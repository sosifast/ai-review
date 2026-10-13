import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username")?.trim();

  if (!username) {
    return NextResponse.json(
      { success: false, error: "Username Roblox wajib diisi" },
      { status: 400 }
    );
  }

  try {
    const userRes = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: false,
      }),
    });

    const userData = await userRes.json();
    if (!userData.data || userData.data.length === 0) {
      return NextResponse.json(
        { success: false, error: "User Roblox tidak ditemukan" },
        { status: 404 }
      );
    }

    const robloxUser = userData.data[0];
    const userId = robloxUser.id;

    let avatarUrl = "";
    try {
      const thumbRes = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
      );
      const thumbData = await thumbRes.json();
      if (thumbData.data && thumbData.data.length > 0) {
        avatarUrl = thumbData.data[0].imageUrl || "";
      }
    } catch (e) {
      console.warn("Gagal mengambil avatar Roblox:", e);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: String(robloxUser.id),
        username: robloxUser.name,
        displayName: robloxUser.displayName,
        hasVerifiedBadge: !!robloxUser.hasVerifiedBadge,
        avatarUrl,
      },
    });
  } catch (error: any) {
    console.error("Roblox API Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghubungkan ke server Roblox" },
      { status: 500 }
    );
  }
}
