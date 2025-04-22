'use client';

import React, { useState } from 'react';
import { BookOpen, Pencil } from 'lucide-react';
import { HintSection } from './HintSection';
import { MathJax } from 'better-react-mathjax';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import ConfidenceSelector from './ConfidenceSelector';

interface QuestionCardProps {
  questionNumber: number;
  question: {
    question_id: string;
    question_text: string;
    options: Record<string, string>;
    correct_answer: string;
    explanation: string;
    source_page?: number;
    source_text?: string;
  };
  onSelectAnswer: (questionId: string, answer: string) => void;
  selectedAnswer?: string;
  note: string;
  onUpdateNote: (questionId: string, newNote: string) => void;
  userId: string;
  testId: string;
  confidence?: number;
  onUpdateConfidence?: (questionId: string, confidenceLevel: number) => void;
}

// --- ADD NEW LATEX HELPERS --- START
const cleanLatexFields = (text: string): string => {
  return text
    .replace(/[\x00-\x1F\x7F]/g, '') // Strip control characters
    .replace(/\\/g, '\\'); // Normalize escaped backslashes
};

const isValidLatex = (text: string): boolean => {
  try {
    katex.renderToString(text, { throwOnError: true });
    return true;
  } catch {
    return false;
  }
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
// --- ADD NEW LATEX HELPERS --- END

const QuestionCard = ({
  questionNumber,
  question,
  onSelectAnswer,
  selectedAnswer,
  userId,
  testId,
  note,
  onUpdateNote,
  confidence = 0.6,
  onUpdateConfidence,
}: QuestionCardProps) => {
  const [showHint, setShowHint] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);

  return (
    <div className="bg-[var(--color-background)] rounded-xl p-8 shadow-lg border-2 border-gray-300">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start flex-1">
            <span className="text-2xl font-medium text-[var(--color-text-secondary)] mr-6">
              {questionNumber}.
            </span>
            <div className="flex-1">
              <p className="text-xl text-[var(--color-text)] font-medium">
                {renderTextWithLatex(question.question_text)}
              </p>
              {question.source_page && (
                <span className="text-sm text-[var(--color-text-muted)] mt-1 block">
                  Source: Page {question.source_page}
                </span>
              )}
            </div>
          </div>
          <div className="flex space-x-3 ml-6">
            <button
              onClick={() => setShowHint(!showHint)}
              className={`p-3 transition-colors rounded-lg ${
                showHint
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-background-alt)]'
              }`}
              title="Show hint"
            >
              <BookOpen size={24} />
            </button>
            <button
              onClick={() => setShowNoteInput(!showNoteInput)}
              className={`p-3 transition-colors rounded-lg ${
                showNoteInput
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-background-alt)]'
              }`}
              title="Add note"
            >
              <Pencil size={24} />
            </button>
          </div>
        </div>

        {/* {question.source_text && (
          <div className="ml-10 p-4 bg-[var(--color-background-alt)] rounded-lg border border-[var(--color-gray-200)]">
            <p className="text-sm text-[var(--color-text-muted)] italic">
              &ldquo;{renderTextWithLatex(question.source_text)}&rdquo;
            </p>
          </div>
        )} */}

        <HintSection
          userId={userId}
          testId={testId}
          questionId={question.question_id}
          questionText={question.question_text}
          isVisible={showHint}
          onToggle={() => setShowHint(!showHint)}
        />

        {showNoteInput && (
          <div className="ml-10 p-6 bg-[var(--color-background-alt)] rounded-lg border border-[var(--color-gray-200)]">
            <h4 className="text-xl font-medium mb-3 text-[var(--color-text)]">
              Notes
            </h4>
            <textarea
              value={note}
              onChange={(e) =>
                onUpdateNote(question.question_id, e.target.value)
              }
              placeholder="Write your notes here..."
              className="w-full p-4 text-lg rounded-lg border border-[var(--color-gray-200)] focus:border-[var(--color-primary)] focus:outline-none resize-y min-h-[120px]"
            />
          </div>
        )}

        <div className="ml-10 space-y-4">
          {question?.options &&
            Object.entries(question.options ?? {}).map(([key, value]) => (
              <button
                key={key}
                onClick={() => onSelectAnswer(question.question_id, key)}
                className={`w-full text-left p-5 rounded-lg text-lg transition-colors border-2 ${
                  selectedAnswer === key
                    ? 'border-2 border-gray-400 bg-gray-200 text-gray-900'
                    : 'border-[var(--color-gray-200)] hover:border-gray-400 hover:bg-[var(--color-background-alt)]'
                }`}
              >
                <span className="text-xl font-medium mr-3">{key}.</span>
                {renderTextWithLatex(value)}
              </button>
            ))}
        </div>

        {/* Confidence Selector */}
        {selectedAnswer && onUpdateConfidence && (
          <ConfidenceSelector
            questionId={question.question_id}
            confidence={confidence}
            onUpdateConfidence={onUpdateConfidence}
          />
        )}
      </div>
    </div>
  );
};

export default QuestionCard;
