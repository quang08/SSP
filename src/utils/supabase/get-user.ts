/*
 * Copyright (c) 2025 SSP Team (Peyton, Alex, Jackson, Yousif)
 */

import { User } from '@supabase/supabase-js';
import { createClient } from './client';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

// Cache for the user data to avoid redundant calls
let userCache: User | null = null;
let fetchPromise: Promise<User | null> | null = null;

// Function to get user with deduplication
export async function getUser(): Promise<User | null> {
  // Return from cache if available
  if (userCache !== null) {
    return userCache;
  }

  // If a fetch is already in progress, return that promise
  if (fetchPromise) {
    return fetchPromise;
  }

  // Create a new fetch promise
  fetchPromise = new Promise<User | null>(async (resolve) => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      userCache = data?.user || null;
      resolve(userCache);
    } catch (error) {
      console.error('Error fetching user:', error);
      resolve(null);
    } finally {
      // Clear the promise after 100ms to allow for new fetches
      // but prevent simultaneous duplicate calls
      setTimeout(() => {
        fetchPromise = null;
      }, 100);
    }
  });

  return fetchPromise;
}

// React hook for Supabase auth state with deduplication
export function useUser() {
  const {
    data: user,
    error,
    mutate,
  } = useSWR('supabase-user', getUser, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
    refreshInterval: 300000, // Refresh every 5 minutes
  });

  // Clear cache on logout or session change
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        userCache = null;
        mutate(null, false);
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Force refresh user data
        userCache = null;
        mutate();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [mutate]);

  return {
    user,
    isLoading: !error && !user,
    error,
    mutate,
  };
}
