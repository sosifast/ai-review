"use client";

import { useEffect, useState } from "react";

type AnalysisResult = {
  rating: number;
  desain: number;
  warna: number;
  kakiKaki: number;
  struktur: number;
  komentar: string;
};

function RatingCircle({ value, size = 300 }: { value: number; size?: number }) {
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 10) * circumference;
  const color = value >= 8 ? '#22c55e' : value >= 6 ? '#f59e0b' : value >= 4 ? '#f97316' : '#ef4444';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="16" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth="16" strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          className="score-circle drop-shadow-[0_0_20px_rgba(249,115,22,0.5)] transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="flex flex-col items-center">
        <span className="text-8xl font-black text-white leading-none tracking-tighter drop-shadow-2xl">{value}</span>
        <span className="text-2xl font-mono text-zinc-400 mt-2">/ 10</span>
      </div>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-3 mt-8">
      {[1, 2, 3, 4, 5].map((star) => {
        const fillPercentage = Math.max(0, Math.min(100, (rating - (star - 1) * 2) * 50));
        const color = rating >= 8 ? 'text-green-400' : rating >= 6 ? 'text-amber-400' : 'text-orange-400';
        return (
          <div key={star} className="relative w-12 h-12">
            <svg className="w-12 h-12 text-white/[0.08] absolute top-0 left-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
            <div className="absolute top-0 left-0 h-full overflow-hidden transition-all duration-1000 ease-out" style={{ width: `${fillPercentage}%` }}>
              <svg className={`w-12 h-12 ${color} drop-shadow-[0_0_10px_currentColor]`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}


export default function MonitorPage() {
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [data, setData] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    const handleStorageChange = () => {
      const storedStatus = localStorage.getItem('monitorStatus') as any;
      const storedData = localStorage.getItem('monitorData');

      if (storedStatus) setStatus(storedStatus);
      if (storedData) {
        try {
          setData(JSON.parse(storedData));
        } catch {
          // ignore
        }
      } else {
        setData(null);
      }
    };

    // Initial load
    handleStorageChange();

    window.addEventListener('storage', handleStorageChange);
    // As a fallback for same-tab updates (though Monitor is usually a different tab)
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-black text-white overflow-hidden flex items-center justify-center relative">
      {status === 'idle' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 animate-[pulse_4s_ease-in-out_infinite]">
           <div className="flex items-center scale-150">
             <div>
               <span className="font-black text-5xl tracking-[0.2em] uppercase">YOK</span>
               <span className="font-bold text-5xl text-orange-400 tracking-wide"> Entertainment</span>
             </div>
           </div>
        </div>
      )}

      {status === 'analyzing' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-12">
          <div className="relative">
             <div className="w-80 h-80 border-[12px] border-orange-500/10 rounded-full" />
             <div className="absolute inset-0 w-80 h-80 border-[12px] border-orange-400 border-t-transparent rounded-full animate-spin shadow-[0_0_50px_rgba(249,115,22,0.3)]" />
             <div className="absolute inset-0 w-80 h-80 border-[12px] border-amber-400/40 border-b-transparent rounded-full animate-[spin_3s_reverse_infinite]" />
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-40 border-4 border-dashed border-orange-500/50 rounded-full animate-[spin_10s_linear_infinite]" />
             </div>
          </div>
          <p className="text-4xl font-mono text-orange-400 tracking-[0.4em] animate-pulse font-black drop-shadow-[0_0_20px_rgba(249,115,22,0.6)]">ANALYZING...</p>
        </div>
      )}

      {status === 'done' && data && (
        <div className="flex flex-col items-center justify-center animate-fade-up z-10 w-full h-full">
          <div className="mb-10 text-center">
            <h2 className="text-6xl font-black text-white tracking-widest uppercase mb-4 drop-shadow-2xl">Score Modifikasi</h2>
            <div className="w-64 h-3 bg-gradient-to-r from-orange-400 to-amber-500 mx-auto rounded-full shadow-[0_0_20px_rgba(249,115,22,0.6)]" />
          </div>

          <RatingCircle value={data.rating} size={420} />
          
          <div className="scale-125 mt-10">
            <StarRating rating={data.rating} />
          </div>
          
          <div className="mt-14 px-14 py-4 rounded-full text-3xl font-mono font-black uppercase tracking-[0.4em] shadow-[0_0_40px_rgba(0,0,0,0.6)]"
            style={{
              background: data.rating >= 8 ? 'rgba(34,197,94,0.15)' : data.rating >= 6 ? 'rgba(245,158,11,0.15)' : 'rgba(249,115,22,0.15)',
              color: data.rating >= 8 ? '#4ade80' : data.rating >= 6 ? '#fbbf24' : '#fb923c',
              border: `3px solid ${data.rating >= 8 ? 'rgba(34,197,94,0.3)' : data.rating >= 6 ? 'rgba(245,158,11,0.3)' : 'rgba(249,115,22,0.3)'}`
            }}
          >
            {data.rating >= 9 ? 'Legendary' : data.rating >= 8 ? 'Excellent' : data.rating >= 7 ? 'Great' : data.rating >= 6 ? 'Good' : data.rating >= 5 ? 'Average' : 'Needs Work'}
          </div>
        </div>
      )}
    </div>
  );
}
