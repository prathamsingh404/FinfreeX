import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const STRATTON_API_URL = process.env.STRATTON_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://backend-jet-mu-37.vercel.app';


export async function GET() {
  try {
    const res = await fetch(`${STRATTON_API_URL}/api/providers`);
    if (!res.ok) throw new Error(`Stratton API error: ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message, providers: {}, all_providers: {} }, { status: 503 });
  }
}
