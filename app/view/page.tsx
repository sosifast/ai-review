"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type AnalysisResult = {
  rating: number;
  desain: number;
  warna: number;
  kakiKaki: number;
  struktur: number;
  komentar: string;
};

export default function ViewPage() {
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const handleStorageChange = () => {
      const storedStatus = localStorage.getItem('monitorStatus') as any;
      const storedData = localStorage.getItem('monitorData');
      const storedImages = localStorage.getItem('monitorImages');
      const storedSingleImage = localStorage.getItem('monitorImage');

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
      
      if (storedImages) {
        try {
          const parsed = JSON.parse(storedImages);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setImages(parsed);
          }
        } catch {
          if (storedSingleImage) setImages([storedSingleImage]);
        }
      } else if (storedSingleImage) {
        setImages([storedSingleImage]);
      } else {
        setImages([]);
      }
    };

    // Initial load
    handleStorageChange();

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Simple slideshow effect if there are multiple images
  useEffect(() => {
    if (images.length > 1) {
      const intervalTime = status === 'analyzing' ? 1500 : 4000;
      const slideInterval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }, intervalTime);
      return () => clearInterval(slideInterval);
    }
  }, [images, status]);

  return (
    <div className="w-screen h-screen bg-black text-white overflow-hidden relative">
      
      {/* Background Images Layer */}
      {images.length > 0 ? (
        <div className="absolute inset-0 z-0">
          {images.map((src, idx) => (
            <div 
              key={idx} 
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentImageIndex ? 'opacity-100' : 'opacity-0'}`}
            >
              <img 
                src={src} 
                alt="Motor Modifikasi" 
                className={`w-full h-full object-contain p-12 transition-all duration-1000 ${
                  status === 'analyzing' ? 'brightness-50 blur-[2px]' : 'brightness-100'
                }`}
              />
              
              {/* Subtle ambient glow matching the image behind */}
              <img 
                src={src} 
                alt="Motor Modifikasi Blur" 
                className={`absolute inset-0 w-full h-full object-cover -z-10 blur-[100px] opacity-40 transition-all duration-1000 ${
                  status === 'analyzing' ? 'brightness-50' : 'brightness-100'
                }`}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-20">
          <span className="font-black text-5xl tracking-[0.2em] uppercase text-zinc-500">YOK Entertainment</span>
        </div>
      )}

      {/* Analysis Overlay Layer */}
      {status === 'analyzing' && images.length > 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          {/* Scanning lines */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="w-full h-[8px] bg-gradient-to-r from-transparent via-orange-500 to-transparent shadow-[0_0_80px_20px_rgba(249,115,22,0.8)] absolute left-0 animate-[scan_2.5s_ease-in-out_infinite_alternate]" />
          </div>
          
          <div className="relative flex items-center justify-center">
            {/* HUD Elements */}
            <div className="w-96 h-96 border-[4px] border-orange-500/20 rounded-full" />
            <div className="absolute inset-0 w-96 h-96 border-[4px] border-orange-400 border-t-transparent border-b-transparent rounded-full animate-spin shadow-[0_0_50px_rgba(249,115,22,0.3)]" />
            <div className="absolute w-[420px] h-[420px] border-[2px] border-dashed border-amber-400/40 rounded-full animate-[spin_8s_linear_infinite_reverse]" />
            
            {/* Crosshair */}
            <div className="absolute w-full h-[2px] bg-orange-500/30" />
            <div className="absolute h-full w-[2px] bg-orange-500/30" />
            <div className="absolute w-8 h-8 border-2 border-orange-400 rounded-full animate-ping" />
          </div>
          
          <div className="absolute bottom-20 bg-black/80 backdrop-blur-md px-12 py-6 rounded-full border border-orange-500/40 shadow-[0_0_40px_rgba(249,115,22,0.2)]">
            <div className="flex items-center gap-6">
              <div className="w-4 h-4 bg-orange-500 rounded-full animate-pulse shadow-[0_0_15px_#f97316]" />
              <span className="text-3xl font-mono text-orange-400 tracking-[0.4em] uppercase font-bold animate-pulse">Scanning Subject...</span>
            </div>
          </div>
        </div>
      )}

      {/* Results Overlay Layer */}
      {status === 'done' && data && images.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/80 to-transparent pt-32 pb-16 px-16 animate-fade-up">
          <div className="max-w-7xl mx-auto flex items-end justify-between">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-2 h-10 bg-gradient-to-b from-green-400 to-green-600 rounded-full shadow-[0_0_15px_rgba(74,222,128,0.5)]" />
                <h2 className="text-5xl font-black text-white tracking-widest uppercase drop-shadow-lg">Analysis Complete</h2>
              </div>
              <p className="text-xl text-zinc-400 font-mono italic max-w-2xl leading-relaxed">&quot;{data.komentar}&quot;</p>
            </div>
            
            <div className="flex items-center gap-8 bg-black/60 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
              <div className="flex flex-col text-right">
                <span className="text-sm font-mono text-zinc-500 uppercase tracking-widest font-bold mb-1">Final Score</span>
                <div className="flex items-baseline gap-2 justify-end">
                  <span className={`text-7xl font-black leading-none drop-shadow-2xl ${
                    data.rating >= 8 ? 'text-green-400' : data.rating >= 6 ? 'text-amber-400' : 'text-orange-400'
                  }`}>{data.rating}</span>
                  <span className="text-2xl font-mono text-zinc-600 font-bold">/10</span>
                </div>
              </div>
              <div className="w-[2px] h-20 bg-white/10" />
              <div className="flex flex-col">
                <span className={`px-6 py-2 rounded-full text-xl font-mono font-black uppercase tracking-widest ${
                  data.rating >= 8 ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                  data.rating >= 6 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 
                  'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                }`}>
                  {data.rating >= 9 ? 'Legendary' : data.rating >= 8 ? 'Excellent' : data.rating >= 7 ? 'Great' : data.rating >= 6 ? 'Good' : data.rating >= 5 ? 'Average' : 'Needs Work'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Small UI hints */}
      {images.length > 1 && status !== 'analyzing' && (
        <div className="absolute top-10 right-10 z-30 flex gap-2">
          {images.map((_, idx) => (
            <div key={idx} className={`w-3 h-3 rounded-full transition-all duration-500 ${idx === currentImageIndex ? 'bg-white shadow-[0_0_10px_white]' : 'bg-white/20'}`} />
          ))}
        </div>
      )}
    </div>
  );
}
