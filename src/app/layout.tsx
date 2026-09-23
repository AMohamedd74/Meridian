import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Nav from "@/components/Nav";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "PathPal — Find a direction worth testing",
  description:
    "Have a conversation about your life, interests and ambitions, explore three possible directions, and test one in the real world.",
};

async function currentUserEmail(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const email = await currentUserEmail();
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Nav email={email} authEnabled={isSupabaseConfigured} />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
