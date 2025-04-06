/*
 * Copyright (c) 2025 SSP Team (Peyton, Alex, Jackson, Yousif)
 */

export interface Topic {
  id: number;
  title: string;
  description: string;
  progress: number;
  module_id: string;
}

export interface Concept {
  concept?: string;
  text?: string;
}

export interface Section {
  title: string;
  concepts: Concept[];
  completed?: boolean;
  locked?: boolean;
}

export interface Chapter {
  title: string;
  sections: Section[];
}

export interface StudyGuide {
  title: string;
  id: string;
  practice_tests: PracticeTest[];
}

export interface StudyGuideResponse {
  study_guide_id?: string;
  _id?: string;
}

export interface SlidesGuide {
  _id: string;
  title: string;
  description?: string;
  slides?: SlideContent[];
  topics?: SlideTopic[];
  quizzes?: SlideQuiz[];
}

export interface SlideContent {
  title: string;
  content: string;
  order?: number;
}

export interface SlideTopic {
  title: string;
  description?: string;
  key_points?: (Concept | string)[];
  explanation?: string;
  source_pages?: number[];
  source_texts?: string[];
  topic_prerequisites?: string[];
  quizzes?: {
    topic: string;
    quizzes: {
      multiple_choice?: SlideQuestion[];
      short_answer?: ShortAnswerSlideQuestion[];
    };
  }[];
}

export interface SlideQuestion {
  question: string;
  choices?: Record<string, string>;
  correct: string;
  explanation: string;
  source_page?: number;
  source_text?: string;
}

export interface SlideQuiz {
  title: string;
  questions: SlideQuestion[];
}

export interface ShortAnswerSlideQuestion {
  question: string;
  ideal_answer: string;
  source_page?: number;
  source_text?: string;
}

export interface SlidePracticeTest {
  practice_test_id: string;
  study_guide_id: string;
  study_guide_title: string;
  section_title: string;
  questions: SlideQuestion[];
  guide_type: 'slides';
  short_answer?: ShortAnswerSlideQuestion[];
}

export interface PracticeTest {
  section_title: string;
  practice_test_id: string;
}

export interface PracticeTestsData {
  practice_tests: PracticeTest[];
}

export interface ProgressMap {
  [key: string]: number;
}

export interface TestMap {
  [key: string]: string;
}

export interface SlidesGuideListItem {
  _id: string;
  title: string;
  description?: string;
  topics?: { title: string }[];
  slides?: { title: string; content: string }[];
  fromAnalytics?: boolean;
}

export interface SlidesGuideListResponse {
  study_guides: SlidesGuideListItem[];
  message?: string;
}

export interface DashboardGuide {
  id: string;
  title: string;
  description: string;
  progress: number;
  type: 'regular' | 'slides';
}

// Interface for the consolidated data response from the new API endpoint
export interface ConsolidatedGuidesResponse {
  regular_guides: {
    study_guide_id: string;
    title: string;
  }[];
  slides_guides: SlidesGuideListItem[];
  guide_analytics: any[]; // Using 'any' for flexibility with the analytics data structure
  regular_guide_tests: {
    [title: string]: PracticeTest[];
  };
  slides_guide_tests: {
    [guide_id: string]: SlidePracticeTest[];
  };
  completed_tests: {
    test_id: string;
    study_guide_id: string;
    score: number;
    accuracy: number;
    submitted_at: string;
  }[];
  guide_progress: {
    [guide_id_or_title: string]: number;
  };
}
