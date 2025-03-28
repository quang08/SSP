/*
 * Copyright (c) 2025 SSP Team (Peyton, Alex, Jackson, Yousif)
 */

export interface TimePeriod {
  period: string;
  hours: number;
  session_count: number;
}

export interface EnhancedStudyHours {
  user_id: string;
  total_hours: number;
  completed_hours: number;
  ongoing_hours: number;
  has_ongoing_session: boolean;
  message: string;
  time_periods: TimePeriod[];
}

export interface Test {
  id: string;
  name: string;
  duration: number;
  attempts: number;
  lastScore: number;
}

export interface Question {
  question: string;
  choices?: Record<string, string>;
  correct?: string;
  explanation?: string;
  source_page?: number;
  source_text?: string;
}

export interface ShortAnswerQuestion {
  question_id: string;
  question: string;
  ideal_answer: string;
  source_page?: number;
  source_text?: string;
}

export type QuestionType = 'multiple_choice' | 'short_answer';

export interface Quiz {
  section_title: string;
  questions: Question[];
  short_answer?: ShortAnswerQuestion[];
}

export interface CompletedTest {
  test_id: string;
  study_guide_id: string;
}

export interface TestResultsResponse {
  test_results: CompletedTest[];
}

export interface SelectedAnswers {
  [key: string]: string;
}

export interface SubmissionResult {
  submission_id: string;
}

export interface QuizQuestion {
  question_id: string;
  question: string;
  question_text?: string;
  options?: { [key: string]: string };
  choices?: { [key: string]: string };
  user_answer?: string;
  user_answer_text?: string;
  correct_answer?: string;
  correct_answer_text?: string;
  explanation?: string;
  is_correct?: boolean;
  notes?: string;
  source_page?: number;
  source_text?: string;
  question_type?: QuestionType;
  topic_id?: string;
  topic_name?: string;
  confidence_level?: number;
  ideal_answer?: string;
  feedback?: string;
  reference_part?: string;
  student_part?: string;
  judgment?: number;
}

export interface QuizResults {
  user_id: string;
  test_id: string;
  score: number;
  accuracy: number;
  status: string;
  questions: QuizQuestion[];
  time_taken: number;
}

export interface WrongQuestion {
  question_id: string;
  question: string;
  user_choice: string;
  user_answer_text: string;
  correct_answer: string;
  correct_answer_text: string;
}

export interface WeeklyProgress {
  week_start: string;
  average_accuracy: number;
}

export interface LatestTestQuestion {
  question_id: string;
  question: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
  notes: string;
}

export interface LatestTest {
  user_id: string;
  test_id: string;
  study_guide_id: string;
  questions: LatestTestQuestion[];
  score: number;
  accuracy: number;
  total_questions: number;
  attempt_number: number;
  time_taken: number;
  submitted_at: string;
  status: string;
}

export interface TestAnalytics {
  average_score: number;
  total_tests: number;
  recent_wrong_questions: WrongQuestion[];
  weekly_progress: WeeklyProgress[];
  latest_test: LatestTest;
}

export interface GuideAnalytics {
  user_id: string;
  study_guide_id: string;
  study_guide_title?: string;
  study_guide_description?: string;
  total_tests: number;
  average_score: number;
  average_accuracy: number;
  recent_wrong_questions: WrongQuestion[];
  weekly_progress: WeeklyProgress[];
  latest_test: TestSubmission | null;
  last_updated?: string;
  message?: string;
  guide_type?: 'slides' | 'regular';
}

export interface PerformanceDataPoint {
  submission_id: string;
  user_id: string;
  test_id: string;
  study_guide_id: string;
  score: number;
  accuracy: number;
  total_questions: number;
  attempt_number: number;
  time_taken: number;
  submitted_at: string;
  status: string;
}

export interface GuidePerformanceHistory {
  study_guide_id: string;
  test_results: PerformanceDataPoint[];
}
