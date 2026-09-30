import { NextResponse } from 'next/server';

let latestImages: string[] = [];

export async function POST(req: Request) {
  try {
    const { imagesBase64 } = await req.json();
    latestImages = imagesBase64 || [];
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ imagesBase64: latestImages });
}
