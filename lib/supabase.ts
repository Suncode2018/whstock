import { createClient } from '@supabase/supabase-js';

// วาง Project URL และ anon key ของคุณตรงนี้
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ewydpegoplpklmqyaqvd.supabase.co/rest/v1/้';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3eWRwZWdvcGxwa2xtcXlhcXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDE0MzQsImV4cCI6MjEwODc3NzQzNH0.-eH5-SkVnvFDqNE_ubkHL29lxC-f6AjS-Vp8dvHnHKc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);