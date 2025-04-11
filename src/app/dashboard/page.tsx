'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Clock,
  Target,
  Award,
  X,
  Check,
  Zap,
  Loader2,
  GraduationCap,
  Timer,
  Percent,
  CheckCircle2,
  Activity,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Header } from '@/components/layout/header';
import { ENDPOINTS } from '@/config/urls';
import { Progress } from '@/components/ui/progress';
import useSWR, { mutate } from 'swr';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { motion, AnimatePresence } from 'framer-motion';
import { RouteGuard } from '@/components/auth/route-guard';
import {
  WrongQuestion,
  WeeklyProgress,
  GuideAnalytics,
  EnhancedStudyHours,
  TimePeriod,
  TopicMasteryData,
  ProcessedTopicMastery,
  RawTopicMasteryResponse,
  RawMasteryStudyGuide,
  RawTopicChapter,
  RawTopicSection,
  RawTopicSubmission,
  GroupedMasteryData,
  ProcessedGuide,
  ProcessedChapter,
} from '@/interfaces/test';
import { DashboardGuide } from '@/interfaces/topic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { GuideStats } from '@/components/dashboard/guide-stats';
import { formatTime } from '@/lib/utils';
import * as Messages from '@/config/messages';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { TopicMasteryCard } from '../../components/dashboard/topic-mastery-card';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useUser } from '@/utils/supabase/get-user';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { format } from 'date-fns';

// Define interfaces for clearer typing
interface Attempt {
  attempt_id?: string;
  attempt_number: number;
  accuracy?: number;
}

