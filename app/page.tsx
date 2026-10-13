"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

type AnalysisResult = {
  rating: number;
  desain: number;
  warna: number;
  kakiKaki: number;
  struktur: number;
  komentar: string;
  participantName?: string;
};

type Participant = {
  id: string;
  robloxUsername: string;
  displayName?: string;
  robloxId?: string;
  avatarUrl?: string;
  name: string;
  files: File[];
  imageUrls: string[];
  status: "idle" | "analyzing" | "done" | "error";
  result: AnalysisResult | null;
  savedToDb?: boolean;
  isCheckingRoblox?: boolean;
};

function RatingCircle({ value, size = 140 }: { value: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 10) * circumference;
  const color = value >= 8 ? "#22c55e" : value >= 6 ? "#f59e0b" : value >= 4 ? "#f97316" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          className="score-circle drop-shadow-[0_0_12px_rgba(249,115,22,0.4)] transition-all duration-700"
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
    <div className="flex gap-1.5 mt-3">
      {[1, 2, 3, 4, 5].map((star) => {
        const fillPercentage = Math.max(0, Math.min(100, (rating - (star - 1) * 2) * 50));
        const color = rating >= 8 ? "text-green-400" : rating >= 6 ? "text-amber-400" : "text-orange-400";
        return (
          <div key={star} className="relative w-5 h-5">
            <svg className="w-5 h-5 text-white/[0.08] absolute top-0 left-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <div className="absolute top-0 left-0 h-full overflow-hidden" style={{ width: `${fillPercentage}%` }}>
              <svg className={`w-5 h-5 ${color} drop-shadow-[0_0_5px_currentColor]`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
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
  const color = value >= 8 ? "bg-green-500" : value >= 6 ? "bg-amber-500" : value >= 4 ? "bg-orange-500" : "bg-red-500";

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
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: "p_1",
      robloxUsername: "",
      displayName: "",
      name: "Peserta 1",
      files: [],
      imageUrls: [],
      status: "idle",
      result: null,
      savedToDb: false,
    },
  ]);
  const [activeParticipantId, setActiveParticipantId] = useState<string>("p_1");
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isQueueRunning, setIsQueueRunning] = useState<boolean>(false);
  const [queueProgress, setQueueProgress] = useState<{ current: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [dbStatusMsg, setDbStatusMsg] = useState<string>("");
  const [isClearingDb, setIsClearingDb] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const appendFileInputRef = useRef<HTMLInputElement>(null);

  const activeParticipant =
    participants.find((p) => p.id === activeParticipantId) || participants[0] || null;

  const updateMonitor = async (status: string, data: any = null, pName: string = "") => {
    const payloadData = data
      ? { ...data, participantName: data.participantName || pName }
      : pName
      ? { participantName: pName }
      : null;

    if (typeof window !== "undefined") {
      localStorage.setItem("monitorStatus", status);
      if (pName) localStorage.setItem("participantName", pName);
      if (payloadData) {
        localStorage.setItem("monitorData", JSON.stringify(payloadData));
      } else {
        localStorage.removeItem("monitorData");
      }
    }
    try {
      await fetch("/api/pusher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, data: payloadData, participantName: pName }),
      });
    } catch (e) {
      console.error("Failed to sync to pusher", e);
    }
  };

  const convertFilesToBase64 = async (filesList: File[]): Promise<string[]> => {
    return Promise.all(
      filesList.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const img = new window.Image();
              img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX = 500;
                let w = img.width,
                  h = img.height;
                if (w > h) {
                  if (w > MAX) {
                    h *= MAX / w;
                    w = MAX;
                  }
                } else {
                  if (h > MAX) {
                    w *= MAX / h;
                    h = MAX;
                  }
                }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL("image/jpeg", 0.6));
              };
              img.src = e.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    );
  };

  const syncImagesToStorage = async (filesList: File[], base64s?: string[]) => {
    try {
      if (filesList.length === 0) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("monitorImages");
          localStorage.removeItem("monitorImage");
        }
        await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imagesBase64: [] }),
        });
        return;
      }

      const imagesBase64 = base64s || (await convertFilesToBase64(filesList));
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("monitorImages", JSON.stringify(imagesBase64));
          if (imagesBase64[0]) localStorage.setItem("monitorImage", imagesBase64[0]);
        } catch (e) {
          console.warn("Could not save images to localStorage", e);
        }
      }

      try {
        await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imagesBase64 }),
        });
      } catch (e) {
        console.error("Failed to sync images to API", e);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Cek profil Roblox ke API
  const verifyRobloxUser = async (id: string, username: string) => {
    if (!username.trim()) return;

    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isCheckingRoblox: true } : p))
    );

    try {
      const res = await fetch(`/api/roblox?username=${encodeURIComponent(username.trim())}`);
      const data = await res.json();
      if (data.success && data.user) {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  robloxUsername: data.user.username,
                  displayName: data.user.displayName,
                  robloxId: data.user.id,
                  avatarUrl: data.user.avatarUrl,
                  name: data.user.displayName || data.user.username,
                  isCheckingRoblox: false,
                }
              : p
          )
        );
      } else {
        setParticipants((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isCheckingRoblox: false } : p))
        );
      }
    } catch {
      setParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isCheckingRoblox: false } : p))
      );
    }
  };

  // Simpan peserta ke Database PostgreSQL via Prisma
  const saveParticipantToDatabase = async (
    target: Participant,
    result: AnalysisResult,
    imagesBase64: string[]
  ) => {
    try {
      setDbStatusMsg("Menyimpan ke PostgreSQL...");
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          robloxUsername: target.robloxUsername || target.name,
          displayName: target.displayName || target.name,
          robloxId: target.robloxId || null,
          avatarUrl: target.avatarUrl || null,
          name: target.displayName || target.robloxUsername || target.name,
          images: imagesBase64,
          rating: result.rating,
          desain: result.desain,
          warna: result.warna,
          kakiKaki: result.kakiKaki,
          struktur: result.struktur,
          komentar: result.komentar,
          status: "done",
        }),
      });

      const json = await res.json();
      if (json.success) {
        setParticipants((prev) =>
          prev.map((p) => (p.id === target.id ? { ...p, savedToDb: true } : p))
        );
        setDbStatusMsg("Tersimpan di Database PostgreSQL");
      } else {
        setDbStatusMsg("Gagal simpan ke DB");
      }
    } catch (e) {
      console.error("Gagal simpan ke DB:", e);
      setDbStatusMsg("Error koneksi database");
    }
  };

  // Bersihkan semua data peserta di database PostgreSQL
  const handleClearDatabase = async () => {
    const confirmClear = window.confirm(
      "Apakah Anda yakin ingin menghapus SEMUA data peserta di database PostgreSQL? Tampilan monitor juga akan dikosongkan."
    );
    if (!confirmClear) return;

    try {
      setIsClearingDb(true);
      setDbStatusMsg("Membersihkan database...");
      const res = await fetch("/api/participants", {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setParticipants((prev) =>
          prev.map((p) => ({ ...p, savedToDb: false }))
        );
        await updateMonitor("idle", null, "");
        setDbStatusMsg("Database berhasil dibersihkan");
        alert("Semua data peserta di database berhasil dibersihkan!");
      } else {
        alert("Gagal membersihkan database: " + (data.error || "Terjadi kesalahan"));
      }
    } catch (err) {
      console.error("Gagal clear database:", err);
      alert("Terjadi kesalahan saat menghapus data database.");
    } finally {
      setIsClearingDb(false);
    }
  };

  const addParticipant = () => {
    const newId = `p_${Date.now()}`;
    const nextNumber = participants.length + 1;
    const newP: Participant = {
      id: newId,
      robloxUsername: "",
      displayName: "",
      name: `Peserta ${nextNumber}`,
      files: [],
      imageUrls: [],
      status: "idle",
      result: null,
      savedToDb: false,
    };
    setParticipants((prev) => [...prev, newP]);
    setActiveParticipantId(newId);
    setActiveImageIndex(0);
  };

  const removeParticipant = (idToRemove: string) => {
    if (participants.length <= 1) {
      participants[0]?.imageUrls.forEach((u) => URL.revokeObjectURL(u));
      const fresh: Participant = {
        id: `p_${Date.now()}`,
        robloxUsername: "",
        displayName: "",
        name: "Peserta 1",
        files: [],
        imageUrls: [],
        status: "idle",
        result: null,
        savedToDb: false,
      };
      setParticipants([fresh]);
      setActiveParticipantId(fresh.id);
      setActiveImageIndex(0);
      syncImagesToStorage([]);
      return;
    }

    const target = participants.find((p) => p.id === idToRemove);
    target?.imageUrls.forEach((u) => URL.revokeObjectURL(u));

    const remaining = participants.filter((p) => p.id !== idToRemove);
    setParticipants(remaining);
    if (activeParticipantId === idToRemove) {
      setActiveParticipantId(remaining[0].id);
      setActiveImageIndex(0);
      syncImagesToStorage(remaining[0].files);
    }
  };

  const updateRobloxUsername = (id: string, username: string) => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              robloxUsername: username,
              name: p.displayName || username || `Peserta #${p.id}`,
            }
          : p
      )
    );
  };

  const handleSelectActiveParticipant = (id: string) => {
    if (isQueueRunning) return;
    setActiveParticipantId(id);
    setActiveImageIndex(0);
    const p = participants.find((item) => item.id === id);
    if (p) {
      syncImagesToStorage(p.files);
      if (p.result) {
        updateMonitor("done", p.result, p.displayName || p.robloxUsername || p.name);
      } else {
        updateMonitor("idle", null, p.displayName || p.robloxUsername || p.name);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeParticipant) return;
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const newUrls = newFiles.map((file) => URL.createObjectURL(file));

      activeParticipant.imageUrls.forEach((u) => URL.revokeObjectURL(u));

      setParticipants((prev) =>
        prev.map((p) =>
          p.id === activeParticipant.id
            ? {
                ...p,
                files: newFiles,
                imageUrls: newUrls,
                status: "idle",
                result: null,
                savedToDb: false,
              }
            : p
        )
      );
      setActiveImageIndex(0);
      syncImagesToStorage(newFiles);
      updateMonitor("idle", null, activeParticipant.displayName || activeParticipant.robloxUsername || activeParticipant.name);
    }
    if (e.target) e.target.value = "";
  };

  const handleAppendImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeParticipant) return;
    if (e.target.files && e.target.files.length > 0) {
      const addedFiles = Array.from(e.target.files);
      const addedUrls = addedFiles.map((file) => URL.createObjectURL(file));

      const updatedFiles = [...activeParticipant.files, ...addedFiles];
      const updatedUrls = [...activeParticipant.imageUrls, ...addedUrls];

      setParticipants((prev) =>
        prev.map((p) =>
          p.id === activeParticipant.id
            ? {
                ...p,
                files: updatedFiles,
                imageUrls: updatedUrls,
                status: "idle",
                result: null,
                savedToDb: false,
              }
            : p
        )
      );
      syncImagesToStorage(updatedFiles);
    }
    if (e.target) e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!activeParticipant) return;
    if (e.dataTransfer.files?.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (droppedFiles.length === 0) return;

      const addedUrls = droppedFiles.map((f) => URL.createObjectURL(f));
      const updatedFiles = [...activeParticipant.files, ...droppedFiles];
      const updatedUrls = [...activeParticipant.imageUrls, ...addedUrls];

      setParticipants((prev) =>
        prev.map((p) =>
          p.id === activeParticipant.id
            ? {
                ...p,
                files: updatedFiles,
                imageUrls: updatedUrls,
                status: "idle",
                result: null,
                savedToDb: false,
              }
            : p
        )
      );
      syncImagesToStorage(updatedFiles);
    }
  };

  const removeSingleImage = (fileIndex: number) => {
    if (!activeParticipant) return;
    const urlToRemove = activeParticipant.imageUrls[fileIndex];
    if (urlToRemove) URL.revokeObjectURL(urlToRemove);

    const updatedFiles = activeParticipant.files.filter((_, idx) => idx !== fileIndex);
    const updatedUrls = activeParticipant.imageUrls.filter((_, idx) => idx !== fileIndex);

    setParticipants((prev) =>
      prev.map((p) =>
        p.id === activeParticipant.id
          ? {
              ...p,
              files: updatedFiles,
              imageUrls: updatedUrls,
              status: updatedFiles.length === 0 ? "idle" : p.status,
              result: updatedFiles.length === 0 ? null : p.result,
              savedToDb: false,
            }
          : p
      )
    );

    if (activeImageIndex >= updatedUrls.length) {
      setActiveImageIndex(Math.max(0, updatedUrls.length - 1));
    }
    syncImagesToStorage(updatedFiles);
  };

  const clearActiveImages = () => {
    if (!activeParticipant) return;
    activeParticipant.imageUrls.forEach((u) => URL.revokeObjectURL(u));
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === activeParticipant.id
          ? {
              ...p,
              files: [],
              imageUrls: [],
              status: "idle",
              result: null,
              savedToDb: false,
            }
          : p
      )
    );
    setActiveImageIndex(0);
    syncImagesToStorage([]);
    updateMonitor("idle", null, activeParticipant.displayName || activeParticipant.robloxUsername || activeParticipant.name);
  };

  // Review a single participant and auto-save to Database
  const reviewParticipant = async (targetParticipant: Participant) => {
    if (targetParticipant.files.length === 0) return;

    const participantTitle =
      targetParticipant.displayName ||
      targetParticipant.robloxUsername ||
      targetParticipant.name ||
      "Peserta";

    setParticipants((prev) =>
      prev.map((p) => (p.id === targetParticipant.id ? { ...p, status: "analyzing" } : p))
    );
    const analyzingData = {
      id: targetParticipant.id,
      robloxUsername: targetParticipant.robloxUsername,
      displayName:
        targetParticipant.displayName ||
        targetParticipant.name ||
        targetParticipant.robloxUsername,
      avatarUrl: targetParticipant.avatarUrl,
      status: "analyzing",
    };
    await updateMonitor("analyzing", analyzingData, participantTitle);

    try {
      const imagesBase64 = await convertFilesToBase64(targetParticipant.files);
      await syncImagesToStorage(targetParticipant.files, imagesBase64);

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagesBase64 }),
      });
      const resData = await response.json();

      let parsedResult: AnalysisResult;
      if (resData?.result) {
        try {
          const cleaned = resData.result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          parsedResult = JSON.parse(cleaned);
        } catch {
          parsedResult = {
            rating: 0,
            desain: 0,
            warna: 0,
            kakiKaki: 0,
            struktur: 0,
            komentar: resData.result,
          };
        }
      } else {
        parsedResult = {
          rating: 0,
          desain: 0,
          warna: 0,
          kakiKaki: 0,
          struktur: 0,
          komentar: resData.error || "Gagal menganalisis.",
        };
      }

      parsedResult.participantName = participantTitle;

      setParticipants((prev) =>
        prev.map((p) =>
          p.id === targetParticipant.id
            ? {
                ...p,
                status: parsedResult.rating > 0 ? "done" : "error",
                result: parsedResult,
              }
            : p
        )
      );

      // Simpan langsung ke database PostgreSQL
      if (parsedResult.rating > 0) {
        await saveParticipantToDatabase(targetParticipant, parsedResult, imagesBase64);
      }

      await updateMonitor(
        parsedResult.rating > 0 ? "done" : "error",
        parsedResult,
        participantTitle
      );
    } catch (err: any) {
      const errResult: AnalysisResult = {
        rating: 0,
        desain: 0,
        warna: 0,
        kakiKaki: 0,
        struktur: 0,
        komentar: err?.message || "Koneksi error.",
        participantName: participantTitle,
      };
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === targetParticipant.id
            ? {
                ...p,
                status: "error",
                result: errResult,
              }
            : p
        )
      );
      await updateMonitor("error", errResult, participantTitle);
    }
  };

  // Run queue review sequentially (hemat token)
  const runSequentialQueueReview = async () => {
    const queueList = participants.filter((p) => p.files.length > 0);
    if (queueList.length === 0 || isQueueRunning) return;

    setIsQueueRunning(true);

    for (let i = 0; i < queueList.length; i++) {
      const current = queueList[i];
      setActiveParticipantId(current.id);
      setActiveImageIndex(0);
      setQueueProgress({ current: i + 1, total: queueList.length });

      await reviewParticipant(current);

      if (i < queueList.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
    }

    setIsQueueRunning(false);
    setQueueProgress(null);
  };

  const totalUploadedPhotos = participants.reduce((acc, p) => acc + p.files.length, 0);
  const completedReviews = participants.filter((p) => p.status === "done").length;

  return (
    <div className="min-h-screen bg-[#060608] text-white flex flex-col overflow-hidden">
      {/* Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-30%] right-[-10%] w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-amber-600/8 rounded-full blur-[150px]" />
      </div>

      <main className="relative z-10 flex-1 flex flex-col lg:flex-row min-h-screen">
        {/* PANEL 1: DAFTAR MULTI LIST PESERTA (Sidebar Antrean) */}
        <div className="w-full lg:w-[330px] xl:w-[360px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.06] bg-[#09090c]/90 p-4 sm:p-5 flex flex-col gap-4">
          {/* Header & Tambah Peserta */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5.333 0L0 18.667l18.667 5.333L24 5.333 5.333 0zm10.4 14.533l-5.6-1.6 1.6-5.6 5.6 1.6-1.6 5.6z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">Peserta Roblox</h2>
                <p className="text-[11px] font-mono text-zinc-500">
                  {participants.length} Terdaftar • {completedReviews} Dinilai
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={addParticipant}
              disabled={isQueueRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 hover:border-orange-500/50 rounded-xl text-xs font-semibold text-orange-300 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              title="Tambah form peserta baru"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Peserta</span>
            </button>
          </div>

          {/* Tombol Jalankan Antrean (Hemat Token) */}
          <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] rounded-2xl p-3.5 shadow-lg">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                Review Antrean
              </span>
              <span className="text-zinc-500 text-[10px]">Otomatis simpan ke DB</span>
            </div>

            <button
              type="button"
              onClick={runSequentialQueueReview}
              disabled={totalUploadedPhotos === 0 || isQueueRunning}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 ${
                totalUploadedPhotos === 0
                  ? "bg-zinc-900 text-zinc-600 border border-white/5 cursor-not-allowed"
                  : isQueueRunning
                  ? "bg-orange-500/20 text-orange-300 border border-orange-500/40 cursor-wait shadow-[0_0_25px_rgba(249,115,22,0.3)]"
                  : "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-[0_0_25px_rgba(249,115,22,0.4)] hover:scale-[1.01] active:scale-[0.99]"
              }`}
            >
              {isQueueRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
                  <span>
                    Review Antrean ({queueProgress?.current}/{queueProgress?.total})...
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Mulai Review Semua Antrean</span>
                </>
              )}
            </button>
          </div>

          {/* List Kartu Peserta */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {participants.map((p, idx) => {
              const isActive = p.id === activeParticipantId;
              const hasPhotos = p.files.length > 0;
              const displayTitle = p.displayName || p.robloxUsername || p.name;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectActiveParticipant(p.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer relative group ${
                    isActive
                      ? "bg-orange-500/10 border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.2)]"
                      : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {p.avatarUrl ? (
                        <div className="relative w-8 h-8 rounded-xl overflow-hidden shrink-0 border border-orange-500/40 shadow-sm bg-black">
                          <Image src={p.avatarUrl} alt={p.robloxUsername} fill unoptimized className="object-cover" />
                        </div>
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-mono text-xs font-bold ${
                            isActive
                              ? "bg-orange-500 text-white"
                              : "bg-white/[0.05] text-zinc-400 group-hover:text-white"
                          }`}
                        >
                          #{idx + 1}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                          <span>{displayTitle}</span>
                          {p.robloxId && (
                            <svg className="w-3 h-3 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </p>
                        <p className="text-[10px] font-mono text-zinc-500 truncate">
                          {p.robloxUsername ? `@${p.robloxUsername}` : "Belum ada username"} • {hasPhotos ? `${p.files.length} Foto` : "0 Foto"}
                        </p>
                      </div>
                    </div>

                    {/* Status Pill & Hapus Peserta */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.status === "analyzing" ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse">
                          REVIEW...
                        </span>
                      ) : p.status === "done" && p.result ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                          ⭐ {p.result.rating}
                        </span>
                      ) : p.status === "error" ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                          ERROR
                        </span>
                      ) : hasPhotos ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          SIAP
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-medium bg-white/[0.05] text-zinc-500">
                          KOSONG
                        </span>
                      )}

                      {participants.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeParticipant(p.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-all rounded"
                          title="Hapus peserta ini"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Sidebar: Tombol Clear Database */}
          <div className="pt-3 border-t border-white/[0.08] mt-auto">
            <button
              type="button"
              onClick={handleClearDatabase}
              disabled={isClearingDb || isQueueRunning}
              className="w-full py-2.5 px-3 rounded-xl font-semibold text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              title="Hapus semua data peserta dari database PostgreSQL"
            >
              {isClearingDb ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  <span>Membersihkan Database...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Clear Database Tersimpan</span>
                </>
              )}
            </button>
            {dbStatusMsg && (
              <p className="text-[10px] font-mono text-zinc-500 text-center mt-1.5 truncate">
                {dbStatusMsg}
              </p>
            )}
          </div>
        </div>

        {/* PANEL 2: FORM USERNAME ROBLOX & MULTI UPLOAD FOTO */}
        {activeParticipant && (
          <div className="flex-1 p-4 sm:p-6 lg:p-7 flex flex-col gap-4 overflow-y-auto">
            {/* Form Input Username Roblox */}
            <div className="bg-[#0e0e12]/90 border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5.333 0L0 18.667l18.667 5.333L24 5.333 5.333 0zm10.4 14.533l-5.6-1.6 1.6-5.6 5.6 1.6-1.6 5.6z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 block">
                      Username Roblox Peserta
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      Data otomatis terhubung & disimpan ke database PostgreSQL
                    </span>
                  </div>
                </div>

                {activeParticipant.savedToDb && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-mono font-semibold">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>TERSIMPAN DI DB</span>
                  </div>
                )}
              </div>

              {/* Input + Search & Avatar Card */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-sm font-bold">
                    @
                  </span>
                  <input
                    type="text"
                    value={activeParticipant.robloxUsername}
                    onChange={(e) => updateRobloxUsername(activeParticipant.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        verifyRobloxUser(activeParticipant.id, activeParticipant.robloxUsername);
                      }
                    }}
                    placeholder="Masukkan username akun Roblox (misal: builderman)..."
                    className="w-full pl-8 pr-10 py-2.5 bg-black/60 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/80 focus:ring-1 focus:ring-orange-500/40 transition-all font-semibold"
                  />
                  {activeParticipant.robloxUsername && (
                    <button
                      type="button"
                      onClick={() => updateRobloxUsername(activeParticipant.id, "")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                      title="Hapus username"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => verifyRobloxUser(activeParticipant.id, activeParticipant.robloxUsername)}
                  disabled={!activeParticipant.robloxUsername.trim() || activeParticipant.isCheckingRoblox}
                  className="px-4 py-2.5 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 hover:border-orange-500/50 rounded-xl text-xs font-semibold text-orange-300 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40"
                >
                  {activeParticipant.isCheckingRoblox ? (
                    <>
                      <div className="w-3 h-3 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
                      <span>Cek Akun...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>Cek Avatar</span>
                    </>
                  )}
                </button>
              </div>

              {/* Card Profil Roblox Terverifikasi */}
              {activeParticipant.robloxId && (
                <div className="mt-3 p-2.5 rounded-xl bg-orange-500/5 border border-orange-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {activeParticipant.avatarUrl && (
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-orange-500/30 bg-black shrink-0">
                        <Image src={activeParticipant.avatarUrl} alt="Avatar Roblox" fill unoptimized className="object-cover" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{activeParticipant.displayName}</span>
                        <span className="text-[10px] font-mono text-zinc-400">(@{activeParticipant.robloxUsername})</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        Roblox User ID: {activeParticipant.robloxId}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 font-bold">
                    TERVERIFIKASI
                  </span>
                </div>
              )}
            </div>

            {/* Viewer Foto Utama Peserta */}
            <div
              className={`relative flex-1 min-h-[38vh] rounded-2xl lg:rounded-3xl overflow-hidden border-2 transition-all duration-300 ${
                dragOver
                  ? "border-orange-400 bg-orange-400/5"
                  : activeParticipant.imageUrls.length > 0
                  ? "border-white/[0.08] bg-[#0a0a0c]"
                  : "border-dashed border-white/15 bg-[#0a0a0c] hover:border-white/30 cursor-pointer"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => activeParticipant.imageUrls.length === 0 && fileInputRef.current?.click()}
            >
              {activeParticipant.imageUrls.length > 0 ? (
                <div className="absolute inset-0 flex flex-col p-4">
                  <div className="relative flex-1 rounded-xl overflow-hidden border border-white/5">
                    <Image
                      src={
                        activeParticipant.imageUrls[activeImageIndex] ||
                        activeParticipant.imageUrls[0]
                      }
                      alt={`Foto motor ${activeParticipant.name}`}
                      fill
                      className={`object-cover transition-all duration-700 ${
                        activeParticipant.status === "analyzing"
                          ? "scale-105 brightness-[0.35]"
                          : "brightness-90 hover:brightness-100"
                      }`}
                    />

                    {/* Top Bar inside Viewer */}
                    <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-auto">
                      <div className="px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-xs font-mono text-zinc-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                        <span>
                          Foto {activeImageIndex + 1} dari {activeParticipant.imageUrls.length}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSingleImage(activeImageIndex);
                        }}
                        className="px-3 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
                        title="Hapus foto ini dari peserta"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Hapus Foto Ini</span>
                      </button>
                    </div>

                    {/* Nav Arrows if multiple */}
                    {activeParticipant.imageUrls.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIndex((prev) =>
                              prev > 0 ? prev - 1 : activeParticipant.imageUrls.length - 1
                            );
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/10 text-white flex items-center justify-center transition-all hover:scale-110"
                          title="Foto sebelumnya"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIndex((prev) =>
                              prev < activeParticipant.imageUrls.length - 1 ? prev + 1 : 0
                            );
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/10 text-white flex items-center justify-center transition-all hover:scale-110"
                          title="Foto berikutnya"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </>
                    )}

                    {/* Scan overlay if analyzing */}
                    {activeParticipant.status === "analyzing" && (
                      <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                        <div className="w-full h-[3px] bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-[0_0_40px_8px_rgba(249,115,22,0.5)] absolute left-0 animate-[scan_2s_ease-in-out_infinite_alternate]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-24 h-24 border-2 border-orange-400/30 rounded-full animate-ping" />
                          <div className="absolute w-16 h-16 border border-dashed border-orange-400/60 rounded-full animate-[spin_6s_linear_infinite]" />
                        </div>
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-6 py-3 rounded-full border border-orange-400/30">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                            <span className="text-xs font-mono text-orange-300 tracking-widest uppercase">
                              Sedang Menganalisis {activeParticipant.displayName || activeParticipant.robloxUsername || activeParticipant.name}...
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                      <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />
                  </div>
                  <div className="text-center px-4">
                    <p className="text-sm font-semibold text-zinc-300">
                      Upload Foto Motor untuk {activeParticipant.displayName || activeParticipant.robloxUsername || activeParticipant.name}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Drag & drop atau klik di sini untuk memilih banyak foto sekaligus
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Multi-List Galeri Thumbnail Foto Peserta Aktif */}
            {activeParticipant.imageUrls.length > 0 && (
              <div className="bg-[#0e0e12]/80 border border-white/[0.08] rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-300">
                      Foto Terlampir ({activeParticipant.imageUrls.length})
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
                      • Klik untuk preview atau hapus foto individual
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearActiveImages}
                    className="text-[11px] font-mono text-zinc-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Hapus Semua Foto</span>
                  </button>
                </div>

                <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
                  {activeParticipant.imageUrls.map((src, idx) => {
                    const isActive = idx === activeImageIndex;
                    return (
                      <div
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative w-20 h-20 shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 group border ${
                          isActive
                            ? "border-orange-500 ring-2 ring-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.35)] scale-[1.02]"
                            : "border-white/10 hover:border-white/30 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <Image src={src} alt={`Thumbnail #${idx + 1}`} fill className="object-cover" />
                        <div
                          className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold leading-none ${
                            isActive ? "bg-orange-500 text-white" : "bg-black/70 text-zinc-300"
                          }`}
                        >
                          #{idx + 1}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSingleImage(idx);
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 hover:bg-red-500 border border-white/20 hover:border-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 shadow"
                          title="Hapus foto ini"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}

                  {/* Slot Tambah Foto */}
                  <button
                    type="button"
                    onClick={() => appendFileInputRef.current?.click()}
                    className="w-20 h-20 shrink-0 rounded-xl border-2 border-dashed border-white/15 hover:border-orange-400/60 bg-white/[0.02] hover:bg-orange-500/5 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-orange-300 transition-all group cursor-pointer"
                    title="Tambah foto sudut lain"
                  >
                    <div className="w-6 h-6 rounded-full bg-white/[0.05] group-hover:bg-orange-500/20 flex items-center justify-center text-zinc-400 group-hover:text-orange-400 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-mono font-medium">+ Foto</span>
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all duration-300 group"
              >
                <svg className="w-4 h-4 text-zinc-400 group-hover:text-orange-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                </svg>
                <span className="text-xs font-semibold text-zinc-300">
                  {activeParticipant.imageUrls.length > 0 ? "Pilih Ulang Foto" : "Pilih Multi Foto"}
                </span>
              </button>

              {activeParticipant.imageUrls.length > 0 && (
                <button
                  type="button"
                  onClick={() => appendFileInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-xl text-orange-400 text-xs font-semibold transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>+ Tambah Foto</span>
                </button>
              )}

              {/* Hidden File Inputs */}
              <input type="file" ref={fileInputRef} accept="image/*" multiple onChange={handleImageChange} className="hidden" />
              <input type="file" ref={appendFileInputRef} accept="image/*" multiple onChange={handleAppendImages} className="hidden" />

              {/* Tombol Review Peserta Ini Saja */}
              <button
                type="button"
                onClick={() => reviewParticipant(activeParticipant)}
                disabled={activeParticipant.files.length === 0 || isQueueRunning || activeParticipant.status === "analyzing"}
                className={`flex-1 min-w-[180px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all ${
                  activeParticipant.files.length === 0
                    ? "bg-zinc-900 text-zinc-600 cursor-not-allowed border border-white/5"
                    : activeParticipant.status === "analyzing"
                    ? "bg-orange-500/20 text-orange-300 border border-orange-400/30 cursor-wait"
                    : "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-[0_0_25px_rgba(249,115,22,0.4)] hover:scale-[1.01] active:scale-[0.99]"
                }`}
              >
                {activeParticipant.status === "analyzing" ? (
                  <>
                    <div className="w-4 h-4 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
                    <span>Menganalisis...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span>Review & Simpan ke DB</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* PANEL 3: HASIL PENILAIAN JURI AI (Score Report) */}
        <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.06] bg-[#09090c]/90 p-4 sm:p-6 flex flex-col overflow-y-auto">
          {!activeParticipant || (!activeParticipant.result && activeParticipant.status !== "analyzing") ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 p-6">
              <svg className="w-16 h-16 text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm text-zinc-400 font-mono font-medium">Hasil Penilaian Juri AI</p>
              <p className="text-xs text-zinc-600 font-mono mt-1 leading-relaxed">
                Ketik username Roblox, upload foto motor, lalu klik &quot;Mulai Review Semua Antrean&quot;. Hasil otomatis tersimpan ke PostgreSQL!
              </p>
            </div>
          ) : activeParticipant.status === "analyzing" ? (
            /* Loading State */
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
              <div className="relative">
                <div className="w-24 h-24 border-2 border-orange-500/20 rounded-full" />
                <div className="absolute inset-0 w-24 h-24 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-zinc-200">Sedang Menganalisis</p>
                <p className="text-xs font-mono text-orange-400 mt-1">
                  Roblox: @{activeParticipant.robloxUsername || activeParticipant.name}
                </p>
              </div>
            </div>
          ) : activeParticipant.result && activeParticipant.result.rating === 0 ? (
            /* Error State */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-2">
                <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-red-400">Analisis Gagal</p>
              <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                {activeParticipant.result.komentar}
              </p>
              <button
                type="button"
                onClick={() => reviewParticipant(activeParticipant)}
                className="mt-3 px-5 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-mono transition-colors"
              >
                COBA LAGI
              </button>
            </div>
          ) : (
            /* Results Presentation */
            activeParticipant.result && (
              <div className="flex-1 flex flex-col gap-5 overflow-y-auto">
                {/* Header */}
                <div className="animate-fade-up">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <div className="w-1 h-5 bg-gradient-to-b from-orange-400 to-amber-500 rounded-full" />
                      Laporan Modifikasi
                    </h2>
                    {activeParticipant.savedToDb && (
                      <span className="text-[10px] font-mono font-bold text-green-400 bg-green-500/10 border border-green-500/25 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>SAVED IN POSTGRES</span>
                      </span>
                    )}
                  </div>

                  {/* Profil Roblox Peserta pada Skor */}
                  <div className="mt-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {activeParticipant.avatarUrl ? (
                        <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-orange-500/40 bg-black shrink-0">
                          <Image src={activeParticipant.avatarUrl} alt="Roblox" fill unoptimized className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5.333 0L0 18.667l18.667 5.333L24 5.333 5.333 0zm10.4 14.533l-5.6-1.6 1.6-5.6 5.6 1.6-1.6 5.6z" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-white">
                          {activeParticipant.displayName || activeParticipant.robloxUsername || activeParticipant.name}
                        </p>
                        <p className="text-[10px] font-mono text-zinc-400">
                          {activeParticipant.robloxUsername ? `@${activeParticipant.robloxUsername}` : "Roblox Player"}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {activeParticipant.files.length} Foto
                    </span>
                  </div>
                </div>

                {/* Main Score Circle */}
                <div className="flex flex-col items-center justify-center animate-fade-up-delay-1 my-1">
                  <RatingCircle value={activeParticipant.result.rating} />
                  <StarRating rating={activeParticipant.result.rating} />
                  <div
                    className="mt-3.5 px-5 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest shadow-lg"
                    style={{
                      background:
                        activeParticipant.result.rating >= 8
                          ? "rgba(34,197,94,0.15)"
                          : activeParticipant.result.rating >= 6
                          ? "rgba(245,158,11,0.15)"
                          : "rgba(249,115,22,0.15)",
                      color:
                        activeParticipant.result.rating >= 8
                          ? "#4ade80"
                          : activeParticipant.result.rating >= 6
                          ? "#fbbf24"
                          : "#fb923c",
                      border: `1px solid ${
                        activeParticipant.result.rating >= 8
                          ? "rgba(34,197,94,0.3)"
                          : activeParticipant.result.rating >= 6
                          ? "rgba(245,158,11,0.3)"
                          : "rgba(249,115,22,0.3)"
                      }`,
                    }}
                  >
                    {activeParticipant.result.rating >= 9
                      ? "Legendary"
                      : activeParticipant.result.rating >= 8
                      ? "Excellent"
                      : activeParticipant.result.rating >= 7
                      ? "Great"
                      : activeParticipant.result.rating >= 6
                      ? "Good"
                      : activeParticipant.result.rating >= 5
                      ? "Average"
                      : "Needs Work"}
                  </div>
                </div>

                {/* Rating Bars */}
                <div className="space-y-3 p-4 bg-white/[0.02] rounded-2xl border border-white/[0.04]">
                  <RatingBar label="Desain Keseluruhan" value={activeParticipant.result.desain} delay="1" />
                  <RatingBar label="Keserasian Warna" value={activeParticipant.result.warna} delay="2" />
                  <RatingBar label="Ban & Velg" value={activeParticipant.result.kakiKaki} delay="3" />
                  <RatingBar label="Rangka & Suspensi" value={activeParticipant.result.struktur} delay="4" />
                </div>

                {/* Komentar Juri AI */}
                {activeParticipant.result.komentar && (
                  <div className="p-4 bg-orange-500/[0.03] border border-orange-500/20 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2 text-orange-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      <span className="text-xs font-mono font-bold uppercase tracking-wider">
                        Komentar Juri AI
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 font-mono italic leading-relaxed">
                      &quot;{activeParticipant.result.komentar}&quot;
                    </p>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
