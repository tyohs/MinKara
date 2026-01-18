import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Note: For full type safety, consider using Supabase CLI to generate types:
// npx supabase gen types typescript --project-id xnzczwlsppqpvmybvqlu > src/types/supabase.ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
