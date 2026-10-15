"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ScannerLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/scanner-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Login failed.");
        return;
      }
      router.push("/scanner");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <form onSubmit={submit} className="mx-auto max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Scanner Login</h1>
        <input required placeholder="Phone number" value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-lg border px-3 py-2" />
        <input required type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border px-3 py-2" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{loading ? "Signing in..." : "Login"}</button>
        <a href="/scanner/register" className="block text-center text-sm text-blue-600">Register as scanner</a>
      </form>
    </main>
  );
}
