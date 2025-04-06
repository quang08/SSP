# API Calls By Page

## practice/page.tsx
- `ENDPOINTS.studyGuides` - Fetch all study guides
- `ENDPOINTS.testResults(authUserId)` - Get completed tests data
- `ENDPOINTS.slidesGuides` - Fetch slides-based study guides
- `ENDPOINTS.allGuideAnalytics(authUserId)` - Get analytics for all guides
- `ENDPOINTS.slidesPracticeTests(guide._id)` - Fetch tests for slides guides
- `ENDPOINTS.practiceTests(guide.title)` - Fetch tests for regular guides

**Analysis:**
- Makes multiple API calls in a waterfall pattern within a single useEffect
- For each slide guide, makes individual API calls to `slidesPracticeTests` in a Promise.all loop
- For each regular guide, makes individual API calls to `practiceTests` in a Promise.all loop
- Potential inefficiency: Could have N+2 API calls where N is the number of guides
- Optimization opportunity: Consider backend endpoint to batch guide test data requests

## practice/guide/slides/[guideId]/page.tsx
- `ENDPOINTS.slidesGuide(guideId)` - Fetch specific slides guide data 
- `ENDPOINTS.slidesPracticeTests(guideId)` - Fetch practice tests for the guide
- `ENDPOINTS.testResults(userId)` - Get completed tests by the user
- `ENDPOINTS.generateSlidesPracticeTests` - Generate new practice tests

**Analysis:**
- Calls `testResults` both in a refreshData function and in the fetchPracticeTests function
- Sets up a window focus event listener to refresh test completion data
- Makes a conditional API call to generate practice tests when none exist
- Potential inefficiency: Duplicate calls to `testResults` endpoint when focus changes

## practice/guide/[title]/page.tsx
- `ENDPOINTS.studyGuide(title)` - Fetch specific study guide by title
- `ENDPOINTS.practiceTests(title)` - Fetch practice tests for guide
- `ENDPOINTS.testResults(userId)` - Get completed tests
- `ENDPOINTS.guideAnalytics(userId, studyGuide.study_guide_id)` - Get guide-specific analytics
- `/api/practice-tests/generate` - Backend endpoint to generate practice tests (POST)

**Analysis:**
- Uses useSWR for efficient data fetching with built-in caching
- Makes parallel API calls for study guide, practice tests, and completed tests data
- Conditionally fetches `guideAnalytics` only when user and study guide data are available
- Makes a POST request to generate tests only when user explicitly requests it
- Has a page reload after generating tests instead of refetching data with SWR
- Optimization opportunity: Refetch data with SWR instead of forcing page reload

## practice/guide/slides/[guideId]/quiz/[testId]/page.tsx
- `ENDPOINTS.practiceTest(testId)` - Fetch specific quiz/test data
- `ENDPOINTS.slidesGuide(guideId)` - Get slides guide data
- `ENDPOINTS.submitAdaptiveTest` - Submit adaptive test results
- `ENDPOINTS.submitTest` - Submit standard test results
- `ENDPOINTS.testStatus` - Check the status of a test in the mastery model
- `ENDPOINTS.topicStatus` - Get the status of a topic in the mastery model

**Analysis:**
- One-time API calls for quiz data and slides guide data via useSWR
- POST requests to submit test results only happen on user action (form submission)
- Handles retry functionality with attempt tracking
- Directs users to remediation page when needed based on submission results
- No apparent inefficiencies in call patterns

## practice/guide/slides/[guideId]/quiz/[testId]/results/page.tsx
- `ENDPOINTS.testResults(userId, submissionId)` - Fetch specific test submission results
- `ENDPOINTS.topicSpecificMastery` - Get topic-specific mastery data
- `ENDPOINTS.retryTest` - Request a test retry

**Analysis:**
- Fetches test results using the submission ID from URL parameters
- Makes conditional API calls to mastery endpoints based on availability of submission data
- Makes POST request to retry endpoint only on user action

