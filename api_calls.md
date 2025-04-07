# API Calls By Page

## practice/page.tsx [Done]
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

## practice/guide/slides/[guideId]/page.tsx [Done]
- `ENDPOINTS.slidesGuide(guideId)` - Fetch specific slides guide data 
- `ENDPOINTS.slidesPracticeTests(guideId)` - Fetch practice tests for the guide
- `ENDPOINTS.testResults(userId)` - Get completed tests by the user
- `ENDPOINTS.generateSlidesPracticeTests` - Generate new practice tests

**Analysis:**
- Calls `testResults` both in a refreshData function and in the fetchPracticeTests function
- Sets up a window focus event listener to refresh test completion data
- Makes a conditional API call to generate practice tests when none exist
- Potential inefficiency: Duplicate calls to `testResults` endpoint when focus changes

## practice/guide/[title]/page.tsx [Done]
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

## practice/guide/slides/[guideId]/quiz/[testId]/page.tsx [Done] 
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

## practice/guide/slides/[guideId]/quiz/[testId]/results/page.tsx [Done]
- `ENDPOINTS.testResults(userId, submissionId)` - Fetch specific test submission results
- `ENDPOINTS.topicSpecificMastery` - Get topic-specific mastery data
- `ENDPOINTS.retryTest` - Request a test retry

**Analysis:**
- Fetches test results using the submission ID from URL parameters
- Makes conditional API calls to mastery endpoints based on availability of submission data
- Makes POST request to retry endpoint only on user action

### Optimized with Consolidated Endpoint:
- `ENDPOINTS.quizResultsWithData(testId, userId, submissionId)` - New consolidated endpoint
- Reduces multiple API calls to a single request
- Returns combined data including:
  - Test submission results
  - Mastery thresholds
  - Retry eligibility status
  - Topic mastery information
  - Remediation status
- Falls back to the original endpoints if submission ID is not available
- Improves page load performance and reduces network overhead

## practice/guide/slides/[guideId]/quiz/[testId]/remediation/page.tsx
- `ENDPOINTS.getRemediation` - Fetch remediation content for a specific submission
- `ENDPOINTS.markRemediationViewed` - Mark remediation as viewed
- `ENDPOINTS.retryTest` - Request to retry the test after remediation

**Analysis:**
- Fetches remediation content using submission ID from URL parameters
- Makes POST request to mark remediation as viewed when user completes viewing
- Offers retry functionality after remediation is completed

## practice/guide/[title]/quiz/[testId]/page.tsx [Done]
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

### Optimized with Consolidated Endpoint:
- `ENDPOINTS.quizWithGuideData(testId, title)` - New consolidated endpoint
- Reduces multiple API calls to a single request
- Returns combined data including:
  - Complete quiz data with questions
  - Relevant study guide data for the specific section
- Implements caching with SWR's dedupingInterval
- Reduces network overhead and eliminates separate API calls
- Optimizes payload size by only including relevant sections from the study guide

## practice/guide/[title]/quiz/[testId]/results/page.tsx
- `ENDPOINTS.testResults(authUserId, testId)` - Fetch specific test submission results

**Analysis:**
- Makes a single API call to fetch test results without any caching strategy
- No revalidation mechanism in place if data changes
- Missing potential additional data that might be useful (like mastery thresholds)
- Uses direct fetch rather than SWR, missing out on caching benefits
- No error retry mechanism if the network request fails temporarily
- Every page navigation triggers a fresh API call, even for the same test
- The Back button links directly to the study guide, potentially causing unnecessary data refetching

**Optimization Opportunity:**
- Implement a consolidated endpoint similar to the slides version
- Add SWR for caching and revalidation
- Include mastery thresholds and retry eligibility in a single request
- Create `ENDPOINTS.quizResultsWithData` for regular guides similar to slides guides
- Share data between quiz taking and results pages to reduce redundant fetching

## dashboard/page.tsx [Done]
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

## New Consolidated Endpoints

To optimize performance and reduce the number of API calls, the following consolidated endpoints have been implemented:

### 1. All Guides with Tests (Practice Page)

**Endpoint**: `/api/study-guide/all-with-tests/:user_id`  
**Frontend usage**: `ENDPOINTS.allGuidesWithTests(userId)`  
**Purpose**: Consolidates multiple API calls needed for the Practice page into a single request.

**Returns**:
- Regular study guides
- Slides guides
- Guide analytics data
- Practice tests for both regular and slides guides
- Completed tests by the user
- Progress data for each guide

