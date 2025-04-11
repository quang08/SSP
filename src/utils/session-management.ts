import { createClient } from '@/utils/supabase/client';
import { ENDPOINTS } from '@/config/urls';
import { toast } from 'sonner';

export const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
let inactivityTimer: NodeJS.Timeout | null = null;
let isSessionActive = false;
let lastActivity = Date.now();

// Track user activity
export const resetInactivityTimer = () => {
  lastActivity = Date.now();

  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }

  if (isSessionActive) {
    inactivityTimer = setTimeout(handleInactiveSession, INACTIVITY_TIMEOUT);
  }
};

// Get time remaining in session
export const getSessionTimeRemaining = (): number => {
  if (!isSessionActive) return 0;
  const elapsed = Date.now() - lastActivity;
  return Math.max(0, INACTIVITY_TIMEOUT - elapsed);
};

// Handle inactive session by logging out the user
const handleInactiveSession = async () => {
  if (!isSessionActive) return;

  try {
    isSessionActive = false;

    // Get session ID from localStorage
    const sessionId = localStorage.getItem('session_id');
    if (!sessionId) return;

    // Get Supabase token
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      // If there's no token, just clear local session data
      localStorage.removeItem('session_id');
      return;
    }

    // End the session in the backend
    await fetch(ENDPOINTS.endSession, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sessionId }),
    });

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Clear session data
    localStorage.removeItem('session_id');

    // Show notification
    toast.info('Session ended due to inactivity', {
      description: 'You have been logged out due to inactivity.',
      duration: 5000,
    });

    // Redirect to login page
    window.location.href =
      '/auth?m=signin&message=Your session expired due to inactivity';
  } catch (error) {
    console.error('Error ending inactive session:', error);
  }
};

// Initialize activity tracking
export const initSessionActivity = () => {
  if (typeof window === 'undefined') return;

  isSessionActive = true;
  lastActivity = Date.now();

  // Set up event listeners for user activity
  const activityEvents = [
    'mousedown',
    'keypress',
    'scroll',
    'mousemove',
    'touchstart',
  ];

  activityEvents.forEach((event) => {
    window.addEventListener(event, resetInactivityTimer);
  });

  // Check for visibility changes (tab switching)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Reset timer when coming back to the tab
      resetInactivityTimer();
    }
  });

  // Add beforeunload event to catch when users close tabs/browsers
  window.addEventListener('beforeunload', async (event) => {
    try {
      // Get session ID from localStorage
      const sessionId = localStorage.getItem('session_id');
      if (!sessionId) return;

      // Use the 'fetch' API with keepalive option to ensure the request completes
      // even when the page is being unloaded
      navigator.sendBeacon(
        ENDPOINTS.endSession,
        JSON.stringify({ session_id: sessionId })
      );

      // Clear session data from localStorage
      localStorage.removeItem('session_id');
      isSessionActive = false;
    } catch (error) {
      console.error('Error ending session during unload:', error);
    }
  });

  // Initial setup of the timer
  resetInactivityTimer();

  return () => {
    // Cleanup function to remove listeners
    isSessionActive = false;

    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }

    activityEvents.forEach((event) => {
      window.removeEventListener(event, resetInactivityTimer);
    });

    window.removeEventListener('beforeunload', () => {});
  };
};

// Manually end the active session
export const endActiveSession = async (sessionId: string) => {
  try {
    const response = await fetch(ENDPOINTS.endSession, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (!response.ok) {
      console.error('Failed to end session');
    }
  } catch (error) {
    console.error('Error ending session:', error);
  }
};

/**
 * Handle inactive session (show warning and end session)
 * @param sessionId The session ID to end
 */
export const showInactivityWarning = async (sessionId: string) => {
  let countdownTimer: NodeJS.Timeout;

  const handleContinue = () => {
    clearTimeout(countdownTimer);
    document.removeEventListener('mousemove', handleContinue);
    document.removeEventListener('keydown', handleContinue);
    document.removeEventListener('click', handleContinue);
    if (warningToast) toast.dismiss(warningToast);
  };

  // Show warning with auto-dismiss after 60 seconds
  const warningToast = toast.warning(
    'Your session is about to end due to inactivity. Move the mouse or press a key to continue.',
    {
      duration: 60000, // 60 seconds
      onDismiss: async () => {
        // End the session
        await endActiveSession(sessionId);
        toast.error('Your session has ended due to inactivity.', {
          duration: 5000,
        });
        // Redirect to home page after 5 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 5000);
      },
    }
  );

  // Set up event listeners to cancel the warning
  document.addEventListener('mousemove', handleContinue);
  document.addEventListener('keydown', handleContinue);
  document.addEventListener('click', handleContinue);
};