## practice/guide/slides/[guideId]/quiz/[testId]/remediation/page.tsx
- `ENDPOINTS.getRemediation` - Fetch remediation content for a specific submission
- `ENDPOINTS.markRemediationViewed` - Mark remediation as viewed
- `ENDPOINTS.retryTest` - Request to retry the test after remediation

**Analysis:**
- Fetches remediation content using submission ID from URL parameters
- Makes POST request to mark remediation as viewed when user completes viewing
- Offers retry functionality after remediation is completed

## practice/guide/[title]/quiz/[testId]/page.tsx
- `ENDPOINTS.practiceTest(testId)` - Fetch specific quiz data
- `ENDPOINTS.studyGuide(title)` - Get study guide data 
- `ENDPOINTS.submitAdaptiveTest` - Submit adaptive test results
- `ENDPOINTS.submitTest` - Submit standard test results

**Analysis:**
- Uses useSWR to fetch user data, quiz content, and study guide data in parallel
- Makes all required fetch calls on initial load, with no conditional or duplicate fetching
- Makes a POST request to submit test results only when user completes the quiz
- Detailed console logging for submission payload which might impact performance slightly
- Has efficient error handling with proper error displays to users
- Detects the test type (adaptive vs standard) and uses the appropriate submission endpoint
- Potential optimization: Reuse study guide data from previous page navigation context instead of fetching again

## dashboard/page.tsx
- `ENDPOINTS.topicMastery(userId)` - Fetch user's topic mastery data
- `ENDPOINTS.enhancedStudyHours(userId, {...options})` - Get study hours with aggregation options
- `ENDPOINTS.testAnalytics(userId)` - Fetch user's test analytics
- `ENDPOINTS.allGuideAnalytics(userId)` - Get analytics for all guides
- `ENDPOINTS.studyGuides` - Fetch all study guides
- `ENDPOINTS.guideAnalytics(userId, selectedGuide.id)` - Get analytics for a specific guide (fallback)
- `ENDPOINTS.claimAnonymousSessions` - POST request to claim anonymous study sessions
- `ENDPOINTS.startSession` - POST request to start a new user session

**Analysis:**
- Uses useSWR for most API calls, which provides caching and deduplication
- Sets up polling for `enhancedStudyHours` with refreshInterval of 60000ms (every minute)
- Has a fallback mechanism for `guideAnalytics` if `allGuideAnalytics` fails
- Makes a POST request to `startSession` automatically if no session exists
- Potential inefficiency: The 60-second polling interval for study hours may create excessive calls during idle periods

Note: All endpoints are prefixed with the base API URL configured in the environment variables. Most calls include authentication headers using Supabase tokens.

## Summary of Potential Issues
1. **practice/page.tsx**: High number of individual API calls based on guide count
2. **practice/guide/slides/[guideId]/page.tsx**: Duplicate calls to `testResults` on window focus events
3. **dashboard/page.tsx**: Continuous polling for study hours data
4. Multiple pages fetch the same data (like study guides) that could be shared via global state management
5. **practice/guide/slides/[guideId]/quiz/[testId]/page.tsx**: No caching for remediation content and mastery data

## Detailed Analysis of Excessive API Calls

### 1. practice/page.tsx - N+2 API Call Pattern
This page makes at minimum 2 API calls (studyGuides and testResults) plus N additional API calls where N is the number of guides:
- One call to fetch all study guides
- One call to fetch completed tests data
- One call to fetch slides-based study guides
- One call for analytics to know which guides have stats
- For each slide guide: One call to fetch progress data (slidesPracticeTests)
- For each regular guide: One call to fetch practice tests (practiceTests)

With 10 guides, this could result in 22+ API calls on a single page load, creating significant network overhead and potential performance issues, especially on slower connections.

