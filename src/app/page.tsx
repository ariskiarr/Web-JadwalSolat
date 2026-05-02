"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import dayjs from "dayjs";
import "dayjs/locale/id";
dayjs.locale("id");
import { CalendarDaysIcon, MapPinIcon } from "@heroicons/react/24/outline";

type Kota = { id: string; nama?: string; lokasi?: string };
type Jadwal = {
  tanggal: string; // contoh: "Sabtu, 13/09/2025"
  date?: string; // ISO 2025-09-13
  imsak: string;
  subuh: string;
  terbit?: string;
  dhuha?: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
};

export default function Home() {
  const [kotaList, setKotaList] = useState<Kota[]>([]);
  const [search, setSearch] = useState("");
  const [selectedKota, setSelectedKota] = useState<string>("");
  const [jadwal, setJadwal] = useState<Jadwal | null>(null);
  const [jadwalBulanan, setJadwalBulanan] = useState<Jadwal[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingKota, setLoadingKota] = useState(true);
  const [errorKota, setErrorKota] = useState<string>("");
  const [date, setDate] = useState<string>(
    () => new Date().toISOString().split("T")[0],
  );
  const [error, setError] = useState<string>("");
  // Hindari membaca localStorage di server untuk mencegah hydration mismatch
  const [mode, setMode] = useState<"daily" | "monthly">("daily");
  const [month, setMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(() => new Date().getFullYear());
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [errorMonthly, setErrorMonthly] = useState("");
  const [nextPrayer, setNextPrayer] = useState<{
    name: string;
    time: string;
    diffMs: number;
  } | null>(null);
  const [countdown, setCountdown] = useState<string>("");
  const [notifyEnabled, setNotifyEnabled] = useState<boolean>(false);
  const [notifyOffset, setNotifyOffset] = useState<number>(10);
  const [isHydrated, setIsHydrated] = useState(false);
  const timeoutsRef = useRef<number[]>([]);

  // Ambil daftar kota (real-time dari API internal yang proxy ke v2)
  useEffect(() => {
    let canceled = false;
    setLoadingKota(true);
    setErrorKota("");
    fetch("/api/kota")
      .then((r) => r.json())
      .then((d) => {
        if (canceled) return;
        if (d.ok && Array.isArray(d.data)) {
          setKotaList(d.data);
        } else {
          setErrorKota(d.error || "Tidak dapat memuat kota");
        }
      })
      .catch((e) => {
        if (!canceled) setErrorKota("Gagal terhubung ke server kota");
        console.error(e);
      })
      .finally(() => {
        if (!canceled) setLoadingKota(false);
      });
    return () => {
      canceled = true;
    };
  }, []);

  const retryKota = () => {
    setLoadingKota(true);
    setErrorKota("");
    fetch("/api/kota")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setKotaList(d.data);
        else setErrorKota(d.error || "Gagal memuat kota");
      })
      .catch(() => setErrorKota("Gagal terhubung ke server kota"))
      .finally(() => setLoadingKota(false));
  };

  // Ambil jadwal ketika kota dipilih
  useEffect(() => {
    if (!selectedKota) return;
    setLoading(true);
    setError("");
    // date sudah dalam format YYYY-MM-DD sehingga tidak perlu dipecah lagi
    fetch(`/api/jadwal?kota=${selectedKota}&date=${date}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) {
          setError(data.error || "Gagal memuat jadwal");
          setJadwal(null);
        } else {
          setJadwal(data.data);
        }
      })
      .catch((e) => {
        console.error("Error fetch jadwal", e);
        setError("Tidak dapat terhubung ke server");
      })
      .finally(() => setLoading(false));
  }, [selectedKota, date]);

  // Ambil jadwal bulanan saat mode monthly atau parameter berubah
  useEffect(() => {
    if (mode !== "monthly" || !selectedKota) return;
    setLoadingMonthly(true);
    setErrorMonthly("");
    const mm = String(month).padStart(2, "0");
    fetch(`/api/jadwal/bulan?kota=${selectedKota}&year=${year}&month=${mm}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) {
          setErrorMonthly(d.error || "Gagal memuat jadwal bulanan");
          setJadwalBulanan(null);
        } else {
          setJadwalBulanan(d.data);
        }
      })
      .catch((e) => {
        console.error(e);
        setErrorMonthly("Gagal koneksi jadwal bulanan");
      })
      .finally(() => setLoadingMonthly(false));
  }, [mode, selectedKota, month, year]);

  // Hydrate preferences once on client
  useEffect(() => {
    setIsHydrated(true);
    try {
      const savedMode = localStorage.getItem("modeView");
      if (savedMode === "monthly") setMode("monthly");
      const ne = localStorage.getItem("notifyEnabled");
      if (ne) setNotifyEnabled(ne === "true");
      const no = localStorage.getItem("notifyOffset");
      if (no) {
        const parsed = Number(no);
        if (!Number.isNaN(parsed)) setNotifyOffset(parsed);
      }
    } catch {}
  }, []);
  // Persist preferences after hydration to avoid mismatch
  useEffect(() => {
    if (isHydrated) localStorage.setItem("modeView", mode);
  }, [mode, isHydrated]);
  useEffect(() => {
    if (isHydrated)
      localStorage.setItem("notifyEnabled", String(notifyEnabled));
  }, [notifyEnabled, isHydrated]);
  useEffect(() => {
    if (isHydrated) localStorage.setItem("notifyOffset", String(notifyOffset));
  }, [notifyOffset, isHydrated]);

  // Util untuk menghitung next prayer
  const computeNextPrayer = useCallback(
    (base: Jadwal | null) => {
      if (!base) {
        setNextPrayer(null);
        return;
      }
      const dateISO = base.date || date; // fallback ke input date
      // Highlight & countdown hanya relevan untuk hari ini
      if (!dayjs(dateISO).isSame(dayjs(), "day")) {
        setNextPrayer(null);
        return;
      }
      const sequence: { name: string; time?: string }[] = [
        { name: "Imsak", time: base.imsak },
        { name: "Subuh", time: base.subuh },
        { name: "Dzuhur", time: base.dzuhur },
        { name: "Ashar", time: base.ashar },
        { name: "Maghrib", time: base.maghrib },
        { name: "Isya", time: base.isya },
      ];
      const now = dayjs();
      for (const p of sequence) {
        if (!p.time) continue;
        const dt = dayjs(`${dateISO}T${p.time}:00`);
        if (dt.isAfter(now)) {
          setNextPrayer({ name: p.name, time: p.time, diffMs: dt.diff(now) });
          return;
        }
      }
      setNextPrayer(null);
    },
    [date],
  );

  // Hitung next prayer saat jadwal harian berubah
  useEffect(() => {
    if (mode === "daily") computeNextPrayer(jadwal);
  }, [jadwal, computeNextPrayer, mode]);

  // Countdown updater
  useEffect(() => {
    if (!nextPrayer) {
      setCountdown("");
      return;
    }
    const interval = window.setInterval(() => {
      const dateISO = jadwal?.date || date;
      const target = dayjs(`${dateISO}T${nextPrayer.time}:00`);
      const diff = target.diff(dayjs());
      if (diff <= 0) {
        computeNextPrayer(jadwal); // recompute for next
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(
        `${hours.toString().padStart(2, "0")}:${mins
          .toString()
          .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`,
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [nextPrayer, jadwal, computeNextPrayer, date]);

  // Schedule notifications
  const scheduleNotifications = useCallback(
    (base: Jadwal | null) => {
      timeoutsRef.current.forEach((t) => window.clearTimeout(t));
      timeoutsRef.current = [];
      if (!notifyEnabled || !base) return;
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "default"
      ) {
        Notification.requestPermission();
      }
      if (
        typeof Notification === "undefined" ||
        Notification.permission !== "granted"
      )
        return;
      const dateISO = base.date || date;
      const offsetMs = notifyOffset * 60000;
      const list: { name: string; time?: string }[] = [
        { name: "Subuh", time: base.subuh },
        { name: "Dzuhur", time: base.dzuhur },
        { name: "Ashar", time: base.ashar },
        { name: "Maghrib", time: base.maghrib },
        { name: "Isya", time: base.isya },
      ];
      const now = Date.now();
      list.forEach((item) => {
        if (!item.time) return;
        const target =
          new Date(`${dateISO}T${item.time}:00`).getTime() - offsetMs;
        const delay = target - now;
        if (delay > 0) {
          const id = window.setTimeout(() => {
            try {
              new Notification(`Pengingat ${item.name}`, {
                body: `${item.name} ${item.time} (±${notifyOffset}m lagi)`,
              });
            } catch {}
          }, delay);
          timeoutsRef.current.push(id);
        }
      });
    },
    [notifyEnabled, notifyOffset, date],
  );

  useEffect(() => {
    if (mode === "daily" && selectedKota) scheduleNotifications(jadwal);
  }, [scheduleNotifications, jadwal, mode, selectedKota]);

  // (hapus fitur test & simulasi notifikasi, tidak diperlukan lagi)

  // Persist pilihan kota
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kotaId");
      if (saved) setSelectedKota(saved);
    } catch {}
  }, []);
  useEffect(() => {
    if (isHydrated && selectedKota)
      localStorage.setItem("kotaId", selectedKota);
  }, [selectedKota, isHydrated]);

  const filteredKota = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return [];
    const exact: Kota[] = [];
    const partial: Kota[] = [];
    for (const k of kotaList) {
      const label = (k.nama || k.lokasi || "").toLowerCase();
      if (!label) continue;
      if (label.startsWith(s)) exact.push(k);
      else if (label.includes(s)) partial.push(k);
      if (exact.length + partial.length >= 40) break; // limit
    }
    return [...exact, ...partial].slice(0, 40);
  }, [kotaList, search]);

  // Autocomplete logic
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement | null>(null);

  const commitSelection = useCallback((k: Kota) => {
    setSelectedKota(k.id);
    const label = k.nama || k.lokasi || k.id;
    setSearch(label);
    setActiveIndex(-1);
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!filteredKota.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filteredKota.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(
          (i) => (i - 1 + filteredKota.length) % filteredKota.length,
        );
      } else if (e.key === "Enter") {
        if (activeIndex >= 0) {
          e.preventDefault();
          commitSelection(filteredKota[activeIndex]);
        }
      } else if (e.key === "Escape") {
        setActiveIndex(-1);
      }
    },
    [filteredKota, activeIndex, commitSelection],
  );

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const children = listRef.current.querySelectorAll('[data-item="true"]');
    const el = children[activeIndex] as HTMLElement | undefined;
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const highlight = (label: string) => {
    const s = search.trim();
    if (!s) return label;
    const idx = label.toLowerCase().indexOf(s.toLowerCase());
    if (idx === -1) return label;
    return (
      <>
        {label.slice(0, idx)}
        <span className="text-emerald-300 font-semibold">
          {label.slice(idx, idx + s.length)}
        </span>
        {label.slice(idx + s.length)}
      </>
    );
  };

  const Skeleton = () => (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-white/20 rounded w-1/3" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-white/10" />
        ))}
      </div>
    </div>
  );

  const isToday = (iso?: string) => {
    if (!iso) return false;
    return dayjs().format("YYYY-MM-DD") === iso;
  };

  const nextPrayerName = nextPrayer?.name;

  return (
    <div className="min-h-dvh w-full text-white relative">
      <header className="relative z-10 mx-auto max-w-5xl px-4 sm:px-4 pt-6 sm:pt-12 pb-5 sm:pb-8">
        <div className="flex flex-col items-center gap-3 sm:gap-6 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-semibold tracking-tight leading-tight">
            Jadwal Salat Indonesia
          </h1>
          <p className="mt-1 text-white/70 text-xs sm:text-sm md:text-base max-w-2xl">
            Cek jadwal salat harian dan bulanan seluruh kota di Indonesia.
            Highlight waktu berikutnya beserta hitung mundur dan pengingat
            sebelum adzan.
          </p>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-6xl px-4 sm:px-4 pb-24 sm:pb-28 grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-10">
        {/* Panel Kota */}
        <aside className="lg:col-span-2 space-y-4 sm:space-y-5">
          <div className="ios-card p-3 sm:p-5 relative overflow-hidden ios-group">
            <div className="pointer-events-none absolute inset-0 ios-group-glow bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.15),transparent_60%)]" />
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <MapPinIcon className="w-5 h-5" /> Pilih Kota
            </h2>
            <div className="mb-4">
              <div
                className="inline-flex w-full ios-segment [&>button]:flex-1 gap-1"
                role="tablist"
                aria-label="Mode jadwal"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "daily"}
                  onClick={() => setMode("daily")}
                  className={`ios-segment-item ${
                    mode === "daily"
                      ? "bg-white/20 text-white"
                      : "ios-segment-item-inactive"
                  }`}
                >
                  Harian
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "monthly"}
                  onClick={() => setMode("monthly")}
                  className={`ios-segment-item ${
                    mode === "monthly"
                      ? "bg-white/20 text-white"
                      : "ios-segment-item-inactive"
                  }`}
                >
                  Bulanan
                </button>
              </div>
            </div>
            <div
              className="relative mb-3"
              role="combobox"
              aria-haspopup="listbox"
              aria-controls="kota-listbox"
              aria-expanded={filteredKota.length > 0}
            >
              <input
                type="text"
                placeholder="Ketik nama kota... (misal: jakarta, jember)"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setActiveIndex(-1);
                }}
                onKeyDown={onKeyDown}
                aria-autocomplete="list"
                aria-controls="kota-listbox"
                className="peer ios-input"
                autoComplete="off"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    setActiveIndex(-1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded"
                >
                  ✕
                </button>
              )}
            </div>
            {search.trim() !== "" && (
              <div
                ref={listRef}
                id="kota-listbox"
                role="listbox"
                className="max-h-60 sm:max-h-72 overflow-y-auto pr-1 space-y-1 relative rounded-xl"
              >
                {loadingKota && (
                  <div className="text-xs text-white/70 animate-pulse px-2 py-1">
                    Memuat daftar kota...
                  </div>
                )}
                {!loadingKota &&
                  filteredKota.map((k, i) => {
                    const label = k.nama || k.lokasi || k.id;
                    const active = selectedKota === k.id;
                    const focused = i === activeIndex;
                    return (
                      <button
                        key={k.id}
                        data-item="true"
                        role="option"
                        aria-selected={active}
                        onClick={() => commitSelection(k)}
                        className={`w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors flex items-center justify-between ${
                          active
                            ? "bg-emerald-500/60 text-white"
                            : focused
                              ? "bg-white/25 text-white"
                              : "bg-white/10 text-white/90 ios-row-hover"
                        }`}
                      >
                        <span>{highlight(label)}</span>
                        {active && (
                          <span className="text-[10px] uppercase tracking-wide">
                            Dipilih
                          </span>
                        )}
                      </button>
                    );
                  })}
                {!loadingKota && !filteredKota.length && (
                  <p className="text-xs text-white/60 px-2 py-1">
                    Tidak ada hasil
                  </p>
                )}
              </div>
            )}
            {errorKota && (
              <div className="mt-2 text-[10px] text-amber-300 flex items-center justify-between gap-2">
                <span>{errorKota}</span>
                <button
                  onClick={retryKota}
                  className="underline text-amber-200"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
          <div className="ios-card p-4 sm:p-5 relative overflow-hidden">
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <CalendarDaysIcon className="w-4 h-4" /> Tanggal
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="ios-input"
            />
            {mode === "monthly" && (
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="ios-input px-2"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {dayjs().month(i).format("MMMM")}
                    </option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="ios-input px-2"
                >
                  {Array.from({ length: 5 }).map((_, i) => {
                    const y = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
          <div className="ios-card p-4 sm:p-5 text-xs space-y-4 relative overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-semibold text-sm">Pengingat Adzan</h3>
              <button
                type="button"
                onClick={() => setNotifyEnabled((v) => !v)}
                aria-pressed={notifyEnabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                  notifyEnabled ? "bg-emerald-500" : "bg-white/25"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    notifyEnabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            {/* Suara adzan dihapus */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-[11px] tracking-wide text-white/70">
                Offset Pengingat
                <span className="font-semibold text-white text-xs">
                  {notifyOffset}m
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={60}
                value={notifyOffset}
                disabled={!notifyEnabled}
                onChange={(e) => setNotifyOffset(Number(e.target.value) || 10)}
                className="w-full accent-emerald-500 disabled:opacity-40 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-white/40">
                <span>1m</span>
                <span>30m</span>
                <span>60m</span>
              </div>
            </div>
            {/* Kontrol volume & uji suara dihapus */}
            {nextPrayer && mode === "daily" && (
              <div className="text-[11px] rounded-lg bg-sky-500/10 border border-sky-300/20 px-3 py-2 flex flex-col gap-0.5">
                <span className="text-sky-200 font-medium">
                  Berikutnya: {nextPrayer.name} {nextPrayer.time}
                </span>
                {countdown && (
                  <span className="font-mono text-white/70 text-[10px] tracking-tight">
                    {countdown}
                  </span>
                )}
              </div>
            )}
            {/* Tombol tes & simulasi notifikasi dihapus */}
            <p className="text-[10px] text-white/40 leading-relaxed">
              Notifikasi bekerja selama tab aktif & izin diberikan. Offset =
              berapa menit sebelum adzan.
            </p>
          </div>
        </aside>
        {/* Panel Jadwal */}
        <section className="lg:col-span-3 space-y-6">
          <div className="ios-card-lg p-4 sm:p-6 relative overflow-hidden ios-group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_70%)] ios-group-glow" />
            {!selectedKota && mode === "daily" && (
              <p className="text-white/70 text-sm">
                Silakan pilih kota untuk melihat jadwal salat.
              </p>
            )}
            {!selectedKota && mode === "monthly" && (
              <p className="text-white/70 text-sm">
                Pilih kota untuk melihat jadwal bulanan.
              </p>
            )}
            {selectedKota && loading && <Skeleton />}
            {error && !loading && (
              <div className="text-red-300 text-sm font-medium">{error}</div>
            )}
            {mode === "daily" &&
              selectedKota &&
              jadwal &&
              !loading &&
              !error && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">
                      Jadwal Hari Ini
                    </h2>
                    <p className="text-sm text-white/70">
                      {(() => {
                        // gunakan field date ISO jika ada, jika tidak parse pola dd/mm/yyyy dari jadwal.tanggal
                        if (jadwal.date) {
                          return dayjs(jadwal.date).format(
                            "dddd, DD MMMM YYYY",
                          );
                        }
                        // fallback: ekstrak dd/mm/yyyy dari string jadwal.tanggal
                        const match = jadwal.tanggal.match(
                          /(\d{2})\/(\d{2})\/(\d{4})/,
                        );
                        if (match) {
                          const d = match[1];
                          const m = match[2];
                          const y = match[3];
                          return dayjs(`${y}-${m}-${d}`).format(
                            "dddd, DD MMMM YYYY",
                          );
                        }
                        return jadwal.tanggal;
                      })()}
                    </p>
                    {isHydrated && (
                      <p className="mt-1 text-[11px] text-white/55">
                        {nextPrayer
                          ? `Highlight: ${nextPrayer.name} ${nextPrayer.time}`
                          : dayjs().format("YYYY-MM-DD") !==
                              (jadwal.date || date)
                            ? "Highlight waktu berikutnya hanya tampil untuk tanggal hari ini."
                            : "Semua waktu salat hari ini sudah lewat."}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {(
                      [
                        ["Imsak", jadwal.imsak],
                        ["Subuh", jadwal.subuh],
                        ["Terbit", jadwal.terbit],
                        ["Dhuha", jadwal.dhuha],
                        ["Dzuhur", jadwal.dzuhur],
                        ["Ashar", jadwal.ashar],
                        ["Maghrib", jadwal.maghrib],
                        ["Isya", jadwal.isya],
                      ] as const
                    ).map(([label, value]) => (
                      <div
                        key={label}
                        className={`relative ios-glass rounded-2xl p-3 sm:p-4 flex flex-col gap-1 ios-interactive ${
                          nextPrayerName === label
                            ? "bg-sky-500/18 border-sky-200/30 ring-2 ring-sky-200/70 shadow-lg shadow-sky-500/15 scale-[1.01]"
                            : ""
                        }`}
                      >
                        {nextPrayerName === label && (
                          <span className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide bg-sky-300/20 border border-sky-200/30 text-sky-50">
                            Berikutnya
                          </span>
                        )}
                        <span
                          className={`text-xs uppercase tracking-wide ${
                            nextPrayerName === label
                              ? "text-sky-100"
                              : "text-white/70"
                          }`}
                        >
                          {label}
                        </span>
                        <span className="text-lg font-semibold text-white">
                          {value || "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            {mode === "monthly" && selectedKota && !loading && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    Jadwal Bulan{" "}
                    {dayjs(
                      `${year}-${String(month).padStart(2, "0")}-01`,
                    ).format("MMMM YYYY")}
                  </h2>
                  {loadingMonthly && (
                    <span className="text-xs text-white/60">Memuat...</span>
                  )}
                </div>
                {errorMonthly && (
                  <div className="text-red-300 text-sm">{errorMonthly}</div>
                )}
                {jadwalBulanan && !errorMonthly && (
                  <div className="rounded-xl border border-white/10 relative overflow-x-auto">
                    <table className="min-w-[600px] w-full text-[11px] md:text-xs table-fixed">
                      <thead className="bg-white/10 backdrop-blur sticky top-0 z-10">
                        <tr className="text-left">
                          <th className="px-2 sm:px-3 py-2 w-[16%] min-w-[90px] whitespace-nowrap">
                            Tanggal
                          </th>
                          <th className="px-2 sm:px-3 py-2 w-[8%] whitespace-nowrap">
                            Imsak
                          </th>
                          <th className="px-2 sm:px-3 py-2 w-[8%] whitespace-nowrap">
                            Subuh
                          </th>
                          <th className="px-2 sm:px-3 py-2 w-[8%] whitespace-nowrap">
                            Terbit
                          </th>
                          <th className="px-2 sm:px-3 py-2 w-[8%] whitespace-nowrap">
                            Dhuha
                          </th>
                          <th className="px-2 sm:px-3 py-2 w-[8%] whitespace-nowrap">
                            Dzuhur
                          </th>
                          <th className="px-2 sm:px-3 py-2 w-[8%] whitespace-nowrap">
                            Ashar
                          </th>
                          <th className="px-2 sm:px-3 py-2 w-[8%] whitespace-nowrap">
                            Maghrib
                          </th>
                          <th className="px-2 sm:px-3 py-2 w-[8%] whitespace-nowrap">
                            Isya
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {jadwalBulanan.map((j) => {
                          const today = isToday(j.date);
                          return (
                            <tr
                              key={j.date || j.tanggal}
                              className={`${
                                today
                                  ? "bg-emerald-500/25 font-semibold ring-1 ring-inset ring-emerald-400/40"
                                  : ""
                              } ios-row-hover`}
                            >
                              <td className="px-2 sm:px-3 py-1 whitespace-nowrap min-w-[90px]">
                                {j.tanggal}
                              </td>
                              <td className="px-2 sm:px-3 py-1">{j.imsak}</td>
                              <td
                                className={`px-2 sm:px-3 py-1 ${
                                  today && nextPrayerName === "Subuh"
                                    ? "text-emerald-300 font-bold"
                                    : ""
                                }`}
                              >
                                {j.subuh}
                              </td>
                              <td className="px-2 sm:px-3 py-1">
                                {j.terbit || "-"}
                              </td>
                              <td className="px-2 sm:px-3 py-1">
                                {j.dhuha || "-"}
                              </td>
                              <td
                                className={`px-2 sm:px-3 py-1 ${
                                  today && nextPrayerName === "Dzuhur"
                                    ? "text-emerald-300 font-bold"
                                    : ""
                                }`}
                              >
                                {j.dzuhur}
                              </td>
                              <td
                                className={`px-2 sm:px-3 py-1 ${
                                  today && nextPrayerName === "Ashar"
                                    ? "text-emerald-300 font-bold"
                                    : ""
                                }`}
                              >
                                {j.ashar}
                              </td>
                              <td
                                className={`px-2 sm:px-3 py-1 ${
                                  today && nextPrayerName === "Maghrib"
                                    ? "text-emerald-300 font-bold"
                                    : ""
                                }`}
                              >
                                {j.maghrib}
                              </td>
                              <td
                                className={`px-2 sm:px-3 py-1 ${
                                  today && nextPrayerName === "Isya"
                                    ? "text-emerald-300 font-bold"
                                    : ""
                                }`}
                              >
                                {j.isya}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <style jsx>{`
                      @media (max-width: 640px) {
                        table {
                          font-size: 10px;
                        }
                        th,
                        td {
                          padding-left: 0.25rem;
                          padding-right: 0.25rem;
                          white-space: nowrap;
                        }
                      }
                    `}</style>
                  </div>
                )}
              </div>
            )}
          </div>
          <footer className="text-[10px] sm:text-[11px] text-white/40 text-center pt-4 px-2">
            Jangan Lupa Solat Yahhhhhh..... -Arss
            {/* Sumber data: api.myquran.com • Mode:{" "}
            {mode === "daily" ? "Harian" : "Bulanan"} • Dibangun dengan Next.js */}
          </footer>
        </section>
      </main>
      {/* Responsive styles moved to globals.css */}
    </div>
  );
}
