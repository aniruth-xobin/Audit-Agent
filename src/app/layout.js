import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { SettingsProvider } from "@/context/SettingsContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Xobin Audit Agent",
  description: "Production Monitoring Dashboard for the AI Audit Agent",
  icons: {
    icon: "/xobin-logo.png",
    shortcut: "/xobin-logo.png",
    apple: "/xobin-logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-theme="dark"
      data-colormode="colorful"
      data-chartstyle="matrix"
    >
      <body className="h-screen w-full flex overflow-hidden selection:bg-emerald-500/30">
        <SettingsProvider>
          <Sidebar />
          <div className="flex flex-col flex-1 h-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-primary)]">
            <Header />
            <main className="flex-1 overflow-auto p-8">
              {children}
            </main>
          </div>
        </SettingsProvider>
      </body>
    </html>
  );
}
