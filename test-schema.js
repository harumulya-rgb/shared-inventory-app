import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('materials').select('*').limit(1);
  if (error) console.error(error);
  if (data && data.length > 0) console.log(Object.keys(data[0]));
  else console.log('No data or empty');
}
test();
