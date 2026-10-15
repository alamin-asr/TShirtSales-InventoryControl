"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ScannerRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", phone: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/scanner-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Registration failed.");
        return;
      }
      router.push("/scanner/login?registered=1");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <form onSubmit={submit} className="mx-auto max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Scanner Registration</h1>
        <p className="text-sm text-gray-500">Admin approval is required before scanning QR codes.</p>
        {(["fullName", "phone", "password", "confirmPassword"] as const).map((field) => (
          <input
            key={field}
            required
            type={field.includes("password") ? "password" : "text"}
            placeholder={field === "confirmPassword" ? "Confirm password" : field === "fullName" ? "Full name" : field[0].toUpperCase() + field.slice(1)}
            value={form[field]}
            onChange={(event) => setForm({ ...form, [field]: event.target.value })}
            className="w-full rounded-lg border px-3 py-2"
          />
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
          {loading ? "Submitting..." : "Request Scanner Access"}
        </button>
        <Link href="/scanner/login" className="block text-center text-sm text-blue-600">Already registered? Login</Link>
      </form>
    </main>
  );
}
