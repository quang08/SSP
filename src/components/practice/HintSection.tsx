import React, { useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { fetchWithAuth } from '@/app/auth/fetchWithAuth';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { ENDPOINTS } from '@/config/urls';

interface HintSectionProps {
  userId: string;
  testId: string;
  questionId: string;
  questionText: string;
  isVisible: boolean;
  onToggle: () => void;
}

const cleanLatexFields = (text: string): string => {
  return text
    .replace(/[\\x00-\\x1F\\x7F]/g, '') // Strip control characters
    .replace(/\\\\/g, '\\\\'); // Normalize escaped backslashes
};

const isValidLatex = (text: string): boolean => {
  try {
    katex.renderToString(text, { throwOnError: true });
    return true;
  } catch {
    return false;
  }
};

const renderWithKatex = (
  text: string,
  displayMode: boolean = false
): string => {
  try {
    return katex.renderToString(text, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: true,
    });
  } catch (error) {
    console.error('KaTeX rendering error:', error);
    return text;
  }
};

const isSimpleLatex = (text: string): boolean => {
  // Check if text contains only basic LaTeX commands and symbols
  const simpleLatexPattern =
    /^[a-zA-Z0-9\\s\\+\\-\\*\\/\\^\\{\\}\\(\\)\\[\\_\\$]]+$/;
  return simpleLatexPattern.test(text);
};

const stripMathDelimiters = (latex: string): string => {
  // Order matters: $$ first, then $, then \[, then \(
  return latex
    .replace(/^\$\$([\s\S]*)\$\$$/, '$1') // $$...$$
    .replace(/^\$(.*)\$$/, '$1') // $...$
    .replace(/^\\\[([\s\S]*)\\\]$/, '$1') // \[...\]
    .replace(/^\\\((.*)\\\)$/, '$1'); // \(...\)
};

export const renderTextWithLatex = (text: string) => {
  if (!text) return null;

  // --- Step 1: Normalize double-escaped characters ---
  let processedText = text
    .replace(/\\\\\(/g, '\\(')
    .replace(/\\\\\)/g, '\\)')
    .replace(/\\\\\[/g, '\\[')
    .replace(/\\\\\]/g, '\\]')
    .replace(/\\\\/g, '\\');

  // --- Step 2: Normalize some LaTeX commands ---
  processedText = processedText
    .replace(/\\mathbb\{([^}]+)\}/g, (_, p1) => `\\mathbb{${p1}}`)
    .replace(/_{([^}]+)}/g, '_{$1}')
    .replace(/\^{([^}]+)}/g, '^{$1}')
    .replace(/\\sum(?![a-zA-Z])/g, '\\sum\\limits')
    .replace(/\\int(?![a-zA-Z])/g, '\\int\\limits')
    .replace(/\\prod(?![a-zA-Z])/g, '\\prod\\limits')
    .replace(/\\mid/g, '|')
    .replace(/\\T(?![a-zA-Z])/g, '^{\\intercal}')
    .replace(/\\Var/g, '\\operatorname{Var}')
    .replace(/\\Bias/g, '\\operatorname{Bias}')
    .replace(/\\MSE/g, '\\operatorname{MSE}')
    .replace(/\\EPE/g, '\\operatorname{EPE}')
    .replace(/\\{/g, '{')
    .replace(/\\}/g, '}');

  // --- Step 3: Split by math delimiters while preserving them ---
  const parts = processedText.split(
    /(\$\$[\s\S]+?\$\$|\$[^\n]+\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g
  );


  // --- Step 4: Hash function for keys ---
  const hashString = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(36);
  };

  // --- Step 5: Render each part ---
  return parts.map((part, index) => {
    const key = `${index}-${hashString(part)}`;
    const trimmed = part.trim();

    const isLatex = /^(\$\$.*\$\$|\$.*\$|\\\(.*\\\)|\\\[.*\\\])$/.test(trimmed);

    if (isLatex) {
      // Remove only the outermost delimiters
      let latex = trimmed;

      if (latex.startsWith('$$') && latex.endsWith('$$')) {
        latex = latex.slice(2, -2);
      } else if (latex.startsWith('$') && latex.endsWith('$')) {
        latex = latex.slice(1, -1);
      } else if (latex.startsWith('\\(') && latex.endsWith('\\)')) {
        latex = latex.slice(2, -2);
      } else if (latex.startsWith('\\[') && latex.endsWith('\\]')) {
        latex = latex.slice(2, -2);
      }

      try {
        return (
          <span
            key={key}
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(latex, {
                displayMode:
                  trimmed.startsWith('$$') || trimmed.startsWith('\\['),
                throwOnError: false,
                trust: true,
              }),
            }}
          />
        );
      } catch (e) {
        console.error('KaTeX render error:', e, '\nLatex:', latex);
        return <span key={key}>{part}</span>;
      }
    }

    return <span key={key}>{part}</span>;
  });
};

