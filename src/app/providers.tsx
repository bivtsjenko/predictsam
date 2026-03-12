"use client";

import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Navbar />
        <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
