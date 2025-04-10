# User Flow: Test Taking, Remediation, and Retries

This document outlines the typical flow a user follows when interacting with practice tests within a study guide, including scenarios involving remediation and retrying failed attempts.

**Key Components Involved:**

*   **Study Guide Page:** `fe/src/app/practice/guide/[title]/page.tsx` (Displays chapters, sections, and test buttons)
*   **Quiz Page:** `fe/src/app/practice/guide/[title]/quiz/[testId]/page.tsx` (Where the user takes the test)
*   **Results Page:** `fe/src/app/practice/guide/[title]/quiz/[testId]/results/page.tsx` (Displays results, feedback, and options for next steps)
*   **Remediation Page:** `fe/src/app/practice/guide/[title]/quiz/[testId]/remediation/page.tsx` (Displays learning material after failing max attempts)
*   **Backend Routes:** Primarily under `be/app/routes/study_guide_routes.py` and `be/app/routes/mastery_routes.py`
*   **Backend Services:** Primarily `be/app/services/mastery_service.py`

## 1. Starting a Test

1.  **Navigate to Study Guide:** The user accesses the main study guide page (`.../[title]/page.tsx`).
2.  **View Sections:** The page displays chapters and sections. Each section typically has an associated practice test button.
3.  **Button States:** The button for each section's test reflects its status:
    *   **"Locked"**: If prerequisites (mastery of previous sections/chapters) are not met (`section.is_unlocked === false`). Determined by checking `sectionMasteryStatus` which comes from the `/guide-with-data/...` backend endpoint.
    *   **"Start Quiz"**: If the section is unlocked and the test hasn't been completed or mastered.
    *   **"View Results"**: If the test associated with the section has been completed previously (`completedTests` set includes the test ID).
    *   **"Mastered" / "Review Recommended"**: May appear if mastery logic dictates different states (based on `section.is_mastered` or `section.review_recommended`).
4.  **Click "Start Quiz"**: The user clicks the button for an unlocked section.
5.  **Prerequisite Check (Frontend):** The `handleQuizClick` function might perform a basic check based on the `section.is_unlocked` state. If locked, a toast notification appears.
6.  **Navigate to Quiz Page:** If unlocked, the user is navigated to the quiz page (`.../quiz/[testId]/page.tsx`).

## 2. Taking the Test

1.  **Load Quiz Data:** The quiz page (`.../quiz/[testId]/page.tsx`) fetches the test questions and related study guide context using the `/quiz-with-guide-data/...` endpoint.
2.  **Display Questions:** Questions (multiple choice using `QuestionCard`, short answer using `ShortAnswerQuestionCard`) are rendered.
3.  **Answer Questions:** The user selects answers for multiple-choice questions and types answers for short-answer questions. They can optionally add notes or adjust confidence levels.
4.  **Track Progress:** The UI updates the progress bar and answered count (`selectedAnswers`, `shortAnswers` state).
5.  **Record Start Time:** The `startTime` state is recorded when the component mounts.

## 3. Submitting the Test

1.  **Click "Submit Quiz"**: Once all questions are answered, the user clicks the submit button.
2.  **Frontend Processing (`handleSubmit`):**
    *   Sets `submitting` state to true.
    *   Constructs the submission payload, including:
        *   `user_id`, `test_id`, `study_guide_id`.
        *   `started_at` timestamp.
        *   Formatted `answers` array (containing user selections/text, question IDs, types, confidence, notes, topic info).
        *   Retry information (`is_retry`, `previous_attempt_id`, `attempt_number`) if applicable.
    *   Determines the correct submission endpoint (standard `/api/study-guides/practice/submit` or adaptive `/api/adaptive-tests/submit`).
3.  **API Request:** Sends a `POST` request to the determined endpoint with the payload.
4.  **Backend Processing (`study_guide_routes.py -> mastery_service.py::process_test_attempt`):**
    *   Receives the submission.
    *   Evaluates answers (including auto-grading short answers if applicable).
    *   Calculates `score` and `accuracy`.
    *   Determines `mastered` status based on accuracy threshold (e.g., >= 80%).
    *   Finds or creates the `test_submissions` document for this user/test.
    *   Increments `attempt_number` and `total_attempts`.
    *   Adds the current attempt details (score, accuracy, questions, time\_taken, mastered status) to the `attempts` array within the submission document.
    *   Updates top-level fields in the `test_submissions` document (latest score, accuracy, mastered status, attempt number).
    *   **Determines Next State:** Based on `mastered` status and `attempt_number` vs `MAX_ATTEMPTS`:
        *   Sets `needs_remediation` (usually `True` if not mastered after max attempts).
        *   Sets `can_retry` (`False` if remediation is needed and not viewed, `True` otherwise).
        *   Sets `review_recommended`.
    *   Calls `sync_mastery_status` to update overall topic mastery data.
    *   Returns the processed submission result (including `submission_id`, `mastered`, `needs_remediation`, `can_retry`, etc.).
