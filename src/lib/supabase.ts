import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://empkipdihlmmumwvzkyd.supabase.co';
const supabaseAnonKey = 'sb_publishable_Bhk6iFwEBWSpeFJCHfb_Sg__UDavlUj';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
