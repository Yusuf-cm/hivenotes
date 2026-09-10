import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'AI now runs on the HiveNotes server. Use /ai on the API.' },
    { status: 410 }
  )
}
