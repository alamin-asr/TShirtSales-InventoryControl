"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Receipt = { orderId: string; quantity: number; sizes: string[]; sellingPoint: string; createdAt: string };

export default function ScannerPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<import("qr-scanner").default | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [manualValue, setManualValue] = useState("");

  useEffect(() => {
    let active = true;
    async function start() {
      const QrScanner = (await import("qr-scanner")).default;
      if (!active || !videoRef.current) return;
      const scanner = new QrScanner(videoRef.current, (result) => {
        void submitScan(result.data);
      }, { highlightScanRegion: true, highlightCodeOutline: true });
      scannerRef.current = scanner;
      try {
        await scanner.start();
      } catch {
        setError("Camera permission is required. You can paste the QR link below.");
      }
    }
    void start();
    return () => {
      active = false;
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
    };
  }, []);

  async function submitScan(value: string) {
    scannerRef.current?.stop();
    setError("");
    setMessage("Checking QR code...");
    const match = value.match(/\/receipt\/([^/?#]+)/);
    const orderId = decodeURIComponent(match?.[1] || value.trim());
    try {
      const response = await fetch("/api/scanner/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Scan failed.");
        return;
      }
      setReceipt(data.receipt);
      setMessage("QR verified and scan recorded successfully.");
    } catch {
      setError("Network error. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <section className="mx-auto max-w-lg space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">QR Scanner</h1><p className="text-sm text-gray-500">Each receipt can be scanned only once.</p></div>
          <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); }} className="text-sm text-gray-600">Sign out</button>
        </div>
        <video ref={videoRef} className="aspect-video w-full rounded-xl bg-gray-900 object-cover" muted playsInline />
        <button onClick={() => { setError(""); scannerRef.current?.start(); }} className="w-full rounded-lg border px-4 py-2 font-semibold">Start Camera</button>
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-semibold">Camera unavailable?</p>
          <input value={manualValue} onChange={(event) => setManualValue(event.target.value)} placeholder="Paste QR receipt link" className="w-full rounded-lg border px-3 py-2 text-sm" />
          <button onClick={() => void submitScan(manualValue)} disabled={!manualValue.trim()} className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Verify QR</button>
        </div>
        {message && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {receipt && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm"><p className="font-bold text-emerald-800">Verified: {receipt.orderId}</p><p>{receipt.quantity} T-shirt ({receipt.sizes.join(", ")})</p><p>Point: {receipt.sellingPoint}</p><p>{new Date(receipt.createdAt).toLocaleString()}</p></div>}
      </section>
    </main>
  );
}
