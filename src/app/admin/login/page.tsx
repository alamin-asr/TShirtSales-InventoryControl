"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid credentials");
        return;
      }

      if (data.user?.role !== "ADMIN") {
        setError("Access restricted. This account does not have administrator privileges.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold text-2xl shadow-md">
            A
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Admin Portal
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to manage stock inventory, allocations, and sales
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="shadow-lg border-gray-200">
          <CardHeader
            title="Administrator Sign In"
            subtitle="Sign in with your administrator account"
          />
          <CardContent>
            {error && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-medium"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Administrator Phone"
                placeholder="01700000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="username"
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              <Button
                type="submit"
                className="w-full bg-purple-700 hover:bg-purple-800 focus:ring-purple-500"
                isLoading={loading}
                disabled={loading || !phone || !password}
              >
                Sign In to Dashboard
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-4">
              <Link href="/" className="text-blue-600 hover:underline font-medium">
                ← Back to Home
              </Link>
              <Link href="/login" className="text-gray-600 hover:underline">
                Seller Login →
              </Link>
            </div>
            <Link href="/admin/register" className="mt-3 block text-center text-xs text-purple-700 hover:underline">
              Register an administrator account
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