**Reduces From**:
- Previously: N+2 API calls (where N is the number of study guides)
- Now: 1 consolidated API call

### 2. Slides Guide with Data (Slides Guide Page)

**Endpoint**: `/api/study-guide/slides-guide-with-data/:guide_id/:user_id`  
**Frontend usage**: `ENDPOINTS.slidesGuideWithData(guideId, userId)`  
**Purpose**: Consolidates multiple API calls needed for the slides guide page into a single request.

**Returns**:
- Slides guide data
- Practice tests for the guide
- User's completed tests for this guide
- Topic mastery statuses
- Test prerequisites/lock statuses

**Reduces From**:
- Previously: 5+ separate API calls (guide data, practice tests, completed tests, topic status checks, test status checks)
- Now: 1 consolidated API call
- Eliminates duplicate calls on window focus events

**Benefits**:
- Improved page load performance
- Elimination of multiple sequential API calls
- Simplified frontend code with cleaner data management
- Reduced backend processing overhead

### 3. Regular Guide with Data (Regular Study Guide Page)

**Endpoint**: `/api/study-guide/guide-with-data/:title/:user_id`  
**Frontend usage**: `ENDPOINTS.guideWithData(title, userId)`  
**Purpose**: Consolidates multiple API calls needed for the regular study guide page into a single request.

**Returns**:
- Study guide data
- Practice tests for the guide
- User's completed tests for this guide
- Guide analytics data
- Pre-calculated progress data

**Reduces From**:
- Previously: 4+ separate API calls (study guide, practice tests, completed tests, guide analytics)
- Now: 1 consolidated API call
- Eliminates the need to calculate progress on the client

**Benefits**:
- Improved page load performance
- Elimination of data fetching waterfall
- Simplified frontend code with cleaner state management
- Enhanced user experience with faster content loading
- Improved efficiency when generating practice tests by using SWR mutation

### 4. Quiz with Guide Data (Quiz/Test Page)

**Endpoint**: `/api/study-guide/quiz-with-guide/:test_id/:guide_id/:user_id`  
**Frontend usage**: `ENDPOINTS.quizWithGuide(testId, guideId, userId)`  
**Purpose**: Consolidates multiple API calls needed for the quiz/test page into a single request.

**Returns**:
- Quiz/test data with questions
- Slides guide data for the relevant guide
- Previous attempt data if the user has taken this test before

**Reduces From**:
- Previously: 2+ separate API calls (quiz data, guide data)
- Now: 1 consolidated API call

**Benefits**:
- Improved quiz loading performance
- Single request for all necessary data
- Access to previous attempts history for better user context
- Simplified frontend code with unified error handling

### 5. Dashboard Data (Dashboard Page)

**Endpoint**: `/api/user/dashboard-data/:user_id`  
**Frontend usage**: `ENDPOINTS.dashboardData(userId, options)`  
**Purpose**: Consolidates multiple API calls needed for the Dashboard page into a single request.

**Options**:
- `startDate`: Optional start date for filtering study hours data
- `endDate`: Optional end date for filtering study hours data
- `includeOngoing`: Whether to include ongoing sessions
- `aggregateBy`: How to aggregate study hours data ("day", "week", or "month")
- `includeAnonymous`: Whether to include anonymous sessions

**Returns**:
- Topic mastery data
- Study hours with appropriate filtering
- Test analytics
- Guide analytics
- Study guides data

**Reduces From**:
- Previously: 5+ separate API calls
- Now: 1 consolidated API call

### 6. Quiz Results with Data (Quiz Results Page)

**Endpoint**: `/api/study-guide/quiz-results-with-data/:test_id/:user_id/:submission_id`  
**Frontend usage**: `ENDPOINTS.quizResultsWithData(testId, userId, submissionId)`  
**Purpose**: Consolidates multiple API calls needed for the quiz results page into a single request.

**Returns**:
- Complete test submission data
- Mastery threshold settings
- Retry eligibility status
- Topic mastery information
- Remediation status and content (if available)
- Attempt information

**Reduces From**:
- Previously: 2+ separate API calls (test results, mastery thresholds)
- Now: 1 consolidated API call

**Benefits**:
- Improved page load performance
- Elimination of sequential API calls
- Simplified frontend code with unified data handling
- Enhanced user experience with faster results display
- Better remediation status tracking

### 7. Quiz with Guide Data (Quiz Page)

**Endpoint**: `/api/study-guide/quiz-with-guide-data/:test_id/:title`  
**Frontend usage**: `ENDPOINTS.quizWithGuideData(testId, title)`  
**Purpose**: Consolidates multiple API calls needed for the quiz page into a single request.

