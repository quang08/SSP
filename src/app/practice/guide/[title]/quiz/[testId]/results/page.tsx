'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/app/auth/fetchWithAuth';
import { Header } from '@/components/layout/header';
import Link from 'next/link';
import { getUserId } from '@/app/auth/getUserId';
import { Loading } from '@/components/ui/loading';
import { ENDPOINTS } from '@/config/urls';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  CheckCircle,
  XCircle,
  Trophy,
  Target,
  CheckCircle2,
  Clock,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { AIChat } from '@/components/practice/AIChat';
import { QuizResults, QuizQuestion, QuestionType } from '@/interfaces/test';
import { ResultCard } from '@/components/practice/ResultCard';
import { MathJaxContext } from 'better-react-mathjax';
import useSWR from 'swr';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import RemediationChoice from '@/components/practice/RemediationChoice';
import { motion } from 'framer-motion';
import {
  AccordionItem,
  AccordionContent,
  Accordion,
} from '@/components/ui/accordion';

// MathJax configuration
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
      '\\given': '\\,|\\,',
      '\\set': '\\{\\,',
      '\\setend': '\\,\\}',
      '\\abs': ['\\left|#1\\right|', 1],
      '\\norm': ['\\left\\|#1\\right\\|', 1],
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

// --- Interfaces ---
// Define base interfaces needed for extension
interface Section {
  title: string;
  key_concepts?: string[];
  source_pages?: string[];
  source_texts?: string[];
  prerequisite_sections?: string[];
}

interface Chapter {
  title: string;
  sections: Section[];
}

interface StudyGuideData {
  title: string;
  chapters: Chapter[];
  _id?: string; // Include potential original fields
  study_guide_id?: string;
}

interface ProcessedSection extends Section {
  // Replace 'Section' if different base type
  completed: boolean;
  is_unlocked: boolean;
  is_mastered: boolean;
  review_recommended: boolean;
  attempts_used: number;
  mastery_percentage: number;
}

interface ProcessedChapter extends Omit<Chapter, 'sections'> {
  // Replace 'Chapter' if different base type
  sections: ProcessedSection[];
}

interface ProcessedStudyGuideData extends Omit<StudyGuideData, 'chapters'> {
  // Replace 'StudyGuideData' if different base type
  chapters: ProcessedChapter[];
}

interface ConsolidatedResultsResponse {
  submission: QuizResults;
  mastery_thresholds?: {
    pass_threshold: number;
    mastery_threshold: number;
  };
  mastery_threshold?: number;
  can_retry?: boolean;
  attempts_remaining?: number;
  topic_mastery?: {
    current_score: number;
    is_mastered: boolean;
  };
  attempt_number?: number;
  mastered?: boolean;
  needs_remediation?: boolean;
}

// Add this interface to handle the result_id property
interface ResultsWithResultId extends QuizResults {
  result_id?: string;
}

