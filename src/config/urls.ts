// Use environment variable for API URL
export const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const ENDPOINTS = {
  studyGuide: (title: string) =>
    `${API_URL}/api/study-guide/${encodeURIComponent(title)}`,
  studyGuides: `${API_URL}/api/study-guide/all`,
  slidesGuides: `${API_URL}/api/study-guide/slides`,
  slidesGuide: (guideId: string) =>
    `${API_URL}/api/study-guide/slides/${encodeURIComponent(guideId)}`,
  slidesPracticeTests: (guideId: string) =>
    `${API_URL}/api/study-guide/practice/guide/slides/${encodeURIComponent(guideId)}`,
  generateSlidesPracticeTests: `${API_URL}/api/study-guide/slides/generate-practices`,
  studyHours: (userId: string) =>
    `${API_URL}/api/user/study-hours/${encodeURIComponent(userId)}`,
  enhancedStudyHours: (
    userId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      includeOngoing?: boolean;
      aggregateBy?: 'day' | 'week' | 'month';
      includeAnonymous?: boolean;
    }
  ) => {
    let url = `${API_URL}/api/user/study-hours/${encodeURIComponent(userId)}`;
    const params = new URLSearchParams();

    if (options?.startDate) params.append('start_date', options.startDate);
    if (options?.endDate) params.append('end_date', options.endDate);
    if (options?.includeOngoing !== undefined)
      params.append('include_ongoing', options.includeOngoing.toString());
    if (options?.aggregateBy)
      params.append('aggregate_by', options.aggregateBy);
    if (options?.includeAnonymous !== undefined)
      params.append('include_anonymous', options.includeAnonymous.toString());

    const paramString = params.toString();
    if (paramString) url += `?${paramString}`;

    return url;
  },
  practiceTests: (title: string) =>
    `${API_URL}/api/study-guide/practice/guide/${encodeURIComponent(title)}`,
  practiceTest: (testId: string) =>
    `${API_URL}/api/study-guide/practice/${testId}`,
  testAnalytics: (userId: string) =>
    `${API_URL}/api/user/test-analytics/${encodeURIComponent(userId)}`,
  guideAnalytics: (userId: string, guideId: string) =>
    `${API_URL}/api/user/test-analytics/${encodeURIComponent(userId)}/${encodeURIComponent(guideId)}`,
  allGuideAnalytics: (userId: string) =>
    `${API_URL}/api/user/test-analytics/all/${encodeURIComponent(userId)}`,
  testResults: (userId: string, testId?: string) =>
    testId
      ? `${API_URL}/api/study-guide/practice/results/${userId}/${testId}`
      : `${API_URL}/api/study-guide/practice/results/${userId}`,
  guidePerformance: (guideId: string, userId?: string) =>
    userId
      ? `${API_URL}/api/study-guide/results/guide/${encodeURIComponent(guideId)}?user_id=${encodeURIComponent(userId)}`
      : `${API_URL}/api/study-guide/results/guide/${encodeURIComponent(guideId)}`,
  submitTest: `${API_URL}/api/study-guide/practice/submit`,
  startSession: `${API_URL}/api/user/session/start`,
  endSession: `${API_URL}/api/user/session/end`,

  // Add new RAG endpoints
  ragChatHistory: `${API_URL}/api/rag/chat-history`,
  ragAnswerChat: `${API_URL}/api/rag/answer-chat`,
  ragFetchHint: `${API_URL}/api/rag/fetch-hint`,
  ragGenerateHint: `${API_URL}/api/rag/generate-hint`,

  // Add new endpoint for claiming anonymous sessions
  claimAnonymousSessions: `${API_URL}/api/user/claim-sessions`,

  // Add user creation endpoint
  createUser: `${API_URL}/api/user/create`,

  // Add auth status endpoint
  authStatus: (userId: string) =>
    `${API_URL}/api/user/auth-status?user_id=${encodeURIComponent(userId)}`,

  // Analytics endpoints
  userAnalytics: (userId: string) =>
    `${API_URL}/api/analytics/user/${encodeURIComponent(userId)}`,
  analyticsSummary: (userId: string) =>
    `${API_URL}/api/analytics/summary/${encodeURIComponent(userId)}`,
  updateStudyHours: (userId: string) =>
    `${API_URL}/api/analytics/study-hours/${encodeURIComponent(userId)}`,
  updateTestAnalytics: (userId: string) =>
    `${API_URL}/api/analytics/test/${encodeURIComponent(userId)}`,
  updateChatAnalytics: (userId: string) =>
    `${API_URL}/api/analytics/chat/${encodeURIComponent(userId)}`,
  updateHintAnalytics: (userId: string) =>
    `${API_URL}/api/analytics/hint/${encodeURIComponent(userId)}`,
};
