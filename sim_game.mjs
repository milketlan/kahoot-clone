import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  console.log("Creating dumb game...");
  const {data: game} = await supabase.from('games').insert({ status: 'waiting', pin_code: 'TEST01' }).select('*').single();
  const game_id = game.game_id;
  
  const {data: playerRet} = await supabase.from('players').insert({ game_id, name: "Bot", score: 0 }).select('*').single();
  const player_id = playerRet.player_id;

  const {error} = await supabase.from("players").update({ previous_score: 0, score: 966, streak: 1 }).eq("player_id", player_id);
  console.log("ERROR IS:", error);
}
run();