### 2. practice/guide/slides/[guideId]/page.tsx - Duplicate Window Focus Calls
This page implements a window focus event listener that triggers API calls to refresh data:
```typescript
// Sets up duplicative calls on window focus
const handleFocus = () => {
  refreshData();
};

useEffect(() => {
  window.addEventListener('focus', handleFocus);
  return () => {
    window.removeEventListener('focus', handleFocus);
  };
}, []);
```
The `refreshData` function makes calls to `testResults` endpoint, which is also called during the initial page load and in `fetchPracticeTests`. This creates duplicate calls whenever a user switches tabs and returns to the application.

### 3. dashboard/page.tsx - Continuous Polling
This page implements a 60-second polling interval for study hours data:
```typescript
const { data: studyHoursData } = useSWR(
  userId ? ENDPOINTS.enhancedStudyHours(userId, {...options}) : null,
  fetcher,
  { refreshInterval: 60000 } // Every 60 seconds
);
```
While this ensures fresh data, it creates unnecessary network traffic during periods of user inactivity. The polling continues even when the user is not actively using the dashboard.

### 4. practice/guide/slides/[guideId]/quiz/[testId]/page.tsx - Mastery Status Checking
This page potentially makes excessive API calls to check test and topic prerequisites:
```typescript
// For each topic, check prerequisites
useEffect(() => {
  if (slidesGuide?.topics) {
    slidesGuide.topics.forEach((topic: SlideTopic) => {
      checkTopicPrerequisites(topic.title);
    });
  }
}, [slidesGuide]);

// For each test, check lock status
useEffect(() => {
  const checkTestLockStatus = async () => {
    for (const topic of slidesGuide.topics) {
      const topicTests = getTestsByTopic(topic.title);
      for (const test of topicTests) {
        // API call to ENDPOINTS.testStatus
      }
    }
  };
  checkTestLockStatus();
}, [practiceTests, slidesGuide]);
```
This creates a quadratic relationship between topics and tests, potentially making T×P API calls (where T is the number of topics and P is the average number of tests per topic).

## Optimization Recommendations
1. Implement backend endpoints that batch related data requests
2. Use global state management (Redux, Zustand, Context) to share common data
3. Adjust polling intervals based on user activity rather than fixed timers
4. Consider using websockets for real-time updates instead of polling
5. Implement proper caching for remediation content and mastery data
6. Consider preloading potential retry and remediation data during test submission

# Review of API Documentation Accuracy

Let me check if the API calls documentation is accurate based on the code files provided.

## Fe/src/app/practice/page.tsx
The documentation correctly identifies all API calls:
- ENDPOINTS.studyGuides
- ENDPOINTS.testResults(authUserId)
- ENDPOINTS.slidesGuides
- ENDPOINTS.allGuideAnalytics(authUserId)
- ENDPOINTS.slidesPracticeTests(guide._id)
- ENDPOINTS.practiceTests(guide.title)

The analysis about waterfall pattern and N+2 API calls is accurate.

## Fe/src/app/practice/guide/slides/[guideId]/quiz/[testId]/page.tsx
The documentation lists these endpoints:
- ENDPOINTS.practiceTest(testId)
- ENDPOINTS.slidesGuide(guideId)
- ENDPOINTS.submitAdaptiveTest
- ENDPOINTS.submitTest
- ENDPOINTS.testStatus
- ENDPOINTS.topicStatus

However, I don't see explicit references to ENDPOINTS.testStatus or ENDPOINTS.topicStatus in the provided code. The file does make calls to checkTestPrerequisites and checkTopicPrerequisites functions, but I don't see direct API calls to these endpoints in the provided code.

## Fe/src/app/practice/guide/slides/[guideId]/quiz/[testId]/results/page.tsx
The documentation lists:
- ENDPOINTS.testResults(userId, submissionId)
- ENDPOINTS.topicSpecificMastery
- ENDPOINTS.retryTest

The code shows:
- ENDPOINTS.testResults(authUserId, testId)
- ENDPOINTS.masteryThresholds
- ENDPOINTS.retryTest

The code doesn't explicitly call ENDPOINTS.topicSpecificMastery that I can see, and it does call ENDPOINTS.masteryThresholds which isn't mentioned in the documentation.

