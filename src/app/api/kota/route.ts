import { NextResponse } from "next/server";

export const revalidate = 3600; // 1 jam

export async function GET() {
  try {
    const res = await fetch("https://api.myquran.com/v2/sholat/kota/semua");
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `HTTP ${res.status}` },
        { status: res.status }
      );
    }
    const data = await res.json();
    if (data.status !== true) {
      return NextResponse.json(
        { ok: false, error: data.message || "Status API false" },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, data: data.data });
  } catch (e: unknown) {
    let message = "Gagal mengambil data kota";
    if (e instanceof Error) message = e.message;
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
