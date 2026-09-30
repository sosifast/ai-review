import { NextResponse } from 'next/server';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '',
  useTLS: true,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { status, data } = body;

    await pusher.trigger('monitor-channel', 'status-update', {
      status,
      data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pusher error:', error);
    return NextResponse.json({ success: false, error: 'Failed to trigger event' }, { status: 500 });
  }
}
