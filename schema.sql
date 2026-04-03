-- Create games table
CREATE TABLE games (
  game_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pin_code text NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  current_question_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create questions table
CREATE TABLE questions (
  question_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id uuid REFERENCES games(game_id) ON DELETE CASCADE,
  title text NOT NULL,
  options jsonb NOT NULL,
  correct_option_index integer NOT NULL,
  time_limit integer NOT NULL DEFAULT 10,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create players table
CREATE TABLE players (
  player_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id uuid REFERENCES games(game_id) ON DELETE CASCADE,
  name text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 啟動 Supabase 的即時同步功能 (Realtime)
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table players;

-- 關閉 RLS 安全性檢查以便可以無需登入即可建立房間和加入遊戲
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
