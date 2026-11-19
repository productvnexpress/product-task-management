/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string, defaultVal: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
      return (import.meta as any).env[key];
    }
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}
  return defaultVal;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'https://ukmtjpsyqcklrhrbywlv.supabase.co');
const supabaseAnonKey = getEnvVar(
  'VITE_SUPABASE_ANON_KEY',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrbXRqcHN5cWNrbHJocmJ5d2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwODEwMjksImV4cCI6MjExMDY1NzAyOX0.p2brfBmO1dS9Nn52eW6we1Jv5bbngI6q89AunYN5QOU'
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
