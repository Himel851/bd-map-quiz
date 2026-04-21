import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "কোন জেলা? — বাংলাদেশ মানচিত্র কুইজ",
  description:
    "স্টাইলাইজড মানচিত্রে বিভাগ দেখে বাংলাদেশের জেলা চেনার দ্রুত কুইজ। স্কোর, স্ট্রিক ও সেরা পয়েন্ট।",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bn"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