const QuizResultsPage: React.FC = () => {
  const params = useParams();
  const testId = typeof params.testId === 'string' ? params.testId : '';
  const rawTitle = typeof params.title === 'string' ? params.title : '';
  const router = useRouter();

  // Fully decode the title parameter from the URL
  const title = useMemo(() => {
    let decoded = rawTitle;
    try {
      // Keep decoding until the string doesn't change anymore
      while (true) {
        const nextDecoded = decodeURIComponent(decoded);
        if (nextDecoded === decoded) {
          break;
        }
        decoded = nextDecoded;
      }
    } catch (e) {
      console.error('Error decoding title param:', e);
      // Fallback to the raw title if decoding fails unexpectedly
      return rawTitle;
    }
    return decoded;
  }, [rawTitle]);

  // Get submission ID from URL query parameters
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [retryLoading, setRetryLoading] = useState<boolean>(false);
  const supabase = createClient();

  // State for additional data from the consolidated endpoint
  const [masteryThresholds, setMasteryThresholds] = useState<{
    pass_threshold: number;
    mastery_threshold: number;
  } | null>(null);
  const [canRetry, setCanRetry] = useState<boolean>(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(0);
  const [topicMastery, setTopicMastery] = useState<{
    current_score: number;
    is_mastered: boolean;
  } | null>(null);

  // Initialize user ID and submission ID
  useEffect(() => {
    const initData = async () => {
      const authUserId = await getUserId();
      setUserId(authUserId);

      const urlParams = new URLSearchParams(window.location.search);
      const subId = urlParams.get('submission');
      setSubmissionId(subId);
    };

    initData();
  }, []);

  // Create the fetch key based on available parameters
  const fetchKey = useMemo(() => {
    if (!userId || !testId) return null;

    if (submissionId) {
      return ENDPOINTS.quizResultsWithData(testId, userId, submissionId);
    }

    return ENDPOINTS.testResults(userId, testId);
  }, [userId, testId, submissionId]);

  // Fetch data using SWR
  const { data, error, isLoading, mutate } = useSWR(fetchKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
    errorRetryCount: 3,
  });

  // Process data when it changes
  useEffect(() => {
    if (!data) return;

    // Check if we have the consolidated response format
    if (data && typeof data === 'object' && 'submission' in data) {
      // It's the consolidated response
      const consolidatedData = data as ConsolidatedResultsResponse;

      // Handle both mastery_thresholds object and direct mastery_threshold field
      if (consolidatedData.mastery_thresholds) {
        setMasteryThresholds(consolidatedData.mastery_thresholds);
      } else if (consolidatedData.mastery_threshold !== undefined) {
        setMasteryThresholds({
          pass_threshold: consolidatedData.mastery_threshold * 0.6, // Set pass threshold to 60% of mastery
          mastery_threshold: consolidatedData.mastery_threshold,
        });
      }

      setCanRetry(consolidatedData.can_retry || false);
      setAttemptsRemaining(consolidatedData.attempts_remaining || 0);
      setTopicMastery(consolidatedData.topic_mastery || null);
    }
  }, [data]);

  // Parse the results data from either format
  const results = useMemo(() => {
    if (!data) return null;

    let submissionData: QuizResults | null = null;

    if (typeof data === 'object' && 'submission' in data) {
      submissionData = (data as ConsolidatedResultsResponse).submission;
    } else {
      // Handle potential older format directly
      submissionData = data as QuizResults;
    }

    if (!submissionData) return null;

    // --- CORRECTED LOGIC TO GET QUESTIONS ---
    // Prioritize questions from the latest attempt in the attempts array
    let questions: QuizResults['questions'] = [];
    if (submissionData.attempts && submissionData.attempts.length > 0) {
      const latestAttempt =
        submissionData.attempts[submissionData.attempts.length - 1];
      questions = latestAttempt.questions || [];
    } else if (submissionData.questions) {
      // Fallback for older structure or if attempts array is missing/empty
      questions = submissionData.questions;
    }
    // --- END CORRECTION ---

    // Return the submission data with the correctly extracted questions
    return {
      ...submissionData,
      questions: questions, // Ensure questions array is correctly assigned
    };
  }, [data]);

  // Handle retry
  const handleRetry = async () => {
    // Use results?._id or results?.result_id as the primary source for previous_attempt_id
    const actualSubmissionId =
      results?._id || (results as ResultsWithResultId)?.result_id;

    if (!userId || !testId || !results?.study_guide_id || !actualSubmissionId) {
      toast.error(
        'Cannot retry test: Missing user, test, study guide, or submission information.'
      );
      console.error('Retry Pre-check Failed', {
        userId,
        testId,
        guideId: results?.study_guide_id,
        actualSubmissionId,
      });
      return;
    }

    setRetryLoading(true);
    try {
      // Use fetchWithAuth for consistency if needed, or keep direct fetch if preferred
      const token = await supabase.auth
        .getSession()
        .then((res) => res.data.session?.access_token);
      const response = await fetch(ENDPOINTS.retryTest, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          test_id: testId,
          study_guide_id: results.study_guide_id,
          previous_attempt_id: actualSubmissionId, // Pass the correct ID
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Retry error response:', errorData);
        throw new Error(errorData.message || 'Failed to process retry request');
      }

      const retryData = await response.json();

      if (!retryData.can_retry) {
        toast.warning(
          retryData.message || 'Cannot retry this test at the moment.'
        );
        setRetryLoading(false);
        return;
      }

      toast.success(
        retryData.message || 'Test retry initialized. Redirecting...'
      );

      // Navigate back to quiz page with retry parameters
      router.push(
        `/practice/guide/${encodeURIComponent(title)}/quiz/${testId}?retry=true&attempt=${retryData.attempt_number}&previous=${actualSubmissionId}`
      );
    } catch (err) {
      toast.error(
        `Failed to initialize retry: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
      console.error('Error retrying test:', err);
      setRetryLoading(false); // Ensure loading state is reset on error
    }
    // No need for finally block if navigation happens on success
  };

  // Process the study guide to add completion status, mastery status, and lock status to sections
  const processedGuide: ProcessedStudyGuideData | null =
    (data as ProcessedStudyGuideData) || null;

  // Helper function to find a section by title in the processed guide
  const findSectionByTitle = (
    guide: ProcessedStudyGuideData | null,
    sectionTitle: string
  ): ProcessedSection | null => {
    if (!guide) return null;

    for (const chapter of guide.chapters as ProcessedChapter[]) {
      for (const section of chapter.sections as ProcessedSection[]) {
        if (section.title === sectionTitle) {
          return section;
        }
      }
    }
    return null;
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href={`/practice/guide/${title}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Study Guide
          </Link>

          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quiz Results</h1>
              <p className="mt-2 text-gray-600">
                Review your answers and learn from the explanations
              </p>
            </div>

            {/* Add refresh button */}
            {!isLoading && (
              <Button
                variant="outline"
                onClick={() => mutate()}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            )}
          </div>

          {isLoading ? (
            <Loading size="lg" text="Loading results..." />
          ) : error ? (
            <div className="text-center p-6 bg-red-50 rounded-xl border border-red-200">
              <p className="text-base text-red-500">
                Error: Failed to fetch quiz results
              </p>
              <Button
                onClick={() => mutate()}
                className="mt-4"
                variant="default"
              >
                Try Again
              </Button>
            </div>
          ) : (
            results && (
              <>
                <div className="grid gap-6 md:grid-cols-4 mb-8">
                  <Card
                    className={cn(
                      'bg-white shadow-lg hover:shadow-xl transition-all duration-300',
                      'border-l-4 border-l-[var(--color-primary)]'
                    )}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">
                          Correct Answers
                        </h3>
                        <Trophy className="h-6 w-6 text-[var(--color-primary)]" />
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-gray-900">
                          {results.score}
                        </span>
                        <span className="ml-1 text-2xl text-gray-600">
                          / {results.questions?.length ?? 0}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={cn(
                      'bg-white shadow-lg hover:shadow-xl transition-all duration-300',
                      'border-l-4 border-l-yellow-500'
                    )}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">
                          Accuracy
                        </h3>
                        <Target className="h-6 w-6 text-yellow-500" />
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-gray-900">
                          {(results.accuracy || 0).toFixed(0)}%
                        </span>
                      </div>
                      {masteryThresholds && (
                        <div className="mt-2 text-xs text-gray-500">
                          Pass: {masteryThresholds.pass_threshold}% / Mastery:{' '}
                          {masteryThresholds.mastery_threshold}%
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card
                    className={cn(
                      'bg-white shadow-lg hover:shadow-xl transition-all duration-300',
                      'border-l-4',
                      'border-l-blue-500'
                    )}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">
                          Time Taken
                        </h3>
                        <Clock className="h-6 w-6 text-blue-500" />
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-gray-900">
                          {isNaN(results.time_taken) || results.time_taken === 0
                            ? (results.attempts?.[0]?.time_taken || 0).toFixed(
                                0
                              )
                            : Math.round(results.time_taken || 0)}
                        </span>
                        <span className="ml-2 text-gray-600">seconds</span>
                      </div>
                      {/* Add Retry button conditionally */}
                      {results.can_retry && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRetry}
                          disabled={retryLoading}
                          className="mt-4 w-full text-blue-600 border-blue-300 hover:bg-blue-50"
                        >
                          {retryLoading ? (
                            <>
                              <span className="mr-2">Loading...</span>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Retry Test ({results.attempts_remaining} left)
                            </>
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  <Card
                    className={cn(
                      'bg-white shadow-lg hover:shadow-xl transition-all duration-300',
                      'border-l-4',
                      'border-l-green-500'
                    )}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">
                          Status
                        </h3>
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-gray-900 capitalize">
                          {results.mastered
                            ? 'Mastered'
                            : results.review_recommended
                              ? 'Review'
                              : 'Incomplete'}
                        </span>
                      </div>
                      {!results.mastered && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 h-1.5 rounded-full">
                            <div
                              className="h-1.5 bg-purple-500 rounded-full"
                              style={{
                                width: `${Math.min(100, ((results.attempt_number || 1) / 3) * 100)}%`,
                              }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {results.attempts_remaining === 0
                              ? 'No attempts remaining'
                              : ``}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Conditionally render Remediation Button */}
                {(results.needs_remediation || results.remediation_viewed) &&
                  (results?._id ||
                    (results as ResultsWithResultId)?.result_id) &&
                  results?.study_guide_id && (
                    <div className="mb-6 text-center">
                      <Link
                        href={`/practice/guide/${encodeURIComponent(title)}/quiz/${testId}/remediation?submission=${results._id || (results as ResultsWithResultId).result_id}&study_guide_id=${results.study_guide_id}`}
                        passHref
                      >
                        <Button variant="secondary" size="lg">
                          <BookOpen className="mr-2 h-5 w-5" />
                          View Remediation Material
                        </Button>
                      </Link>
                    </div>
                  )}

                {/* Add topic mastery info if available */}
                {topicMastery && (
                  <Card className="mb-6 bg-white shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-md font-semibold">
                            Topic Mastery
                          </h3>
                          <p className="text-sm text-gray-600">
                            Current mastery level:{' '}
                            {(topicMastery.current_score || 0).toFixed(0)}%
                          </p>
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-sm ${
                            topicMastery.is_mastered
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {topicMastery.is_mastered
                            ? 'Mastered'
                            : 'In Progress'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-6">
                  {results.questions?.map((q: QuizQuestion, index) => (
                    <ResultCard
                      questionNumber={index + 1}
                      userId={userId ?? ''}
                      testId={testId ?? ''}
                      key={q.question_id}
                      questionId={q.question_id}
                      questionType={q.question_type as QuestionType}
                      question={q.question ?? ''}
                      userAnswer={q.user_answer ?? ''}
                      userAnswerText={q.user_answer_text ?? undefined}
                      correctAnswer={q.correct_answer ?? undefined}
                      isCorrect={q.is_correct ?? false}
                      explanation={q.explanation ?? ''}
                      sourcePage={q.source_page ?? undefined}
                      sourceText={q.source_text ?? undefined}
                      reference_part={q.reference_part ?? undefined}
                      feedback={q.feedback ?? undefined}
                      confidenceLevel={q.confidence_level ?? undefined}
                      imageData={q.image_data ?? null}
                    />
                  ))}
                </div>
              </>
            )
          )}
        </main>
      </div>
    </MathJaxContext>
  );
};

export default QuizResultsPage;
