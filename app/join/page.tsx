"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../utils/supabase/client";
import confetti from "canvas-confetti";

function JoinForm() {
  const searchParams = useSearchParams();
  const initialPin = searchParams?.get("pin") || "";
  
  const [pinCode, setPinCode] = useState(initialPin);
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Game State
  const [joined, setJoined] = useState(false);
  const [gameId, setGameId] = useState("");
  const [gameStatus, setGameStatus] = useState("waiting");
  const [playerId, setPlayerId] = useState("");
  const [score, setScore] = useState(0);
  
  // Finished State
  const [rank, setRank] = useState(0);
  
  // Playing State
  const [answeredRow, setAnsweredRow] = useState<number | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCode || !nickname) {
      setError("Please fill in both PIN and Nickname"); return;
    }
    setError(""); setLoading(true);

    try {
      const { data: game, error: gameError } = await supabase
        .from("games").select("game_id, status").eq("pin_code", pinCode).single();
      if (gameError || !game) throw new Error("Game not found.");
      if (game.status !== "waiting") throw new Error("Game has already started.");
      
      const { data: player, error: playerError } = await supabase
        .from("players").insert({ game_id: game.game_id, name: nickname, score: 0 }).select().single();
      if (playerError) throw new Error("Failed to join.");

      setGameId(game.game_id);
      setPlayerId(player.player_id);
      setJoined(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!gameId) return;

    const channel = supabase.channel(\`game_status_\${gameId}\`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: \`game_id=eq.\${gameId}\` }, (payload) => {
        setGameStatus(payload.new.status);
        if (payload.new.status === "playing") {
           // Reset answer if wait/playing toggles
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameId]);

  // When game switches to finished, fetch rank
  useEffect(() => {
    if (gameStatus === "finished" && gameId && playerId) {
       const fetchRank = async () => {
          const { data } = await supabase.from('players').select('player_id, score').eq('game_id', gameId).order('score', { ascending: false });
          if(data) {
             const r = data.findIndex(p => p.player_id === playerId) + 1;
             setRank(r);
             if (r <= 3 && r > 0) {
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
             }
          }
       };
       fetchRank();
    }
  }, [gameStatus, gameId, playerId]);
  
  const handleAnswer = async (index: number) => {
    if (answeredRow !== null) return;
    setAnsweredRow(index);
    
    // Add points based on speed (simulated vibe pointing)
    const points = Math.floor(Math.random() * 500) + 500; 
    
    const { data } = await supabase.from('players').select('score').eq('player_id', playerId).single();
    if(data) {
        await supabase.from('players').update({ score: data.score + points }).eq('player_id', playerId);
        setScore(data.score + points);
    }
  }

  // Phase 5 Finished UI
  if (gameStatus === "finished") {
     const isPodium = rank > 0 && rank <= 3;
     return (
        <div className={\`min-h-screen \${isPodium ? 'bg-gradient-to-tr from-yellow-400 to-amber-600' : 'bg-slate-800'} flex flex-col items-center justify-center p-6 text-white text-center transition-colors duration-1000\`}>
            {isPodium ? (
               <>
                 <h1 className="text-9xl mb-8 animate-bounce">🏆</h1>
                 <h2 className="text-5xl font-black mb-4 drop-shadow-md">You got #{rank}!</h2>
                 <p className="text-3xl font-bold opacity-90 mb-12">Total Score: {score}</p>
                 <div className="bg-white max-w-sm w-full py-4 rounded-xl text-yellow-600 font-bold shadow-lg animate-pulse">AMAZING JOB! 🎉</div>
               </>
            ) : (
               <>
                 <h1 className="text-7xl mb-8">👏</h1>
                 <h2 className="text-4xl font-black mb-4">Well played!</h2>
                 <p className="text-2xl font-bold opacity-70 mb-4">You placed #{rank || '-'}</p>
                 <p className="text-xl font-bold opacity-90">Score: {score}</p>
               </>
            )}
        </div>
     );
  }

  // Phase 4 Playing UI
  if (gameStatus === "playing") {
    const colors = ["bg-red-500", "bg-blue-500", "bg-yellow-400", "bg-green-500"];
    const hoverColors = ["hover:bg-red-400", "hover:bg-blue-400", "hover:bg-yellow-300", "hover:bg-green-400"];
    
    return (
      <div className="h-screen w-full bg-slate-100 flex flex-col p-2 gap-2 pb-[10vh]">
        <div className="w-full flex justify-between p-4 mb-2 bg-white rounded-xl shadow-sm">
           <div className="font-bold text-slate-500">{nickname}</div>
           <div className="font-black bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md">{score}</div>
        </div>
        <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-2">
          {[0,1,2,3].map(i => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={answeredRow !== null}
              className={\`\${colors[i]} \${hoverColors[i]} rounded-2xl shadow-[0_8px_0_rgba(0,0,0,0.2)] transition-transform active:translate-y-2 active:shadow-none \${answeredRow === i ? 'opacity-100 border-[10px] border-white' : (answeredRow !== null ? 'opacity-30 scale-95 grayscale' : '')}\`}
            >
              {answeredRow === i && <span className="text-6xl animate-bounce absolute inset-0 flex items-center justify-center">✔️</span>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Phase 3 Waiting UI
  if (joined) {
    return (
      <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 animate-[breathe_4s_infinite] opacity-80 z-0"></div>
        <div className="z-10 text-center flex flex-col items-center">
          <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center mb-8 border-4 border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.1)] relative">
             <div className="absolute inset-0 rounded-full border-4 border-indigo-400 border-t-transparent animate-spin"></div>
             <span className="text-5xl">👀</span>
          </div>
          <h2 className="text-4xl font-black mb-2">You're in!</h2>
          <p className="text-2xl font-bold bg-white/20 px-6 py-2 rounded-xl mt-4 border border-white/10 shadow-inner">{nickname}</p>
          <p className="mt-12 text-xl opacity-70 animate-pulse tracking-widest uppercase font-bold">Waiting for host...</p>
        </div>
        <style dangerouslySetInnerHTML={{__html: \`@keyframes breathe { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; } }\`}} />
      </div>
    );
  }

  // Form UI
  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col justify-center items-center p-6 lg:p-8">
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] p-8 border border-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-teal-400 to-blue-500"></div>
        <h1 className="text-5xl font-black text-center mb-10 mt-6 text-slate-800 tracking-tighter">Kahoot<span className="text-blue-600">!</span></h1>
        
        <form onSubmit={handleJoin} className="flex flex-col gap-5">
          {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center font-bold text-sm">{error}</div>}
          
          <input type="text" pattern="[0-9]*" inputMode="numeric" value={pinCode} onChange={(e) => setPinCode(e.target.value)} className="text-center text-4xl w-full bg-slate-50 p-6 rounded-2xl border-4 border-slate-100 focus:border-blue-400 focus:bg-white focus:outline-none transition-all font-black text-slate-700 placeholder:opacity-30 placeholder:font-normal shadow-inner" placeholder="Game PIN" required />
          
          <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} className="text-center text-2xl font-bold w-full bg-slate-50 p-6 rounded-2xl border-4 border-slate-100 focus:border-purple-400 focus:bg-white focus:outline-none transition-all text-slate-700 placeholder:opacity-30 placeholder:font-normal shadow-inner" placeholder="Nickname" required />
          
          <button type="submit" disabled={loading} className="mt-4 w-full bg-slate-900 text-white font-black text-3xl py-6 rounded-2xl shadow-[0_8px_0_#334155] active:translate-y-[8px] active:shadow-none transition-all disabled:opacity-50 uppercase tracking-widest hover:bg-slate-800">
            {loading ? "..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center text-3xl font-black animate-pulse">Loading...</div>}>
      <JoinForm />
    </Suspense>
  );
}
