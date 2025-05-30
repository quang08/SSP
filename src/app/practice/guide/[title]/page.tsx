'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import Link from 'next/link';
import useSWR from 'swr';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { createClient } from '@/utils/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Loading } from '@/components/ui/loading';
import { ENDPOINTS } from '@/config/urls';
import {
  ChevronLeft,
  CheckCircle,
  PlayCircle,
  BarChart,
  AlertTriangle,
  Clock,
  Lock,
  Circle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { CompletedTest, TestResultsResponse } from '@/interfaces/test';
import { cn } from '@/lib/utils';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { toast } from 'sonner';

// Define types for the new JSON structure
interface QuizChoice {
  question: string;
  choices: Record<string, string>;
  correct: string;
  explanation: string;
}

interface ShortAnswer {
  question: string;
  ideal_answer: string;
}

interface SectionQuiz {
  concept: string;
  quizzes: {
    multiple_choice: QuizChoice[];
    short_answer: ShortAnswer[];
  };
}

interface Section {
  title: string;
  key_concepts: string[];
  quizzes: SectionQuiz[];
  completed?: boolean;
  source_pages?: string[];
  source_texts?: string[];
  prerequisite_sections?: string[];
  is_unlocked?: boolean;
  is_mastered?: boolean;
  review_recommended?: boolean;
  attempts_used?: number;
  mastery_percentage?: number;
}

interface Chapter {
  title: string;
  sections: Section[];
  prerequisite_chapters?: string[];
  is_unlocked?: boolean;
  is_mastered?: boolean;
}

interface StudyGuideData {
  title: string;
  chapters: Chapter[];
  study_guide_id?: string;
  gdrive_folder_url?: string;
}

interface TestMap {
  [key: string]: string;
}

// Add interface for practice test
interface PracticeTest {
  practice_test_id: string;
  section_title: string;
  questions: QuizChoice[];
  short_answer?: ShortAnswer[];
}

// Add interface for practice tests data
interface PracticeTestsData {
  practice_tests: PracticeTest[];
}

// Add interfaces for mastery status
interface SectionStatus {
  section_title: string;
  is_unlocked: boolean;
  is_mastered: boolean;
  review_recommended?: boolean;
  attempts_used?: number;
  mastery_percentage?: number;
}

interface TestStatus {
  test_id: string;
  is_unlocked: boolean;
  prerequisites?: string[];
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

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

const StudyGuidePage: React.FC = () => {
  const params = useParams();
  const title = typeof params.title === 'string' ? params.title : '';
  const router = useRouter();
  const supabase = createClient();
  const [generatingTests, setGeneratingTests] = useState<boolean>(false);
  const [sectionMasteryStatus, setSectionMasteryStatus] = useState<
    Record<
      string,
      {
        isUnlocked: boolean;
        isMastered: boolean;
        review_recommended?: boolean;
        attempts_used?: number;
        mastery_percentage?: number;
      }
    >
  >({});
  const [lockedTests, setLockedTests] = useState<Record<string, boolean>>({});
  const [testPrerequisites, setTestPrerequisites] = useState<
    Record<string, string[]>
  >({});

  const { data: userData } = useSWR('user', async () => {
    const { data } = await supabase.auth.getUser();
    return data?.user;
  });

  const userId = userData?.id;

  // Use the consolidated endpoint for fetching all data
  const {
    data: consolidatedData,
    error: consolidatedError,
    mutate: refreshData,
  } = useSWR(
    title && userId ? ENDPOINTS.guideWithData(title, userId) : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // 10 seconds
      onSuccess: (data) => {
        // Process the section mastery statuses
        const sectionStatus: Record<
          string,
          {
            isUnlocked: boolean;
            isMastered: boolean;
            review_recommended?: boolean;
            attempts_used?: number;
            mastery_percentage?: number;
          }
        > = {};

        // Map section statuses (similar to topic statuses in slides)
        (data.section_statuses || []).forEach((status: SectionStatus) => {
          if (status.section_title) {
            sectionStatus[status.section_title] = {
              isUnlocked: status.is_unlocked,
              isMastered: status.is_mastered,
              review_recommended: status.review_recommended,
              attempts_used: status.attempts_used,
              mastery_percentage: status.mastery_percentage,
            };
          }
        });
        setSectionMasteryStatus(sectionStatus);

        // Process test lock statuses
        const lockStatus: Record<string, boolean> = {};
        const prereqStatus: Record<string, string[]> = {};

        (data.test_statuses || []).forEach((status: TestStatus) => {
          if (status.test_id) {
            lockStatus[status.test_id] = !status.is_unlocked;
            prereqStatus[status.test_id] = status.prerequisites || [];
          }
        });

        setLockedTests(lockStatus);
        setTestPrerequisites(prereqStatus);
      },
    }
  );

  // Extract data from the consolidated response
  const studyGuide = consolidatedData?.guide;
  const testsData = { practice_tests: consolidatedData?.practice_tests || [] };
  const completedTestsData = {
    test_results: consolidatedData?.completed_tests || [],
  };
  const guideAnalytics = consolidatedData?.guide_analytics;
  const progress = consolidatedData?.progress || 0;

  const error = consolidatedError;
  const loading = !consolidatedData;
  const hasAnalytics = guideAnalytics && guideAnalytics.total_tests > 0;

  const getErrorMessage = () => {
    if (consolidatedError) {
      if (consolidatedError.message.includes('404')) {
        return "We couldn't find this study guide. It may have been deleted or you may not have access to it.";
      }
      return 'Failed to load study guide data. Please try again.';
    }
    return 'An unexpected error occurred.';
  };

  // Process the data
  const practiceTests = (testsData.practice_tests.reduce(
    (acc: TestMap, test: PracticeTest) => {
      acc[test.section_title] = test.practice_test_id;
      return acc;
    },
    {} as TestMap
  ) || {}) as TestMap;

  // Correctly create the Set of completed test IDs
  const completedTests = new Set(
    consolidatedData?.completed_tests?.map(
      (test: CompletedTest) => test.test_id
    ) || []
  );

  // Process the study guide to add completion status, mastery status, and lock status to sections
  const processedGuide: StudyGuideData | null = studyGuide
    ? {
        ...studyGuide,
        chapters: studyGuide.chapters.map((chapter: Chapter) => ({
          ...chapter,
          sections: chapter.sections.map((section: Section) => {
            const testId = practiceTests[section.title] || '';
            const sectionMastery = sectionMasteryStatus[section.title];

            // Check if prerequisites are met
            let prerequisitesMet = true;
            if (
              section.prerequisite_sections &&
              section.prerequisite_sections.length > 0
            ) {
              prerequisitesMet = section.prerequisite_sections.every(
                (prereq) => {
                  const prereqStatus = sectionMasteryStatus[prereq];
                  // Consider a prerequisite met if:
                  // 1. It's marked as mastered OR
                  // 2. It's marked as review_recommended (which means user has attempted all tries)
                  return (
                    prereqStatus &&
                    (prereqStatus.isMastered || prereqStatus.review_recommended)
                  );
                }
              );
            }

            // Determine if section is unlocked based on prerequisites
            const is_unlocked = sectionMastery?.isUnlocked ?? prerequisitesMet;

            return {
              ...section,
              completed: completedTests.has(testId),
              is_unlocked: is_unlocked,
              is_mastered: sectionMastery?.isMastered ?? false,
              review_recommended: sectionMastery?.review_recommended ?? false,
              attempts_used: sectionMastery?.attempts_used ?? 0,
              mastery_percentage: sectionMastery?.mastery_percentage ?? 0,
            };
          }),
        })),
      }
    : null;

  const handleQuizClick = (testId: string, sectionTitle: string): void => {
    if (!title) return;

    // If test is already completed, show the results
    if (completedTests.has(testId)) {
      router.push(
        `/practice/guide/${encodeURIComponent(title)}/quiz/${testId}/results`
      );
      return;
    }

    // Get the section from the processed guide
    const section = findSectionByTitle(processedGuide, sectionTitle);

    // Check if the section has prerequisites and if they are met
    if (section && !section.is_unlocked) {
      // Get prerequisite names to show in the toast
      const prerequisites = section.prerequisite_sections || [];
      const prerequisitesList =
        prerequisites.length > 0 ? `: ${prerequisites.join(', ')}` : '';

      // Show toast notification about prerequisites
      toast.error('Prerequisites Required', {
        description: `You need to master or complete the prerequisite sections before taking this test${prerequisitesList}.`,
        duration: 4000,
      });
      return;
    }

    // Navigate to the test if unlocked
    router.push(`/practice/guide/${encodeURIComponent(title)}/quiz/${testId}`);
  };

  // Helper function to find a section by title in the processed guide
  const findSectionByTitle = (
    guide: StudyGuideData | null,
    sectionTitle: string
  ): Section | null => {
    if (!guide) return null;

    for (const chapter of guide.chapters as Chapter[]) {
      for (const section of chapter.sections as Section[]) {
        if (section.title === sectionTitle) {
          return section;
        }
      }
    }

    // Add explicit return null if no section is found
    return null;
  };

  // Generate practice tests from the studyGuide data
  const generatePracticeTests = async () => {
    if (!studyGuide) return;

    try {
      setGeneratingTests(true);
      const token = await supabase.auth
        .getSession()
        .then((res) => res.data.session?.access_token);

      // Call the API to generate practice tests
      const response = await fetch('/api/practice-tests/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guide_id: processedGuide?.study_guide_id }),
      });

      if (response.ok) {
        // Refresh data instead of reloading the page
        refreshData();
      }
    } catch (error) {
      console.error('Error generating practice tests:', error);
    } finally {
      setGeneratingTests(false);
    }
  };

  // Function to determine section status icon and styling
  const getSectionStatusInfo = (section: Section) => {
    let statusIcon = null;
    let statusText = '';
    let bgColorClass = '';
    let textColorClass = '';

    if (section.is_mastered) {
      statusIcon = <CheckCircle className="h-4 w-4 text-green-500" />;
      statusText = 'Mastered';
      bgColorClass = 'bg-green-100';
      textColorClass = 'text-green-700';
    } else if (section.review_recommended) {
      statusIcon = <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      statusText = 'Review Recommended';
      bgColorClass = 'bg-yellow-100';
      textColorClass = 'text-yellow-700';
    } else if (section.completed) {
      statusIcon = <Clock className="h-4 w-4 text-blue-500" />;
      statusText = 'Attempted';
      bgColorClass = 'bg-blue-100';
      textColorClass = 'text-blue-700';
    } else if (!section.is_unlocked) {
      statusIcon = <Lock className="h-4 w-4 text-gray-500" />;
      statusText = 'Locked';
      bgColorClass = 'bg-gray-100';
      textColorClass = 'text-gray-700';
    } else {
      statusIcon = <Circle className="h-4 w-4 text-gray-400" />;
      statusText = 'Not Started';
      bgColorClass = 'bg-gray-100';
      textColorClass = 'text-gray-700';
    }

    return { statusIcon, statusText, bgColorClass, textColorClass };
  };

  // Update MathJax config with additional macros
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
        macros: mathJaxConfig.tex.macros,
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

  // Simple string hashing function for generating unique keys
  const hashString = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36); // Convert to base-36 for shorter strings
  };

  // Function to automatically wrap LaTeX expressions with $ delimiters
  function autoWrapLatexMath(text: string): string {
    // Step 1: Convert \{ and \} to actual LaTeX commands
    let processed = text
      .replace(/\\\{/g, '\\lbrace')
      .replace(/\\\}/g, '\\rbrace');

    // Step 2: Wrap entire known math block expressions like:
    // - { x : x^T \hat{\beta} > 0.5 }
    // - \frac{1}{k}
    // These patterns contain math symbols or commands
    const mathBlockPattern =
      /(?:\\lbrace[^\\]*?\\rbrace|\\frac\s*\{[^{}]*\}\s*\{[^{}]*\}|[a-zA-Z0-9]+[\^_][a-zA-Z0-9{}\\]+|\\[a-zA-Z]+\{[^{}]*\}|\\[a-zA-Z]+)/g;

    processed = processed.replace(mathBlockPattern, (match) => {
      // Don't wrap if it's already wrapped
      if (/^\$.*\$/.test(match)) return match;
      return `$${match}$`;
    });

    return processed;
  }

  function wrapUnwrappedLatex(text: string): string {
    if (/<mjx-(container|math|c|mi|mo|mtext|texatom)/.test(text)) return text;

    const MATH_BLOCK_PATTERN =
      /(?<!\$)((\\(sum|frac|hat|mathcal|mathbb|beta|alpha|theta|lambda|mu|pi|phi|infty|[a-zA-Z]+)|[a-zA-Z]+\([^)]*\)|[a-zA-Z0-9]+[\^_][a-zA-Z0-9{}\\]+)[^$.]*)/g;

    const parts = text.split(/(\$.*?\$)/g); // keep already wrapped blocks intact

    return parts
      .map((part) => {
        if (/^\$.*\$$/.test(part)) return part;
        return part.replace(MATH_BLOCK_PATTERN, (match) => {
          if (/^[a-zA-Z0-9\s.,;:!?]+$/.test(match)) return match;
          return `$${match.trim()}$`;
        });
      })
      .join('');
  }


  function sanitizeLatexMath(text: string): string {
    return text.replace(/\$(.+?)\$/g, (_, math) => {
      const escaped = math.replace(/\\\\/g, '\\').replace(/#/g, '\\#'); // escape hash symbol
      return `$${escaped}$`;
    });
  }

  const containsMathJaxHTML = (text: string) => /<mjx-/.test(text);

  const renderTextWithLatex = (text: string) => {
    const content = containsMathJaxHTML(text) ? text : wrapUnwrappedLatex(text);
    const sanitized = sanitizeLatexMath(content);
    const parts = sanitized.split(/(\$.*?\$)/g);

    return (
      <span>
        {parts.map((part, i) =>
          /^\$.*\$$/.test(part.trim()) ? (
            <MathJax key={i} inline dynamic>
              {part}
            </MathJax>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Link
              href="/practice"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Practice
            </Link>

            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  {studyGuide?.title.replace(/_/g, ' ')}
                  {hasAnalytics && (
                    <span className="ml-2 px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full flex items-center">
                      <BarChart className="h-4 w-4 mr-1" />
                      Analytics Available
                    </span>
                  )}
                </h1>
                <p className="mt-2 text-gray-600">Study Guide Content</p>
              </div>

              {studyGuide?.study_guide_id && userId && (
                <Link
                  href={`/dashboard?guide=${studyGuide.study_guide_id}`}
                  className={
                    !hasAnalytics ? 'pointer-events-none opacity-50' : ''
                  }
                >
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
                    disabled={!hasAnalytics}
                    title={
                      !hasAnalytics
                        ? 'Take a quiz first to enable analytics'
                        : 'View guide analytics'
                    }
                  >
                    <BarChart className="h-4 w-4" />
                    {hasAnalytics ? 'View Analytics' : 'No Analytics Yet'}
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>

          {loading ? (
            <Loading size="lg" text="Loading study guide..." />
          ) : error ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-xl border border-red-200 max-w-2xl mx-auto"
            >
              <div className="text-center space-y-4">
                <p className="text-xl font-semibold text-red-600">
                  {getErrorMessage()}
                </p>
                <p className="text-gray-600">
                  You can try refreshing the page or going back to the practice
                  section.
                </p>
                <div className="flex gap-4 mt-6">
                  <Button
                    onClick={() => window.location.reload()}
                    variant="default"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Try Again
                  </Button>
                  <Link href="/practice">
                    <Button variant="outline">Return to Practice</Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid md:grid-cols-4 gap-8"
            >
              <motion.div
                variants={item}
                className="md:col-span-3 bg-white rounded-xl shadow-lg p-6 border-2 border-gray-300"
              >
                <Accordion
                  type="multiple"
                  defaultValue={['chapter-0']}
                  className="w-full space-y-4"
                >
                  {processedGuide?.chapters.map(
                    (chapter: Chapter, chapterIndex: number) => (
                      <motion.div key={chapterIndex} variants={item}>
                        <AccordionItem
                          value={`chapter-${chapterIndex}`}
                          className="border-2 border-gray-300 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden data-[state=open]:shadow-md"
                        >
                          <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors flex justify-between items-center w-full">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-[var(--color-primary)]/10">
                                <BarChart className="h-5 w-5 text-[var(--color-primary)]" />
                              </div>
                              <span className="text-left font-semibold text-gray-900">
                                {chapter.title}
                              </span>
                            </div>
                          </AccordionTrigger>

                          <AccordionContent className="px-6 pb-6 pt-2">
                            <div className="space-y-3">
                              {chapter.sections.map(
                                (section: Section, sectionIndex: number) => {
                                  // Get section status information
                                  const {
                                    statusIcon,
                                    statusText,
                                    bgColorClass,
                                    textColorClass,
                                  } = getSectionStatusInfo(section);

                                  return (
                                    <motion.div
                                      key={sectionIndex}
                                      variants={item}
                                    >
                                      <AccordionItem
                                        value={`section-${chapterIndex}-${sectionIndex}`}
                                        className="border-2 border-gray-300 rounded-lg overflow-hidden hover:border-[var(--color-primary)]/50 transition-all duration-300 data-[state=open]:shadow-md data-[state=open]:border-[var(--color-primary)]/40"
                                      >
                                        <AccordionTrigger className="px-4 py-3 hover:no-underline transition-colors">
                                          <div className="flex items-center gap-3">
                                            <div
                                              className={cn(
                                                'p-1.5 rounded-lg transition-colors',
                                                section.is_mastered
                                                  ? 'bg-green-200'
                                                  : section.is_unlocked
                                                    ? 'bg-[var(--color-primary)]/10'
                                                    : 'bg-gray-200'
                                              )}
                                            >
                                              {section.is_mastered ? (
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                              ) : !section.is_unlocked ? (
                                                <Lock className="h-4 w-4 text-gray-500" />
                                              ) : (
                                                <PlayCircle className="h-4 w-4 text-[var(--color-primary)]" />
                                              )}
                                            </div>
                                            <span className="text-left font-medium text-gray-800">
                                              {section.title}
                                            </span>
                                            {/* Add status indicator */}
                                            {statusIcon && (
                                              <span
                                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${bgColorClass} ${textColorClass}`}
                                              >
                                                {statusIcon}
                                                {statusText}
                                              </span>
                                            )}
                                          </div>
                                        </AccordionTrigger>

                                        <AccordionContent className="px-4 pb-4 pt-1">
                                          <div className="space-y-2.5">
                                            {/* Key Concepts */}
                                            {section.key_concepts && (
                                              <div className="space-y-2">
                                                <h4 className="font-medium text-gray-900">
                                                  Key Concepts
                                                </h4>
                                                <ul className="list-disc list-inside space-y-2 text-gray-700">
                                                  {section.key_concepts.map(
                                                    (
                                                      concept: string,
                                                      index: number
                                                    ) => (
                                                      <li key={index}>
                                                        {renderTextWithLatex(
                                                          concept
                                                        )}
                                                      </li>
                                                    )
                                                  )}
                                                </ul>
                                              </div>
                                            )}

                                            {/* Source Information */}
                                            {section.source_pages &&
                                              section.source_pages.length >
                                                0 && (
                                                <div className="text-sm text-gray-500">
                                                  Source Page
                                                  {section.source_pages.length >
                                                  1
                                                    ? 's'
                                                    : ''}
                                                  :{' '}
                                                  {section.source_pages.join(
                                                    ', '
                                                  )}
                                                </div>
                                              )}

                                            {/* Source Texts */}
                                            {section.source_texts &&
                                              section.source_texts.length >
                                                0 && (
                                                <div className="space-y-2">
                                                  {section.source_texts.map(
                                                    (
                                                      text: string,
                                                      index: number
                                                    ) => (
                                                      <div
                                                        key={index}
                                                        className="p-3 bg-gray-50 rounded-lg border border-gray-200 overflow-x-auto"
                                                      >
                                                        <div className="text-sm text-gray-600 italic leading-relaxed break-words whitespace-pre-wrap max-w-full">
                                                          &ldquo;
                                                          {renderTextWithLatex(
                                                            text
                                                          )}
                                                          &rdquo;
                                                        </div>
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              )}

                                            {/* Display prerequisites if any */}
                                            {section.prerequisite_sections &&
                                              section.prerequisite_sections
                                                .length > 0 && (
                                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                                                  <p className="font-medium text-gray-700 mb-2">
                                                    Prerequisites:
                                                  </p>
                                                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                                                    {section.prerequisite_sections.map(
                                                      (
                                                        prereq: string,
                                                        index: number
                                                      ) => (
                                                        <li
                                                          key={index}
                                                          className="flex items-center gap-2"
                                                        >
                                                          <span>{prereq}</span>
                                                          {sectionMasteryStatus[
                                                            prereq
                                                          ] && (
                                                            <span className="flex items-center gap-1">
                                                              {sectionMasteryStatus[
                                                                prereq
                                                              ].isMastered ? (
                                                                <CheckCircle className="h-3 w-3 text-green-500" />
                                                              ) : sectionMasteryStatus[
                                                                  prereq
                                                                ]
                                                                  .review_recommended ? (
                                                                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                                                              ) : !sectionMasteryStatus[
                                                                  prereq
                                                                ].isUnlocked ? (
                                                                <Lock className="h-3 w-3 text-gray-500" />
                                                              ) : (
                                                                <Circle className="h-3 w-3 text-gray-400" />
                                                              )}
                                                              <span
                                                                className={`text-xs px-1.5 py-0.5 rounded-full ${
                                                                  sectionMasteryStatus[
                                                                    prereq
                                                                  ].isMastered
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : sectionMasteryStatus[
                                                                          prereq
                                                                        ]
                                                                          .review_recommended
                                                                      ? 'bg-yellow-100 text-yellow-700'
                                                                      : 'bg-gray-100 text-gray-700'
                                                                }`}
                                                              >
                                                                {sectionMasteryStatus[
                                                                  prereq
                                                                ].isMastered
                                                                  ? 'Mastered'
                                                                  : sectionMasteryStatus[
                                                                        prereq
                                                                      ]
                                                                        .review_recommended
                                                                    ? 'Review Recommended'
                                                                    : sectionMasteryStatus[
                                                                          prereq
                                                                        ]
                                                                          .attempts_used &&
                                                                        sectionMasteryStatus[
                                                                          prereq
                                                                        ]
                                                                          .attempts_used >
                                                                          0
                                                                      ? 'Attempted'
                                                                      : 'Not Mastered'}
                                                              </span>
                                                            </span>
                                                          )}
                                                        </li>
                                                      )
                                                    )}
                                                  </ul>
                                                </div>
                                              )}

                                            {/* Quiz Button or Generate Tests Button */}
                                            {practiceTests[section.title] ? (
                                              <div className="pt-4">
                                                <Button
                                                  onClick={() =>
                                                    handleQuizClick(
                                                      practiceTests[
                                                        section.title
                                                      ],
                                                      section.title
                                                    )
                                                  }
                                                  className={cn(
                                                    'w-full transition-all duration-300',
                                                    section.is_unlocked
                                                      ? 'bg-gradient-to-r from-[var(--color-primary)] to-purple-400 text-white hover:from-[var(--color-primary)]/90 hover:to-purple-500/90'
                                                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                  )}
                                                  disabled={
                                                    !section.is_unlocked
                                                  }
                                                  title={
                                                    !section.is_unlocked
                                                      ? section.prerequisite_sections &&
                                                        section
                                                          .prerequisite_sections
                                                          .length > 0
                                                        ? `Prerequisites: ${section.prerequisite_sections.join(', ')}`
                                                        : 'You need to master the prerequisites first'
                                                      : ''
                                                  }
                                                >
                                                  {!section.is_unlocked ? (
                                                    <>
                                                      <Lock className="h-4 w-4 mr-2" />
                                                      Locked (Prerequisites
                                                      Required)
                                                    </>
                                                  ) : completedTests.has(
                                                      practiceTests[
                                                        section.title
                                                      ]
                                                    ) ? (
                                                    'View Results'
                                                  ) : section.is_mastered ? (
                                                    'Mastered'
                                                  ) : section.review_recommended ? (
                                                    'Review Recommended'
                                                  ) : (
                                                    'Start Quiz'
                                                  )}
                                                </Button>
                                              </div>
                                            ) : (
                                              <div className="pt-4">
                                                <Button
                                                  onClick={
                                                    generatePracticeTests
                                                  }
                                                  disabled={generatingTests}
                                                  className="w-full bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"
                                                >
                                                  {generatingTests ? (
                                                    <div className="flex items-center gap-2">
                                                      <span className="animate-spin h-4 w-4 border-2 border-white border-opacity-50 border-t-white rounded-full"></span>
                                                      <span>
                                                        Generating Tests...
                                                      </span>
                                                    </div>
                                                  ) : (
                                                    'Generate Practice Tests'
                                                  )}
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        </AccordionContent>
                                      </AccordionItem>
                                    </motion.div>
                                  );
                                }
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </motion.div>
                    )
                  )}
                </Accordion>

                {/* Global generating tests indicator */}
                {generatingTests && (
                  <div className="mt-6 p-4 bg-[var(--color-primary)]/5 rounded-lg text-center">
                    <Loading size="sm" text="Generating practice tests..." />
                  </div>
                )}
              </motion.div>

              <motion.div variants={item} className="space-y-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart className="h-5 w-5 text-[var(--color-primary)]" />
                    Guide Info
                  </h3>
                  <div className="space-y-4">
                    {/* Conditionally render Google Drive Link based on data */}
                    {processedGuide?.gdrive_folder_url && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">
                          Course Materials
                        </p>
                        <Link
                          href={processedGuide.gdrive_folder_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-sm flex items-center justify-center gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                            title="View associated course materials in Google Drive"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View Materials in Drive
                          </Button>
                        </Link>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-gray-600 mb-1">Chapters</p>
                      <p className="font-medium">
                        {studyGuide?.chapters?.length || 0} chapters available
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Sections</p>
                      <p className="font-medium">
                        {studyGuide?.chapters?.reduce(
                          (acc: number, chapter: Chapter) =>
                            acc + (chapter.sections?.length || 0),
                          0
                        ) || 0}{' '}
                        sections
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        Practice Tests
                      </p>
                      <p className="font-medium">
                        {testsData?.practice_tests?.length || 0} available
                      </p>
                    </div>
                    {testsData?.practice_tests?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 mb-1">Progress</p>
                        <div className="flex justify-between">
                          <p className="font-medium">
                            {completedTests.size}/
                            {testsData.practice_tests.length} completed
                          </p>
                          <p className="font-medium text-[var(--color-primary)]">
                            {progress.toFixed(0)}%
                          </p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${progress}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Analytics info section */}
                    {hasAnalytics && guideAnalytics && (
                      <div className="pt-2 mt-3 border-t border-dashed border-gray-200">
                        <p className="text-sm font-medium text-green-700 mb-3">
                          Analytics Available
                        </p>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">
                              Tests Taken
                            </p>
                            <p className="font-medium">
                              {guideAnalytics.total_tests}
                            </p>
                          </div>

                          {guideAnalytics.average_accuracy !== undefined && (
                            <div>
                              <p className="text-sm text-gray-600 mb-1">
                                Average Accuracy
                              </p>
                              <p className="font-medium">
                                {guideAnalytics.average_accuracy.toFixed(0)}%
                              </p>
                            </div>
                          )}

                          {guideAnalytics.average_score !== undefined && (
                            <div>
                              <p className="text-sm text-gray-600 mb-1">
                                Average Score
                              </p>
                              <p className="font-medium">
                                {guideAnalytics.average_score.toFixed(1)} points
                              </p>
                            </div>
                          )}

                          <div className="mt-3">
                            <Link
                              href={`/dashboard?guide=${studyGuide?.study_guide_id}`}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs flex items-center gap-1 bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                              >
                                <BarChart className="h-3 w-3" />
                                View Detailed Analytics
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}

                    {!hasAnalytics && (
                      <div className="pt-2 mt-3 border-t border-dashed border-gray-200">
                        <p className="text-sm text-gray-600 mb-2">Analytics</p>
                        <p className="text-sm text-amber-700">
                          Take a quiz to generate analytics
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </MathJaxContext>
  );
};

export default StudyGuidePage;
