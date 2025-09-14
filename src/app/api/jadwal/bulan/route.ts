import { NextResponse } from 'next/server';

// /api/jadwal/bulan?kota=ID&year=YYYY&month=MM
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const kota = searchParams.get('kota');
  const year = searchParams.get('year');
  const month = searchParams.get('month');
  if (!kota || !year || !month) {
    return NextResponse.json({ ok: false, error: 'Parameter kota, year, month wajib' }, { status: 400 });
  }
  try {
    if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) {
      return NextResponse.json({ ok: false, error: 'Format year/month salah' }, { status: 400 });
    }
    const url = `https://api.myquran.com/v2/sholat/jadwal/${kota}/${year}/${month}`;
    const res = await fetch(url, { next: { revalidate: 60 * 30 } });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'HTTP ' + res.status }, { status: res.status });
    }
    const data = await res.json();
    if (data.status !== true) {
      return NextResponse.json({ ok: false, error: data.message || 'Gagal memuat jadwal bulanan' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, data: data.data.jadwal });
  } catch (e: unknown) {
    let msg = 'Kesalahan internal';
    if (e instanceof Error) msg = e.message;
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
