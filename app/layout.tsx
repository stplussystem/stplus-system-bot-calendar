import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ระบบออฟฟิศ ST PLUS SYSTEM",
  description: "ระบบออฟฟิศ ST PLUS SYSTEM ลงชื่อเข้า-ออก งาน ปฏิทิน และอื่นๆ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        {/* 🔥 จัดเต็มเรื่องสี Toaster ให้ปรับแต่งได้ตรงใจ 100% */}
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast:
                "shadow-2xl rounded-2xl border !p-4 flex items-center gap-3",
              title: "font-bold text-sm",
              description: "text-slate-500 text-xs",
              success: "!bg-green-50 !text-green-700 !border-green-200",
              error: "!bg-red-50 !text-red-700 !border-red-200",
              warning: "!bg-orange-50 !text-orange-700 !border-orange-200",
              info: "!bg-blue-50 !text-blue-700 !border-blue-200",
            },
          }}
        />
      </body>
    </html>
  );
}
