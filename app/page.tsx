"use client";

import { useState, useRef } from "react";
import Image from "next/image";

type AnalysisResult = {
  rating: number;
  desain: number;
  warna: number;
  kakiKaki: number;
  struktur: number;
  komentar: string;
};

function RatingCircle({ value, size = 140 }: { value: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 10) * circumference;
  const color = value >= 8 ? '#22c55e' : value >= 6 ? '#f59e0b' : value >= 4 ? '#f97316' : '#ef4444';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          className="score-circle drop-shadow-[0_0_12px_rgba(249,115,22,0.4)]"
        />
      </svg>
      <div className="flex flex-col items-center">
        <span className="text-5xl font-black text-white leading-none tracking-tighter">{value}</span>
        <span className="text-xs font-mono text-zinc-500 mt-1">/ 10</span>
      </div>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1.5 mt-4">
      {[1, 2, 3, 4, 5].map((star) => {
        const fillPercentage = Math.max(0, Math.min(100, (rating - (star - 1) * 2) * 50));
        const color = rating >= 8 ? 'text-green-400' : rating >= 6 ? 'text-amber-400' : 'text-orange-400';
        return (
          <div key={star} className="relative w-5 h-5">
            <svg className="w-5 h-5 text-white/[0.08] absolute top-0 left-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
            <div className="absolute top-0 left-0 h-full overflow-hidden" style={{ width: `${fillPercentage}%` }}>
              <svg className={`w-5 h-5 ${color} drop-shadow-[0_0_5px_currentColor]`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RatingBar({ label, value, delay }: { label: string; value: number; delay: string }) {
  const percentage = (value / 10) * 100;
  const color = value >= 8 ? 'bg-green-500' : value >= 6 ? 'bg-amber-500' : value >= 4 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className={`animate-fade-up-delay-${delay}`}>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</span>
        <span className="text-sm font-bold text-white font-mono">{value}</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full rating-bar shadow-[0_0_10px_rgba(249,115,22,0.3)]`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export default function Home() {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateMonitor = async (status: string, data: any = null) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('monitorStatus', status);
      if (data) {
        localStorage.setItem('monitorData', JSON.stringify(data));
      } else {
        localStorage.removeItem('monitorData');
      }
    }
    try {
      await fetch('/api/pusher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, data }),
      });
    } catch (e) {
      console.error('Failed to sync to pusher', e);
    }
  };

  const syncImagesToStorage = async (filesList: File[]) => {
    try {
      const base64Promises = filesList.map(file => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX = 500;
            let w = img.width, h = img.height;
            if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
            else { if (h > MAX) { w *= MAX / h; h = MAX; } }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.6));
          };
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }));

      const imagesBase64 = await Promise.all(base64Promises);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('monitorImages', JSON.stringify(imagesBase64));
        } catch (e) {
          console.warn('Could not save images to localStorage (might be too large)', e);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const urls = filesArray.map(file => URL.createObjectURL(file));
      setSelectedImages(urls);
      setAnalysisResult(null);
      updateMonitor('idle');
      syncImagesToStorage(filesArray);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      const dt = new DataTransfer();
      filesArray.forEach(f => dt.items.add(f));
      if (fileInputRef.current) fileInputRef.current.files = dt.files;
      const urls = filesArray.map(file => URL.createObjectURL(file));
      setSelectedImages(urls);
      setAnalysisResult(null);
      updateMonitor('idle');
      syncImagesToStorage(filesArray);
    }
  };

  const handleAnalyze = async () => {
    if (selectedImages.length === 0 || !fileInputRef.current?.files?.length) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    updateMonitor('analyzing');
    if (typeof window !== 'undefined') {
      // Set a temporary image for the monitor to show scanning effect
      const file = fileInputRef.current?.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => localStorage.setItem('monitorImage', e.target?.result as string);
        reader.readAsDataURL(file);
      }
    }

    try {
      const files = Array.from(fileInputRef.current.files);
      const base64Promises = files.map(file => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX = 500;
            let w = img.width, h = img.height;
            if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
            else { if (h > MAX) { w *= MAX / h; h = MAX; } }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.6));
          };
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }));

      const imagesBase64 = await Promise.all(base64Promises);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('monitorImages', JSON.stringify(imagesBase64));
        } catch (e) {
          console.warn('Could not save images to localStorage (might be too large)', e);
        }
      }

      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagesBase64 })
        });
        const data = await response.json();
        if (data?.result) {
          try {
            const cleaned = data.result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleaned);
            setAnalysisResult(parsed);
            updateMonitor('done', parsed);
          } catch {
            const errResult = { rating: 0, desain: 0, warna: 0, kakiKaki: 0, struktur: 0, komentar: data.result };
            setAnalysisResult(errResult);
            updateMonitor('error', errResult);
          }
        } else {
          const errResult = { rating: 0, desain: 0, warna: 0, kakiKaki: 0, struktur: 0, komentar: data.error || 'Gagal menganalisis.' };
          setAnalysisResult(errResult);
          updateMonitor('error', errResult);
        }
      } catch {
        const errResult = { rating: 0, desain: 0, warna: 0, kakiKaki: 0, struktur: 0, komentar: 'Koneksi error.' };
        setAnalysisResult(errResult);
        updateMonitor('error', errResult);
      }
      setIsAnalyzing(false);
    } catch {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060608] text-white overflow-hidden">

      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-30%] right-[-10%] w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-amber-600/8 rounded-full blur-[150px]" />
        <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-red-600/5 rounded-full blur-[120px]" />
      </div>

      {/* Top Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-5 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.4)]">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide">YOK</span>
            <span className="font-bold text-sm text-orange-400 tracking-wide"> Entertainment</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-600">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isAnalyzing ? 'bg-orange-400 animate-pulse' : 'bg-green-500'}`} />
            <span>{isAnalyzing ? 'SCANNING' : 'READY'}</span>
          </div>
        </div>
      </nav>

      <main className="relative z-10 flex flex-col lg:flex-row min-h-[calc(100vh-65px)]">

        {/* Left: Image Panel */}
        <div className="w-full lg:w-[55%] p-4 sm:p-6 lg:p-8 flex flex-col">
          <div
            className={`relative flex-1 min-h-[50vh] rounded-2xl lg:rounded-3xl overflow-hidden border-2 transition-all duration-300 ${
              dragOver 
                ? 'border-orange-400 bg-orange-400/5' 
                : selectedImages.length > 0 
                  ? 'border-white/[0.06] bg-[#0a0a0c]'
                  : 'border-dashed border-white/10 bg-[#0a0a0c] hover:border-white/20 cursor-pointer'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => selectedImages.length === 0 && fileInputRef.current?.click()}
          >
            {selectedImages.length > 0 ? (
              <div className="absolute inset-0 flex flex-col p-4 gap-4">
                <div className="relative flex-1 rounded-xl overflow-hidden border border-white/5">
                  <Image
                    src={selectedImages[0]}
                  alt="Motor modifikasi"
                  fill
                  className={`object-cover transition-all duration-1000 ${
                    isAnalyzing ? 'scale-105 brightness-[0.35]' : 'brightness-90 hover:brightness-100'
                  }`}
                />

                {/* Scan overlay */}
                {isAnalyzing && (
                  <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                    <div className="w-full h-[3px] bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-[0_0_40px_8px_rgba(249,115,22,0.5)] absolute left-0 animate-[scan_2s_ease-in-out_infinite_alternate]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 border-2 border-orange-400/30 rounded-full animate-ping" />
                      <div className="absolute w-16 h-16 border border-dashed border-orange-400/60 rounded-full animate-[spin_6s_linear_infinite]" />
                    </div>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-orange-400/30">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                        <span className="text-sm font-mono text-orange-300 tracking-widest uppercase">Analyzing modification...</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Corner markers */}
                <div className={`absolute inset-0 z-10 p-5 pointer-events-none transition-opacity duration-500 ${isAnalyzing || analysisResult ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-orange-400/50" />
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-orange-400/50" />
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-orange-400/50" />
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-orange-400/50" />
                </div>

                {/* Rating overlay on image */}
                {analysisResult && (
                  <div className="absolute top-5 right-5 z-30 bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/10 animate-fade-up">
                    <div className="flex items-center gap-2">
                      <span className={`text-3xl font-black ${
                        analysisResult.rating >= 8 ? 'text-green-400' : analysisResult.rating >= 6 ? 'text-amber-400' : 'text-orange-400'
                      }`}>{analysisResult.rating}</span>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono text-zinc-400">/10</span>
                        <span className="text-[9px] font-mono text-zinc-600 uppercase">Score</span>
                      </div>
                    </div>
                  </div>
                )}
                </div>

                {/* Thumbnails (if multiple) */}
                {selectedImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto h-20 shrink-0">
                    {selectedImages.map((src, idx) => (
                      <div key={idx} className="relative w-24 h-full rounded-lg overflow-hidden border border-white/10 shrink-0">
                        <Image src={src} alt={`Thumbnail ${idx+1}`} fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                    <svg className="w-10 h-10 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-400">Drag & drop gambar motor modifikasi</p>
                  <p className="text-xs text-zinc-600 mt-1">atau klik untuk memilih file</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom controls */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all duration-300 group"
            >
              <svg className="w-4 h-4 text-zinc-400 group-hover:text-orange-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
              </svg>
              <span className="text-sm font-medium text-zinc-300">
                {selectedImages.length > 0 ? 'Ganti Gambar' : 'Pilih Gambar'}
              </span>
            </button>
            <input type="file" ref={fileInputRef} accept="image/*" multiple onChange={handleImageChange} className="hidden" />

            <button
              onClick={handleAnalyze}
              disabled={selectedImages.length === 0 || isAnalyzing}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                selectedImages.length === 0
                  ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-white/5'
                  : isAnalyzing
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30 cursor-wait'
                    : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
                  <span>Menganalisis...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>Mulai Review</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Results Panel */}
        <div className="w-full lg:w-[45%] p-4 sm:p-6 lg:p-8 lg:border-l border-white/[0.04] flex flex-col">
          
          {!analysisResult && !isAnalyzing ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
              <svg className="w-16 h-16 text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm text-zinc-600 font-mono">Hasil penilaian akan tampil di sini</p>
              <p className="text-xs text-zinc-700 font-mono mt-1">Upload gambar & klik &quot;Mulai Review&quot;</p>
            </div>
          ) : isAnalyzing && !analysisResult ? (
            /* Loading State */
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 border-2 border-orange-500/20 rounded-full" />
                <div className="absolute inset-0 w-24 h-24 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-300">Sedang diproses</p>
              </div>
            </div>
          ) : analysisResult && analysisResult.rating === 0 ? (
            /* Error State (API Limit / Failure) */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-red-400">Analisis Gagal</p>
              <p className="text-xs text-zinc-400 font-mono leading-relaxed">{analysisResult.komentar}</p>
              <button 
                onClick={handleAnalyze} 
                className="mt-4 px-6 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-mono transition-colors"
              >
                COBA LAGI
              </button>
            </div>
          ) : analysisResult && (
            /* Results */
            <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
              {/* Header */}
              <div className="animate-fade-up">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-orange-400 to-amber-500 rounded-full" />
                  Rating Modifikasi
                </h2>
                <p className="text-xs text-zinc-600 font-mono mt-1">MODIFICATION SCORE REPORT</p>
              </div>

              {/* Main Score */}
              <div className="flex flex-col items-center justify-center animate-fade-up-delay-1 mb-8 mt-2">
                <RatingCircle value={analysisResult.rating} />
                <StarRating rating={analysisResult.rating} />
                <div className="mt-4 px-5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest shadow-lg"
                  style={{
                    background: analysisResult.rating >= 8 ? 'rgba(34,197,94,0.15)' : analysisResult.rating >= 6 ? 'rgba(245,158,11,0.15)' : 'rgba(249,115,22,0.15)',
                    color: analysisResult.rating >= 8 ? '#4ade80' : analysisResult.rating >= 6 ? '#fbbf24' : '#fb923c',
                    border: `1px solid ${analysisResult.rating >= 8 ? 'rgba(34,197,94,0.3)' : analysisResult.rating >= 6 ? 'rgba(245,158,11,0.3)' : 'rgba(249,115,22,0.3)'}`
                  }}
                >
                  {analysisResult.rating >= 9 ? 'Legendary' : analysisResult.rating >= 8 ? 'Excellent' : analysisResult.rating >= 7 ? 'Great' : analysisResult.rating >= 6 ? 'Good' : analysisResult.rating >= 5 ? 'Average' : 'Needs Work'}
                </div>
              </div>

              {/* Rating Bars */}
              <div className="space-y-4 mt-2 p-5 bg-white/[0.02] rounded-2xl border border-white/[0.04]">
                <RatingBar label="Desain Keseluruhan" value={analysisResult.desain} delay="1" />
                <RatingBar label="Keserasian Warna" value={analysisResult.warna} delay="2" />
                <RatingBar label="Ban & Velg" value={analysisResult.kakiKaki} delay="3" />
                <RatingBar label="Rangka & Suspensi" value={analysisResult.struktur} delay="4" />
              </div>


            </div>
          )}
        </div>
      </main>
    </div>
  );
}
