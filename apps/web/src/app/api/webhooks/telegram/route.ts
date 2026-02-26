import { NextResponse } from "next/server"

const notImplemented = {
  success: false,
  error: { code: "NOT_IMPLEMENTED", message: "Telegram webhook handler is not implemented" },
} as const

export async function GET() {
  return NextResponse.json(notImplemented, { status: 501 })
}

export async function POST() {
  return NextResponse.json(notImplemented, { status: 501 })
}
