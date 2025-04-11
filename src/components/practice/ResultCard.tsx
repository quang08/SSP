import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  MessageCircle,
  X,
  BookOpen,
  LightbulbIcon,
  TrendingUp,
} from 'lucide-react';
import { AIChat } from './AIChat';
import { MathJax } from 'better-react-mathjax';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface ResultCardProps {
  questionNumber: number;
  isCorrect: boolean;
  userAnswer: string;
  userAnswerText?: string;
  correctAnswer?: string;
  explanation: string;
  userId: string;
  testId: string;
  questionId: string;
  questionType?: string;
  question?: string;
  sourcePage?: number;
  sourceText?: string;
  reference_part?: string;
  feedback?: string;
  confidenceLevel?: number;
}

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
      // Check if it needs to be wrapped in delimiters
      let latex = part;

      // For non-delimited LaTeX content, wrap it in $ delimiters
      if (
        !part.startsWith('$') &&
        !part.startsWith('\\(') &&
        !part.startsWith('\\[')
      ) {
        latex = `$${part}$`;
      }

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
          {latex}
        </MathJax>
      );
    }

    return <span key={key}>{part}</span>;
  });
};

export const ResultCard = ({
  questionNumber,
  isCorrect,
  userAnswer,
  userAnswerText,
  correctAnswer,
  explanation,
  userId,
  testId,
  questionId,
  questionType = 'multiple_choice',
  question,
  sourcePage,
  sourceText,
  reference_part,
  feedback,
  confidenceLevel,
}: ResultCardProps) => {
  // Determine which answer to display based on question type
  const displayUserAnswer =
    questionType === 'short_answer'
      ? userAnswerText || 'No answer provided'
      : `${userAnswer}` || 'No answer provided';

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-1">
            {isCorrect ? (
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-medium text-gray-900 mb-4">
              Question {questionNumber}
            </h3>

            {question && (
              <div className="mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-lg text-gray-800">
                  {renderTextWithLatex(question)}
                </div>
              </div>
            )}

            <div className="space-y-5">
              {/* User's Answer Section */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-medium text-gray-700">Your Answer:</p>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      isCorrect
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {isCorrect ? 'Correct' : 'Needs Improvement'}
                  </span>
                </div>
                <div
                  className={`p-4 rounded-lg ${
                    isCorrect
                      ? 'bg-green-50 border border-green-100'
                      : 'bg-red-50 border border-red-100'
                  }`}
                >
                  <div
                    className={`font-medium ${
                      isCorrect ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {renderTextWithLatex(displayUserAnswer)}

                    {/* Display Confidence Level */}
                    {confidenceLevel !== undefined &&
                      confidenceLevel !== null && (
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <TrendingUp className="w-4 h-4 mr-1 text-blue-500" />
                          <span>Confidence: {confidenceLevel}</span>
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* Ideal/Correct Answer Section */}
              {(questionType === 'short_answer' || !isCorrect) &&
                correctAnswer && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium text-gray-700">
                        {questionType === 'short_answer'
                          ? 'Ideal Answer:'
                          : 'Correct Answer:'}
                      </p>
                      {questionType === 'short_answer' && (
                        <LightbulbIcon className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                      <div className="font-medium text-green-700">
                        {renderTextWithLatex(correctAnswer)}
                      </div>
                    </div>
                  </div>
                )}

              {/* Explanation Section - Only for Multiple Choice */}
              {questionType !== 'short_answer' && explanation && (
                <div>
                  <p className="font-medium text-gray-700 mb-2">Explanation:</p>
                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="text-gray-800">
                      {renderTextWithLatex(explanation)}
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback Section for Short Answers */}
              {questionType === 'short_answer' && feedback && (
                <div>
                  <p className="font-medium text-amber-700 mb-2">Feedback:</p>
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="text-amber-800">
                      {renderTextWithLatex(feedback)}
                    </div>

                    {/* Key Points */}
                    {reference_part && (
                      <div className="mt-4 pt-4 border-t border-amber-200">
                        <p className="font-medium text-amber-800 mb-2">
                          Key{' '}
                          {reference_part.includes(',') ? 'points' : 'point'} to
                          include:
                        </p>
                        <div className="text-amber-700 italic">
                          &quot;{renderTextWithLatex(reference_part)}&quot;
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Source Reference Section */}
              {questionType === 'short_answer' && sourceText && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-medium text-blue-700">
                      Source Reference:
                    </p>
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    {sourcePage && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                        Page {sourcePage}
                      </span>
                    )}
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <blockquote className="text-blue-800 border-l-4 border-blue-300 pl-4 italic">
                      <div>{renderTextWithLatex(sourceText)}</div>
                    </blockquote>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-200">
              <AIChat userId={userId} testId={testId} questionId={questionId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
