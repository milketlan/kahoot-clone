"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase/client";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleHostGame = async () => {
    setLoading(true);
    try {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      const { data, error } = await supabase
        .from("games")
        .insert({ pin_code: pin, status: "waiting", current_question_index: 0 })
        .select()
        .single();
      
      if (error) throw error;
      router.push(`/host/${data.game_id}`);
    } catch (e) {
      console.error(e);
      alert("Failed to create game. Check Supabase connection.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-pink-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      <div className="z-10 flex flex-col items-center text-center">
        <h1 className="text-7xl md:text-9xl font-black mb-4 tracking-tighter drop-shadow-2xl">
          Kahoot<span className="text-yellow-400">Clone</span>
        </h1>
        <p className="text-2xl opacity-80 mb-16 max-w-xl font-medium">The ultimate real-time trivia vibe. Built with Next.js, Tailwind, and Supabase.</p>
        
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl px-4">
          <button
            onClick={() => router.push('/join')}
            className="flex-1 bg-white text-indigo-900 hover:bg-slate-100 hover:-translate-y-2 font-black text-3xl py-8 rounded-3xl shadow-[0_12px_0_#94a3b8] active:shadow-none active:translate-y-2 transition-all group relative overflow-hidden"
          >
            <span className="relative z-10 block group-hover:scale-105 transition-transform">Join Game ✨</span>
          </button>
          
          <button
            onClick={handleHostGame}
            disabled={loading}
            className="flex-1 bg-indigo-500 text-white hover:bg-indigo-400 hover:-translate-y-2 font-black text-3xl py-8 rounded-3xl shadow-[0_12px_0_#312e81] active:shadow-none active:translate-y-2 transition-all disabled:opacity-50 group border-4 border-indigo-400"
          >
            <span className="relative z-10 block group-hover:scale-105 transition-transform">{loading ? "Creating..." : "Host Game 🚀"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
