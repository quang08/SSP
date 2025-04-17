'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import QuestionCard from '@/components/practice/card-question';
import ShortAnswerQuestionCard from '@/components/practice/card-short-answer-question';
import { ChevronLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { ENDPOINTS } from '@/config/urls';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import Link from 'next/link';
import useSWR from 'swr';
import { createClient } from '@/utils/supabase/client';
import {
  Question,
  Quiz,
  SelectedAnswers,
  SubmissionResult,
  ShortAnswerQuestion,
  QuestionType,
  QuizQuestion,
} from '@/interfaces/test';
import { toast } from 'sonner';
import { initSessionActivity } from '@/utils/session-management';
import { MathJaxContext } from 'better-react-mathjax';

// MathJax configuration (copied from standard quiz page)
const mathJaxConfig = {
  loader: {
    load: [
      '[tex]/html',
      '[tex]/ams',
      '[tex]/noerrors',
      '[tex]/noundefined',
      '[tex]/mhchem',
      '[tex]/cancel',
    ],
  },
  tex: {
    packages: {
      '[+]': ['html', 'ams', 'noerrors', 'noundefined', 'mhchem', 'cancel'],
    },
    inlineMath: [
      ['$', '$'],
      ['\\(', '\\)'],
    ],
    displayMath: [
      ['$$', '$$'],
      ['\\[', '\\]'],
    ],
    processEscapes: true,
    processEnvironments: true,
    processRefs: true,
    digits: /^(?:[0-9]+(?:\{,\}[0-9]{3})*(?:\.[0-9]*)?|\.[0-9]+)/,
    tags: 'ams',
    tagSide: 'right',
    tagIndent: '0.8em',
    useLabelIds: true,
    maxMacros: 1000,
    maxBuffer: 5 * 1024,
    macros: {
      // Number sets
      '\\R': '\\mathbb{R}',
      '\\N': '\\mathbb{N}',
      '\\Z': '\\mathbb{Z}',
      '\\Q': '\\mathbb{Q}',
      '\\C': '\\mathbb{C}',

      // Common operators and functions
      '\\Var': '\\operatorname{Var}',
      '\\Bias': '\\operatorname{Bias}',
      '\\EPE': '\\operatorname{EPE}',
      '\\RSS': '\\operatorname{RSS}',
      '\\MSE': '\\operatorname{MSE}',
      '\\E': '\\mathbb{E}',
      '\\P': '\\mathbb{P}',

      // Decorators
      '\\hat': '\\widehat',
      '\\bar': '\\overline',
      '\\tilde': '\\widetilde',
      '\\vec': '\\mathbf',
      '\\mat': '\\mathbf',

      // Greek letters shortcuts
      '\\eps': '\\varepsilon',
      '\\alp': '\\alpha',
      '\\bet': '\\beta',
      '\\gam': '\\gamma',
      '\\del': '\\delta',
      '\\the': '\\theta',
      '\\kap': '\\kappa',
      '\\lam': '\\lambda',
      '\\sig': '\\sigma',
      '\\Gam': '\\Gamma',
      '\\Del': '\\Delta',
      '\\The': '\\Theta',
      '\\Lam': '\\Lambda',
      '\\Sig': '\\Sigma',
      '\\Ome': '\\Omega',

      // Special operators
      '\\T': '^{\\intercal}',
      '\\given': '\\,|\\, ',
      '\\set': '\\{\\, ',
      '\\setend': '\\,\\}',
      '\\abs': ['\\left|#1\\right|', 1],
      '\\norm': ['\\left\\\\|#1\\right\\\\|', 1],
      '\\inner': ['\\left\\langle#1\\right\\rangle', 1],
      '\\ceil': ['\\left\\lceil#1\\right\\rceil', 1],
      '\\floor': ['\\left\\lfloor#1\\right\\rfloor', 1],

      // Limits and sums
      '\\lim': '\\lim\\limits',
      '\\sum': '\\sum\\limits',
      '\\prod': '\\prod\\limits',
      '\\int': '\\int\\limits',

      // Additional statistical operators
      '\\Cov': '\\operatorname{Cov}',
      '\\Corr': '\\operatorname{Corr}',
      '\\SE': '\\operatorname{SE}',
      '\\Prob': '\\operatorname{P}',

      // Additional mathematical operators
      '\\argmax': '\\operatorname{arg\\,max}',
      '\\argmin': '\\operatorname{arg\\,min}',
      '\\trace': '\\operatorname{tr}',
      '\\diag': '\\operatorname{diag}',

      // Matrix notation
      '\\bm': ['\\boldsymbol{#1}', 1],
      '\\matrix': ['\\begin{matrix}#1\\end{matrix}', 1],
      '\\pmatrix': ['\\begin{pmatrix}#1\\end{pmatrix}', 1],
      '\\bmatrix': ['\\begin{bmatrix}#1\\end{bmatrix}', 1],

      // Additional decorators
      '\\underbar': ['\\underline{#1}', 1],
      '\\overbar': ['\\overline{#1}', 1],

      // Probability and statistics
      '\\iid': '\\stackrel{\\text{iid}}{\\sim}',
      '\\indep': '\\perp\\!\\!\\!\\perp',

      // Calculus
      '\\dd': '\\,\\mathrm{d}',
      '\\partial': '\\partial',
      '\\grad': '\\nabla',

      // Sets and logic
      '\\setminus': '\\backslash',
      '\\implies': '\\Rightarrow',
      '\\iff': '\\Leftrightarrow',

      // Spacing
      '\\negspace': '\\negmedspace{}',
      '\\thinspace': '\\thinspace{}',
      '\\medspace': '\\medspace{}',
      '\\thickspace': '\\thickspace{}',
      '\\quad': '\\quad{}',
      '\\qquad': '\\qquad{}',
    },
  },
  svg: {
    fontCache: 'global',
    scale: 1,
    minScale: 0.5,
    matchFontHeight: true,
    mtextInheritFont: true,
  },
  options: {
    enableMenu: false,
    menuOptions: {
      settings: {
        zoom: 'Click',
        zscale: '200%',
      },
    },
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
    renderActions: {
      addMenu: [],
      checkLoading: [],
    },
  },
};

// Fetcher for authenticated requests
const fetcher = async (url: string) => {
  const supabase = createClient();
  const token = await supabase.auth
    .getSession()
    .then((res) => res.data.session?.access_token);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();
};

// Helper type for Slider props
interface SliderProps {
  onClick: () => void;
  className?: string;
}

// Define interfaces for submission payloads
interface AdaptiveTestSubmissionPayload {
  user_id: string;
  practice_test_id: string;
  study_guide_id: string;
  chapter_title: string;
  score: number;
  accuracy: number;
  total_questions: number;
  time_taken: number;
  questions: Array<{
    question_id: string;
    question: string;
    question_type?: QuestionType | string;
    user_answer?: string;
    user_answer_text?: string;
    correct_answer?: string;
    is_correct: boolean;
    choices?: Record<string, string> | undefined;
  }>;
}

interface StandardTestSubmissionPayload {
  user_id: string;
  test_id: string;
  study_guide_id: string;
  started_at: string;
  answers: Array<{
    question_id: string;
    user_answer?: string;
    user_answer_text?: string;
    notes?: string;
    question_type?: QuestionType | string;
    confidence_level?: number;
    topic_id?: string;
    topic_name?: string;
  }>;
  section_title: string;
  chapter_title: string;
  is_retry: boolean;
  previous_attempt_id?: string;
  attempt_number: number;
}

const SlidesQuizPage: React.FC = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const testId = typeof params.testId === 'string' ? params.testId : '';
  const guideId = typeof params.guideId === 'string' ? params.guideId : '';
  const router = useRouter();
  const supabase = createClient();

  // Get retry parameters from URL
  const isRetry = searchParams.get('retry') === 'true';
  const attemptNumber = parseInt(searchParams.get('attempt') || '1');
  const previousAttemptId = searchParams.get('previous') || '';

  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [startTime, setStartTime] = useState<number>(0);
  const [shortAnswers, setShortAnswers] = useState<{ [key: string]: string }>(
    {}
  );
  const [shortAnswerImages, setShortAnswerImages] = useState<{
    [key: string]: string | null;
  }>({});

  useEffect(() => {
    setStartTime(Math.floor(Date.now() / 1000));
  }, []);

  // Fetch user data
  const { data: userData } = useSWR('user', async () => {
    const { data } = await supabase.auth.getUser();
    return data?.user;
  });

  // Use the consolidated endpoint for fetching quiz and guide data
  const { data: consolidatedData, error: consolidatedError } = useSWR(
    testId && guideId && userData?.id
      ? ENDPOINTS.quizWithGuide(testId, guideId, userData.id)
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // 10 seconds
    }
  );

  // Extract the data from the consolidated response
  const quiz = consolidatedData?.quiz;
  const slidesGuideData = consolidatedData?.guide;
  const previousAttempts = consolidatedData?.previous_attempts || [];

  const [selectedAnswers, setSelectedAnswers] = React.useState<SelectedAnswers>(
    {}
  );
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  // Add state for confidence levels
  const [confidenceLevels, setConfidenceLevels] = useState<{
    [key: string]: number;
  }>({});

  const loading = !consolidatedData || !userData;
  const anyError = consolidatedError || error;

  // Process quiz questions to separate multiple choice and short answer
  const processedQuestions = React.useMemo(() => {
    if (!quiz?.questions) return { multipleChoice: [], shortAnswer: [] };

    // Extract multiple choice and short answer questions
    const multipleChoice = quiz.questions.filter(
      (q: Question) => q.choices !== undefined
    );

    // Parse short answer questions if they exist
    let shortAnswer: ShortAnswerQuestion[] = [];

    if (quiz.short_answer) {
      shortAnswer = quiz.short_answer.map(
        (q: ShortAnswerQuestion, i: number) => ({
          question_id: `sa_${i}`,
          question: q.question,
          ideal_answer: q.ideal_answer,
          source_page: q.source_page,
          source_text: q.source_text,
        })
      );
    }

    return { multipleChoice, shortAnswer };
  }, [quiz]);

  // Add function to handle confidence updates
  const handleUpdateConfidence = (
    questionId: string,
    confidenceLevel: number
  ): void => {
    setConfidenceLevels((prev) => ({
      ...prev,
      [questionId]: confidenceLevel,
    }));
  };

  // Update answer handlers to set default confidence
  const handleSelectAnswer = (questionId: string, answer: string): void => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));

    // Set default confidence level if not already set
    if (!confidenceLevels[questionId]) {
      setConfidenceLevels((prev) => ({
        ...prev,
        [questionId]: 0.6, // Default neutral confidence
      }));
    }
  };

  const handleShortAnswer = (questionId: string, answer: string): void => {
    setShortAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
    // Clear image if text is entered
    if (answer.trim() !== '' && shortAnswerImages[questionId]) {
      setShortAnswerImages((prev) => ({ ...prev, [questionId]: null }));
    }
    // Set default confidence level if not already set and text is entered
    if (!confidenceLevels[questionId] && answer.trim() !== '') {
      setConfidenceLevels((prev) => ({
        ...prev,
        [questionId]: 0.6, // Default neutral confidence
      }));
    }
  };

  // Add handler for image changes
  const handleImageChange = (
    questionId: string,
    imageDataUri: string | null
  ): void => {
    setShortAnswerImages((prev) => ({
      ...prev,
      [questionId]: imageDataUri,
    }));
    // Clear text if image is uploaded
    if (imageDataUri && shortAnswers[questionId]) {
      setShortAnswers((prev) => ({ ...prev, [questionId]: '' }));
    }
    // Set default confidence if image is uploaded and confidence not set
    if (imageDataUri && !confidenceLevels[questionId]) {
      setConfidenceLevels((prev) => ({
        ...prev,
        [questionId]: 0.6, // Default neutral confidence
      }));
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (
      !userData?.id ||
      !testId ||
      !slidesGuideData ||
      !guideId ||
      !startTime ||
      !quiz
    )
      return;

    try {
      setSubmitting(true);
      // Show a detailed submission toast
      toast.info('Submitting and evaluating your test answers...', {
        duration: 3000,
      });

      const studyGuideId = slidesGuideData._id;
      if (!studyGuideId) throw new Error('Study guide ID not found');

      const sectionTitle = quiz.section_title || '';
      const chapterTitle = quiz.chapter_title || 'All Topics';

      // Format multiple choice answers (explicitly type as QuizQuestion)
      const multipleChoiceAnswers: QuizQuestion[] = Object.entries(
        selectedAnswers
      ).map(([questionId, answer]) => {
        const question =
          processedQuestions.multipleChoice[parseInt(questionId)];
        const isCorrect = answer === question?.correct;
        return {
          question_id: questionId,
          question: question?.question || '',
          user_answer: answer,
          correct_answer: question?.correct,
          is_correct: isCorrect,
          explanation: question?.explanation || '',
          notes: notes[questionId] || '',
          choices: question?.choices || {},
          question_type: 'multiple_choice',
          confidence_level: confidenceLevels[questionId] || 0.5,
          topic_id: sectionTitle,
          topic_name: sectionTitle || 'General',
        };
      });

      // Format short answer responses (explicitly type as QuizQuestion)
      const shortAnswerResponses: QuizQuestion[] =
        processedQuestions.shortAnswer
          .map((saQuestion, index) => {
            const questionId = saQuestion.question_id;
            const textAnswer = shortAnswers[questionId] || '';
            const imageData = shortAnswerImages[questionId] || null;

            // Only include if there is text OR an image
            if (textAnswer.trim() !== '' || imageData) {
              return {
                question_id: questionId,
                question: saQuestion.question || '',
                user_answer_text: textAnswer,
                user_answer: textAnswer,
                image_data: imageData,
                correct_answer: saQuestion.ideal_answer,
                ideal_answer: saQuestion.ideal_answer,
                is_correct: false,
                notes: notes[questionId] || '',
                question_type: 'short_answer',
                confidence_level: confidenceLevels[questionId] || 0.5,
                topic_id: sectionTitle,
                topic_name: sectionTitle || 'General',
              };
            }
            return null; // Return null if no answer
          })
          .filter((response) => response !== null) as QuizQuestion[]; // Filter out nulls

      // Combine all answers
      const formattedAnswers: QuizQuestion[] = [
        ...multipleChoiceAnswers,
        ...shortAnswerResponses,
      ];

      // Determine test type and endpoint
      const testType = quiz.test_type || 'standard';
      const submitEndpoint =
        testType === 'adaptive'
          ? ENDPOINTS.submitAdaptiveTest
          : ENDPOINTS.submitTest;

      let submissionPayload:
        | AdaptiveTestSubmissionPayload
        | StandardTestSubmissionPayload;

      if (testType === 'adaptive') {
        // Payload for /adaptive-tests/submit (AdaptiveTestSubmissionRequest)
        let adaptiveCorrectCount = 0;
        formattedAnswers.forEach((ans) => {
          if (ans.question_type === 'multiple_choice' && ans.is_correct) {
            adaptiveCorrectCount++;
          }
        });
        const adaptiveAccuracy =
          totalQuestions > 0
            ? (adaptiveCorrectCount / totalQuestions) * 100
            : 0;
        const endTime = Math.floor(Date.now() / 1000);
        const timeTaken = endTime - startTime;

        submissionPayload = {
          user_id: userData.id,
          practice_test_id: testId,
          study_guide_id: studyGuideId,
          chapter_title: chapterTitle,
          score: adaptiveCorrectCount,
          accuracy: adaptiveAccuracy,
          total_questions: totalQuestions,
          time_taken: timeTaken,
          questions: formattedAnswers.map((ans) => ({
            question_id: ans.question_id,
            question: ans.question,
            question_type: ans.question_type,
            user_answer: ans.user_answer,
            correct_answer: ans.correct_answer,
            is_correct: ans.is_correct ?? false,
            choices: ans.choices,
          })),
        };
        console.log(
          'Submitting ADAPTIVE test (from slides page) to:',
          submitEndpoint
        );
      } else {
        // Payload for standard /practice/submit (TestSubmissionRequest)
        submissionPayload = {
          user_id: userData.id,
          test_id: testId,
          study_guide_id: studyGuideId,
          started_at: new Date(startTime * 1000).toISOString(),
          answers: formattedAnswers.map((ans) => ({
            question_id: ans.question_id,
            user_answer:
              ans.question_type === 'multiple_choice'
                ? ans.user_answer
                : ans.user_answer_text,
            user_answer_text:
              ans.question_type === 'short_answer'
                ? ans.user_answer_text
                : undefined,
            notes: ans.notes,
            question_type: ans.question_type,
            confidence_level: ans.confidence_level,
            topic_id: ans.topic_id,
            topic_name: ans.topic_name,
          })),
          section_title: sectionTitle,
          chapter_title: chapterTitle,
          is_retry: isRetry,
          previous_attempt_id: isRetry ? previousAttemptId : undefined,
          attempt_number: isRetry ? attemptNumber : 1,
        };
        console.log(
          'Submitting STANDARD test (from slides page) to:',
          submitEndpoint
        );
      }

      console.log('Payload:', JSON.stringify(submissionPayload, null, 2));

      const response = await fetch(submitEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Submission Error:', response.status, errorText);
        throw new Error(
          `Failed to submit quiz: ${errorText || response.statusText}`
        );
      }

      const result = await response.json();

      // Navigate based on test type and result
      if (testType === 'adaptive') {
        console.log('Adaptive test submitted successfully:', result);
        toast.success('Adaptive test submitted!', {
          duration: 3000,
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        });

        // Show loading indicator before navigation
        toast.info('Returning to adaptive tests page...', {
          duration: 2000,
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
        });

        router.push('/adaptive-test');
      } else {
        // Check if server returned special status fields for mastery model
        if (result.mastered) {
          toast.success('Congratulations! You have mastered this topic!', {
            duration: 3000,
          });
        } else if (result.needs_remediation) {
          toast.warning('Review needed before your next attempt.', {
            duration: 3000,
          });
          router.push(
            `/practice/guide/slides/${encodeURIComponent(guideId)}/quiz/${testId}/remediation?submission=${result.submission_id}`
          );
          return;
        } else if (result.can_retry) {
          toast.info(
            `You can retry this test. Attempt ${result.attempt_number}/${result.attempts_remaining + result.attempt_number}`,
            {
              duration: 3000,
            }
          );
        }

        // Show loading indicator before navigation
        toast.info('Loading quiz results...', {
          duration: 2000,
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
        });

        router.push(
          `/practice/guide/slides/${encodeURIComponent(guideId)}/quiz/${testId}/results?submission=${result.submission_id}`
        );
      }
    } catch (err: unknown) {
      console.error('Error in handleSubmit (slides):', err);
      setError(err instanceof Error ? err.message : 'Failed to submit quiz');
      toast.error(
        `Submission failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate progress including both question types
  const totalMultipleChoice = processedQuestions.multipleChoice.length;
  const totalShortAnswer = processedQuestions.shortAnswer.length;
  const totalQuestions = totalMultipleChoice + totalShortAnswer;

  const answeredMultipleChoice = Object.keys(selectedAnswers).length;
  const answeredShortAnswer = processedQuestions.shortAnswer.reduce(
    (count, saQuestion) => {
      const questionId = saQuestion.question_id;
      const hasText =
        shortAnswers[questionId] && shortAnswers[questionId].trim() !== '';
      const hasImage =
        shortAnswerImages[questionId] !== null &&
        shortAnswerImages[questionId] !== undefined;
      if (hasText || hasImage) {
        return count + 1;
      }
      return count;
    },
    0
  );
  const answeredQuestions = answeredMultipleChoice + answeredShortAnswer;

  const progressPercentage =
    totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
  const isQuizComplete =
    totalQuestions > 0 && answeredQuestions === totalQuestions;

  // Add this useEffect to initialize session activity tracking
  useEffect(() => {
    // Initialize session activity monitoring
    const cleanupSessionActivity = initSessionActivity();

    // Cleanup when component unmounts
    return () => {
      if (cleanupSessionActivity) {
        cleanupSessionActivity();
      }
    };
  }, []);

  // Custom arrows for the slider
  const PrevArrow = (props: SliderProps) => {
    const { onClick } = props;
    // ... existing code ...
    return null; // Placeholder return
  };

  const NextArrow = (props: SliderProps) => {
    const { onClick } = props;
    // ... existing code ...
    return null; // Placeholder return
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="flex min-h-screen flex-col bg-[var(--color-background-alt)]">
        <Header />
        <main className="flex-1">
          <div className="sticky top-[64px] left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Link
                    href={`/practice/guide/slides/${encodeURIComponent(guideId)}`}
                    className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Link>
                </div>
                <h2 className="text-2xl font-medium text-gray-900">
                  Practice Quiz - {quiz?.section_title}
                </h2>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-transparent">
                  <span className="text-sm font-medium text-gray-700">
                    {answeredQuestions}/{totalQuestions}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1 mb-2">
                {[...Array(totalQuestions)].map((_, index) => {
                  // Determine if this indicator dot corresponds to a multiple choice or short answer
                  const isMultipleChoice = index < totalMultipleChoice;
                  const questionId = isMultipleChoice
                    ? index.toString()
                    : `sa_${index - totalMultipleChoice}`;

                  const isAnswered = isMultipleChoice
                    ? Object.keys(selectedAnswers).includes(questionId)
                    : Object.keys(shortAnswers).includes(questionId);

                  return (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all duration-500 ${
                        isAnswered ? 'bg-blue-500' : 'bg-gray-200'
                      }`}
                    ></div>
                  );
                })}
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>

              <div className="flex justify-between text-md text-gray-500 mt-1">
                <span>Progress: {progressPercentage.toFixed(0)}%</span>
                <span>
                  {answeredQuestions} of {totalQuestions} questions answered
                </span>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative w-20 h-20 mb-4">
                  <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-purple-600 rounded-full animate-spin"></div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Loading Quiz
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    We&apos;re preparing your quiz questions. This should only
                    take a moment...
                  </p>
                </div>
              </div>
            ) : anyError ? (
              <div className="text-center p-10 bg-red-50 rounded-xl border border-red-200">
                <p className="text-xl text-red-500">Error: {error}</p>
                <Button
                  onClick={() => window.location.reload()}
                  className="mt-6"
                  variant="default"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-8">
                  {/* Multiple Choice Questions */}
                  {processedQuestions.multipleChoice.map(
                    (question: Question, index: number) => (
                      <QuestionCard
                        key={`mc_${index}`}
                        questionNumber={index + 1}
                        question={{
                          question_id: `${index}`,
                          question_text: question.question,
                          options: question.choices || {},
                          correct_answer: question.correct || '',
                          explanation: question.explanation || '',
                          source_page: question.source_page,
                          source_text: question.source_text,
                        }}
                        onSelectAnswer={handleSelectAnswer}
                        selectedAnswer={selectedAnswers[index.toString()]}
                        note={notes[index.toString()] || ''}
                        onUpdateNote={(questionId: string, newNote: string) =>
                          setNotes((prevNotes) => ({
                            ...prevNotes,
                            [questionId]: newNote,
                          }))
                        }
                        userId={userData?.id || ''}
                        testId={testId}
                        confidence={confidenceLevels[index.toString()] || 0.5}
                        onUpdateConfidence={handleUpdateConfidence}
                      />
                    )
                  )}

                  {/* Short Answer Questions */}
                  {processedQuestions.shortAnswer.map((question, index) => (
                    <ShortAnswerQuestionCard
                      key={`sa_${index}`}
                      questionNumber={totalMultipleChoice + index + 1}
                      question={{
                        question_id: `sa_${index}`,
                        question_text: question.question,
                        ideal_answer: question.ideal_answer,
                        source_page: question.source_page,
                        source_text: question.source_text,
                      }}
                      onAnswerChange={handleShortAnswer}
                      answerText={shortAnswers[`sa_${index}`] || ''}
                      note={notes[`sa_${index}`] || ''}
                      onUpdateNote={(questionId: string, newNote: string) =>
                        setNotes((prevNotes) => ({
                          ...prevNotes,
                          [questionId]: newNote,
                        }))
                      }
                      userId={userData?.id || ''}
                      testId={testId}
                      confidence={confidenceLevels[`sa_${index}`] || 0.5}
                      onUpdateConfidence={handleUpdateConfidence}
                      imageDataUri={shortAnswerImages[`sa_${index}`] || null}
                      onImageChange={handleImageChange}
                    />
                  ))}
                </div>

                <div className="mt-10 flex justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={!isQuizComplete || submitting || !slidesGuideData}
                    variant="default"
                    size="lg"
                    className="text-xl bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <div className="flex items-center">
                        <span className="mr-2">Submitting</span>
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : (
                      `Submit Quiz (${answeredQuestions}/${totalQuestions})`
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </MathJaxContext>
  );
};

export default SlidesQuizPage;