interface LatestTest {
  attempts?: Attempt[];
  // Include other potential fields from latest_test if known
  // e.g., submitted_at: string;
}

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
    },
  },
  svg: {
    fontCache: 'global',
  },
  options: {
    enableMenu: false,
  },
};

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const fetcher = async (url: string) => {
  const supabase = createClient();
  const token = await supabase.auth
    .getSession()
    .then((res) => res.data.session?.access_token);
  console.log(`Fetching data from: ${url}`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch data');
  const data = await res.json();
  console.log(`Received data from ${url}:`, data);
  return data;
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
        <p className="font-medium text-sm text-gray-700">{label}</p>
        <div className="mt-2 space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <p className="text-sm">
                <span className="font-medium">{entry.name}: </span>
                <span>
                  {entry.name === 'Accuracy' ? `${entry.value}%` : entry.value}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// --- Start GuideAnalyticCard Inner Component ---
const GuideAnalyticCard = ({
  guideAnalytic,
  userId,
}: {
  guideAnalytic: GuideAnalytics;
  userId: string | undefined;
}) => {
  const { data: performanceHistory, error: performanceError } = useSWR(
    guideAnalytic?.study_guide_id && userId
      ? ENDPOINTS.guidePerformance(guideAnalytic.study_guide_id, userId)
      : null,
    fetcher
  );

  const chartData = performanceHistory?.test_results
    ? [...performanceHistory.test_results]
        .sort(
          (a, b) =>
            new Date(a.submitted_at).getTime() -
            new Date(b.submitted_at).getTime()
        )
        .map((result) => ({
          date: format(new Date(result.submitted_at), 'MMM d'),
          Score: result.score,
          Accuracy: parseFloat(result.accuracy.toFixed(1)),
          timestamp: result.submitted_at,
        }))
    : [];

  return (
    <motion.div
      key={guideAnalytic.study_guide_id}
      variants={fadeInUp}
      className="h-full"
    >
      <Card className="bg-white shadow-md hover:shadow-lg transition-shadow duration-300 rounded-lg overflow-hidden flex flex-col h-full">
        <CardHeader className="bg-gray-50 border-b border-gray-200 py-3 px-4">
          <CardTitle className="text-md font-semibold text-gray-800 truncate">
            {guideAnalytic.study_guide_title || 'Untitled Guide'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3 text-sm flex-grow">
          {' '}
          {/* Added flex-grow */}
          {/* Overall Stats */}
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Avg. Accuracy:</span>
            <span className="font-medium text-[var(--color-primary)]">
              {guideAnalytic.average_accuracy?.toFixed(0) ?? 'N/A'}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Avg. Score:</span>
            <span className="font-medium">
              {guideAnalytic.average_score?.toFixed(1) ?? 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Submissions:</span>
            <span className="font-medium">
              {guideAnalytic.total_tests ?? 'N/A'}
            </span>
          </div>
          {/* Attempt Progression */}
          {(guideAnalytic.latest_test as LatestTest)?.attempts &&
            (guideAnalytic.latest_test as LatestTest).attempts!.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Latest Test Attempts:
                </h4>
                <div className="space-y-1">
                  {(guideAnalytic.latest_test as LatestTest)
                    .attempts!.slice(-5)
                    .map((attempt: Attempt) => (
                      <div
                        key={attempt.attempt_id || attempt.attempt_number}
                        className="flex justify-between items-center text-xs bg-gray-50 px-2 py-1 rounded"
                      >
                        <span className="text-gray-600">
                          Attempt {attempt.attempt_number}:
                        </span>
                        <span
                          className={`font-medium ${(attempt.accuracy ?? 0) >= 80 ? 'text-green-600' : 'text-amber-600'}`}
                        >
                          {attempt.accuracy?.toFixed(0) ?? 'N/A'}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          {/* Performance Chart */}
          <div className="pt-3 border-t border-gray-100 mt-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Performance Trend:
            </h4>
            {performanceError ? (
              <p className="text-xs text-red-600">Error loading chart.</p>
            ) : !performanceHistory ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      tick={{ fontSize: 10 }}
                      width={30}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      wrapperStyle={{ zIndex: 10 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="Accuracy"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center h-32 flex items-center justify-center">
                No performance history for chart.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
// --- End GuideAnalyticCard Inner Component ---

export default function DashboardPage() {
  const supabase = createClient();
  const [studyTimeView, setStudyTimeView] = useState<'day' | 'week' | 'month'>(
    'week'
  );
  const [isClaimingAnonymousSessions, setIsClaimingAnonymousSessions] =
    useState(false);
  const {
    user: userData,
    isLoading: userLoading,
    error: userError,
  } = useUser();

  const userId = userData?.id;

  // Use the consolidated dashboard data endpoint
  const {
    data: dashboardData,
    error: dashboardError,
    mutate: mutateDashboardData,
  } = useSWR(
    userId
      ? ENDPOINTS.dashboardData(userId, {
          // No session params needed here
        })
      : null,
    fetcher,
    {
      // Keep basic SWR config, removed activity-based refresh
      refreshInterval: 60000,
      revalidateOnFocus: true,
      dedupingInterval: 10000,
      onError: (err) => {
        console.error('Error fetching dashboard data:', err);
      },
    }
  );

  // Extract data from the consolidated response
  const rawMasteryData = dashboardData?.topic_mastery;
  const enhancedStudyHours = dashboardData?.study_hours; // Now contains testing time
  const testAnalytics = dashboardData?.test_analytics;
  const allGuideAnalytics = dashboardData?.guide_analytics
    ? { study_guides: dashboardData.guide_analytics }
    : null;
  const studyGuidesResponse = dashboardData?.study_guides
    ? { study_guides: dashboardData.study_guides }
    : null;

  // Convert study guides to the format expected by the rest of the component
  const studyGuides = useMemo<DashboardGuide[]>(() => {
    if (!dashboardData?.study_guides || !dashboardData?.guide_analytics)
      return [];

    // Create a map for fast lookup of analytics by guide ID
    const analyticsMap = new Map();
    dashboardData.guide_analytics.forEach((guide: GuideAnalytics) => {
      analyticsMap.set(guide.study_guide_id, guide);
    });

    // Convert study guides with analytics
    const guides = dashboardData.study_guides
      .filter((guide: { study_guide_id: string; title: string }) =>
        analyticsMap.has(guide.study_guide_id)
      )
      .map((guide: { study_guide_id: string; title: string }) => {
        const analytics = analyticsMap.get(guide.study_guide_id);
        return {
          id: guide.study_guide_id,
          title: guide.title,
          description: `Study guide for ${guide.title}`,
          progress: analytics?.average_accuracy || 0,
          type: 'regular' as const,
        };
      });

    return guides;
  }, [dashboardData]);

  // Process mastery data for topic mastery tab
  const groupedMasteryData = useMemo(() => {
    if (!rawMasteryData?.mastery_data?.study_guides) return {};

    const grouped: GroupedMasteryData = {};

    // Ensure correct typing for iteration
    const guidesToProcess = rawMasteryData.mastery_data
      .study_guides as RawMasteryStudyGuide[];

    // Iterate through guides
    for (const guide of guidesToProcess) {
      // Use the correctly typed variable
      if (!grouped[guide.study_guide_id]) {
        grouped[guide.study_guide_id] = {
          title: guide.study_guide_title,
          chapters: {},
        };
      }

      for (const chapter of guide.chapters as RawTopicChapter[]) {
        if (!grouped[guide.study_guide_id].chapters[chapter.chapter_title]) {
          grouped[guide.study_guide_id].chapters[chapter.chapter_title] = {
            sections: [],
          };
        }

        for (const section of chapter.sections as RawTopicSection[]) {
          const userSubmissions = (
            section.submissions as RawTopicSubmission[]
          ).filter((sub) => sub.user_id === userId);

          if (userSubmissions.length > 0) {
            const sortedSubmissions = [...userSubmissions].sort(
              (a, b) =>
                new Date(b.last_interaction).getTime() -
                new Date(a.last_interaction).getTime()
            );
            const latestSubmission = sortedSubmissions[0];

            grouped[guide.study_guide_id].chapters[
              chapter.chapter_title
            ].sections.push({
              studyGuideTitle: guide.study_guide_title,
              studyGuideId: guide.study_guide_id,
              chapterTitle: chapter.chapter_title,
              sectionTitle: section.section_title,
              masteryScore: latestSubmission.mastery_score,
              accuracy: latestSubmission.accuracy_rate,
              confidence: latestSubmission.confidence_score,
              recency: latestSubmission.recency_weight * 100,
              questionCount: latestSubmission.question_exposure_count,
              lastInteraction: new Date(latestSubmission.last_interaction),
            });
          }
        }
        grouped[guide.study_guide_id].chapters[
          chapter.chapter_title
        ].sections.sort((a, b) => b.masteryScore - a.masteryScore);
      }
    }
    return grouped;
  }, [rawMasteryData, userId]);

  // Check if user is new based on *testing* time
  const isNewUser = useMemo(() => {
    if (!enhancedStudyHours) return true;
    return enhancedStudyHours.total_hours === 0;
  }, [enhancedStudyHours]);

  const userName =
    userData?.user_metadata?.full_name ||
    userData?.user_metadata?.name ||
    userData?.user_metadata?.display_name ||
    userData?.email?.split('@')[0] ||
    'Student';

  // Generate default values for the accordion to have all items open
  const defaultAccordionValues = useMemo(() => {
    return Object.keys(groupedMasteryData).map((_, index) => `guide-${index}`);
  }, [groupedMasteryData]);

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

  return (
    <MathJaxContext config={mathJaxConfig}>
      <RouteGuard requireAuth>
        <div className="flex min-h-screen flex-col bg-[var(--color-background-alt)]">
          <Header />
          <main className="flex-1">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12 text-center"
              >
                <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                  Welcome back, {userName}!
                </h1>
                <p className="text-xl text-gray-600">
                  Let&apos;s boost your learning today
                </p>
              </motion.div>

              {!dashboardData && !dashboardError ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
                  <p className="text-lg text-gray-600">
                    Loading your dashboard...
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  <Tabs defaultValue="overall" className="mb-12">
                    <TabsList className="flex w-full border-b border-gray-200 mb-6 p-0 bg-transparent space-x-8">
                      <TabsTrigger
                        value="overall"
                        className="px-1 py-2 text-gray-600 data-[state=active]:text-[var(--color-primary)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-primary)] rounded-none bg-transparent hover:text-[var(--color-primary)] transition-colors"
                      >
                        Overall Stats
                      </TabsTrigger>
                      <TabsTrigger
                        value="guide-specific"
                        className="px-1 py-2 text-gray-600 data-[state=active]:text-[var(--color-primary)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-primary)] rounded-none bg-transparent hover:text-[var(--color-primary)] transition-colors"
                      >
                        Guide-Specific Stats
                      </TabsTrigger>
                      <TabsTrigger
                        value="topic-mastery"
                        className="px-1 py-2 text-gray-600 data-[state=active]:text-[var(--color-primary)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-primary)] rounded-none bg-transparent hover:text-[var(--color-primary)] transition-colors"
                      >
                        Topic Mastery
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overall">
                      <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="space-y-8"
                      >
                        <motion.div
                          variants={fadeInUp}
                          className="grid gap-8 md:grid-cols-3 mb-12"
                        >
                          <motion.div
                            variants={fadeInUp}
                            className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden rounded-lg"
                          >
                            <CardContent className="p-6 relative">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[var(--color-primary)]/20 to-purple-300/20 rounded-bl-full"></div>
                              <Clock className="h-8 w-8 text-[var(--color-primary)] mb-4" />
                              <CardTitle className="text-lg font-semibold text-gray-700 mb-2">
                                Total Study Time
                              </CardTitle>
                              <div className="flex flex-col">
                                {enhancedStudyHours?.total_hours === 0 ? (
                                  <div className="space-y-2">
                                    <p className="text-gray-600">
                                      Complete some tests to see total time.
                                    </p>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-baseline">
                                      <span className="text-4xl font-bold text-gray-900">
                                        {enhancedStudyHours?.total_hours}
                                      </span>
                                      <span className="ml-2 text-gray-600">
                                        hours total
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </CardContent>
                          </motion.div>

                          <motion.div
                            variants={fadeInUp}
                            className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden rounded-lg"
                          >
                            <CardContent className="p-6 relative">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-yellow-200/30 to-orange-300/30 rounded-bl-full"></div>
                              <Target className="h-8 w-8 text-yellow-500 mb-4" />
                              <CardTitle className="text-lg font-semibold text-gray-700 mb-2">
                                Average Score
                              </CardTitle>
                              <div className="flex items-baseline">
                                {testAnalytics?.average_score ? (
                                  <>
                                    <span className="text-4xl font-bold text-gray-900">
                                      {testAnalytics.average_score.toFixed(2)}
                                    </span>
                                    <span className="ml-2 text-gray-600">
                                      points
                                    </span>
                                  </>
                                ) : (
                                  <p className="text-gray-600">
                                    {Messages.NO_TEST_DATA}
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </motion.div>

                          <motion.div
                            variants={fadeInUp}
                            className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden rounded-lg"
                          >
                            <CardContent className="p-6 relative">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-200/30 to-emerald-300/30 rounded-bl-full"></div>
                              <Award className="h-8 w-8 text-green-500 mb-4" />
                              <CardTitle className="text-lg font-semibold text-gray-700 mb-2">
                                Tests Taken
                              </CardTitle>
                              <div className="flex items-baseline">
                                {testAnalytics?.total_tests ? (
                                  <>
                                    <span className="text-4xl font-bold text-gray-900">
                                      {testAnalytics.total_tests}
                                    </span>
                                    <span className="ml-2 text-gray-600">
                                      total
                                    </span>
                                  </>
                                ) : (
                                  <p className="text-gray-600">
                                    {Messages.NO_TEST_DATA}
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </motion.div>
                        </motion.div>

                        <motion.div
                          variants={fadeInUp}
                          className="grid gap-8 md:grid-cols-3"
                        >
                          <Card className="col-span-2 bg-white shadow-lg">
                            <CardHeader className="border-b border-gray-100">
                              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                                <Zap className="h-6 w-6 text-yellow-500 mr-2" />
                                Recently Missed Questions
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                              {testAnalytics?.recent_wrong_questions &&
                              testAnalytics.recent_wrong_questions.length >
                                0 ? (
                                <Accordion
                                  type="single"
                                  collapsible
                                  className="w-full"
                                >
                                  {testAnalytics.recent_wrong_questions.map(
                                    (q: WrongQuestion, index: number) => (
                                      <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                      >
                                        <AccordionItem
                                          value={`item-${index}`}
                                          className="border-b border-gray-100 last:border-0"
                                        >
                                          <AccordionTrigger className="text-sm text-gray-900 hover:no-underline py-4">
                                            <div className="flex items-center">
                                              <span className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded-full mr-3 text-xs font-medium">
                                                {index + 1}
                                              </span>
                                              {renderTextWithLatex(q.question)}
                                            </div>
                                          </AccordionTrigger>
                                          <AccordionContent>
                                            <div className="pl-9 pt-2 space-y-3">
                                              <div className="flex items-center text-sm bg-red-200 p-2 rounded">
                                                <X className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
                                                <span className="text-gray-900 ml-1">
                                                  {q.user_choice}.{' '}
                                                  {renderTextWithLatex(
                                                    q.user_answer_text
                                                  )}
                                                </span>
                                              </div>
                                              <div className="flex items-center text-sm bg-green-200 p-2 rounded">
                                                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                                <span className="text-gray-900 ml-1">
                                                  {q.correct_answer}.{' '}
                                                  {renderTextWithLatex(
                                                    q.correct_answer_text
                                                  )}
                                                </span>
                                              </div>
                                            </div>
                                          </AccordionContent>
                                        </AccordionItem>
                                      </motion.div>
                                    )
                                  )}
                                </Accordion>
                              ) : (
                                <div className="flex flex-col items-center justify-center py-6 text-gray-600">
                                  <p>{Messages.NO_TEST_DATA}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          <Card className="bg-white shadow-lg">
                            <CardHeader className="border-b border-gray-100">
                              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                                <Target className="h-6 w-6 text-[var(--color-primary)] mr-2" />
                                Weekly Progress
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                              {testAnalytics?.weekly_progress &&
                              testAnalytics.weekly_progress.length > 0 ? (
                                <div className="space-y-6">
                                  {testAnalytics.weekly_progress.map(
                                    (week: WeeklyProgress, index: number) => (
                                      <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                      >
                                        <div className="flex justify-between items-center mb-2">
                                          <span className="text-sm font-medium text-gray-600">
                                            Week Starting:{' '}
                                            {new Date(
                                              week.week_start
                                            ).toLocaleDateString('en-US', {
                                              month: 'short',
                                              day: 'numeric',
                                              year: 'numeric',
                                            })}
                                          </span>
                                          <span className="text-sm font-bold text-[var(--color-primary)]">
                                            {week.average_accuracy.toFixed(2)}%
                                          </span>
                                        </div>
                                        <Progress
                                          value={week.average_accuracy}
                                          className="h-2"
                                        />
                                      </motion.div>
                                    )
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center py-6 text-gray-600">
                                  <p>{Messages.INSUFFICIENT_DATA}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          <Card className="col-span-3 bg-white shadow-lg hover:shadow-xl transition-all duration-300">
                            <CardHeader className="border-b border-gray-100 py-4">
                              <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                                <GraduationCap className="h-5 w-5 text-[var(--color-primary)] mr-2" />
                                Latest Test Results
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                              {!testAnalytics && !dashboardError ? (
                                <div className="flex flex-col items-center justify-center py-6">
                                  <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
                                  <p className="mt-3 text-sm text-gray-600">
                                    Loading latest results...
                                  </p>
                                </div>
                              ) : testAnalytics?.latest_test ? (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <div className="mb-4">
                                    <p className="text-xs text-gray-500">
                                      Completed on{' '}
                                      {new Date(
                                        testAnalytics.latest_test.attempts?.[
                                          testAnalytics.latest_test.attempts
                                            .length - 1
                                        ]?.submitted_at ??
                                          testAnalytics.latest_test.submitted_at
                                      ).toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: 'numeric',
                                        hour12: true,
                                      })}
                                    </p>
                                  </div>

                                  <motion.div
                                    variants={staggerContainer}
                                    initial="initial"
                                    animate="animate"
                                    className="grid gap-4 md:grid-cols-3 mb-4"
                                  >
                                    <motion.div
                                      variants={fadeInUp}
                                      className="bg-white border hover:shadow-md transition-all duration-300 rounded-lg p-4 relative"
                                    >
                                      <Percent className="h-6 w-6 text-[var(--color-primary)] mb-2" />
                                      <h4 className="text-base font-semibold text-gray-700 mb-1">
                                        Accuracy
                                      </h4>
                                      <div className="flex items-baseline">
                                        <span className="text-2xl font-bold text-gray-900">
                                          {(
                                            testAnalytics.latest_test
                                              .attempts?.[
                                              testAnalytics.latest_test.attempts
                                                .length - 1
                                            ]?.accuracy ??
                                            testAnalytics.latest_test.accuracy
                                          ).toFixed(0)}
                                          %
                                        </span>
                                      </div>
                                      <p className="mt-1 text-xs text-gray-600">
                                        (
                                        {testAnalytics.latest_test.attempts?.[
                                          testAnalytics.latest_test.attempts
                                            .length - 1
                                        ]?.score ??
                                          testAnalytics.latest_test.score}
                                        /
                                        {
                                          testAnalytics.latest_test
                                            .total_questions
                                        }{' '}
                                        correct)
                                      </p>
                                    </motion.div>

                                    <motion.div
                                      variants={fadeInUp}
                                      className="bg-white border hover:shadow-md transition-all duration-300 rounded-lg p-4 relative"
                                    >
                                      <Timer className="h-6 w-6 text-yellow-500 mb-2" />
                                      <h4 className="text-base font-semibold text-gray-700 mb-1">
                                        Time Spent
                                      </h4>
                                      <div className="flex items-baseline">
                                        <span className="text-2xl font-bold text-gray-900">
                                          {formatTime(
                                            testAnalytics.latest_test
                                              .attempts?.[
                                              testAnalytics.latest_test.attempts
                                                .length - 1
                                            ]?.time_taken ??
                                              testAnalytics.latest_test
                                                .time_taken ??
                                              0
                                          )}
                                        </span>
                                        {(testAnalytics.latest_test.attempts?.[
                                          testAnalytics.latest_test.attempts
                                            .length - 1
                                        ]?.time_taken ??
                                          testAnalytics.latest_test
                                            .time_taken ??
                                          0) < 60 && (
                                          <span className="ml-1 text-xs text-gray-600">
                                            seconds
                                          </span>
                                        )}
                                      </div>
                                    </motion.div>

                                    <motion.div
                                      variants={fadeInUp}
                                      className="bg-white border hover:shadow-md transition-all duration-300 rounded-lg p-4 relative"
                                    >
                                      <Activity className="h-6 w-6 text-blue-500 mb-2" />
                                      <h4 className="text-base font-semibold text-gray-700 mb-1">
                                        Total Attempts
                                      </h4>
                                      <div className="flex items-baseline">
                                        <span className="text-2xl font-bold text-gray-900 capitalize">
                                          {testAnalytics.latest_test
                                            .total_attempts ?? 1}
                                        </span>
                                      </div>
                                    </motion.div>
                                  </motion.div>
                                </motion.div>
                              ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-gray-600">
                                  <GraduationCap className="h-12 w-12 text-gray-400 mb-4" />
                                  <p className="text-lg">
                                    {Messages.NO_TEST_RESULTS}
                                  </p>
                                  <p className="text-sm text-gray-500 mt-1">
                                    Complete a test to see your results here
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      </motion.div>
                    </TabsContent>

                    <TabsContent value="guide-specific">
                      {!dashboardData?.guide_analytics && !dashboardError ? (
                        <div className="flex justify-center items-center p-10">
                          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
                          <p className="ml-3 text-lg text-gray-600">
                            Loading Guide Stats...
                          </p>
                        </div>
                      ) : !dashboardData?.guide_analytics ||
                        dashboardData.guide_analytics.length === 0 ? (
                        <p className="text-gray-600 text-center py-10">
                          No guide-specific analytics available yet. Complete
                          some quizzes!
                        </p>
                      ) : (
                        <motion.div
                          variants={staggerContainer}
                          initial="initial"
                          animate="animate"
                          className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3" // Adjust grid layout as needed
                        >
                          {/* Map over analytics and render the inner component */}
                          {dashboardData.guide_analytics.map(
                            (guideAnalytic: GuideAnalytics, index: number) => (
                              <GuideAnalyticCard
                                key={guideAnalytic.study_guide_id || index}
                                guideAnalytic={guideAnalytic}
                                userId={userId}
                              />
                            )
                          )}
                        </motion.div>
                      )}
                    </TabsContent>

                    <TabsContent value="topic-mastery">
                      {!rawMasteryData && !dashboardError ? (
                        <div className="flex justify-center items-center p-10">
                          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
                          <p className="ml-3 text-lg text-gray-600">
                            Loading Topic Mastery...
                          </p>
                        </div>
                      ) : Object.keys(groupedMasteryData).length === 0 ? (
                        <p className="text-gray-600 text-center">
                          No topic mastery data available yet. Complete some
                          quizzes!
                        </p>
                      ) : (
                        <Accordion
                          type="multiple"
                          defaultValue={defaultAccordionValues}
                          className="w-full space-y-4"
                        >
                          {Object.entries(groupedMasteryData).map(
                            ([guideId, guideData], guideIndex) => (
                              <AccordionItem
                                key={guideId}
                                value={`guide-${guideId}`}
                                className="bg-white rounded-lg shadow-sm border border-gray-200"
                              >
                                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                                  <span className="text-lg font-semibold text-gray-800">
                                    {guideData.title}
                                  </span>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-6 pt-0">
                                  {Object.keys(guideData.chapters).length ===
                                  0 ? (
                                    <p className="text-gray-500 pt-4 border-t border-gray-100">
                                      No chapter data for this guide yet.
                                    </p>
                                  ) : (
                                    <div className="space-y-4 pt-4 border-t border-gray-100">
                                      {Object.entries(guideData.chapters).map(
                                        ([chapterTitle, chapterData]) => (
                                          <div key={chapterTitle}>
                                            <h3 className="text-md font-semibold text-gray-700 mb-3">
                                              {chapterTitle}
                                            </h3>
                                            {chapterData.sections.length ===
                                            0 ? (
                                              <p className="text-sm text-gray-500 pl-2">
                                                No section data for this chapter
                                                yet.
                                              </p>
                                            ) : (
                                              <motion.div
                                                variants={staggerContainer}
                                                initial="initial"
                                                animate="animate"
                                                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                                              >
                                                {chapterData.sections.map(
                                                  (mastery) => (
                                                    <motion.div
                                                      key={`${mastery.studyGuideId}-${mastery.chapterTitle}-${mastery.sectionTitle}`}
                                                      variants={fadeInUp}
                                                    >
                                                      <TopicMasteryCard
                                                        studyGuideTitle={
                                                          mastery.studyGuideTitle
                                                        }
                                                        sectionTitle={
                                                          mastery.sectionTitle
                                                        }
                                                        masteryScore={
                                                          mastery.masteryScore
                                                        }
                                                        accuracy={
                                                          mastery.accuracy
                                                        }
                                                        recency={
                                                          mastery.recency
                                                        }
                                                        confidence={
                                                          mastery.confidence
                                                        }
                                                        questionCount={
                                                          mastery.questionCount
                                                        }
                                                        lastInteraction={
                                                          mastery.lastInteraction
                                                        }
                                                      />
                                                    </motion.div>
                                                  )
                                                )}
                                              </motion.div>
                                            )}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  )}
                                </AccordionContent>
                              </AccordionItem>
                            )
                          )}
                        </Accordion>
                      )}
                    </TabsContent>
                  </Tabs>
                </AnimatePresence>
              )}
            </div>
          </main>
        </div>
      </RouteGuard>
    </MathJaxContext>
  );
}
