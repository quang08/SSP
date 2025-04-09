'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  BookOpen,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  markRemediationViewed,
  rateRemediation,
  retryTest,
} from '@/utils/remediation';

// MathJax configuration (same as slides version)
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
  },
  svg: { fontCache: 'global' },
  options: { enableMenu: false },
};

// Helper function to render with KaTeX (same as slides version)
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

// Helper function to determine if text is simple LaTeX (same as slides version)
const isSimpleLatex = (text: string): boolean => {
  const simpleLatexPattern = /^[a-zA-Z0-9\s\+\-\*\/\^\{\}\(\)\[\]\_\$\\]+$/;
  return simpleLatexPattern.test(text);
};

// Helper function to render text with LaTeX (same as slides version)
const renderTextWithLatex = (text: string) => {
  if (!text) return null;

  let processedText = text.replace(/\\\\/g, '\\');
  processedText = processedText
    .replace(/\\mathbb\{([^}]+)\}/g, (_, p1) => `\\mathbb{${p1}}`)
    .replace(/_{([^}]+)}/g, '_{$1}')
    .replace(/\^{([^}]+)}/g, '^{$1}')
    .replace(/\\sum(?![a-zA-Z])/g, '\\sum\\limits')
    .replace(/\\int(?![a-zA-Z])/g, '\\int\\limits')
    .replace(/\\prod(?![a-zA-Z])/g, '\\prod\\limits')
    .replace(/\|/g, '\\,|\\,')
    .replace(/\\mid/g, '\\,|\\,')
    .replace(/\\T(?![a-zA-Z])/g, '^{\\intercal}')
    .replace(/\\Var/g, '\\operatorname{Var}')
    .replace(/\\Bias/g, '\\operatorname{Bias}')
    .replace(/\\MSE/g, '\\operatorname{MSE}')
    .replace(/\\EPE/g, '\\operatorname{EPE}')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}');

  const parts = processedText.split(
    /(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$|\\\([^)]*?\\\)|\\\[[\s\S]*?\\\])/g
  );

  const hashString = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  };

  return parts.map((part, index) => {
    const key = `${index}-${hashString(part)}`;
    if (
      part.startsWith('$') ||
      part.startsWith('\\(') ||
      part.startsWith('\\[')
    ) {
      let latex = part
        .replace(/^\$\$|\$\$$|^\$|\$$|^\\\(|\\\)$|^\\\[|\\\]$/g, '')
        .trim();
      const isDisplay = part.startsWith('$$') || part.startsWith('\\[');
      if (isSimpleLatex(latex)) {
        return (
          <span
            key={key}
            dangerouslySetInnerHTML={{
              __html: renderWithKatex(latex, isDisplay),
            }}
          />
        );
      }
      latex = isDisplay ? `$$${latex}$$` : `$${latex}$`;
      return (
        <MathJax key={key} inline={!isDisplay} dynamic={true}>
          {latex}
        </MathJax>
      );
    }
    if (part.includes('\\') || /[_^{}]/.test(part)) {
      if (isSimpleLatex(part)) {
        return (
          <span
            key={key}
            dangerouslySetInnerHTML={{
              __html: renderWithKatex(part, false),
            }}
          />
        );
      }
      return (
        <MathJax key={key} inline={true} dynamic={true}>
          {`$${part}$`}
        </MathJax>
      );
    }
    return <span key={key}>{part}</span>;
  });
};

// Define interfaces for remediation content (same as slides version)
interface RemediationContent {
  remediation_id: string;
  content: string;
  created_at: string;
  concepts: string[];
  incorrect_questions: Array<{
    question: string;
    user_answer?: string;
    correct_answer: string;
  }>;
  test_id: string;
  viewed: boolean;
  helpful?: boolean;
  attempt_number: number;
  mastery_required: number;
}

