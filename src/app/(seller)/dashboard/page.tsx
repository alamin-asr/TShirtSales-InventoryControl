"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { SIZES } from "@/types";

type Stock = { size: string; quantity: number };
export default function DashboardPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [phone, setPhone] = useState("");
  const [recentPhone, setRecentPhone] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem("tshirt_recent_buyer_phone") ?? "",
  );
  const [phoneError, setPhoneError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const phoneCheckId = useRef(0);
  const [sizes, setSizes] = useState<string[]>(["M"]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSaleConfirmation, setShowSaleConfirmation] = useState(false);
  const total = useMemo(() => stocks.reduce((sum, stock) => sum + stock.quantity, 0), [stocks]);

  const loadStock = useCallback(async () => {
    const response = await fetch("/api/seller/stock", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setStocks(data.stocks);
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void loadStock();
    }, 0);

    const refreshInterval = window.setInterval(() => {
      void loadStock();
    }, 5000);

    const refreshOnFocus = () => {
      void loadStock();
    };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);

    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [loadStock]);
  async function checkPhone(value: string) {
    setPhone(value);
    setMessage("");
    setRemaining(null);
    setPhoneError("");
    const checkId = ++phoneCheckId.current;
    const digits = value.replace(/\D/g, "");
    if (digits.length === 0) {
      setCheckingPhone(false);
      return;
    }
    if (digits.length !== 11) {
      setPhoneError("Buyer phone number must be exactly 11 digits.");
      setCheckingPhone(false);
      return;
    }

    setCheckingPhone(true);
    try {
      const response = await fetch("/api/seller/buyer-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: value }),
      });
      const data = await response.json();
      if (checkId === phoneCheckId.current && response.ok) {
        setRemaining(data.remaining);
      } else if (checkId === phoneCheckId.current) {
        setPhoneError(data.error || "Buyer phone number must be exactly 11 digits.");
      }
    } finally {
      if (checkId === phoneCheckId.current) setCheckingPhone(false);
    }
  }
  async function submit() {
    setShowSaleConfirmation(true);
  }

  async function confirmSale() {
    setShowSaleConfirmation(false);
    setLoading(true); setMessage("");
    const response = await fetch("/api/seller/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ buyerPhone: phone, sizes, idempotencyKey: crypto.randomUUID() }) });
    const data = await response.json(); setMessage(response.ok ? "Confirmed: sale completed successfully. SMS confirmation queued." : data.error);
    if (response.ok) {
      window.localStorage.setItem("tshirt_recent_buyer_phone", phone);
      setRecentPhone(phone);
      setPhone("");
      setSizes(["M"]);
      setRemaining(null);
      await loadStock();
    }
    setLoading(false);
  }
  return <div className="space-y-6">
    <Dialog
      isOpen={showSaleConfirmation}
      onClose={() => setShowSaleConfirmation(false)}
      onConfirm={confirmSale}
      title="Confirm sale"
      message={`Confirm sale of 1 T-shirt to ${phone}?`}
      confirmText="Confirm sale"
      isLoading={loading}
    />
    <div><h1 className="text-2xl font-bold">New Sale</h1><p className="text-gray-500">Only your selling point stock is shown.</p></div>
    <Card><CardHeader title="Available stock" /><CardContent><div className="grid grid-cols-2 sm:grid-cols-5 gap-3">{SIZES.map((size) => <div className="rounded-lg bg-blue-50 p-3" key={size}><div className="text-xs text-gray-500">{size}</div><div className="text-xl font-bold">{stocks.find((s) => s.size === size)?.quantity ?? 0}</div></div>)}</div><p className="mt-3 text-sm text-gray-500">{total} T-shirt(s) available</p></CardContent></Card>
    <Card><CardHeader title="Record purchase" /><CardContent className="space-y-4">
      <Input label="Buyer phone number" placeholder="Enter 11-digit phone number" value={phone} onChange={(e) => checkPhone(e.target.value)} error={phoneError} />
      {recentPhone && !phone && (
        <button
          type="button"
          className="text-left text-sm text-blue-700 hover:underline"
          onClick={() => checkPhone(recentPhone)}
        >
          Use recent buyer number: {recentPhone}
        </button>
      )}
      {phone.replace(/\D/g, "").length > 0 && (
        <p className="text-sm text-blue-700">
          {checkingPhone
            ? "Checking this number..."
            : remaining === null
              ? "Could not verify this number. Please try again."
              : remaining > 0
                ? `This number can buy ${remaining} more T-shirt(s)`
                : "This number has reached the purchase limit. Use another number."}
        </p>
      )}
      <p className="text-sm font-medium text-gray-700">Purchase quantity: <span className="font-bold text-blue-700">1</span></p>
      <Select label="T-shirt size" value={sizes[0]} onChange={(e) => setSizes([e.target.value])} options={SIZES.map((value) => ({ label: value, value }))} />
      <Button disabled={!phone || remaining === null || remaining === 0 || checkingPhone || loading} isLoading={loading} onClick={submit}>Confirm sale</Button>
      {message && <p role="status" className="text-sm font-medium">{message}</p>}
    </CardContent></Card>
  </div>;
}
