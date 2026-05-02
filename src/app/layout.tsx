import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Jadwal Salat Indonesia",
    template: "%s • Jadwal Salat Indonesia",
  },
  description:
    "Cek jadwal salat harian & bulanan seluruh kota di Indonesia. Highlight waktu berikutnya & pengingat sebelum adzan.",
  metadataBase: new URL("https://example.com"),
  applicationName: "Jadwal Salat Indonesia",
  openGraph: {
    title: "Jadwal Salat Indonesia",
    description:
      "Jadwal salat harian & bulanan seluruh kota di Indonesia dengan highlight dan pengingat.",
    type: "website",
    locale: "id_ID",
    siteName: "Jadwal Salat Indonesia",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jadwal Salat Indonesia",
    description:
      "Jadwal salat harian & bulanan seluruh kota di Indonesia dengan highlight & notifikasi.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} font-sans antialiased bg-transparent text-white selection:bg-white/20 selection:text-white`}
      >
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
          <div className="absolute -top-40 -left-32 w-[32rem] h-[32rem] bg-emerald-500/20 blur-3xl rounded-full mix-blend-soft-light" />
          <div className="absolute top-1/2 -right-40 w-[40rem] h-[40rem] bg-teal-400/15 blur-3xl rounded-full mix-blend-soft-light" />
          <div className="absolute bottom-0 left-1/3 w-[28rem] h-[28rem] bg-emerald-300/10 blur-3xl rounded-full mix-blend-soft-light" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_60%)]" />
        </div>
        {children}
      </body>
    </html>
  );
}
