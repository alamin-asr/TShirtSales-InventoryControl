"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function HomePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch("/api/auth/me", { method: "GET", signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (data?.user?.role === "ADMIN") {
            router.replace("/admin");
            return;
          }
          if (data?.user?.role === "SELLER") {
            router.replace("/dashboard");
            return;
          }
        }
      } catch {
        // If unauthenticated or network error, show landing
      } finally {
        window.clearTimeout(timeout);
        if (isMounted) {
          setCheckingAuth(false);
        }
      }
    }

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="text-blue-600" />
          <p className="text-sm font-medium text-gray-500">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50/60 to-white flex flex-col">
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              T
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900">
              T-Shirt Portal
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Seller Login
              </Button>
            </Link>
            <Link href="/scanner/login">
              <Button variant="outline" size="sm">
                QR Scanner
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-xl w-full text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            Inventory & Distribution Management
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
              T-Shirt Sales & Inventory Control
            </h1>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-lg mx-auto">
              Real-time stock allocation, rate-limited buyer quota tracking, instant sale
              recording, and automated SMS confirmation.
            </p>
          </div>

          <div className="max-w-md mx-auto pt-2">
            <Link href="/login" className="w-full">
              <Button size="lg" className="w-full justify-center">
                Seller Dashboard
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-500">
            Need scanner access? <Link href="/scanner/register" className="font-semibold text-blue-600">Register for approval</Link>
          </p>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-6 text-xs text-gray-500">
            <span>Quota Enforcement</span>
            <span>•</span>
            <span>Live Stock Sync</span>
            <span>•</span>
            <span>Idempotent Sales</span>
          </div>
        </div>
      </main>
    </div>
  );
}
