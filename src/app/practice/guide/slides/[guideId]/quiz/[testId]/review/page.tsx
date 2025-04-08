'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { fetchWithAuth } from '@/app/auth/fetchWithAuth';
import { Header } from '@/components/layout/header';
import Link from 'next/link';
import { getUserId } from '@/app/auth/getUserId';
import { ENDPOINTS } from '@/config/urls';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  CheckCircle,
  XCircle,
  BookOpen,
  ArrowRight,
  CircleX,
  AlertTriangle,
} from 'lucide-react';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import { toast } from 'sonner';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { createClient } from '@/utils/supabase/client';

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
  },
  svg: { fontCache: 'global' },
  options: { enableMenu: false },
};

// Helper function to render with KaTeX
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

// Helper function to determine if text is simple LaTeX
const isSimpleLatex = (text: string): boolean => {
  // Check if text contains only basic LaTeX commands and symbols
  const simpleLatexPattern = /^[a-zA-Z0-9\s\+\-\*\/\^\{\}\(\)\[\]\_\$\\]+$/;
  return simpleLatexPattern.test(text);
};

// Helper function to render text with LaTeX
const renderTextWithLatex = (text: string) => {
  if (!text) return null;

  // First, unescape all double backslashes
  let processedText = text.replace(/\\\\/g, '\\');

  // Handle special LaTeX commands and symbols
  processedText = processedText
    // Handle \mathbb{R} notation
    .replace(/\\mathbb\{([^}]+)\}/g, (_, p1) => `\\mathbb{${p1}}`)
    // Handle subscripts and superscripts with multiple characters
    .replace(/_{([^}]+)}/g, '_{$1}')
    .replace(/\^{([^}]+)}/g, '^{$1}')
    // Handle special spacing around operators
    .replace(/\\sum(?![a-zA-Z])/g, '\\sum\\limits')
    .replace(/\\int(?![a-zA-Z])/g, '\\int\\limits')
    .replace(/\\prod(?![a-zA-Z])/g, '\\prod\\limits')
    // Handle spacing around vertical bars and other delimiters
    .replace(/\|/g, '\\,|\\,')
    .replace(/\\mid/g, '\\,|\\,')
    // Handle matrix transpose
    .replace(/\\T(?![a-zA-Z])/g, '^{\\intercal}')
    // Handle common statistical notation
    .replace(/\\Var/g, '\\operatorname{Var}')
    .replace(/\\Bias/g, '\\operatorname{Bias}')
    .replace(/\\MSE/g, '\\operatorname{MSE}')
    .replace(/\\EPE/g, '\\operatorname{EPE}')
    // Handle escaped curly braces
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}');

  // Split text by existing LaTeX delimiters while preserving the delimiters
  const parts = processedText.split(
    /(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$|\\\([^)]*?\\\)|\\\[[\s\S]*?\\\])/g
  );

  // Generate a unique key for each part
  const hashString = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36); // Convert to base-36 for shorter strings
  };

  return parts.map((part, index) => {
    // Generate a more unique key using content hash
    const key = `${index}-${hashString(part)}`;

    if (
      part.startsWith('$') ||
      part.startsWith('\\(') ||
      part.startsWith('\\[')
    ) {
      // Remove the delimiters
      let latex = part
        .replace(/^\$\$|\$\$$|^\$|\$$|^\\\(|\\\)$|^\\\[|\\\]$/g, '')
        .trim();

      const isDisplay = part.startsWith('$$') || part.startsWith('\\[');

      // Use KaTeX for simple expressions and MathJax for complex ones
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

      // Wrap the LaTeX in appropriate delimiters for MathJax
      latex = isDisplay ? `$$${latex}$$` : `$${latex}$`;

      return (
        <MathJax key={key} inline={!isDisplay} dynamic={true}>
          {latex}
        </MathJax>
      );
    }

    // Check if the part contains any LaTeX-like content
    if (part.includes('\\') || /[_^{}]/.test(part)) {
      // Use KaTeX for simple expressions
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

      // Use MathJax for complex expressions
      return (
        <MathJax key={key} inline={true} dynamic={true}>
          {`$${part}$`}
        </MathJax>
      );
    }

    return <span key={key}>{part}</span>;
  });
};

