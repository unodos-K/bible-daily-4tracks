import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing env variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('reading_records').insert({
    user_id: '00000000-0000-0000-0000-000000000000',
    day_index: 1,
    read_date: '2026-08-21',
    completed_at: new Date().toISOString(),
    one_verse: {}
  });
  console.log("Insert Error:", error);
}

test();
