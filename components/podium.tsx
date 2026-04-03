"use client";

import confetti from "canvas-confetti";
import { useEffect, useState } from "react";

const podiumHeights = ["h-[400px]", "h-[300px]", "h-[200px]"];
const podiumColors = [
  "from-yellow-400 to-yellow-600 text-yellow-900 shadow-[0_0_50px_rgba(250,204,21,0.6)]", 
  "from-slate-200 to-slate-400 text-slate-700", 
  "from-amber-600 to-amber-800 text-amber-950"
];

export function Podium({ players }: { players: { id?: string; player_id?: string; name: string; score: number }[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (players.length > 0) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [players.length]);

  const topPlayers = [...players].sort((a,b) => b.score - a.score).slice(0,3);
  const order = [1, 0, 2].filter((index) => topPlayers[index]);

  return (
    <div className="flex items-end justify-center gap-4 md:gap-8 h-[600px] w-full max-w-4xl mx-auto overflow-hidden">
      {order.map((index, i) => {
        const player = topPlayers[index];
        const animationDelay = [1, 0.5, 1.5][i]; // First place pops up fastest!
        const rank = index + 1;
        
        return (
          <div 
            key={player.id || player.player_id || index} 
            className={`flex flex-col items-center flex-1 max-w-[250px] transition-all transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-[200px] opacity-0'}`}
            style={{ transitionDuration: '800ms', transitionDelay: `${animationDelay}s`, transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
          >
             {rank === 1 && <div className="text-7xl mb-4 animate-bounce">👑</div>}
             <div className="text-3xl md:text-4xl font-black mb-2 text-white drop-shadow-md truncate w-full text-center">{player.name}</div>
             <div className="text-white/80 font-bold mb-4 text-xl">{player.score} pts</div>
             <div className={`w-full bg-gradient-to-b ${podiumColors[index]} rounded-t-3xl flex justify-center pt-8 text-7xl font-black shadow-[inset_0_-10px_20px_rgba(0,0,0,0.2)] ${podiumHeights[i]}`}>
                {rank}
             </div>
          </div>
        );
      })}
    </div>
  );
}
