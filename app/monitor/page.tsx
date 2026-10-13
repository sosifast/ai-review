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
    <div className="flex gap-[clamp(3px,0.5vw,7px)] justify-end mt-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const fillPercentage = Math.max(0, Math.min(100, (rating - (star - 1) * 2) * 50));
        return (
          <div
            key={star}
            className="relative w-[clamp(14px,2.2vw,26px)] h-[clamp(14px,2.2vw,26px)] shrink-0"
          >
            <svg
              className="w-full h-full text-zinc-800 absolute top-0 left-0"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <div
              className="absolute top-0 left-0 h-full overflow-hidden"
              style={{ width: `${fillPercentage}%` }}
            >
              <svg
                className="w-[clamp(14px,2.2vw,26px)] h-[clamp(14px,2.2vw,26px)] text-[#f59e0b] drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
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
    <div className="min-h-screen w-full bg-black text-white p-[clamp(12px,2.5vw,28px)] flex flex-col justify-start">
      <div className="w-full space-y-[clamp(10px,1.8vw,20px)]">
        {displayParticipants.length === 0 && !analyzingParticipant ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center opacity-30">
            <p className="text-[clamp(14px,2.2vw,22px)] font-mono text-zinc-400">
              Menunggu data review peserta...
            </p>
          </div>
        ) : (
          <>
            {/* SKELETON ROW: PESERTA YANG SEDANG DIANALISIS */}
            {analyzingParticipant && (
              <div className="w-full py-[clamp(8px,1.6vw,18px)] px-[clamp(8px,1.8vw,16px)] flex items-center justify-between gap-[clamp(10px,2.2vw,24px)] transition-all">
                {/* Left: Avatar, Names */}
                <div className="flex items-center gap-[clamp(10px,2.2vw,24px)] min-w-0">
                  {/* Profile Picture Roblox - Circle dengan Animasi Pulse Ring */}
                  {analyzingParticipant.avatarUrl ? (
                    <div className="relative shrink-0">
                      <img
                        src={analyzingParticipant.avatarUrl}
                        alt={analyzingParticipant.displayName || "Peserta"}
                        className="w-[clamp(44px,8vw,80px)] h-[clamp(44px,8vw,80px)] rounded-full object-cover shrink-0 bg-black ring-2 ring-amber-500/50 animate-pulse"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-[clamp(10px,1.8vw,16px)] w-[clamp(10px,1.8vw,16px)]">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-full w-full bg-amber-500" />
                      </span>
                    </div>
                  ) : (
                    <div className="w-[clamp(44px,8vw,80px)] h-[clamp(44px,8vw,80px)] rounded-full bg-zinc-900 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-[clamp(18px,3vw,32px)] shrink-0 animate-pulse">
                      R
                    </div>
                  )}

                  {/* Display Name & Username */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-[clamp(6px,1vw,12px)]">
                      <h2 className="text-[clamp(15px,2.8vw,28px)] font-bold text-white truncate tracking-wide">
                        {analyzingParticipant.displayName ||
                          analyzingParticipant.robloxUsername ||
                          "Peserta"}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[clamp(9px,1.4vw,14px)] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse shrink-0">
                        ANALISIS...
                      </span>
                    </div>
                    <p className="text-[clamp(12px,2vw,20px)] font-semibold text-[#f59e0b] truncate mt-0.5">
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
                    <div className="w-[clamp(44px,7vw,76px)] h-[clamp(26px,4vw,44px)] bg-zinc-800/80 rounded-lg animate-pulse" />
                    <span className="text-[clamp(11px,1.8vw,18px)] font-semibold text-zinc-600">
                      /10
                    </span>
                  </div>

                  {/* Skeleton Stars */}
                  <div className="flex gap-[clamp(3px,0.5vw,7px)] justify-end mt-1.5">
                    {[0, 1, 2, 3, 4].map((s) => (
                      <div
                        key={s}
                        className="w-[clamp(14px,2.2vw,26px)] h-[clamp(14px,2.2vw,26px)] rounded bg-amber-500/25 animate-pulse shrink-0"
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
                  className="w-full py-[clamp(8px,1.6vw,18px)] px-[clamp(8px,1.8vw,16px)] flex items-center justify-between gap-[clamp(10px,2.2vw,24px)]"
                >
                  {/* Left: Avatar, Names */}
                  <div className="flex items-center gap-[clamp(10px,2.2vw,24px)] min-w-0">
                    {/* Profile Picture Roblox - Circle */}
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt={displayName}
                        className="w-[clamp(44px,8vw,80px)] h-[clamp(44px,8vw,80px)] rounded-full object-cover shrink-0 bg-black"
                      />
                    ) : (
                      <div className="w-[clamp(44px,8vw,80px)] h-[clamp(44px,8vw,80px)] rounded-full bg-zinc-900 flex items-center justify-center text-amber-400 font-black text-[clamp(18px,3vw,32px)] shrink-0">
                        R
                      </div>
                    )}

                    {/* Display Name & Username */}
                    <div className="min-w-0">
                      <h2 className="text-[clamp(15px,2.8vw,28px)] font-bold text-white truncate tracking-wide">
                        {displayName}
                      </h2>
                      <p className="text-[clamp(12px,2vw,20px)] font-semibold text-[#f59e0b] truncate mt-0.5">
                        {username}
                      </p>
                    </div>
                  </div>

                  {/* Right: Score & Stars */}
                  <div className="flex flex-col items-end shrink-0 pl-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[clamp(24px,4.5vw,46px)] font-black text-[#f59e0b] leading-none">
                        {p.rating}
                      </span>
                      <span className="text-[clamp(11px,1.8vw,18px)] font-semibold text-zinc-500">
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
