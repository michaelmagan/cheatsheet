import "./globals.css";
import "@fortune-sheet/react/dist/index.css";
import { Geist, Geist_Mono } from "next/font/google";
import { FortuneSheetProvider } from "@/lib/fortune-sheet-store";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <FortuneSheetProvider>{children}</FortuneSheetProvider>
      </body>
    </html>
  );
}
