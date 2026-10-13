"use client";

import { useEffect, useState } from "react";
import Pusher from "pusher-js";

type DbParticipant = {
  id: string;
  robloxUsername: string;
  displayName: string | null;
  robloxId: string | null;
  avatarUrl: string | null;
  name: string | null;
  images: string[];
  rating: number | null;
  desain: number | null;
  warna: number | null;
  kakiKaki: number | null;
  struktur: number | null;
  komentar: string | null;
  status: string;
  createdAt: string;
};

type AnalyzingParticipant = {
  id?: string;
  robloxUsername?: string;
  displayName?: string;
  avatarUrl?: string | null;
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1.5 justify-end mt-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const fillPercentage = Math.max(0, Math.min(100, (rating - (star - 1) * 2) * 50));
        return (
          <div key={star} className="relative w-4 h-4">
            <svg className="w-4 h-4 text-zinc-800 absolute top-0 left-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <div className="absolute top-0 left-0 h-full overflow-hidden" style={{ width: `${fillPercentage}%` }}>
              <svg className="w-4 h-4 text-[#f59e0b] drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MonitorPage() {
  const [participants, setParticipants] = useState<DbParticipant[]>([]);
  const [analyzingParticipant, setAnalyzingParticipant] = useState<AnalyzingParticipant | null>(null);

  const fetchParticipants = async () => {
    try {
      const res = await fetch("/api/participants");
      const json = await res.json();
      if (json.success && Array.isArray(json.participants)) {
        setParticipants(json.participants);
      }
    } catch (e) {
      console.error("Gagal memuat peserta di monitor:", e);
    }
  };

  useEffect(() => {
    fetchParticipants();
    const pollInterval = setInterval(fetchParticipants, 3000);

    const checkStorage = () => {
      try {
        const status = localStorage.getItem("monitorStatus");
        const rawData = localStorage.getItem("monitorData");
        if (status === "analyzing" && rawData) {
          const parsed = JSON.parse(rawData);
          setAnalyzingParticipant({
            id: parsed.id,
            robloxUsername: parsed.robloxUsername || "",
            displayName: parsed.displayName || parsed.participantName || "Peserta",
            avatarUrl: parsed.avatarUrl || null,
          });
        } else if (
          status === "done" ||
          status === "idle" ||
          status === "cleared" ||
          status === "error"
        ) {
          setAnalyzingParticipant(null);
        }
      } catch {
        // ignore
      }
    };

    checkStorage();
    window.addEventListener("storage", checkStorage);

    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY || "";
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "";

    if (pusherKey) {
      const pusher = new Pusher(pusherKey, { cluster: pusherCluster });
      const channel = pusher.subscribe("monitor-channel");

      channel.bind("status-update", (event: any) => {
        if (event?.status === "analyzing") {
          setAnalyzingParticipant({
            id: event.data?.id,
            robloxUsername: event.data?.robloxUsername || "",
            displayName: event.data?.displayName || event.participantName || "Peserta",
            avatarUrl: event.data?.avatarUrl || null,
          });
        } else if (
          event?.status === "done" ||
          event?.status === "idle" ||
          event?.status === "cleared" ||
          event?.status === "error"
        ) {
          setAnalyzingParticipant(null);
        }
        fetchParticipants();
      });

      return () => {
        clearInterval(pollInterval);
        window.removeEventListener("storage", checkStorage);
        channel.unbind_all();
        channel.unsubscribe();
      };
    }

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("storage", checkStorage);
    };
  }, []);

  // Sort participants by highest rating
  const sortedParticipants = [...participants]
    .filter((p) => typeof p.rating === "number" && p.rating > 0)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  // Hindari duplikasi jika peserta yang sedang dianalisis sudah ada di daftar selesai sebelumnya
  const displayParticipants = sortedParticipants.filter(
    (p) =>
      !analyzingParticipant ||
      !analyzingParticipant.robloxUsername ||
      p.robloxUsername !== analyzingParticipant.robloxUsername
  );

  return (
    <div className="min-h-screen w-full bg-black text-white p-4 sm:p-6 lg:p-8 flex flex-col justify-start">
      <div className="w-full max-w-5xl mx-auto space-y-4">
        {displayParticipants.length === 0 && !analyzingParticipant ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center opacity-30">
            <p className="text-base font-mono text-zinc-400">Menunggu data review peserta...</p>
          </div>
        ) : (
          <>
            {/* SKELETON ROW: PESERTA YANG SEDANG DIANALISIS */}
            {analyzingParticipant && (
              <div className="w-full py-2.5 sm:py-3.5 px-1 sm:px-2 flex items-center justify-between gap-4 transition-all">
                {/* Left: Avatar, Names (Sesuai data input Roblox) */}
                <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                  {/* Profile Picture Roblox - Circle dengan Animasi Pulse Ring */}
                  {analyzingParticipant.avatarUrl ? (
                    <div className="relative shrink-0">
                      <img
                        src={analyzingParticipant.avatarUrl}
                        alt={analyzingParticipant.displayName || "Peserta"}
                        className="w-13 h-13 sm:w-15 sm:h-15 rounded-full object-cover shrink-0 bg-black ring-2 ring-amber-500/50 animate-pulse"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                      </span>
                    </div>
                  ) : (
                    <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-zinc-900 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xl shrink-0 animate-pulse">
                      R
                    </div>
                  )}

                  {/* Display Name & Username (Inputted data) */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-bold text-white truncate tracking-wide">
                        {analyzingParticipant.displayName ||
                          analyzingParticipant.robloxUsername ||
                          "Peserta"}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse shrink-0">
                        ANALISIS...
                      </span>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-[#f59e0b] truncate mt-0.5">
                      {analyzingParticipant.robloxUsername
                        ? `@${analyzingParticipant.robloxUsername}`
                        : "@peserta"}
                    </p>
                  </div>
                </div>

                {/* Right: Animasi Skeleton untuk Rating & Bintang */}
                <div className="flex flex-col items-end shrink-0 pl-2">
                  {/* Skeleton Score Box */}
                  <div className="flex items-baseline gap-1.5">
                    <div className="w-12 sm:w-14 h-7 sm:h-8 bg-zinc-800/80 rounded-lg animate-pulse" />
                    <span className="text-xs sm:text-sm font-semibold text-zinc-600">
                      /10
                    </span>
                  </div>

                  {/* Skeleton Stars */}
                  <div className="flex gap-1.5 justify-end mt-1.5">
                    {[0, 1, 2, 3, 4].map((s) => (
                      <div
                        key={s}
                        className="w-4 h-4 rounded bg-amber-500/25 animate-pulse"
                        style={{ animationDelay: `${s * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* DAFTAR PESERTA YANG SUDAH SELESAI */}
            {displayParticipants.map((p) => {
              const displayName = p.displayName || p.robloxUsername || p.name || "Peserta";
              const username = p.robloxUsername ? `@${p.robloxUsername}` : "@unknown";

              return (
                <div
                  key={p.id}
                  className="w-full py-2.5 sm:py-3.5 px-1 sm:px-2 flex items-center justify-between gap-4"
                >
                  {/* Left: Avatar, Names */}
                  <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                    {/* Profile Picture Roblox - Circle */}
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt={displayName}
                        className="w-13 h-13 sm:w-15 sm:h-15 rounded-full object-cover shrink-0 bg-black"
                      />
                    ) : (
                      <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-zinc-900 flex items-center justify-center text-amber-400 font-black text-xl shrink-0">
                        R
                      </div>
                    )}

                    {/* Display Name & Username */}
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-bold text-white truncate tracking-wide">
                        {displayName}
                      </h2>
                      <p className="text-sm sm:text-base font-semibold text-[#f59e0b] truncate mt-0.5">
                        {username}
                      </p>
                    </div>
                  </div>

                  {/* Right: Score & Stars */}
                  <div className="flex flex-col items-end shrink-0 pl-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-black text-[#f59e0b] leading-none">
                        {p.rating}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-zinc-500">
                        /10
                      </span>
                    </div>

                    {/* Stars */}
                    <StarRating rating={p.rating ?? 0} />
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
