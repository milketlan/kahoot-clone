"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../../utils/supabase/client";
import { Podium } from "../../../components/podium";
import { CountdownBar } from "../../../components/countdown-bar";

interface Player {
  player_id: string;
  name: string;
  score: number;
  streak: number;
  previous_score: number;
  current_answer: number | null;
  answer_time: number | null;
}

interface Question {
  question_id: string;
  title: string;
  options: string[];
  correct_option_index: number;
  time_limit: number;
}

export default function HostPage({ params }: { params: { game_id: string } }) {
  const [pinCode, setPinCode] = useState("------");
  const [players, setPlayers] = useState<Player[]>([]);
  const [joinUrl, setJoinUrl] = useState("");
  const [status, setStatus] = useState("waiting");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Audio hooks reserved for Phase 7 implementation

  useEffect(() => {
    const fetchGame = async () => {
      const { data } = await supabase.from("games").select("*").eq("game_id", params.game_id).single();
      if (data) {
        setPinCode(data.pin_code);
        setJoinUrl(`${window.location.origin}/join?pin=${data.pin_code}`);
        setStatus(data.status);
        setCurrentIndex(data.current_question_index);
      }
    };
    fetchGame();

    const fetchPlayers = async () => {
      const { data } = await supabase.from("players").select("*").eq("game_id", params.game_id);
      if (data) setPlayers(data as Player[]);
    };
    fetchPlayers();

    const channel = supabase.channel('players_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${params.game_id}` }, (payload) => {
         if (payload.eventType === 'INSERT') {
           setPlayers(prev => [...prev, payload.new as Player]);
         } else if (payload.eventType === 'UPDATE') {
           setPlayers(prev => prev.map(p => p.player_id === payload.new.player_id ? (payload.new as Player) : p));
         }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.game_id]);

  const startGame = async () => {
    const { data: qData } = await supabase.from("questions").select("*").eq("game_id", params.game_id).order("created_at");
    let qList = qData || [];
    
    if (qList.length === 0) {
      const dummyQs = [
        { game_id: params.game_id, title: "什麼是 Agentic AI 的核心特徵？", options: ["只能被動回答", "具備自主規劃決策與執行", "只能處理影像", "需手動編寫邏輯"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "MCP (Model Context Protocol) 主要用途為何？", options: ["加快模型訓練", "標準化介面連接外部資源", "壓縮模型參數", "取代前端開發"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "在 Claude Code 中，指令專用於核准 AI 執行危險動作？", options: ["/allow", "/approve", "直接輸入 yes 或 Y", "/grant"], correct_option_index: 2, time_limit: 15 },
        { game_id: params.game_id, title: "Agentic 系統中的 'Tools' (工具) 作用為何？", options: ["操作實體機器人", "讓 AI 執行程式碼或讀取檔案", "監控 AI 的效能", "優化記憶體"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "下列何者不是 MCP 架構中的標準元件？", options: ["MCP Client", "MCP Server", "MCP Root Router", "Host Application"], correct_option_index: 2, time_limit: 15 },
      ];
      await supabase.from("questions").insert(dummyQs);
      const { data: newQData } = await supabase.from("questions").select("*").eq("game_id", params.game_id).order("created_at");
      qList = newQData || [];
    }
    
    setQuestions(qList as Question[]);
    setStatus("playing");
    await supabase.from("games").update({ status: "playing", current_question_index: 0 }).eq("game_id", params.game_id);
    
    // Clear answers
    for(const p of players) {
      await supabase.from("players").update({ current_answer: null, answer_time: null }).eq("player_id", p.player_id);
    }
  };

  const handleTimeUp = async () => {
    // 1. ALWAYS Fetch absolute latest state of players from DB to avoid React state staleness!
    const { data: freshPlayers } = await supabase.from("players").select("*").eq("game_id", params.game_id);
    const playersToEval = freshPlayers || players;
    
    const currentQ = questions[currentIndex];
    const timeLimitMs = (currentQ.time_limit || 15) * 1000;
    
    const updatedPlayers = [];
    for (const player of playersToEval as Player[]) {
       let addedScore = 0;
       let newStreak = Number(player.streak) || 0;
       const cAns = player.current_answer;
       
       if (cAns !== null && cAns !== undefined && cAns === currentQ.correct_option_index && player.answer_time) {
          // Correct! Calculate speed multiplier
          const timeRatio = Math.max(0, 1 - (Number(player.answer_time) / timeLimitMs));
          addedScore = 500 + Math.floor(timeRatio * 500); // 500 to 1000
          newStreak += 1;
          if (newStreak >= 3) addedScore += 200; // Streak bonus
       } else {
          newStreak = 0;
       }
       
       const baseScore = Number(player.score) || 0;
       const newData = {
          previous_score: baseScore,
          score: baseScore + addedScore,
          streak: newStreak
       };
       updatedPlayers.push({ ...player, ...newData });
       
       // Fire off async updates
       await supabase.from("players").update(newData).eq("player_id", player.player_id);
    }
    
    setPlayers(updatedPlayers as Player[]);
    setStatus("revealing_answer");
    await supabase.from("games").update({ status: "revealing_answer" }).eq("game_id", params.game_id);
  };

  const showLeaderboard = async () => {
    setStatus("interstitial_leaderboard");
    await supabase.from("games").update({ status: "interstitial_leaderboard" }).eq("game_id", params.game_id);
  };

  const nextQuestion = async () => {
    if (questions && currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setStatus("playing");
      await supabase.from("games").update({ current_question_index: nextIdx, status: "playing" }).eq("game_id", params.game_id);
      
      // Clear player answers for next round
      for(const p of players) {
         await supabase.from("players").update({ current_answer: null, answer_time: null }).eq("player_id", p.player_id);
      }
    } else {
      setStatus("finished");
      await supabase.from("games").update({ status: "finished" }).eq("game_id", params.game_id);
    }
  };

  // UI rendering based on states
  if (status === "finished") {
     return (
       <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 relative">
         <h1 className="text-7xl font-black mb-16 animate-pulse text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500 z-10">PODIUM</h1>
         <div className="z-10 w-full"><Podium players={players} /></div>
       </div>
     );
  }

  if (status === "interstitial_leaderboard") {
    // Sort by current score
    const sorted = [...players].sort((a,b) => b.score - a.score).slice(0, 5);
    return (
      <div className="min-h-screen bg-indigo-900 flex flex-col items-center p-8 text-white">
        <h1 className="text-6xl font-black mb-12">Top 5 Players</h1>
        <div className="w-full max-w-4xl flex flex-col gap-4">
           {sorted.map((p, i) => {
              const pointDiff = p.score - (p.previous_score || 0);
              return (
                <div key={p.player_id} className="bg-white text-slate-800 rounded-2xl p-6 flex items-center justify-between shadow-lg transform transition-all duration-1000 animate-[slideUp_0.5s_ease-out]">
                  <div className="flex items-center gap-6">
                    <span className="text-4xl font-black text-indigo-400">#{i + 1}</span>
                    <span className="text-3xl font-bold flex items-center gap-2">
                      {p.name} {(p.streak || 0) >= 3 && <span className="animate-bounce" title="On a streak!">🔥</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    {pointDiff > 0 && <span className="text-2xl font-bold text-green-500 animate-pulse">+{pointDiff}</span>}
                    <span className="text-4xl font-black">{p.score}</span>
                  </div>
                </div>
              )
           })}
        </div>
        <div className="absolute bottom-12 right-12 z-20">
           <button onClick={nextQuestion} className="bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black text-3xl hover:bg-slate-200 shadow-[0_8px_0_#94a3b8] active:translate-y-2 active:shadow-none transition-all">
             Next 🚀
           </button>
        </div>
      </div>
    );
  }

  if (status === "playing" || status === "revealing_answer") {
    const currentQ = questions[currentIndex];
    const colors = ["bg-red-500", "bg-blue-500", "bg-yellow-400", "bg-green-500"];
    const shapes = ["▲", "◆", "●", "■"];
    const isRevealing = status === "revealing_answer";
    
    // Calculate how many answered
    const answeredCount = players.filter(p => p.current_answer !== null).length;
    
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col p-8 text-slate-800">
        {!isRevealing ? (
          <CountdownBar 
            durationSeconds={currentQ?.time_limit || 15} 
            isRunning={true} 
            resetKey={currentIndex.toString()} 
            onDone={handleTimeUp} 
          />
        ) : (
          <div className="text-center text-4xl font-black text-slate-600 mb-6">TIME&apos;S UP!</div>
        )}
        
        <div className="w-full text-center bg-white p-12 rounded-[3rem] shadow-sm mt-8 border-b-[8px] border-slate-200 mb-12">
          <h1 className="text-5xl md:text-6xl font-black text-slate-800">{currentQ?.title || "Loading..."}</h1>
        </div>
        
        <div className="grid grid-cols-2 gap-6 z-10 flex-1 content-end">
          {currentQ?.options?.map((opt: string, i: number) => {
             const isCorrect = i === currentQ.correct_option_index;
             let opacity = "opacity-100";
             if (isRevealing && !isCorrect) opacity = "opacity-30 grayscale";
             
             // Answer distribution count
             const countPicked = players.filter(p => p.current_answer === i).length;
             
             return (
               <div key={i} className={`${colors[i]} ${opacity} rounded-[2rem] p-8 md:p-12 flex flex-col items-center justify-center shadow-[0_12px_0_rgba(0,0,0,0.2)] transition-all duration-500 transform relative`}>
                 {isRevealing && (
                    <div className="absolute top-[-20px] bg-white text-slate-900 font-bold px-6 py-2 rounded-full shadow-lg text-2xl">
                      {countPicked} answers
                    </div>
                 )}
                 <div className="flex items-center gap-6">
                   <span className="text-white text-5xl font-black drop-shadow-md">{shapes[i]}</span>
                   <span className="text-white text-4xl md:text-5xl font-black drop-shadow-md">{opt}</span>
                 </div>
                 {isRevealing && isCorrect && <div className="absolute right-8 text-6xl animate-bounce">✅</div>}
               </div>
             );
          })}
        </div>

        <div className="flex justify-between items-center mt-12 px-8">
           <div className="text-3xl font-bold bg-white px-8 py-4 rounded-2xl shadow-sm">
              Answers: <span className="text-indigo-600">{answeredCount} / {players.length}</span>
           </div>
           
           {isRevealing ? (
             <button onClick={showLeaderboard} className="bg-slate-900 border-4 border-slate-700 text-white px-8 py-4 rounded-2xl font-black text-3xl hover:bg-slate-800 shadow-[0_8px_0_#1e293b] active:shadow-none active:translate-y-2 transition-all">
               Show Leaderboard 🏆
             </button>
           ) : (
             <button onClick={handleTimeUp} className="bg-red-500 border-4 border-red-700 text-white px-8 py-4 rounded-2xl font-black text-2xl hover:bg-red-600 shadow-[0_8px_0_#991b1b] active:shadow-none active:translate-y-2 transition-all">
               Skip ⏭️
             </button>
           )}
        </div>
      </div>
    );
  }

  // Phase 2 Lobby UI
  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-700 to-purple-700 flex flex-col items-center justify-between p-8 font-sans text-white overflow-hidden relative">
      <div className="w-full flex flex-col md:flex-row justify-between items-center bg-white/10 p-10 rounded-3xl shadow-2xl backdrop-blur-md border border-white/20 z-10">
        <div className="flex flex-col mb-6 md:mb-0 text-center md:text-left">
          <span className="text-3xl opacity-90 font-bold mb-4">Join at <span className="bg-white text-indigo-700 px-4 py-1 rounded-xl shadow-inner font-black">{joinUrl.replace('http://', '').replace('https://', '').split('?')[0]}</span></span>
          <h1 className="text-9xl font-black tracking-[0.2em] font-mono text-white drop-shadow-2xl">
            {pinCode.match(/.{1,3}/g)?.join('-') || pinCode}
          </h1>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-2xl transform hover:scale-105 transition-transform duration-300 border-8 border-indigo-300">
           <QRCodeSVG value={joinUrl} size={220} fgColor="#3730a3" bgColor="#ffffff" level="H" includeMargin={false} />
        </div>
      </div>

      <div className="flex-1 w-full mt-12 z-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-4xl font-bold bg-black/30 px-8 py-4 rounded-full backdrop-blur-md flex items-center shadow-lg">
            Players <span className="bg-white text-indigo-800 px-5 py-1 rounded-full text-3xl font-black ml-4 shadow-inner">{players.length}</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
          {players.map((p) => (
            <div key={p.player_id} className="bg-white text-indigo-900 font-bold text-2xl py-4 px-6 rounded-2xl shadow-[0_8px_0_#94a3b8] text-center truncate">
              {p.name}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full flex justify-end p-8 z-10">
        <button onClick={startGame} disabled={players.length === 0} className="bg-lime-500 text-white text-5xl font-black py-8 px-16 rounded-[2rem] shadow-[0_16px_0_#3f6212] active:translate-y-[16px] active:shadow-none disabled:opacity-50 uppercase tracking-widest transition-all cursor-pointer border-4 border-lime-400">
          Start Game
        </button>
      </div>
    </div>
  );
}
