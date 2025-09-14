import type { Metadata } from "next";
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
  themeColor: "#059669",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scroll-smooth">
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} font-sans antialiased bg-slate-950 text-white selection:bg-emerald-400/30 selection:text-emerald-100`}
      >
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900" />
          <div className="absolute -top-40 -left-32 w-[32rem] h-[32rem] bg-emerald-500/25 blur-3xl rounded-full mix-blend-screen" />
          <div className="absolute top-1/2 -right-40 w-[40rem] h-[40rem] bg-teal-400/20 blur-3xl rounded-full mix-blend-screen" />
          <div className="absolute bottom-0 left-1/3 w-[28rem] h-[28rem] bg-emerald-300/10 blur-3xl rounded-full mix-blend-screen" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_60%)]" />
        </div>
        {children}
      </body>
    </html>
  );
}
