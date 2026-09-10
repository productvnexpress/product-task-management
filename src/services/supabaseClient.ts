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

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'https://hyhtykhfnyrrvydizwta.supabase.co');
const supabaseAnonKey = getEnvVar(
  'VITE_SUPABASE_ANON_KEY',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5aHR5a2hmbnlycnZ5ZGl6d3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3Mzk5ODYsImV4cCI6MjEwNDMxNTk4Nn0.58KeAN-L1zkMD-gW-RJDe9akhMQgW8s5xeQbPJdZNcA'
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
