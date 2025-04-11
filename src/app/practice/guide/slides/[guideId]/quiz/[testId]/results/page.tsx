'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { fetchWithAuth } from '@/app/auth/fetchWithAuth';
import { Header } from '@/components/layout/header';
import Link from 'next/link';
import { getUserId } from '@/app/auth/getUserId';
import { Loading } from '@/components/ui/loading';
import { ENDPOINTS, API_URL } from '@/config/urls';
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
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import { AIChat } from '@/components/practice/AIChat';
import { QuizQuestion, QuizResults } from '@/interfaces/test';
import { ResultCard } from '@/components/practice/ResultCard';
import { MathJaxContext } from 'better-react-mathjax';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import RemediationChoice from '@/components/practice/RemediationChoice';

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

const SlidesQuizResultsPage: React.FC = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const submissionId = searchParams.get('submission') || '';
  const testId = typeof params.testId === 'string' ? params.testId : '';
  const guideId = typeof params.guideId === 'string' ? params.guideId : '';
  const router = useRouter();
  const supabase = createClient();

  const [results, setResults] = useState<QuizResults | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryLoading, setRetryLoading] = useState<boolean>(false);
  const [masteryThreshold, setMasteryThreshold] = useState<number>(80);
  const [actualSubmissionId, setActualSubmissionId] = useState<string>('');

  useEffect(() => {
    const fetchResults = async (): Promise<void> => {
      if (!testId) return;

      try {
        setLoading(true);
        const authUserId = await getUserId();
        if (!authUserId) throw new Error('User authentication required');

        // Get submission ID from URL or directly from submissionId variable
        const subId = submissionId || searchParams.get('submission') || '';

        // Log the endpoint URL for debugging
        const endpointUrl = ENDPOINTS.quizResultsWithData(
          testId,
          authUserId,
          subId
        );
        console.log('Fetching quiz results from:', endpointUrl);

        if (!subId) {
          // If no submission ID is available, fall back to the old endpoint
          console.log(
            'No submission ID found in URL, falling back to testResults endpoint'
          );
          const response = await fetchWithAuth(
            ENDPOINTS.testResults(authUserId, testId)
          );

          if (!response.ok) {
            throw new Error('Failed to fetch results');
          }

          const data: QuizResults = await response.json();
          console.log('Fallback endpoint response:', data);

          // Check if we got a submission ID from the fallback endpoint
          const fallbackSubmissionId = data.submission_id || '';
          console.log('Fallback submission ID:', fallbackSubmissionId);

          // Set the actualSubmissionId from the data if available
          setActualSubmissionId(fallbackSubmissionId);

          setResults(data);

          // Also fetch mastery thresholds
          const thresholdsResponse = await fetchWithAuth(
            ENDPOINTS.masteryThresholds
          );
          if (thresholdsResponse.ok) {
            const thresholdsData = await thresholdsResponse.json();
            setMasteryThreshold(thresholdsData.accuracy_threshold || 80);
          }

          return;
        }

        // Use the new consolidated endpoint
        const response = await fetchWithAuth(endpointUrl);

        if (!response.ok) {
          throw new Error('Failed to fetch results');
        }

        const data = await response.json();
        console.log('Received consolidated response:', data);

        // Extract submission ID from the response data
        const responseSubmissionId =
          subId || data.submission?.submission_id || '';
        console.log('Response submission ID:', responseSubmissionId);

        // Store the submission ID
        setActualSubmissionId(responseSubmissionId);

        // Prepare the result data, ensuring questions are available
        const processedResults = {
          ...data.submission,
          // Extract questions from the most recent attempt if they exist
          questions: data.submission.attempts?.[0]?.questions || [],
          // Ensure submission_id is set
          submission_id: responseSubmissionId,
        };

        // Set state from the consolidated response
        setResults(processedResults);
        setMasteryThreshold(data.mastery_threshold || 80);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'An error occurred';
        console.error('Error fetching quiz results:', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    void fetchResults();
  }, [testId, submissionId, searchParams]);

  const retryTest = async () => {
    if (!testId || !results || !guideId) return;

    // 1. Reliably get the submission ID from available sources
    let submissionIdToUse =
      actualSubmissionId ||
      results.submission_id ||
      (results as any).result_id || // Check for result_id (from user feedback)
      (results as any)._id || // Check for _id as another possibility
      searchParams.get('submission') ||
      '';

    // If no ID is found after checking all sources, show error and stop.
    if (!submissionIdToUse) {
      console.error('Could not determine submission ID for retry.', {
        actualSubmissionId,
        resultsSubmissionId: results.submission_id,
        resultsResultId: (results as any).result_id,
        results_id: (results as any)._id,
        searchParamsSubmission: searchParams.get('submission'),
      });
      toast.error('Cannot retry test: Missing submission context.');
      setError('Missing submission context for retry');
      return;
    }

    try {
      setRetryLoading(true);

      const userData = await supabase.auth.getUser();
      const userId = userData.data?.user?.id;
      if (!userId) throw new Error('User authentication required');

      const token = await supabase.auth
        .getSession()
        .then((res) => res.data.session?.access_token);

      console.log('Retrying test with submission ID:', submissionIdToUse);

      const response = await fetch(ENDPOINTS.retryTest, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          test_id: testId,
          study_guide_id: guideId,
          previous_attempt_id: submissionIdToUse,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.can_retry) {
          toast.success('Starting new test attempt');
          router.push(
            `/practice/guide/slides/${guideId}/quiz/${testId}?retry=true&attempt=${data.attempt_number}&previous=${submissionIdToUse}`
          );
        } else if (data.needs_remediation) {
          toast.warning('Please review the remediation material first');
          router.push(
            `/practice/guide/slides/${guideId}/quiz/${testId}/remediation?submission=${submissionIdToUse}`
          );
        } else {
          toast.info(data.message || 'Cannot retry test at this time');
        }
      } else {
        throw new Error(data.message || 'Failed to process retry request');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setRetryLoading(false);
    }
  };

  const getSubmissionId = () => {
    return (
      actualSubmissionId ||
      results?.submission_id ||
      '' ||
      searchParams.get('submission') ||
      ''
    );
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href={`/practice/guide/slides/${encodeURIComponent(guideId)}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Study Guide
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Quiz Results</h1>
            <p className="mt-2 text-gray-600">
              Review your answers and learn from the explanations
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative w-20 h-20 mb-4">
                <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-purple-600 rounded-full animate-spin"></div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Loading Results
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  We&apos;re preparing your quiz results and feedback. This
                  should only take a moment...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center p-6 bg-red-50 rounded-xl border border-red-200">
              <p className="text-base text-red-500">Error: {error}</p>
              <Button
                onClick={() => window.location.reload()}
                className="mt-4"
                variant="default"
              >
                Try Again
              </Button>
            </div>
          ) : (
            results && (
              <>
                <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6 mb-8">
                  <Card
                    className={cn(
                      'bg-white shadow-lg hover:shadow-xl transition-all duration-300',
                      'border-l-4 border-l-blue-500'
                    )}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">
                          Score
                        </h3>
                        <Trophy className="h-6 w-6 text-blue-500" />
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-gray-900">
                          {results.score}
                        </span>
                        <span className="ml-2 text-gray-600">points</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={cn(
                      'bg-white shadow-lg hover:shadow-xl transition-all duration-300',
                      'border-l-4',
                      results.accuracy >= masteryThreshold
                        ? 'border-l-green-500'
                        : 'border-l-yellow-500'
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
                          {results.accuracy.toFixed(0)}%
                        </span>
                      </div>
                      <div className="mt-1">
                        <div className="w-full bg-gray-200 h-1.5 rounded-full mt-1">
                          <div
                            className={cn(
                              'h-1.5 rounded-full',
                              results.accuracy >= masteryThreshold
                                ? 'bg-green-500'
                                : 'bg-yellow-500'
                            )}
                            style={{
                              width: `${Math.min(100, results.accuracy)}%`,
                            }}
                          ></div>
                          <div
                            className="w-1 h-3 bg-red-500 rounded-sm relative"
                            style={{
                              marginLeft: `${masteryThreshold}%`,
                              marginTop: '-2px',
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Mastery threshold: {masteryThreshold}%
                        </p>
                      </div>
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
                          {isNaN(results.time_taken)
                            ? (results.attempts?.[0]?.time_taken || 0).toFixed(
                                0
                              )
                            : Math.round(results.time_taken)}
                        </span>
                        <span className="ml-2 text-gray-600">seconds</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={cn(
                      'bg-white shadow-lg hover:shadow-xl transition-all duration-300',
                      'border-l-4',
                      results.mastered
                        ? 'border-l-green-500'
                        : 'border-l-amber-500'
                    )}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">
                          Mastery
                        </h3>
                        {results.mastered ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-6 w-6 text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-2xl font-bold text-gray-900 capitalize">
                          {results.mastered ? 'Achieved' : 'Not Yet'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={cn(
                      'bg-white shadow-lg hover:shadow-xl transition-all duration-300',
                      'border-l-4',
                      'border-l-purple-500'
                    )}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">
                          Attempt
                        </h3>
                        <RefreshCw className="h-6 w-6 text-purple-500" />
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-gray-900">
                          {results.attempt_number || 1}
                        </span>
                        {results.attempts_remaining !== undefined && (
                          <span className="ml-2 text-gray-600 text-sm">
                            of {3}
                          </span>
                        )}
                      </div>
                      {!results.mastered && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 h-1.5 rounded-full">
                            <div
                              className="h-1.5 bg-purple-500 rounded-full"
                              style={{
                                width: `${((results.attempt_number || 1) / 3) * 100}%`,
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

                  <Card
                    className={cn(
                      'bg-white shadow-lg hover:shadow-xl transition-all duration-300',
                      'border-l-4',
                      results.needs_remediation
                        ? 'border-l-amber-500'
                        : results.remediation_viewed
                          ? 'border-l-green-500'
                          : 'border-l-blue-500'
                    )}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">
                          Status
                        </h3>
                        {results.needs_remediation ? (
                          <BookOpen className="h-6 w-6 text-amber-500" />
                        ) : results.remediation_viewed ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                          <RefreshCw className="h-6 w-6 text-blue-500" />
                        )}
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-xl font-bold text-gray-900 capitalize">
                          {results.needs_remediation
                            ? 'Review Needed'
                            : results.remediation_viewed
                              ? 'Ready to Retry'
                              : results.can_retry
                                ? 'Can Retry'
                                : 'Complete'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Conditionally render Remediation Button (Added) */}
                {(results.needs_remediation || results.remediation_viewed) &&
                  (results.submission_id ||
                    (results as any).result_id ||
                    (results as any)._id) && // Check multiple ID fields
                  guideId && (
                    <div className="mb-6 text-center">
                      <Link
                        href={`/practice/guide/slides/${guideId}/quiz/${testId}/remediation?submission=${(results as any).result_id || results.submission_id || (results as any)._id}&study_guide_id=${guideId}`}
                        passHref
                      >
                        <Button variant="secondary" size="lg">
                          <BookOpen className="mr-2 h-5 w-5" />
                          View Remediation Material
                        </Button>
                      </Link>
                    </div>
                  )}

                {/* Enhanced retry button and remediation guidance section */}
                <div className="mb-8 flex flex-col gap-4">
                  {results.mastered ? (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-center gap-4">
                      <CheckCircle className="h-8 w-8 text-green-500 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-green-700">
                          Mastery Achieved!
                        </h3>
                        <p className="text-green-600">
                          Congratulations! You&rsquo;ve demonstrated mastery of
                          this topic. You can now proceed to the next topics.
                        </p>
                      </div>
                    </div>
                  ) : results.needs_remediation ? (
                    <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
                      <div className="flex items-start gap-4">
                        <AlertTriangle className="h-8 w-8 text-yellow-500 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-yellow-700 text-xl mb-2">
                            Review Recommendation
                          </h3>
                          <p className="text-yellow-600 mb-4">
                            After 3 attempts, your highest score was{' '}
                            {results.accuracy.toFixed(0)}% (Mastery requires{' '}
                            {masteryThreshold}%). According to Bloom's Mastery
                            Theory, you must review the remediation materials
                            and then achieve mastery on a retry to proceed to
                            the next test.
                          </p>
                          <p className="text-yellow-700 font-medium mb-4">
                            Please review the materials and then retry the test.
                            You must achieve at least {masteryThreshold}% to
                            unlock the next test.
                          </p>
                          <div className="flex flex-wrap gap-3">
                            <Button
                              onClick={() =>
                                router.push(
                                  `/practice/guide/slides/${guideId}/quiz/${testId}/remediation?submission=${(results as any).result_id || results.submission_id || (results as any)._id}&study_guide_id=${guideId}`
                                )
                              }
                              className="bg-yellow-500 hover:bg-yellow-600 text-white"
                            >
                              <BookOpen className="mr-2 h-4 w-4" />
                              Review Remediation Materials
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : results.can_retry !== false ? (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center gap-4">
                      <RefreshCw className="h-8 w-8 text-blue-500 flex-shrink-0" />
                      <div className="flex-grow">
                        <h3 className="font-semibold text-blue-700">
                          You can retry this test
                        </h3>
                        <p className="text-blue-600">
                          {results.mastered
                            ? "You've already achieved mastery! You can still retry if you want to improve your score."
                            : `You haven't achieved mastery yet (need ${masteryThreshold}% accuracy). Review your answers below and try again.`}
                        </p>
                        {results.remediation_viewed && (
                          <p className="text-green-600 mt-1 text-sm">
                            <CheckCircle2 className="h-4 w-4 inline mr-1" />
                            Remediation material reviewed
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={retryTest}
                        disabled={retryLoading}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        {retryLoading ? (
                          <>
                            <span className="mr-2">Loading</span>
                            <span className="animate-spin">⟳</span>
                          </>
                        ) : (
                          'Retry Test'
                        )}
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-6">
                  {results.questions?.map((question, index) => (
                    <ResultCard
                      key={question.question_id}
                      questionNumber={index + 1}
                      isCorrect={question.is_correct === true}
                      userAnswer={
                        question.question_type === 'multiple_choice' &&
                        question.user_answer &&
                        question.choices
                          ? `${question.user_answer}. ${question.choices[question.user_answer]}`
                          : question.user_answer || ''
                      }
                      userAnswerText={
                        question.user_answer_text ||
                        (question.question_type === 'short_answer'
                          ? 'No answer provided'
                          : '')
                      }
                      correctAnswer={
                        question.question_type === 'multiple_choice' &&
                        question.correct_answer &&
                        question.choices
                          ? `${question.correct_answer}. ${question.choices[question.correct_answer]}`
                          : question.question_type === 'short_answer'
                            ? question.ideal_answer || ''
                            : question.correct_answer_text || ''
                      }
                      explanation={question.explanation || ''}
                      userId={results.user_id}
                      testId={testId}
                      questionId={question.question_id}
                      questionType={question.question_type}
                      question={question.question}
                      sourcePage={question.source_page}
                      sourceText={question.source_text}
                      reference_part={question.reference_part}
                      feedback={question.feedback}
                      confidenceLevel={question.confidence_level}
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

export default SlidesQuizResultsPage;