const BookRemediationPage: React.FC = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const submissionId = searchParams.get('submission') || '';
  const studyGuideId = searchParams.get('study_guide_id') || ''; // Get study_guide_id from query params
  const testId = typeof params.testId === 'string' ? params.testId : '';
  const title = typeof params.title === 'string' ? params.title : ''; // Use title for book guides
  const router = useRouter();
  const supabase = createClient();

  const [remediation, setRemediation] = useState<RemediationContent | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMarked, setViewMarked] = useState<boolean>(false);
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);

  useEffect(() => {
    const fetchRemediation = async (): Promise<void> => {
      if (!testId || !submissionId) return;

      try {
        setLoading(true);

        const userData = await supabase.auth.getUser();
        const userId = userData.data?.user?.id;

        if (!userId) {
          throw new Error('User authentication required');
        }

        const token = await supabase.auth
          .getSession()
          .then((res) => res.data.session?.access_token);

        // Make the remediation request with all required fields
        const response = await fetch(ENDPOINTS.getRemediation, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            test_id: testId,
            previous_attempt_id: submissionId,
            study_guide_id: studyGuideId, // Pass study_guide_id explicitly
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || 'Failed to fetch remediation content'
          );
        }

        const data = await response.json();
        setRemediation(data.remediation_content);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'An error occurred';
        setError(errorMessage);
        toast.error(`Error: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    void fetchRemediation();
  }, [testId, submissionId, studyGuideId]); // Add studyGuideId dependency

  // Mark remediation as viewed when component mounts (same as slides)
  useEffect(() => {
    const markAsViewed = async () => {
      if (remediation?.remediation_id && !remediation.viewed && !viewMarked) {
        const success = await markRemediationViewed(remediation.remediation_id);
        if (success) {
          setViewMarked(true);
          setRemediation((prev) => (prev ? { ...prev, viewed: true } : null));
        }
      }
    };

    void markAsViewed();
  }, [remediation, viewMarked]);

  const handleRating = async (wasHelpful: boolean) => {
    if (!remediation?.remediation_id) return;

    try {
      setSubmittingFeedback(true);
      const success = await rateRemediation(
        remediation.remediation_id,
        wasHelpful
      );

      if (success) {
        setRemediation((prev) =>
          prev ? { ...prev, helpful: wasHelpful } : null
        );
      }
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleRetry = async () => {
    if (!testId || !submissionId || !studyGuideId) {
      // Check for studyGuideId
      toast.error('Missing necessary information to retry the test.');
      return;
    }
    await retryTest(testId, submissionId, studyGuideId); // Pass studyGuideId
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Adjusted Backlink */}
          <Link
            href={`/practice/guide/${encodeURIComponent(title)}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Study Guide
          </Link>

          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Remediation Material
              </h1>
              <p className="mt-2 text-gray-600">
                Review this content to help you master the topic
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loading size="lg" text="Loading remediation content..." />
            </div>
          ) : error ? (
            <div className="text-center p-6 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-base text-red-500 mb-4">Error: {error}</p>
              <Button
                onClick={() => window.location.reload()}
                className="mt-4"
                variant="default"
              >
                Try Again
              </Button>
            </div>
          ) : remediation ? (
            <div className="space-y-8">
              {/* Status Card */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                    <h2 className="text-xl font-semibold text-blue-800">
                      Remediation for Attempt {remediation.attempt_number}
                    </h2>
                  </div>
                  <p className="text-blue-700 mb-2">
                    After reviewing this material, you&rsquo;ll be able to retry
                    the test. Try to understand the concepts clearly before your
                    next attempt.
                  </p>
                  <p className="text-sm text-blue-600 mb-4">
                    <span className="font-medium">Required for mastery:</span>{' '}
                    Score at least{' '}
                    {(remediation.mastery_required * 100).toFixed(0)}% on your
                    next attempt.
                  </p>
                  {viewMarked && (
                    <div className="flex items-center gap-2 text-green-600 mb-3">
                      <Eye className="h-4 w-4" />
                      <span className="text-sm">
                        Marked as viewed on {new Date().toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-gray-700">Was this helpful?</span>
                    <Button
                      onClick={() => handleRating(true)}
                      disabled={
                        submittingFeedback || remediation.helpful === true
                      }
                      variant="outline"
                      size="sm"
                      className={cn(
                        'border-green-300 hover:border-green-500',
                        remediation.helpful === true &&
                          'bg-green-100 text-green-700'
                      )}
                    >
                      <ThumbsUp
                        className={cn(
                          'h-4 w-4 mr-2',
                          remediation.helpful === true
                            ? 'text-green-600'
                            : 'text-gray-400'
                        )}
                      />
                      Yes
                    </Button>
                    <Button
                      onClick={() => handleRating(false)}
                      disabled={
                        submittingFeedback || remediation.helpful === false
                      }
                      variant="outline"
                      size="sm"
                      className={cn(
                        'border-red-300 hover:border-red-500',
                        remediation.helpful === false &&
                          'bg-red-100 text-red-700'
                      )}
                    >
                      <ThumbsDown
                        className={cn(
                          'h-4 w-4 mr-2',
                          remediation.helpful === false
                            ? 'text-red-600'
                            : 'text-gray-400'
                        )}
                      />
                      No
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Key Concepts Section */}
              {remediation.concepts && remediation.concepts.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-3">
                      Key Concepts to Review
                    </h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {remediation.concepts.map((concept, idx) => (
                        <li key={idx} className="text-gray-700">
                          {renderTextWithLatex(concept)}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Remediation Content */}
              <Card>
                <CardContent className="p-6 bg-white shadow-lg">
                  <h3 className="font-semibold text-lg mb-4">
                    Learning Material
                  </h3>
                  <div className="prose prose-blue max-w-none">
                    {remediation.content && (
                      <div className="text-gray-700">
                        {remediation.content
                          .split('\n')
                          .map((paragraph: string, index: number) => {
                            if (paragraph.startsWith('# ')) {
                              return (
                                <h3
                                  key={index}
                                  className="text-xl font-bold text-gray-800 mt-4 mb-2"
                                >
                                  {renderTextWithLatex(paragraph.substring(2))}
                                </h3>
                              );
                            } else if (paragraph.startsWith('## ')) {
                              return (
                                <h4
                                  key={index}
                                  className="text-lg font-semibold text-gray-700 mt-3 mb-2"
                                >
                                  {renderTextWithLatex(paragraph.substring(3))}
                                </h4>
                              );
                            } else if (paragraph.startsWith('- ')) {
                              return (
                                <li
                                  key={index}
                                  className="ml-5 mb-1 text-gray-700"
                                >
                                  {renderTextWithLatex(paragraph.substring(2))}
                                </li>
                              );
                            } else if (paragraph.trim() === '') {
                              return <br key={index} />;
                            } else {
                              return (
                                <p key={index} className="text-gray-700 mb-3">
                                  {renderTextWithLatex(paragraph)}
                                </p>
                              );
                            }
                          })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Incorrect Questions */}
              {remediation.incorrect_questions &&
                remediation.incorrect_questions.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-4">
                        Questions You Missed
                      </h3>
                      <div className="space-y-5">
                        {remediation.incorrect_questions.map((item, index) => (
                          <div
                            key={index}
                            className="border-b pb-4 last:border-b-0 last:pb-0"
                          >
                            <p className="font-medium mb-2">
                              {renderTextWithLatex(item.question)}
                            </p>
                            <div className="grid grid-cols-1 gap-3 text-sm">
                              <div className="bg-red-50 p-3 rounded border border-red-200">
                                <span className="block text-red-700 font-medium">
                                  Your answer:
                                </span>
                                <span className="text-red-600">
                                  {renderTextWithLatex(
                                    item.user_answer || 'No answer provided'
                                  )}
                                </span>
                              </div>
                              <div className="bg-green-50 p-3 rounded border border-green-200">
                                <span className="block text-green-700 font-medium">
                                  Correct answer:
                                </span>
                                <span className="text-green-600">
                                  {renderTextWithLatex(item.correct_answer)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Action Buttons */}
              <div className="flex flex-col md:flex-row gap-4 justify-center pt-4">
                <Button
                  onClick={handleRetry}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium"
                  size="lg"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Retry Test
                </Button>
                {/* Adjusted Backlink */}
                <Link
                  href={`/practice/guide/${encodeURIComponent(title)}`}
                  className="flex items-center justify-center h-11 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  <BookOpen className="h-5 w-5 mr-2" />
                  Return to Study Guide
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center p-6 bg-yellow-50 rounded-xl border border-yellow-200">
              <p className="text-base text-yellow-700">
                No remediation content available.
              </p>
              {/* Adjusted Backlink */}
              <Link
                href={`/practice/guide/${encodeURIComponent(title)}`}
                className="mt-4 inline-flex items-center justify-center h-10 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Return to Study Guide
              </Link>
            </div>
          )}
        </main>
      </div>
    </MathJaxContext>
  );
};

export default BookRemediationPage;
