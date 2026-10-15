"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminRegisterPage() {
  const router = useRouter();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/admin-register")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to check registration status");
        return response.json();
      })
      .then((data: { available: boolean; adminCount: number; maxAdminCount: number }) => {
        setAvailable(data.available);
      })
      .catch(() => setError("Unable to check admin registration status. Please try again."));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/admin-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, password, confirmPassword, sellingPointName: "Admin" }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAvailable(false);
        setError(data.error || "Registration failed.");
        return;
      }
      router.replace("/admin");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="shadow-lg border-gray-200">
          <CardHeader title="Admin Registration" subtitle="Only two administrator accounts can be registered." />
          <CardContent>
            {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
            {available === false ? (
              <div className="space-y-4">
                <p className="rounded-lg bg-gray-100 p-4 text-sm text-gray-700">
                  Both administrator registration slots are already used. Use an existing administrator account to sign in.
                </p>
                <Link href="/admin/login" className="block text-center text-sm font-medium text-blue-600 hover:underline">
                  Go to Admin Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                <Input label="Phone Number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                <Input label="Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <Input label="Confirm Password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                <Button type="submit" className="w-full bg-purple-700 hover:bg-purple-800" isLoading={loading} disabled={loading || available === null}>
                  Create Administrator Account
                </Button>
                <Link href="/admin/login" className="block text-center text-sm text-gray-600 hover:underline">
                  Already registered? Sign in
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
