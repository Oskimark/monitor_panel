import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://empkipdihlmmumwvzkyd.supabase.co';
const supabaseAnonKey = 'TU_ANON_KEY_AQUI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);