## Missing Documentation
There's no section in api_calls.md for these files we can see in the outlines:
- fe/src/app/dashboard/page.tsx - Only function declarations are shown in the outline, but the documentation mentions API calls for this page without showing the actual code

## Fe/src/app/practice/guide/slides/[guideId]/page.tsx
The documentation correctly identifies that this page uses:
- ENDPOINTS.testStatus
- ENDPOINTS.topicStatus

Looking at the code from the search results, these endpoints are used in:
- checkTestPrerequisites function (line ~295) - ENDPOINTS.testStatus
- checkTopicPrerequisites function (line ~406) - ENDPOINTS.topicStatus
- checkTestLockStatus function (line ~452) - ENDPOINTS.testStatus

The api_calls.md was correct about these endpoints, though they weren't visible in the initially provided code snippets.

## Fe/src/app/practice/guide/slides/[guideId]/quiz/[testId]/results/page.tsx
From the search results, I see the ENDPOINTS configuration in urls.ts includes:
- topicSpecificMastery endpoint (line ~105)
- masteryThresholds endpoint (line ~139)

This confirms the documentation is correct about topicSpecificMastery, and I also saw masteryThresholds in the code.

## Overall Updated Assessment
The documentation in api_calls.md is more accurate than I initially thought:

1. It correctly identifies ENDPOINTS.testStatus and ENDPOINTS.topicStatus which are used in the slides guide page
2. It correctly identifies ENDPOINTS.topicSpecificMastery which may be used in the results page
3. It's still missing ENDPOINTS.masteryThresholds in the results page section

The analysis of API call patterns and potential inefficiencies appears to be well-founded and aligns with the code structure.

# Dashboard API Calls Documentation

## fe/src/app/dashboard/page.tsx
This page makes the following API calls:

- `fetcher('user')` - Fetches user data from Supabase auth
- `ENDPOINTS.topicMastery(userId)` - Fetches mastery data for topics
- `ENDPOINTS.enhancedStudyHours(userId, {...options})` - Fetches study hours with aggregation options and continuous polling
  ```typescript
  useSWR<EnhancedStudyHours>(
    userId ? ENDPOINTS.enhancedStudyHours(userId, {
      includeOngoing: true,
      aggregateBy: studyTimeView,
      includeAnonymous: false,
    }) : null,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true
    }
  );
  ```
- `ENDPOINTS.testAnalytics(userId)` - Fetches test analytics data
- `ENDPOINTS.allGuideAnalytics(userId)` - Fetches analytics for all study guides in one request
- `ENDPOINTS.studyGuides` - Fetches all study guides
- `ENDPOINTS.guideAnalytics(userId, selectedGuide.id)` - Falls back to individual guide analytics if allGuideAnalytics fails:
  ```typescript
  const { data: individualGuideAnalytics, error: guideAnalyticsError } = useSWR(
    userId && selectedGuide?.id && !selectedGuideAnalytics
      ? ENDPOINTS.guideAnalytics(userId, selectedGuide.id)
      : null,
    fetcher
  );
  ```
- `ENDPOINTS.claimAnonymousSessions` - POST request to claim anonymous study sessions
- `ENDPOINTS.startSession` - POST request to start a new user session

**Analysis:**
- Uses SWR for most API calls providing efficient caching and deduplication
- Implements 60-second polling for study hours data which could create excessive network traffic during idle periods
- Makes parallel API calls for different data types (study hours, test analytics, guide analytics)
- Has a fallback mechanism for guide analytics if the bulk fetch fails
- Makes conditional API calls based on user state and tab selection
- Manually initiates session via POST if no session exists
- Auto-refreshes study hours data which could lead to unnecessary API calls:
  ```typescript
  const interval = setInterval(() => {
    if (enhancedStudyHours) {
      console.log('Auto-refreshing study hours data');
      mutateStudyHours();
    }
  }, 60000);
  ```

The page uses appropriate error handling and loading states for each data type, but the continuous polling and auto-refresh for study hours could be optimized to reduce unnecessary network traffic.
