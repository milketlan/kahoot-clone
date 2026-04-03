const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mraamczgvuhdpwvhach.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yYWFtY3pndnVoZHB3dnZoYWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMzc3NjQsImV4cCI6MjA5MDcxMzc2NH0.GOgvAWm9qFsImN-scfzLAXNCiLNk-kHbFZ6S7hS5Khk';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from("games")
    .insert({ pin_code: "test", status: "waiting", current_question_index: 0 })
    .select()
    .single();
    
  console.log("DATA:", data);
  console.log("ERROR:", error);
}
run();
