import { NextResponse } from "next/server";

// /api/jadwal?kota=ID&date=YYYY-MM-DD
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const kota = searchParams.get("kota");
  const date = searchParams.get("date");
  if (!kota || !date) {
    return NextResponse.json(
      { ok: false, error: "Parameter kota & date wajib" },
      { status: 400 }
    );
  }
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Format tanggal salah" },
        { status: 400 }
      );
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const url = `https://api.myquran.com/v2/sholat/jadwal/${kota}/${yyyy}/${mm}/${dd}`;
  const res = await fetch(url);
    const data = await res.json();
    if (data.status !== true) {
      return NextResponse.json(
        { ok: false, error: data.message || "Gagal memuat jadwal" },
        { status: 502 }
      );
    }
    // di v2 struktur: data: { id, lokasi, daerah, jadwal: { tanggal:'Sabtu, 13/09/2025', imsak, subuh, terbit, dhuha, dzuhur, ... , date:'2025-09-13'} }
    const j = data.data.jadwal;
    return NextResponse.json({ ok: true, data: j });
  } catch (e: unknown) {
    let message = "Terjadi kesalahan internal";
    if (e instanceof Error) message = e.message;
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