export const HintSection = ({
  userId,
  testId,
  questionId,
  questionText,
  isVisible,
  onToggle,
}: HintSectionProps) => {
  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [loadingMessage, setLoadingMessage] =
    useState<string>('Loading hint...');
  const [generatingNewHint, setGeneratingNewHint] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const maxRetries = 3;
  const loadingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Function to retry fetching a hint that might have been generated
  const retryFetchHint = async () => {
    try {
      console.log('Retrying hint fetch...');
      // Try to fetch the hint that might have been generated despite the error
      const fetchResponse = await fetchWithAuth(ENDPOINTS.ragFetchHint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          test_id: testId,
          question_id: questionId,
        }),
      });

      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        console.log('Retry fetch response:', data);

        if (data.found) {
          console.log('Successfully retrieved hint on retry!');
          setHint(data.hint);
          setError(null);
          setLoadingHint(false);
          setGeneratingNewHint(false);
          setIsRefreshing(false);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error during hint retry:', error);
      return false;
    }
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setLoadingMessage('Refreshing hint...');
    retryFetchHint().finally(() => {
      setIsRefreshing(false);
    });
  };

  const handleGetHint = async () => {
    if (hint && !isRefreshing) return;

    setLoadingHint(true);
    setError(null);
    setLoadingMessage('Loading hint...');

    try {
      // Try fetching existing hint
      const fetchResponse = await fetchWithAuth(ENDPOINTS.ragFetchHint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          test_id: testId,
          question_id: questionId,
        }),
      });

      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        console.log('Fetch hint response:', data);

        if (data.found) {
          // Hint exists, set it directly and reset loading state
          setHint(data.hint);
          setLoadingHint(false);
          setGeneratingNewHint(false);
          setIsRefreshing(false);
          return;
        } else {
          // Hint not found, show transition message and generate a new one
          setGeneratingNewHint(true);
          setLoadingMessage(
            data.message ||
              'Creating a personalized hint for you... (this may take up to 30 seconds)'
          );
        }
      } else {
        // Handle other API errors
        setGeneratingNewHint(true);
        setLoadingMessage(
          'Crafting a new hint for you... (this may take up to 30 seconds)'
        );
      }

      // If we get here, we need to generate a new hint
      const generateResponse = await fetchWithAuth(ENDPOINTS.ragGenerateHint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          test_id: testId,
          question_id: questionId,
          question_text: questionText,
        }),
      });

      if (!generateResponse.ok) {
        throw new Error(
          'Failed to generate hint, but it might still be processing...'
        );
      }

      const generateData = await generateResponse.json();
      setHint(generateData.hint);

      // Explicitly reset loading states when we get a successful hint
      if (generateData.hint) {
        console.log('Successfully generated new hint');
        setLoadingHint(false);
        setGeneratingNewHint(false);
        setIsRefreshing(false);
        setRetryCount(0);
        return; // Exit early after setting the hint
      }
    } catch (error) {
      console.error('Error generating hint:', error);

      // Set a more informative error message but don't show it yet - try to recover first
      setError(
        'Sorry, I had trouble creating your hint. Please wait while I try again...'
      );
      setRetryCount((prev) => prev + 1);

      // Wait a moment before retrying (delay increases with each retry)
      const delay = 1000 * retryCount;
      setLoadingMessage(
        `Retrieving your hint... (attempt ${retryCount + 1}/${maxRetries})`
      );

      setTimeout(async () => {
        // Try to fetch the hint that might have been generated despite the error
        const success = await retryFetchHint();

        if (!success && retryCount < maxRetries - 1) {
          // If still not successful and we have retries left, retry the fetch
          setRetryCount((prev) => prev + 1);
        } else if (!success) {
          // Max retries reached, show final error
          setError(
            'Sorry, I had trouble creating your hint. Please try again later or ask your instructor for help.'
          );
          setLoadingHint(false);
          setGeneratingNewHint(false);
          setIsRefreshing(false);
        }
      }, delay);

      return; // Don't reset loading state yet if we're retrying
    }

    // Only reach here if everything went well
    setLoadingHint(false);
    setGeneratingNewHint(false);
    setIsRefreshing(false);
    setRetryCount(0);
  };

  const handleRetry = () => {
    setRetryCount(0);
    setError(null);
    handleGetHint();
  };

  React.useEffect(() => {
    console.log('HintSection useEffect - Visibility changed:', {
      isVisible,
      hasHint: !!hint,
      isLoading: loadingHint,
    });

    if (isVisible && !hint && !loadingHint) {
      console.log('Initiating hint fetch from useEffect');
      handleGetHint();
    } else if (isVisible && hint) {
      // If we already have a hint but are somehow still in loading state, fix it
      setLoadingHint(false);
      setGeneratingNewHint(false);
    }
  }, [isVisible, hint, loadingHint]);

  // Safeguard against infinite loading states
  React.useEffect(() => {
    // If we're in a loading state, set a timeout to exit it after 45 seconds (increased from 20)
    if (loadingHint) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.log('Loading timeout reached, forcing exit from loading state');
        setLoadingHint(false);
        setGeneratingNewHint(false);
        setIsRefreshing(false);
        if (!hint) {
          setError(
            'The hint is taking longer than expected. Please click "Try Again" or refresh the page.'
          );
        }
      }, 45000); // 45 seconds timeout (increased from 20 seconds)
    }

    // Cleanup function
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [loadingHint, hint]);

  if (!isVisible) return null;

  // Update formatHintWithPageCircles to process text before sending to LaTeX rendering
  const formatHintWithPageCircles = (text: string): string => {
    if (!text) return '';

    // Add support for multiple patterns for page references
    let processedText = text;

    // Handle "Based on page X" format (with spaces)
    processedText = processedText.replace(
      /([Bb]ased\s+on\s+page\s*)(\d+)/g,
      (match, prefix, pageNum) => {
        return `${prefix}[PAGE_MARKER_${pageNum}]`;
      }
    );

    // Handle "Basedonpage X" format (without spaces)
    processedText = processedText.replace(
      /([Bb]asedonpage)(\s*)(\d+)/g,
      (match, prefix, space, pageNum) => {
        return `${prefix}${space}[PAGE_MARKER_${pageNum}]`;
      }
    );

    // Handle specific format in the screenshot "[PAGE_M_ARKER_X]" which might appear
    processedText = processedText.replace(
      /\[PAGE_M_ARKER_(\d+)\]/g,
      (match, pageNum) => {
        return `[PAGE_MARKER_${pageNum}]`;
      }
    );

    return processedText;
  };

  // This function processes the React nodes after LaTeX rendering to add page circles
  const processPageMarkers = (nodes: React.ReactNode): React.ReactNode => {
    if (!nodes || typeof nodes !== 'object') return nodes;

    // If it's not an array (might be a single element), wrap it in array for processing
    const nodeArray = React.Children.toArray(nodes);

    return React.Children.map(nodeArray, (node) => {
      // If it's a text node (string), replace page markers with JSX elements
      if (typeof node === 'string') {
        // Add debug output to see what's being processed
        console.log('Processing text node:', node);

        if (node.includes('[PAGE_MARKER_')) {
          const parts = node.split(/\[PAGE_MARKER_(\d+)\]/g);
          console.log('Split parts:', parts);

          if (parts.length > 1) {
            const result: React.ReactNode[] = [];

            for (let i = 0; i < parts.length; i++) {
              if (i % 2 === 0) {
                // Even indices are text
                if (parts[i]) result.push(parts[i]);
              } else {
                // Odd indices are page numbers
                result.push(
                  <span
                    key={`page-${i}`}
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-dark)] font-medium text-xs"
                  >
                    {parts[i]}
                  </span>
                );
              }
            }
            return <>{result}</>;
          }
        }
        return node;
      }

      // If it's an element with props and children
      if (React.isValidElement(node)) {
        // Type assertion to handle children property
        const element = node as React.ReactElement<{
          children?: React.ReactNode;
        }>;

        if (element.props.children) {
          return React.cloneElement(
            element,
            { ...element.props },
            processPageMarkers(element.props.children)
          );
        }
      }

      return node;
    });
  };

  // Update the method to use a more direct approach rather than relying on complex regex transformations
  const renderHintWithMathAndPageCircles = (text: string): React.ReactNode => {
    if (!text) return null;

    // Create a regex pattern to match all known variations of page references
    const pageRefPattern =
      /([Bb]ased(?:\s*on)?\s*page\s*|[Bb]asedonpage\s*|[Pp]age\s+)(?:\[?PAGE_?M?_?ARKER_?)?(\d+)\]?/g;

    // Check if we have any page references in this text
    if (pageRefPattern.test(text)) {
      // Reset the regex pattern (since test() moves the lastIndex forward)
      pageRefPattern.lastIndex = 0;

      // Split the text into chunks - some will be plain text, others will be page references
      const chunks: Array<string> = [];
      let lastIndex = 0;
      let match;

      while ((match = pageRefPattern.exec(text)) !== null) {
        // Add the text up to the match
        if (match.index > lastIndex) {
          chunks.push(text.substring(lastIndex, match.index));
        }

        // Add a special marker for the page reference
        chunks.push(
          `__PAGE_REF_START__${match[1]}__PAGE_NUM_${match[2]}__PAGE_REF_END__`
        );

        // Update the last index
        lastIndex = match.index + match[0].length;
      }

      // Add any remaining text
      if (lastIndex < text.length) {
        chunks.push(text.substring(lastIndex));
      }

      // Process each chunk with LaTeX rendering, then replace our special markers with page circles
      const processedChunks = chunks.map((chunk) => {
        if (chunk.startsWith('__PAGE_REF_START__')) {
          // Extract the prefix and page number
          const prefixMatch = chunk.match(/__PAGE_REF_START__(.*?)__PAGE_NUM_/);
          const numMatch = chunk.match(/__PAGE_NUM_(\d+)__PAGE_REF_END__/);

          if (prefixMatch && numMatch) {
            const prefix = prefixMatch[1];
            const pageNum = numMatch[1];

            // Return the properly formatted page reference as JSX
            return (
              <React.Fragment key={`page-ref-${pageNum}`}>
                {prefix}
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-dark)] font-medium text-xs">
                  {pageNum}
                </span>
              </React.Fragment>
            );
          }
        }

        // For regular text chunks, process with LaTeX
        return renderTextWithLatex(chunk);
      });

      // Return all processed chunks
      return <>{processedChunks}</>;
    }

    // If no page references, just render with LaTeX as usual
    return renderTextWithLatex(text);
  };

  return (
    <div className="ml-10 bg-[var(--color-background-alt)] rounded-lg border border-[var(--color-gray-200)]">
      <div className="w-full flex items-center justify-between p-6 text-left border-b border-[var(--color-gray-200)]">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center justify-between"
        >
          <h4 className="text-xl font-medium text-[var(--color-text)]">Hint</h4>
          <ChevronDown
            className={`w-5 h-5 text-[var(--color-text-secondary)] transform transition-transform ${
              isVisible ? 'rotate-180' : ''
            }`}
          />
        </button>
        {hint && (
          <button
            onClick={handleManualRefresh}
            className="ml-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Sometimes the hint might need a reload! Click to refresh"
            aria-label="Refresh hint"
            disabled={loadingHint || isRefreshing}
          >
            <RefreshCw
              className={`w-4 h-4 text-[var(--color-text-secondary)] ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        )}
      </div>
      <div className="p-6">
        {loadingHint || isRefreshing ? (
          <div className="text-lg text-[var(--color-text-secondary)]">
            <p>{loadingMessage}</p>
            {(generatingNewHint || isRefreshing) && (
              <div className="mt-4">
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <div
                    className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-pulse"
                    style={{ animationDelay: '0ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-pulse"
                    style={{ animationDelay: '300ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-pulse"
                    style={{ animationDelay: '600ms' }}
                  ></div>
                </div>
                <div className="w-full bg-[var(--color-background)] rounded-full h-1.5">
                  <div className="bg-[var(--color-primary)] h-1.5 rounded-full animate-[progressPulse_3s_ease-in-out_infinite]"></div>
                </div>
              </div>
            )}
          </div>
        ) : error ? (
          <div className="text-lg text-[var(--color-text-secondary)]">
            <p className="text-red-500">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-4 px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="text-lg text-[var(--color-text-secondary)]">
            {hint ? renderHintWithMathAndPageCircles(hint) : null}
          </div>
        )}
      </div>
    </div>
  );
};
