import React, { useState } from 'react';
import { BookOpen, Pencil, ImagePlus, X } from 'lucide-react';
import { HintSection } from './HintSection';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MathJax } from 'better-react-mathjax';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import ConfidenceSelector from './ConfidenceSelector';

interface ShortAnswerQuestionProps {
  questionNumber: number;
  question: {
    question_id: string;
    question_text: string;
    ideal_answer: string;
    source_page?: number;
    source_text?: string;
  };
  onAnswerChange: (questionId: string, text: string) => void;
  answerText: string;
  note: string;
  onUpdateNote: (questionId: string, newNote: string) => void;
  userId: string;
  testId: string;
  confidence?: number;
  onUpdateConfidence?: (questionId: string, confidenceLevel: number) => void;
  imageDataUri: string | null;
  onImageChange: (questionId: string, imageDataUri: string | null) => void;
}

const cleanLatexFields = (text: string): string => {
  return text
    .replace(/[\x00-\x1F\x7F]/g, '') // Strip control characters
    .replace(/\\\\/g, '\\'); // Normalize escaped backslashes
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

  // return parts.map((part, index) => {
  //   // Generate a more unique key using content hash
  //   const key = `${index}-${hashString(part)}`;

  //   if (
  //     part.startsWith('$') ||
  //     part.startsWith('\\(') ||
  //     part.startsWith('\\[')
  //   ) {
  //     // Remove the delimiters
  //     let latex = part
  //       .replace(/^\$\$|\$\$$|^\$|\$$|^\\\(|\\\)$|^\\\[|\\\]$/g, '')
  //       .trim();

  //     const isDisplay = part.startsWith('$$') || part.startsWith('\\[');

  //     // Use KaTeX for simple expressions and MathJax for complex ones
  //     if (isSimpleLatex(latex)) {
  //       return (
  //         <span
  //           key={key}
  //           dangerouslySetInnerHTML={{
  //             __html: renderWithKatex(latex, isDisplay),
  //           }}
  //         />
  //       );
  //     }

  //     // Wrap the LaTeX in appropriate delimiters for MathJax
  //     latex = isDisplay ? `$$${latex}$$` : `$${latex}$`;

  //     return (
  //       <MathJax key={key} inline={!isDisplay} dynamic={true}>
  //         {latex}
  //       </MathJax>
  //     );
  //   }

  //   // Check if the part contains any LaTeX-like content
  //   if (part.includes('\\') || /[_^{}]/.test(part)) {
  //     // Use KaTeX for simple expressions
  //     if (isSimpleLatex(part)) {
  //       return (
  //         <span
  //           key={key}
  //           dangerouslySetInnerHTML={{
  //             __html: renderWithKatex(part, false),
  //           }}
  //         />
  //       );
  //     }

  //     // Use MathJax for complex expressions
  //     return (
  //       <MathJax key={key} inline={true} dynamic={true}>
  //         {`$${part}$`}
  //       </MathJax>
  //     );
  //   }

  //   return <span key={key}>{part}</span>;
  // });
  return parts.map((part, index) => {
    const key = `${index}-${hashString(part)}`;

    if (
      part.startsWith('$') ||
      part.startsWith('\\(') ||
      part.startsWith('\\[')
    ) {
      // Remove delimiters and clean text
      let latex = part
        .replace(/^\$\$|\$\$$|^\$|\$$|^\\\(|\\\)$|^\\\[|\\\]$/g, '')
        .trim();

      latex = cleanLatexFields(latex);

      const isDisplay = part.startsWith('$$') || part.startsWith('\\[');

      if (isValidLatex(latex)) {
        return (
          <span
            key={key}
            dangerouslySetInnerHTML={{
              __html: renderWithKatex(latex, isDisplay),
            }}
          />
        );
      } else {
        console.warn('Invalid LaTeX detected:', latex);
        return (
          <span key={key} className="text-red-500">
            Invalid LaTeX: {latex}
          </span>
        );
      }
    }

    return <span key={key}>{part}</span>;
  });
};

const ShortAnswerQuestionCard: React.FC<ShortAnswerQuestionProps> = ({
  questionNumber,
  question,
  onAnswerChange,
  answerText,
  note,
  onUpdateNote,
  userId,
  testId,
  confidence = 0.6,
  onUpdateConfidence,
  imageDataUri,
  onImageChange,
}) => {
  const [showHint, setShowHint] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onAnswerChange(question.question_id, e.target.value);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        onImageChange(question.question_id, result);
      };
      reader.onerror = (error) => {
        console.error('Error reading image file:', error);
        onImageChange(question.question_id, null);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearImage = () => {
    onImageChange(question.question_id, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
          <div className="w-full">
            <h4 className="text-lg font-medium mb-2 text-[var(--color-text)]">
              Your Answer:
            </h4>
            <Textarea
              className="w-full p-4 text-lg rounded-lg border border-[var(--color-gray-200)] focus:border-[var(--color-primary)] focus:outline-none min-h-[120px]"
              placeholder="Type your answer here or upload an image..."
              value={answerText || ''}
              onChange={handleAnswerChange}
              disabled={!!imageDataUri}
              onBlur={(e) => {
                if (
                  !imageDataUri &&
                  e.target.value &&
                  e.target.value.trim() !== ''
                ) {
                  onAnswerChange(question.question_id, e.target.value);
                }
              }}
            />
            <div className="mt-4">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageFileChange}
                className="hidden"
                id={`image-upload-${question.question_id}`}
              />
              <Button
                variant="outline"
                onClick={handleImageUploadClick}
                className="gap-2"
                aria-label="Upload image answer"
              >
                <ImagePlus className="h-4 w-4" />
                Upload Image
              </Button>
              {imageDataUri && (
                <div className="mt-3 relative inline-block">
                  <img
                    src={imageDataUri}
                    alt="Uploaded answer preview"
                    className="max-h-40 max-w-full rounded border border-gray-300 object-contain"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={handleClearImage}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-80 hover:opacity-100"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {((answerText && answerText.trim() !== '') || imageDataUri) &&
          onUpdateConfidence && (
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

export default ShortAnswerQuestionCard;
