import { createClient } from '@/utils/supabase/client';
import { ENDPOINTS } from '@/config/urls';
import { toast } from 'sonner';

// Define interfaces for review materials response
interface IncorrectQuestionSummary {
  question: string;
  user_answer: string;
  correct_answer: string;
}

interface ReviewMaterialsResponse {
  review_id: string;
  user_id: string;
  study_guide_id: string;
  topic_id: string;
  submission_id: string;
  review_recommended: boolean;
  knowledge_gaps: string[];
  content: string;
  incorrect_questions: IncorrectQuestionSummary[];
  generated_at: string;
}

/**
 * Mark a remediation item as viewed
 * @param remediation_id The ID of the remediation to mark as viewed
 */
export const markRemediationViewed = async (
  remediation_id: string
): Promise<boolean> => {
  try {
    const supabase = createClient();
    const userData = await supabase.auth.getUser();
    const userId = userData.data?.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const token = await supabase.auth
      .getSession()
      .then((res) => res.data.session?.access_token);

    if (!token) {
      throw new Error('Authentication token is missing');
    }

    const response = await fetch(
      ENDPOINTS.markRemediationViewed(remediation_id, userId),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          helpful: null,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || 'Failed to mark remediation as viewed'
      );
    }

    // Display a message informing users about the next steps
    toast.success('Remediation marked as viewed', {
      description:
        'Remember: You must retry the test and achieve at least 75% accuracy to proceed to the next test.',
      duration: 5000,
    });

    return true;
  } catch (error) {
    console.error('Error marking remediation as viewed:', error);
    toast.error('Failed to mark remediation as viewed. Please try again.');
    return false;
  }
};

/**
 * Mark review materials as viewed
 * @param userId The user ID
 * @param studyGuideId The study guide ID
 * @param topicId The topic ID
 * @param submissionId The submission ID
 */
export const markReviewViewed = async (
  userId: string,
  studyGuideId: string,
  topicId: string,
  submissionId: string
): Promise<boolean> => {
  try {
    const supabase = createClient();

    const token = await supabase.auth
      .getSession()
      .then((res) => res.data.session?.access_token);

    if (!token) {
      throw new Error('Authentication token is missing');
    }

    const response = await fetch(
      ENDPOINTS.markReviewViewed(userId, studyGuideId, topicId, submissionId),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || 'Failed to mark review materials as viewed'
      );
    }

    // Display a message informing users about the next steps
    toast.success('Review materials marked as viewed', {
      description:
        "According to Bloom's Mastery Theory, you must now retry the test and achieve at least 75% accuracy to proceed to the next test.",
      duration: 5000,
    });

    return true;
  } catch (error) {
    console.error('Error marking review materials as viewed:', error);
    toast.error('Failed to mark review as viewed. Please try again.');
    return false;
  }
};

/**
 * Get review materials for a test
 * @param userId The user ID
 * @param studyGuideId The study guide ID
 * @param topicId The topic ID
 * @param submissionId The submission ID
 */
export const getReviewMaterials = async (
  userId: string,
  studyGuideId: string,
  topicId: string,
  submissionId: string
): Promise<ReviewMaterialsResponse> => {
  try {
    const supabase = createClient();

    const token = await supabase.auth
      .getSession()
      .then((res) => res.data.session?.access_token);

    if (!token) {
      throw new Error('Authentication token is missing');
    }

    const response = await fetch(
      ENDPOINTS.getReviewMaterials(userId, studyGuideId, topicId, submissionId),
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get review materials');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting review materials:', error);
    toast.error('Failed to load review materials. Please try again.');
    throw error;
  }
};

/**
 * Rate a remediation item as helpful or not
 * @param remediation_id The ID of the remediation to rate
 * @param was_helpful Whether the remediation was helpful
 */
export const rateRemediation = async (
  remediation_id: string,
  was_helpful: boolean
): Promise<boolean> => {
  try {
    const supabase = createClient();
    const userData = await supabase.auth.getUser();
    const userId = userData.data?.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const token = await supabase.auth
      .getSession()
      .then((res) => res.data.session?.access_token);

    if (!token) {
      throw new Error('Authentication token is missing');
    }

    const response = await fetch(
      ENDPOINTS.markRemediationViewed(remediation_id, userId),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          helpful: was_helpful,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to rate remediation');
    }

    toast.success(
      `Thank you for your ${was_helpful ? 'positive' : 'negative'} feedback!`
    );
    return true;
  } catch (error) {
    console.error('Error rating remediation:', error);
    toast.error('Failed to submit feedback. Please try again.');
    return false;
  }
};

/**
 * Retry a test after viewing remediation
 * @param test_id The ID of the test to retry
 * @param previous_attempt_id The ID of the previous test attempt
 * @param guide_id The ID of the study guide
 */
export const retryTest = async (
  test_id: string,
  previous_attempt_id: string,
  guide_id: string
): Promise<void> => {
  try {
    const supabase = createClient();
    const userData = await supabase.auth.getUser();
    const userId = userData.data?.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const token = await supabase.auth
      .getSession()
      .then((res) => res.data.session?.access_token);

    console.log('Sending retry request with payload:', {
      user_id: userId,
      test_id: test_id,
      study_guide_id: guide_id,
      previous_attempt_id: previous_attempt_id,
    });

    const response = await fetch(ENDPOINTS.retryTest, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        test_id: test_id,
        study_guide_id: guide_id,
        previous_attempt_id: previous_attempt_id,
      }),
    });

    const data = await response.json();
    console.log('Retry response:', data);

    if (response.ok) {
      if (data.can_retry) {
        toast.success('Starting new test attempt');
        window.location.href = `/practice/guide/slides/${guide_id}/quiz/${test_id}?retry=true&attempt=${data.attempt_number}&previous=${previous_attempt_id}`;
      } else {
        toast.info(data.message || 'Cannot retry test at this time');
      }
    } else {
      throw new Error(data.message || 'Failed to process retry request');
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An error occurred';
    toast.error(`Error: ${errorMessage}`);
    console.error('Retry test error:', error);
  }
};