5.  **Navigation:** The frontend receives the submission response and navigates the user to the results page (`.../results/page.tsx?submission=SUBMISSION_ID`).

## 4. Viewing Results

1.  **Load Results Data:** The results page (`.../results/page.tsx`) fetches the detailed submission results using the `submissionId` from the URL query parameter. It calls the `/quiz-results-with-data/...` endpoint.
2.  **Display Summary:** Shows overall score, accuracy, time taken, and mastery status (`Mastered`, `Review Recommended`, `Incomplete`, etc.) based on fields like `results.mastered`, `results.review_recommended`, `results.accuracy`.
3.  **Display Question Feedback:** Renders `ResultCard` for each question, showing the user's answer, the correct answer, explanations/feedback, and source references (if applicable).
4.  **Determine Next Actions:** The page checks the fetched `results` data for flags:
    *   `results.mastered`: If true, the user has passed.
    *   `results.needs_remediation`: If true, the user failed the maximum allowed attempts and needs to review material.
    *   `results.remediation_viewed`: If true, the user has already visited the remediation page.
    *   `results.can_retry`: If true, the "Retry Test" button is enabled.

## 5. Handling Remediation (If Needed)

1.  **Trigger:** Occurs if the user fails to achieve mastery after the maximum attempts (e.g., 3 attempts) and the backend sets `needs_remediation: true` on the submission.
2.  **"View Remediation" Button:** The results page displays the "View Remediation Material" button (conditional on `results.needs_remediation || results.remediation_viewed`).
3.  **Navigate to Remediation:** User clicks the button.
4.  **Fetch Remediation Content:** The remediation page (`.../remediation/page.tsx`) mounts and makes a `POST` request to `/api/mastery/get-remediation` with user/test/submission/guide IDs.
5.  **Backend Generates Content:** The backend identifies knowledge gaps from the *latest failed attempt* (`test_submissions.attempts[-1]`), generates relevant learning content (concepts, source texts), saves this content into the `test_submissions.remediation_content` array, sets `remediation_provided: true`, and returns the generated content.
6.  **Display Remediation:** The page displays the key concepts, learning material, and missed questions.
7.  **Mark as Viewed:** When the remediation page loads, it automatically calls `markRemediationViewed` (from `fe/src/utils/remediation.ts`), which sends a `POST` request to `/api/mastery/mark-remediation-viewed`.
8.  **Backend Updates Status:** The backend updates the `test_submissions` document, setting `remediation_viewed: true` and, crucially, `can_retry: true`.

## 6. Retrying the Test

1.  **Eligibility:** After viewing the remediation material, `can_retry` becomes `true`.
2.  **"Retry Test" Button:** The button appears enabled on the results page (or potentially on the remediation page itself, like in the slides version).
3.  **Initiate Retry:** User clicks "Retry Test".
4.  **Frontend Action (`handleRetry` on Results/Remediation Page):**
    *   May call `POST /api/mastery/retry-test` (optional verification step).
    *   Navigates the user back to the quiz page (`.../quiz/[testId]/page.tsx`).
    *   **Important:** Passes URL query parameters to indicate a retry: `?retry=true&attempt=NEW_ATTEMPT_NUM&previous=PREVIOUS_SUBMISSION_ID`.
5.  **Take Test Again:** The user takes the quiz for attempt N+1 (e.g., Attempt 4).
6.  **Submit Retry Attempt:** The user submits the quiz again. `handleSubmit` includes `is_retry: true`, the new `attempt_number`, and `previous_attempt_id` in the payload to `/api/study-guides/practice/submit`.
7.  **Backend Processes Retry:** The backend processes the attempt as before, adding it to the `attempts` array and updating the top-level submission status based on this latest attempt.
8.  **View Retry Results:** User is navigated back to the results page, which now shows the outcome of the retry attempt. If mastery is achieved, the flow for this test typically concludes. If not, further retries might be allowed depending on configuration, or the user might be allowed to proceed based on effort (system deviation logic).
