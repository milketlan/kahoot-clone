"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../../utils/supabase/client";
import confetti from "canvas-confetti";

export default function HostPage({ params }: { params: { game_id: string } }) {
  const [pinCode, setPinCode] = useState("------");
  const [players, setPlayers] = useState<{ id: string; name: string; score: number }[]>([]);
  const [joinUrl, setJoinUrl] = useState("");
  const [status, setStatus] = useState("waiting");
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

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
      if (data) setPlayers(data.map((p: any) => ({ id: p.player_id, name: p.name, score: p.score })));
    };
    fetchPlayers();

    const channel = supabase.channel('players_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${params.game_id}` }, (payload) => {
         if (payload.eventType === 'INSERT') {
           setPlayers(prev => [...prev, { id: payload.new.player_id, name: payload.new.name, score: payload.new.score }]);
         } else if (payload.eventType === 'UPDATE') {
           setPlayers(prev => prev.map(p => p.id === payload.new.player_id ? { ...p, score: payload.new.score } : p));
         }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.game_id]);

  useEffect(() => {
    if (status === "finished") {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#facc15', '#4f46e5', '#ec4899', '#10b981']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#facc15', '#4f46e5', '#ec4899', '#10b981']
        });

        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [status]);

  const startGame = async () => {
    const { data: qData } = await supabase.from("questions").select("*").eq("game_id", params.game_id);
    let qList = qData || [];
    
    if (qList.length === 0) {
      const dummyQs = [
        { game_id: params.game_id, title: "What is 1 + 1?", options: ["1", "2", "3", "4"], correct_option_index: 1, time_limit: 10 },
        { game_id: params.game_id, title: "Is Tailwind CSS fast?", options: ["Yes", "No", "Maybe", "What?"], correct_option_index: 0, time_limit: 10 },
        { game_id: params.game_id, title: "What year is it?", options: ["2023", "2024", "2025", "2026"], correct_option_index: 3, time_limit: 10 },
      ];
      await supabase.from("questions").insert(dummyQs);
      const { data: newQData } = await supabase.from("questions").select("*").eq("game_id", params.game_id).order("created_at");
      qList = newQData || [];
    }
    
    setQuestions(qList);
    setStatus("playing");
    await supabase.from("games").update({ status: "playing", current_question_index: 0 }).eq("game_id", params.game_id);
  };

  const nextQuestion = async () => {
    if (questions && currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      await supabase.from("games").update({ current_question_index: nextIdx }).eq("game_id", params.game_id);
    } else {
      setStatus("finished");
      await supabase.from("games").update({ status: "finished" }).eq("game_id", params.game_id);
    }
  };

  if (status === "finished") {
     const topPlayers = [...players].sort((a,b) => b.score - a.score).slice(0,3);
     return (
       <div className="min-h-screen bg-gradient-to-b from-indigo-900 to-purple-900 flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
         <h1 className="text-7xl font-black mb-16 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 animate-pulse">Podium</h1>
         <div className="flex items-end gap-6 h-80">
           {/* Second */}
           {topPlayers[1] && <div className="flex flex-col items-center animate-[slideUp_1s_ease-out]"><div className="text-2xl font-bold mb-3">{topPlayers[1].name}</div><div className="text-yellow-200 mb-2">{topPlayers[1].score} pts</div><div className="w-40 h-40 bg-gray-300 rounded-t-2xl flex justify-center items-start pt-6 text-5xl font-black text-gray-600 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.2)]">2</div></div>}
           {/* First */}
           {topPlayers[0] && <div className="flex flex-col items-center animate-[slideUp_0.8s_ease-out]"><div className="text-5xl mb-4">👑</div><div className="text-4xl font-black mb-3 text-yellow-300">{topPlayers[0].name}</div><div className="text-yellow-100 font-bold mb-2">{topPlayers[0].score} pts</div><div className="w-48 h-64 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-t-2xl flex justify-center items-start pt-8 text-7xl font-black text-yellow-900 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.3),0_0_50px_rgba(250,204,21,0.6)]">1</div></div>}
           {/* Third */}
           {topPlayers[2] && <div className="flex flex-col items-center animate-[slideUp_1.2s_ease-out]"><div className="text-2xl font-bold mb-3">{topPlayers[2].name}</div><div className="text-yellow-200 mb-2">{topPlayers[2].score} pts</div><div className="w-40 h-28 bg-amber-700 rounded-t-2xl flex justify-center items-start pt-6 text-4xl font-bold text-amber-950 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.2)]">3</div></div>}
         </div>
         <style dangerouslySetInnerHTML={{__html: \`@keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }\`}} />
       </div>
     );
  }

  if (status === "playing") {
    const currentQ = questions[currentIndex];
    const colors = ["bg-red-500", "bg-blue-500", "bg-yellow-400", "bg-green-500"];
    
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-between p-8 text-slate-800">
        <div className="w-full max-w-6xl text-center bg-white p-12 rounded-[3.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] mt-8 border-b-[12px] border-slate-200">
          <h1 className="text-6xl font-black text-slate-700">{currentQ?.title || "Loading..."}</h1>
        </div>
        
        <div className="flex-1 w-full flex items-center justify-center relative">
            <div className="absolute w-[200px] h-[200px] bg-purple-500 rounded-full mix-blend-multiply opacity-20 filter blur-3xl animate-blob"></div>
            <div className="text-[12rem] font-black text-indigo-500/10 z-0">VIBE</div>
        </div>

        <div className="w-full max-w-6xl grid grid-cols-2 gap-6 z-10">
          {currentQ?.options?.map((opt: string, i: number) => (
             <div key={i} className={\`\${colors[i]} rounded-[2rem] p-12 flex items-center justify-center shadow-[0_12px_0_rgba(0,0,0,0.2)] transform transition hover:-translate-y-2\`}>
               <span className="text-white text-5xl font-black drop-shadow-md">{opt}</span>
             </div>
          ))}
        </div>
        
        <div className="absolute right-8 top-8 z-20">
           <button onClick={nextQuestion} className="bg-slate-900 border-4 border-slate-700 text-white px-8 py-4 rounded-2xl font-black text-2xl hover:bg-slate-800 shadow-[0_8px_0_#1e293b] active:shadow-none active:translate-y-[8px] transition-all">Next 🚀</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-700 to-purple-700 flex flex-col items-center justify-between p-8 font-sans text-white overflow-hidden relative">
      <div className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-center bg-white/10 p-10 rounded-3xl shadow-2xl backdrop-blur-md border border-white/20 z-10 mt-8">
        <div className="flex flex-col mb-6 md:mb-0 text-center md:text-left">
          <span className="text-3xl opacity-90 font-bold mb-4">Join at <span className="bg-white text-indigo-700 px-4 py-1 rounded-xl shadow-inner font-black">{joinUrl.replace('http://', '').replace('https://', '').split('?')[0]}</span></span>
          <h1 className="text-9xl font-black tracking-[0.2em] font-mono text-white drop-shadow-2xl">
            {pinCode.match(/.{1,3}/g)?.join('-') || pinCode}
          </h1>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-300 border-8 border-indigo-300 rotate-3 hover:rotate-0">
          {joinUrl && <QRCodeSVG value={joinUrl} size={220} fgColor="#3730a3" bgColor="#ffffff" level="H" includeMargin={false} />}
        </div>
      </div>

      <div className="flex-1 w-full max-w-7xl mt-16 z-10">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-4xl font-bold bg-black/30 px-8 py-4 rounded-full backdrop-blur-md border border-white/10 flex items-center shadow-lg">
            Players <span className="bg-white text-indigo-800 px-5 py-1 rounded-full text-3xl font-black ml-4 shadow-inner">{players.length}</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {players.map((p) => (
            <div key={p.id} className="bg-white text-indigo-900 font-bold text-2xl py-5 px-6 rounded-2xl shadow-[0_10px_0_#94a3b8] hover:-translate-y-2 hover:shadow-[0_15px_0_#94a3b8] transition-all text-center truncate">
              {p.name}
            </div>
          ))}
          {players.length === 0 && (
            <div className="col-span-full flex flex-col justify-center items-center h-48 opacity-70 bg-white/5 rounded-3xl border border-dashed border-white/30">
              <div className="w-16 h-16 border-8 border-white border-t-transparent rounded-full animate-spin mb-6 drop-shadow-lg"></div>
              <p className="text-3xl font-black uppercase tracking-widest animate-pulse drop-shadow-md">Waiting for players</p>
            </div>
          )}
        </div>
      </div>

      <div className="w-full flex justify-end p-8 z-10">
        <button onClick={startGame} disabled={players.length === 0} className="bg-lime-500 text-white text-5xl font-black py-8 px-16 rounded-3xl shadow-[0_16px_0_#3f6212] active:translate-y-[16px] active:shadow-none disabled:opacity-50 uppercase tracking-widest transition-all cursor-pointer border-4 border-lime-400 disabled:cursor-not-allowed">
          Start Game
        </button>
      </div>
    </div>
  );
}
