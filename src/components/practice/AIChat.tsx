import React, { useState, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import {
  X,
  Loader2,
  MessageSquare,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { fetchWithAuth } from '@/app/auth/fetchWithAuth';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ENDPOINTS } from '@/config/urls';

// Constants for limits
const MAX_QUESTIONS_PER_SESSION = 3;
const COOLDOWN_SECONDS = 3;
const MAX_TOKEN_LENGTH = 300;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatProps {
  userId: string;
  testId: string;
  questionId: string;
}

// Simple function to estimate tokens (approximately 4 characters per token)
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

export const AIChat: React.FC<AIChatProps> = ({
  userId,
  testId,
  questionId,
}) => {
  const [userMessage, setUserMessage] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState<string>('Thinking...');
  const [generatingResponse, setGeneratingResponse] = useState(false);
  const [lastMessageSent, setLastMessageSent] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [shouldReconnect, setShouldReconnect] = useState(false);

  // New state variables for limits
  const [remainingQuestions, setRemainingQuestions] = useState<number>(
    MAX_QUESTIONS_PER_SESSION
  );
  const [cooldownActive, setCooldownActive] = useState<boolean>(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [tokenCount, setTokenCount] = useState<number>(0);

  const maxRetries = 3;
  const loadingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const cooldownTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Reset limits when the dialog is opened
  useEffect(() => {
    if (isOpen) {
      void loadChatHistory();

      // Count existing user messages to determine remaining questions
      const existingUserMessages = chatHistory.filter(
        (msg) => msg.role === 'user'
      ).length;
      setRemainingQuestions(
        Math.max(0, MAX_QUESTIONS_PER_SESSION - existingUserMessages)
      );
    } else {
      // Clean up timers when dialog closes
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    }
  }, [isOpen, userId, testId, questionId]);

  // Update token count when user types
  useEffect(() => {
    setTokenCount(estimateTokens(userMessage));
  }, [userMessage]);

  useEffect(() => {
    // Safeguard against infinite loading states
    if (loading) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.log('Loading timeout reached, switching to polling mode');
        setLoading(false);
        setGeneratingResponse(false);
        setLoadingMessage(
          'Response is taking longer than expected. Checking for updates...'
        );
        setShouldReconnect(true);

        // Instead of showing error, start polling for response
        if (lastMessageSent) {
          startPollingForResponse();
        }
      }, 30000); // 30 seconds timeout
    }

    // Cleanup function
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [loading, lastMessageSent]);

  // Set up polling effect
  useEffect(() => {
    // Clean up polling interval on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Handle reconnection when dialogue is open
  useEffect(() => {
    if (isOpen && shouldReconnect) {
      startPollingForResponse();
    }
  }, [isOpen, shouldReconnect]);

  const startPollingForResponse = () => {
    if (isPolling || !lastMessageSent) return;

    console.log('Starting to poll for response...');
    setIsPolling(true);

    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Start polling for responses
    pollingIntervalRef.current = setInterval(async () => {
      console.log('Polling for new responses...');
      try {
        // Fetch the latest chat history
        const response = await fetchWithAuth(ENDPOINTS.ragChatHistory, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            test_id: testId,
            question_id: questionId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const newHistory = data.chat_history || [];

          // Check if the history has more messages than what we have locally
          if (newHistory.length > chatHistory.length) {
            console.log('New messages found in polling!', newHistory);
            setChatHistory(newHistory);

            // If we found a response, stop polling and reset states
            setIsPolling(false);
            setShouldReconnect(false);
            setError(null);

            // Clear the polling interval
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        }
      } catch (err) {
        console.error('Error during polling:', err);
        // We don't stop polling on error, just log it
      }
    }, 5000); // Poll every 5 seconds
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  };

  const loadChatHistory = async (): Promise<void> => {
    setLoadingHistory(true);
    setError(null);
    try {
      const response = await fetchWithAuth(ENDPOINTS.ragChatHistory, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          test_id: testId,
          question_id: questionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to load chat history');
      }

      const data = await response.json();
      setChatHistory(data.chat_history || []);

      // Calculate remaining questions based on history
      const userMessageCount = (data.chat_history || []).filter(
        (msg: ChatMessage) => msg.role === 'user'
      ).length;
      setRemainingQuestions(
        Math.max(0, MAX_QUESTIONS_PER_SESSION - userMessageCount)
      );

      // If we were waiting for a response and now we have one, reset the reconnect flag
      if (
        shouldReconnect &&
        data.chat_history &&
        data.chat_history.length > 0
      ) {
        const lastMessage = data.chat_history[data.chat_history.length - 1];
        if (lastMessage.role === 'assistant') {
          setShouldReconnect(false);
          stopPolling();
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error loading chat history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Function to retry fetching a response that might have been generated
  const retryFetchResponse = async (
    messageToSend: string
  ): Promise<boolean> => {
    try {
      console.log('Retrying response fetch...');

      const fetchResponse = await fetchWithAuth(ENDPOINTS.ragAnswerChat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          test_id: testId,
          question_id: questionId,
          user_message: messageToSend,
          max_tokens: MAX_TOKEN_LENGTH, // Add token limit
        }),
      });

      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        console.log('Retry fetch response:', data);

        if (data.answer) {
          console.log('Successfully retrieved response on retry!');
          setChatHistory((prev) => [
            ...prev,
            { role: 'assistant', content: data.answer },
          ]);
          setError(null);
          setLoading(false);
          setGeneratingResponse(false);
          setLastMessageSent(null);
          setShouldReconnect(false);
          stopPolling();
          return true;
        }
      }

      // If we didn't get a response, check the chat history directly
      await loadChatHistory();
      return false;
    } catch (error) {
      console.error('Error during response retry:', error);
      return false;
    }
  };

  // Start cooldown timer
  const startCooldown = () => {
    setCooldownActive(true);
    setCooldownSeconds(COOLDOWN_SECONDS);

    // Clear any existing cooldown timer
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }

    // Set up the cooldown interval
    cooldownTimerRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          // Cooldown complete
          setCooldownActive(false);
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendMessage = async (): Promise<void> => {
    // Check if we have any questions left
    if (remainingQuestions <= 0) {
      setError("You've used all your available questions for this session.");
      return;
    }

    // Check if message is too long
    if (tokenCount > MAX_TOKEN_LENGTH) {
      setError(
        `Your message is too long. Please reduce it to under ${MAX_TOKEN_LENGTH} tokens (current: ${tokenCount}).`
      );
      return;
    }

    // Check if we're in cooldown
    if (cooldownActive) {
      setError(
        `Please wait ${cooldownSeconds} seconds before sending another message.`
      );
      return;
    }

    if (!userMessage.trim()) return;

    setLoading(true);
    setGeneratingResponse(true);
    setError(null);
    setRetryCount(0);
    setLoadingMessage('Thinking...');

    // Store the message being sent for potential polling
    const messageToSend = userMessage;
    setLastMessageSent(messageToSend);
    setUserMessage('');

    // Stop any ongoing polling
    stopPolling();
    setShouldReconnect(false);

    const updatedHistory: ChatMessage[] = [
      ...chatHistory,
      { role: 'user', content: messageToSend },
    ];
    setChatHistory(updatedHistory);

    // Decrement remaining questions and start cooldown
    setRemainingQuestions((prev) => prev - 1);
    startCooldown();

    try {
      const response = await fetchWithAuth(ENDPOINTS.ragAnswerChat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          test_id: testId,
          question_id: questionId,
          user_message: messageToSend,
          max_tokens: MAX_TOKEN_LENGTH, // Add token limit
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response');
      }

      const data = await response.json();
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer },
      ]);
      setLastMessageSent(null); // Clear the last message since we got a response
    } catch (err) {
      console.error('Error fetching response:', err);

      // Set a more informative error message but don't show it yet - try to recover first
      setError(
        'Sorry, I had trouble getting a response. Please wait while I try again...'
      );
      setRetryCount((prev) => prev + 1);

      // Wait a moment before retrying (delay increases with each retry)
      const delay = 1000 * retryCount;
      setLoadingMessage(
        `Retrieving response... (attempt ${retryCount + 1}/${maxRetries})`
      );

      setTimeout(async () => {
        // Try to fetch the response that might have been generated despite the error
        const success = await retryFetchResponse(messageToSend);

        if (!success && retryCount < maxRetries - 1) {
          // If still not successful and we have retries left, retry the fetch
          setRetryCount((prev) => prev + 1);
          setLoadingMessage(
            `Retrieving response... (attempt ${retryCount + 2}/${maxRetries})`
          );
          const nextSuccess = await retryFetchResponse(messageToSend);

          if (!nextSuccess && retryCount + 1 < maxRetries - 1) {
            // Try one more time
            setRetryCount((prev) => prev + 1);
            setLoadingMessage(
              `Retrieving response... (attempt ${retryCount + 3}/${maxRetries})`
            );
            await retryFetchResponse(messageToSend);
          }
        }

        // If we still don't have success after all retries, start polling instead of showing error
        if (!success && retryCount >= maxRetries - 1) {
          setLoadingMessage(
            'Response is taking longer than expected. Checking for updates...'
          );
          setShouldReconnect(true);
          startPollingForResponse();
        }
      }, delay);

      return; // Don't reset loading state yet if we're retrying
    } finally {
      if (!error) {
        setLoading(false);
        setGeneratingResponse(false);
      }
    }
  };

  const handleRetry = () => {
    // Get the last user message
    const lastUserMessage =
      chatHistory.findLast((msg) => msg.role === 'user')?.content || '';
    if (lastUserMessage) {
      // Remove the error message from chat history if it exists
      setChatHistory((prev) =>
        prev.filter((msg) => !msg.content.startsWith('❌ Error:'))
      );
      setUserMessage(lastUserMessage);
      setRetryCount(0);
      setError(null);
      void handleSendMessage();
    }
  };

  const handleForcedUpdate = () => {
    // Manually trigger a refresh of the chat history
    loadChatHistory();
  };

  const formatMathNotation = (text: string): string => {
    if (!text) return '';

    // Convert inline LaTeX expressions
    text = text.replace(/\\\((.*?)\\\)/g, (_, equation) => `$${equation}$`);

    // Convert block LaTeX expressions
    text = text.replace(
      /\\\[(.*?)\\\]/gm,
      (_, equation) => `\n\n$$${equation}$$\n\n`
    );

    return text;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Chat with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] w-[90vw] bg-white">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>AI Tutor Chat</span>
            {isPolling && (
              <div className="flex items-center text-sm text-gray-500 gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Checking for new messages...</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {remainingQuestions} of {MAX_QUESTIONS_PER_SESSION} questions
                left
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleForcedUpdate}
                className="ml-auto"
                title="Sometimes messages might need a reload! Click to refresh"
                aria-label="Refresh chat messages"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="bg-white rounded-lg p-4">
          <div className="h-[500px] overflow-y-auto mb-4 space-y-3">
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-secondary)]">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Loading chat history...</p>
              </div>
            ) : error && !isPolling ? (
              <div className="text-red-500 text-center py-4">
                {error}
                <button
                  onClick={handleRetry}
                  className="ml-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-dark)] transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : chatHistory.length === 0 ? (
              <p className="text-[var(--color-text-secondary)] text-center py-4">
                Start a conversation about this question
              </p>
            ) : (
              <>
                {chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`inline-block max-w-[80%] p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-gray-200'
                      }`}
                    >
                      <div className="text-md whitespace-pre-wrap break-words">
                        <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong>{' '}
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {formatMathNotation(msg.content)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                {(loading || isPolling) && (
                  <div className="flex justify-start">
                    <div className="inline-block max-w-[80%] p-3 rounded-lg bg-gray-200">
                      <div className="text-md whitespace-pre-wrap break-words">
                        <strong>AI:</strong>{' '}
                        <div className="text-lg text-[var(--color-text-secondary)]">
                          <p>{loadingMessage}</p>
                          {(generatingResponse || isPolling) && (
                            <div className="mt-2 flex items-center">
                              <div className="animate-pulse mr-2 h-2 w-2 rounded-full bg-[var(--color-primary)]"></div>
                              <div className="animate-pulse delay-200 mr-2 h-2 w-2 rounded-full bg-[var(--color-primary)]"></div>
                              <div className="animate-pulse delay-500 h-2 w-2 rounded-full bg-[var(--color-primary)]"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {/* Token count indicator */}
            <div className="flex justify-between items-center text-sm">
              <div
                className={`${tokenCount > MAX_TOKEN_LENGTH ? 'text-red-500' : 'text-gray-500'}`}
              >
                {tokenCount}/{MAX_TOKEN_LENGTH} tokens
              </div>
              {cooldownActive && (
                <div className="text-amber-500 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Cooldown: {cooldownSeconds}s
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 p-2 border rounded bg-white"
                placeholder={
                  remainingQuestions > 0
                    ? 'Ask a question about this topic...'
                    : "You've used all your questions for this session"
                }
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyPress={(e) =>
                  e.key === 'Enter' && !e.shiftKey && void handleSendMessage()
                }
                disabled={
                  loading ||
                  loadingHistory ||
                  remainingQuestions <= 0 ||
                  cooldownActive
                }
              />
              <Button
                onClick={() => void handleSendMessage()}
                disabled={
                  loading ||
                  loadingHistory ||
                  !userMessage.trim() ||
                  remainingQuestions <= 0 ||
                  cooldownActive ||
                  tokenCount > MAX_TOKEN_LENGTH
                }
                className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-[var(--color-primary)] shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending...</span>
                  </div>
                ) : (
                  'Send'
                )}
              </Button>
            </div>
            {remainingQuestions <= 0 && (
              <div className="text-amber-500 flex items-center gap-1 text-sm mt-1">
                <AlertCircle className="h-3 w-3" />
                You've used all available questions for this session.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
