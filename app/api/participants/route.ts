import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const participants = await prisma.participant.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, participants });
  } catch (error: any) {
    console.error("Gagal mengambil data peserta dari database:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat peserta dari database" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      robloxUsername,
      displayName,
      robloxId,
      avatarUrl,
      name,
      images,
      rating,
      desain,
      warna,
      kakiKaki,
      struktur,
      komentar,
      status,
    } = body;

    if (!robloxUsername) {
      return NextResponse.json(
        { success: false, error: "Username Roblox wajib diisi" },
        { status: 400 }
      );
    }

    // Upsert or create
    let participant;
    if (id && id.startsWith("c")) {
      participant = await prisma.participant.upsert({
        where: { id },
        update: {
          robloxUsername,
          displayName: displayName || null,
          robloxId: robloxId ? String(robloxId) : null,
          avatarUrl: avatarUrl || null,
          name: name || robloxUsername,
          images: Array.isArray(images) ? images : [],
          rating: typeof rating === "number" ? rating : null,
          desain: typeof desain === "number" ? desain : null,
          warna: typeof warna === "number" ? warna : null,
          kakiKaki: typeof kakiKaki === "number" ? kakiKaki : null,
          struktur: typeof struktur === "number" ? struktur : null,
          komentar: komentar || null,
          status: status || "done",
        },
        create: {
          robloxUsername,
          displayName: displayName || null,
          robloxId: robloxId ? String(robloxId) : null,
          avatarUrl: avatarUrl || null,
          name: name || robloxUsername,
          images: Array.isArray(images) ? images : [],
          rating: typeof rating === "number" ? rating : null,
          desain: typeof desain === "number" ? desain : null,
          warna: typeof warna === "number" ? warna : null,
          kakiKaki: typeof kakiKaki === "number" ? kakiKaki : null,
          struktur: typeof struktur === "number" ? struktur : null,
          komentar: komentar || null,
          status: status || "done",
        },
      });
    } else {
      participant = await prisma.participant.create({
        data: {
          robloxUsername,
          displayName: displayName || null,
          robloxId: robloxId ? String(robloxId) : null,
          avatarUrl: avatarUrl || null,
          name: name || robloxUsername,
          images: Array.isArray(images) ? images : [],
          rating: typeof rating === "number" ? rating : null,
          desain: typeof desain === "number" ? desain : null,
          warna: typeof warna === "number" ? warna : null,
          kakiKaki: typeof kakiKaki === "number" ? kakiKaki : null,
          struktur: typeof struktur === "number" ? struktur : null,
          komentar: komentar || null,
          status: status || "done",
        },
      });
    }

    return NextResponse.json({ success: true, participant });
  } catch (error: any) {
    console.error("Gagal menyimpan peserta ke database:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan data ke database" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await prisma.participant.deleteMany({});

    // Trigger pusher jika terpasang
    try {
      if (process.env.PUSHER_APP_ID && process.env.PUSHER_SECRET) {
        const PusherServer = (await import("pusher")).default;
        const pusher = new PusherServer({
          appId: process.env.PUSHER_APP_ID || "",
          key: process.env.NEXT_PUBLIC_PUSHER_KEY || "",
          secret: process.env.PUSHER_SECRET || "",
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "",
          useTLS: true,
        });
        await pusher.trigger("monitor-channel", "status-update", {
          status: "cleared",
        });
      }
    } catch (pe) {
      console.warn("Pusher trigger warning on clear:", pe);
    }

    return NextResponse.json({
      success: true,
      message: "Semua data peserta di database berhasil dibersihkan",
    });
  } catch (error: any) {
    console.error("Gagal membersihkan data peserta dari database:", error);
    return NextResponse.json(
      { success: false, error: "Gagal membersihkan database" },
      { status: 500 }
    );
  }
}
