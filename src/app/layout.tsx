import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSessionUser } from "@/lib/auth";
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
  title: "The Hidden Realm Weather",
  description: "A dark-themed weather dashboard with a WISH intensity score, powered by Open-Meteo and the National Weather Service.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSessionUser();
  const theme = session?.theme ?? "dark";

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