const QuizReviewPage: React.FC = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const submissionId = searchParams.get('submission') || '';
  const testId = typeof params.testId === 'string' ? params.testId : '';
  const guideId = typeof params.guideId === 'string' ? params.guideId : '';
  const router = useRouter();
  const supabase = createClient();

  const [reviewData, setReviewData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [markingReviewViewed, setMarkingReviewViewed] =
    useState<boolean>(false);

  useEffect(() => {
    const fetchReviewMaterials = async (): Promise<void> => {
      if (!testId || !submissionId) {
        setError('Missing test ID or submission ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const authUserId = await getUserId();
        if (!authUserId) throw new Error('User authentication required');

        // Fetch the topic ID from the results if needed
        const resultsResponse = await fetchWithAuth(
          ENDPOINTS.quizResultsWithData(testId, authUserId, submissionId)
        );

        if (!resultsResponse.ok) {
          throw new Error('Failed to fetch test information');
        }

        const resultsData = await resultsResponse.json();
        const topicId = resultsData.submission?.section_title;

        if (!topicId) {
          throw new Error('Could not determine topic ID for this test');
        }

        // Now fetch the review materials
        const reviewResponse = await fetchWithAuth(
          ENDPOINTS.getReviewMaterials(
            authUserId,
            guideId,
            topicId,
            submissionId
          )
        );

        if (!reviewResponse.ok) {
          throw new Error('Failed to fetch review materials');
        }

        const data = await reviewResponse.json();
        setReviewData(data);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'An error occurred';
        console.error('Error fetching review materials:', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    void fetchReviewMaterials();
  }, [testId, submissionId, guideId]);

  const markAsViewed = async () => {
    if (!reviewData) return;

    try {
      setMarkingReviewViewed(true);

      const userId = await getUserId();
      if (!userId) throw new Error('User authentication required');

      const response = await fetchWithAuth(
        ENDPOINTS.markReviewViewed(
          userId,
          reviewData.study_guide_id,
          reviewData.topic_id,
          reviewData.submission_id
        ),
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('Failed to mark review as viewed');
      }

      toast.success('Review marked as viewed');

      // Navigate back to the study guide
      router.push(`/practice/guide/slides/${guideId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setMarkingReviewViewed(false);
    }
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href={`/practice/guide/slides/${encodeURIComponent(guideId)}/quiz/${testId}/results?submission=${submissionId}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Test Results
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Review Materials
            </h1>
            <p className="mt-2 text-gray-600">
              Review these key concepts to improve your understanding
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative w-20 h-20 mb-4">
                <div className="absolute inset-0 border-4 border-yellow-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-yellow-600 rounded-full animate-spin"></div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Loading Review Materials
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  We&apos;re preparing personalized review materials based on
                  your test performance...
                </p>
              </div>
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
          ) : reviewData ? (
            <>
              {/* Status card */}
              <div className="mb-8">
                <Card className="bg-yellow-50 border border-yellow-200">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <BookOpen className="h-8 w-8 text-yellow-500 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-yellow-700 text-xl">
                          Review Recommended
                        </h3>
                        <p className="text-yellow-600 mt-2">
                          After multiple attempts, we recommend reviewing these
                          concepts before moving on to the next test. Once
                          you've reviewed these materials, you can continue to
                          the next test in your learning path.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Knowledge gaps */}
              {reviewData.knowledge_gaps &&
                reviewData.knowledge_gaps.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                      Areas to Focus On
                    </h2>
                    <Card className="bg-white">
                      <CardContent className="p-6">
                        <ul className="space-y-2">
                          {reviewData.knowledge_gaps.map(
                            (gap: string, index: number) => (
                              <li
                                key={index}
                                className="flex items-start gap-2"
                              >
                                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <span className="text-gray-700">{gap}</span>
                              </li>
                            )
                          )}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                )}

              {/* Review content */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Topic Review Materials
                </h2>
                <Card className="bg-white">
                  <CardContent className="p-6 prose prose-blue max-w-none">
                    {reviewData.content && (
                      <div className="text-gray-700">
                        {reviewData.content
                          .split('\n')
                          .map((paragraph: string, index: number) => {
                            // Handle headings
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
                              // Handle list items
                              return (
                                <li
                                  key={index}
                                  className="ml-5 mb-1 text-gray-700"
                                >
                                  {renderTextWithLatex(paragraph.substring(2))}
                                </li>
                              );
                            } else if (paragraph.trim() === '') {
                              // Handle empty lines
                              return <br key={index} />;
                            } else {
                              // Handle regular paragraphs
                              return (
                                <p key={index} className="text-gray-700 mb-3">
                                  {renderTextWithLatex(paragraph)}
                                </p>
                              );
                            }
                          })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end mt-8">
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(
                      `/practice/guide/slides/${guideId}/quiz/${testId}/results?submission=${submissionId}`
                    )
                  }
                >
                  Return to Results
                </Button>
                <Button
                  className="bg-yellow-500 hover:bg-yellow-600 text-white"
                  onClick={markAsViewed}
                  disabled={markingReviewViewed}
                >
                  {markingReviewViewed ? (
                    <>Processing...</>
                  ) : (
                    <>
                      Mark as Reviewed & Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center p-6 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-base text-gray-500">
                No review materials available.
              </p>
              <Button
                onClick={() => router.push(`/practice/guide/slides/${guideId}`)}
                className="mt-4"
                variant="default"
              >
                Return to Study Guide
              </Button>
            </div>
          )}
        </main>
      </div>
    </MathJaxContext>
  );
};

export default QuizReviewPage;
