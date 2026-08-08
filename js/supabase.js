import { createClient } from
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://bqnidckncilclhvbglac.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_NHz0g89ZGi6WqMuSjnmxEw_t2VvOzOd';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
