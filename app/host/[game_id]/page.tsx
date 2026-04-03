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
  const [questions, setQuestions] = useState<{ title: string; options: string[] }[]>([]);
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
      if (data) setPlayers(data.map((p: { player_id: string; name: string; score: number }) => ({ id: p.player_id, name: p.name, score: p.score })));
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
        { game_id: params.game_id, title: "什麼是 Agentic AI 的核心特徵？", options: ["只能被動回答", "具備自主規劃決策與執行", "只能處理影像", "需手動編寫邏輯"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "MCP (Model Context Protocol) 主要用途為何？", options: ["加快模型訓練", "標準化介面連接外部資源", "壓縮模型參數", "取代前端開發"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "在 Claude Code 中，哪一個指令專門用於核准 AI 執行的危險動作？", options: ["/allow", "/approve", "直接輸入 yes 或 Y", "/grant"], correct_option_index: 2, time_limit: 15 },
        { game_id: params.game_id, title: "Agentic 系統中的 'Tools' (工具) 作用為何？", options: ["操作實體機器人", "讓 AI 執行程式碼或讀取檔案", "監控 AI 的效能", "優化記憶體"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "下列何者不是 MCP 架構中的標準元件？", options: ["MCP Client", "MCP Server", "MCP Root Router", "Host Application"], correct_option_index: 2, time_limit: 15 },
        { game_id: params.game_id, title: "開發 MCP Server 時，讓模型能存取的靜態或動態資料功能稱為？", options: ["Resources", "Tools", "Prompts", "APIs"], correct_option_index: 0, time_limit: 15 },
        { game_id: params.game_id, title: "在 Agentic 架構中，'Skills' (技能) 通常代表什麼？", options: ["內建的權重參數", "賦予 AI 執行特定領域任務的進階能力", "工程師寫程式速度", "AI繪圖技巧"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "Claude Code CLI 最大的特點是什麼？", options: ["整合編譯器", "整合於終端機，能理解整個專案並執行", "只支援 Python", "無法存取本地端"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "MCP 中的 'Prompts' 功能提供什麼主要好處？", options: ["提供標準化可重用的提示詞模板", "壓縮對話", "自動生成 UI", "直接連線網路"], correct_option_index: 0, time_limit: 15 },
        { game_id: params.game_id, title: "關於 Agentic AI 運作循環 (Loop)，何者最準確？", options: ["觀察->思考->行動->觀察", "訓練->測試->佈署", "提問->回答->結束", "爬蟲->儲存->顯示"], correct_option_index: 0, time_limit: 15 },
        { game_id: params.game_id, title: "何種情境最適合建立一個 MCP Server？", options: ["單純寫 Hello World", "企業私有系統標準化暴露給模型查詢", "更新顯卡驅動", "開發網頁前台"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "Claude Code 中，哪個指令用來顯示目前花費的 token 和成本？", options: ["/cost", "/budget", "/billing", "/tokens"], correct_option_index: 0, time_limit: 15 },
        { game_id: params.game_id, title: "Tool-use 或 Function calling 讓 AI 可以做什麼？", options: ["獲得自我意識", "返回結構化資料觸發外部程式執行", "修復硬體", "避免斷線"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "Claude Code 執行高風險操作（例如刪除檔案）時預設會？", options: ["直接靜默執行", "需要使用者手動打字確認", "彈出系統視窗", "直接崩潰"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "MCP 主要支援哪兩種傳輸層機制？", options: ["FTP 與 SMTP", "Stdio 與 SSE", "TCP 與 UDP", "Bluetooth 與 WiFi"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "MCP Server 可以用哪些程式語言開發？", options: ["只能 Python", "只能 TypeScript", "任何支援 JSON-RPC 的語言皆可", "只能 C++"], correct_option_index: 2, time_limit: 15 },
        { game_id: params.game_id, title: "在 Agentic AI 中，何謂 'Human-in-the-loop' (HITL)？", options: ["AI 控制人類", "系統暫停等待人類批准後再繼續", "人類提供電力", "讓語音聽起來更像人"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "在 Claude CLI 中，如何將特定檔案內容精準餵給 Claude？", options: ["使用滑鼠拖曳", "直接在對話提及檔名", "無法做到", "用手機拍照"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "為什麼要有 MCP？", options: ["大廠想壟斷", "解決無數模型與無數資源對接的 N x M 排列組合地獄", "縮小模型", "為了取代 Git"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "關於 MCP 的 Resources 描述何者正確？", options: ["允許模型讀取特定的靜態或動態唯讀資料", "允許模型執行指令", "用來輸入帳號密碼", "限制只輸出圖片"], correct_option_index: 0, time_limit: 15 },
        { game_id: params.game_id, title: "Agent 的 Memory 通常被劃分為哪兩種？", options: ["快取與硬碟", "短期上下文與長期資料庫/外掛存放區", "視覺與聽覺", "主機板與雲端"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "MCP 架構允許模型「主動修改」Resources 上的資料嗎？", options: ["可以，這是特色", "不行，Resources 是唯讀的，修改應使用 Tools", "設定好 IP 就可以", "要升級付費版才能"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "若要讓 Agent 能夠編譯專案，需要賦予什麼？", options: ["Text-to-Speech", "執行 Bash 命令列的 Tool", "唱歌軟體", "網頁爬蟲能力"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "Claude Code 中是否能清除對話上下文以重新開始？", options: ["無法清除", "使用 /clear 指令", "按 ESC 鍵", "關閉網路連線"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "MCP 的 'Tools' 與 'Resources' 最主要差異？", options: ["沒有差異", "Resources 提供唯讀資料，Tools 用於產生副作用或動作", "只差在名字", "Resources 比較貴"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "Anthropic 推出 MCP 解決了什麼生態問題？", options: ["封閉的外掛生態系統", "只需開發一次 Server 即可供所有相容的 AI 使用", "減輕電池消耗", "取代 VSCode 開發"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "若給予 Agent 無限制的 CLI 操作權限可能會帶來什麼風險？", options: ["效能飆升", "無意間刪除重要檔案或執行危險腳本", "導致斷電", "程式碼自動重構太完美惹人怨"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "目前官方推薦開發 MCP Client 主要用於？", options: ["純後端腳本", "打造具備自定義能力的 Agent UI 或與現有編輯器整合", "寫遊戲", "挖礦"], correct_option_index: 1, time_limit: 15 },
        { game_id: params.game_id, title: "哪一個 CLI 工具能實現直接利用最新大模型於終端機完成修改？", options: ["Git", "Docker", "Claude Code", "NPM"], correct_option_index: 2, time_limit: 15 },
        { game_id: params.game_id, title: "Agentic AI 在解決複雜任務時，如果前一步失敗通常會？", options: ["立刻卡死並強制關閉", "分析錯誤訊息、調整策略或工具並重試", "等待開發者寫死 if-else", "將錯誤丟給下個任務"], correct_option_index: 1, time_limit: 15 }
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
         <style dangerouslySetInnerHTML={{__html: `@keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}} />
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
             <div key={i} className={`${colors[i]} rounded-[2rem] p-12 flex items-center justify-center shadow-[0_12px_0_rgba(0,0,0,0.2)] transform transition hover:-translate-y-2`}>
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
