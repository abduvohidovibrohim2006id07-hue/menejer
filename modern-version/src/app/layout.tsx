import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Menejer Pro | Mahsulotlar Boshqaruvi",
  description: "Dinamik mahsulotlar galereyasi va AI menejeri",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body className={`${outfit.variable} font-sans antialiased text-slate-900`}>
        <Toaster position="top-right" toastOptions={{ className: 'font-bold text-sm tracking-wider font-sans rounded-2xl' }} />
        {children}
      </body>
    </html>
  );
}