**Returns**:
- Complete quiz data with questions
- Relevant study guide data focused only on the sections needed for the quiz
- Lightweight study guide payload optimized for quiz context

**Reduces From**:
- Previously: 2+ separate API calls (quiz data, study guide data)
- Now: 1 consolidated API call

**Benefits**:
- Improved page load performance
- Reduced network overhead
- Optimized payload size by only including relevant sections
- Enhanced client-side rendering speed
- Better user experience with faster content delivery

## Benefits of Consolidated Endpoints

1. **Improved Performance**: Reduced request overhead and faster page load times
2. **Reduced Network Traffic**: Fewer HTTP requests means less bandwidth usage
3. **Better User Experience**: Faster rendering of components and less waiting time
4. **Reduced Server Load**: Fewer database queries and processing on the backend
5. **Simplified Frontend Code**: Cleaner code with less state management for multiple requests

## New Findings and Additional Improvements 

### Updated Assessment of Optimized Pages

#### 1. practice/page.tsx - Optimization Success
The consolidated endpoint `ENDPOINTS.allGuidesWithTests(userId)` has successfully replaced multiple API calls:
- **Before**: N+2 API calls (22+ API calls for 10 guides)
- **After**: 1 consolidated API call
- **Result**: ~95% reduction in API calls for this page

This implementation shows excellent performance improvement. No further action required.

#### 2. dashboard/page.tsx - Smart Polling Implementation
Recent changes have improved the polling behavior for the dashboard:
```typescript
{
  refreshInterval: isUserActive ? 60000 : 0, // Only poll when user is active
  revalidateOnFocus: isUserActive, // Only revalidate on focus if user is active
  dedupingInterval: 10000, // Avoid duplicated requests within 10 seconds
}
```
**Improvements**:
- Added user activity detection to pause polling when inactive
- Added tab visibility detection to pause/resume polling
- Implemented dedupingInterval to prevent duplicate requests
- Centralized user data fetching with `useUser()` hook

**Remaining opportunities**:
- Consider implementing a WebSocket connection for real-time updates instead of polling
- Further reduce polling frequency on low-bandwidth connections

#### 3. practice/guide/[title]/quiz/[testId]/results/page.tsx - SWR Implementation
The quiz results page has been optimized with:
- Consolidated endpoint with `ENDPOINTS.quizResultsWithData`
- SWR for caching and revalidation
- Better error handling and retry capabilities
- Improved UI with loading states and retry button

This is a significant improvement, with no further action immediately required.

### New Optimization Opportunities

#### 1. Global State Management for Common Data
Several pages fetch similar data (e.g., user information, guide lists). Consider implementing:
- **Context API or Redux**: For sharing common data between routes
- **Persistent Cache**: SWR's cache is reset on page refresh, consider persistent caching for frequently accessed data
- **Prefetching**: Use `<Link prefetch>` with custom logic to preload data for likely navigation paths

#### 2. Optimistic UI Updates
For actions like marking remediation as viewed or submitting tests:
- Implement optimistic UI updates (update UI before server confirmation)
- Cache invalidation strategies to refresh related data after mutations
- Better error recovery when optimistic updates fail

#### 3. Network Status Handling
Add adaptive behavior based on network conditions:
- Reduce polling frequency on slow connections
- Implement offline mode capabilities for content viewing
- Include "stale-while-revalidate" patterns more consistently

#### 4. Rate Limiting and Request Batching
For remaining endpoints that may generate multiple calls:
- Add client-side debouncing for rapidly triggered API calls
- Batch multiple related requests into a single transaction when possible
- Implement retry with exponential backoff for failed requests

#### 5. Lazy Loading and Progressive Loading
For content-heavy pages:
- Implement virtualization for long lists (only render visible items)
- Progressively load content as the user scrolls
- Defer loading non-critical assets and data

## Implementation Priorities

Based on impact vs. effort, here are the recommended priorities:

1. **High Impact, Low Effort**:
   - Complete SWR implementation across all pages
   - Add network status detection and adaptive behavior
   - Implement persistent caching for frequently accessed data

2. **High Impact, Medium Effort**:
   - Create a global state management system
   - Add optimistic UI updates for common actions
   - Implement prefetching strategies for likely navigation paths

3. **Medium Impact, Variable Effort**:
   - Replace polling with WebSockets where real-time updates are needed
   - Add lazy loading and virtualization for long lists
   - Implement offline mode capabilities

The most immediate focus should be ensuring consistent SWR implementation with proper configuration across all remaining pages.
