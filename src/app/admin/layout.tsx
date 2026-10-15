"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

interface AdminProfile {
  id: string;
  fullName: string;
  phone: string;
  role: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Login and first-time registration are public admin routes.
  const isPublicPage = pathname === "/admin/login" || pathname === "/admin/register";

  useEffect(() => {
    if (isPublicPage) return;

    let isMounted = true;
    async function loadAdmin() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data?.user?.role === "ADMIN") {
            if (isMounted) setAdmin(data.user);
          } else {
            router.push("/admin/login");
          }
        } else {
          router.push("/admin/login");
        }
      } catch {
        router.push("/admin/login");
      }
    }

    loadAdmin();
    return () => {
      isMounted = false;
    };
  }, [isPublicPage, router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
    }
  };

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-purple-700 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                A
              </div>
              <div>
                <span className="font-bold text-gray-900 tracking-tight text-base sm:text-lg">
                  T-Shirt POS
                </span>
                <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  Admin Control
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {admin && (
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-gray-900">
                  {admin.fullName}
                </div>
                <div className="text-xs text-gray-500">{admin.phone}</div>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              isLoading={loggingOut}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
