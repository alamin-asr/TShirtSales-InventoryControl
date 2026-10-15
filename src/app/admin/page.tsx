"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Dialog } from "@/components/ui/dialog";
import { SIZES, type Size } from "@/types";

interface StockOverview {
  centralStock: { size: Size; quantity: number }[];
  sellingPoints: {
    sellingPointName: string;
    stock: Record<Size, number>;
    totalAvailable: number;
  }[];
  totalCentral: number;
  sellers: {
    id: string;
    fullName: string;
    phone: string;
    sellingPointName: string | null;
  }[];
  recentLedger: {
    id: string;
    type: "STOCK_IN" | "ASSIGN" | "SALE";
    size: Size;
    quantity: number;
    sellingPointName: string | null;
    createdAt: string;
    user: { fullName: string; phone: string };
  }[];
}

interface SaleRecord {
  id: string;
  orderId: string;
  sellingPointSnapshot: string;
  buyerPhone: string;
  quantity: number;
  createdAt: string;
  seller: { fullName: string; phone: string };
  items: { size: Size; serialNo: number }[];
}

interface ScannerAccount {
  id: string;
  fullName: string;
  phone: string;
  scannerApproved: boolean;
  createdAt: string;
  _count: { scanRecords: number };
}

export default function AdminDashboardPage() {
  // Global stats
  const [loading, setLoading] = useState(true);
  const [stockData, setStockData] = useState<StockOverview | null>(null);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [salesCount, setSalesCount] = useState(0);
  const [totalSold, setTotalSold] = useState(0);
  const [salesPage, setSalesPage] = useState(1);
  const [salesTotalPages, setSalesTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [scanners, setScanners] = useState<ScannerAccount[]>([]);
  const [scanCount, setScanCount] = useState(0);

  // Stock-In Form State
  const [stockInSize, setStockInSize] = useState<Size>("M");
  const [stockInQty, setStockInQty] = useState("");
  const [stockInLoading, setStockInLoading] = useState(false);
  const [stockInMsg, setStockInMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Stock-Assign Form State
  const [assignSellingPoint, setAssignSellingPoint] = useState("");
  const [assignQuantities, setAssignQuantities] = useState<Record<Size, string>>({
    S: "",
    M: "",
    L: "",
    XL: "",
    XXL: "",
  });
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignMsg, setAssignMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmation, setConfirmation] = useState<"stockIn" | "assign" | null>(null);

  // Load stock overview
  const loadStock = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stock-overview", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStockData(data);
        if (!assignSellingPoint && data.sellingPoints?.length > 0) {
          setAssignSellingPoint(data.sellingPoints[0].sellingPointName);
        }
      }
    } catch {
      // ignore
    }
  }, [assignSellingPoint]);

  // Load sales
  const loadSales = useCallback(async (page: number, search: string) => {
    try {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: "10",
      });
      if (search) query.set("search", search);

      const res = await fetch(`/api/admin/sales?${query.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSales(data.sales || []);
        setSalesCount(data.totalCount || 0);
        setTotalSold(data.totalQuantity || 0);
        setSalesTotalPages(data.totalPages || 1);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadScanners = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/scanners", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setScanners(data.scanners ?? []);
        setScanCount(data.scanCount ?? 0);
      }
    } catch {
      // Refresh can be retried manually.
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadStock(), loadSales(salesPage, searchQuery), loadScanners()]);
    } finally {
      setLoading(false);
    }
  }, [loadStock, loadSales, loadScanners, salesPage, searchQuery]);

  useEffect(() => {
    let mounted = true;
    const execute = async () => {
      try {
        await Promise.all([loadStock(), loadSales(salesPage, searchQuery), loadScanners()]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void execute();
    return () => {
      mounted = false;
    };
  }, [loadStock, loadSales, loadScanners, salesPage, searchQuery]);

  // Handle Stock-In Submit
  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setStockInMsg(null);
    const qty = parseInt(stockInQty, 10);
    if (!qty || qty <= 0) {
      setStockInMsg({ type: "error", text: "Please enter a valid positive quantity" });
      return;
    }

    setConfirmation("stockIn");
  };

  const confirmStockIn = async () => {
    setConfirmation(null);
    const qty = parseInt(stockInQty, 10);
    setStockInLoading(true);
    try {
      const res = await fetch("/api/admin/stock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size: stockInSize, quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStockInMsg({ type: "error", text: data.error || "Failed to add stock" });
      } else {
        setStockInMsg({ type: "success", text: `Confirmed: ${qty} (${stockInSize}) added to central warehouse` });
        setStockInQty("");
        await loadStock();
      }
    } catch {
      setStockInMsg({ type: "error", text: "Network error while adding stock" });
    } finally {
      setStockInLoading(false);
    }
  };

  // Handle Stock Assign Submit
  const handleStockAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignMsg(null);
    if (!assignSellingPoint.trim()) {
      setAssignMsg({ type: "error", text: "Please enter or select a selling point name" });
      return;
    }
    const items = SIZES.flatMap((size) => {
      const quantity = Number.parseInt(assignQuantities[size], 10);
      return Number.isInteger(quantity) && quantity > 0 ? [{ size, quantity }] : [];
    });
    if (items.length === 0) {
      setAssignMsg({ type: "error", text: "Enter a positive quantity for at least one size" });
      return;
    }

    setConfirmation("assign");
  };

  const confirmStockAssign = async () => {
    setConfirmation(null);
    setAssignLoading(true);
    const items = SIZES.flatMap((size) => {
      const quantity = Number.parseInt(assignQuantities[size], 10);
      return Number.isInteger(quantity) && quantity > 0 ? [{ size, quantity }] : [];
    });
    try {
      const res = await fetch("/api/admin/assign-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellingPointName: assignSellingPoint.trim(),
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAssignMsg({ type: "error", text: data.error || "Failed to assign stock" });
      } else {
        setAssignMsg({
          type: "success",
          text: `Confirmed: ${items.map((item) => `${item.quantity} ${item.size}`).join(", ")} assigned to "${assignSellingPoint}"`,
        });
        setAssignQuantities({ S: "", M: "", L: "", XL: "", XXL: "" });
        await loadStock();
      }
    } catch {
      setAssignMsg({ type: "error", text: "Network error while assigning stock" });
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Dialog
        isOpen={confirmation !== null}
        onClose={() => setConfirmation(null)}
        onConfirm={confirmation === "stockIn" ? confirmStockIn : confirmStockAssign}
        title={confirmation === "stockIn" ? "Confirm stock entry" : "Confirm stock assignment"}
        message={
          confirmation === "stockIn"
            ? `Add ${stockInQty} T-shirt(s) of size ${stockInSize} to the central warehouse?`
          : `Assign ${SIZES.flatMap((size) => {
              const quantity = Number.parseInt(assignQuantities[size], 10);
              return Number.isInteger(quantity) && quantity > 0 ? [`${quantity} ${size}`] : [];
            }).join(", ")} to "${assignSellingPoint.trim()}"?`
        }
        confirmText="Confirm"
        isLoading={stockInLoading || assignLoading}
      />
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            System Administration
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time central inventory, distribution control, and immutable ledger oversight
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/admin/sales?format=csv"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
          >
            📥 Export Sales (CSV)
          </a>
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={loading}>
            {loading ? <Spinner size="sm" /> : "↻ Refresh"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            T-Shirts Sold
          </p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-700">{totalSold}</p>
          <p className="mt-1 text-xs text-gray-400">Total units sold</p>
        </div>

        <Card>
          <CardHeader title="QR Scanner Approval" subtitle={`${scanCount} QR code(s) scanned successfully`} />
          <CardContent>
            {scanners.length === 0 ? (
              <p className="text-sm text-gray-500">No scanner registration requests yet.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {scanners.map((scanner) => (
                  <div key={scanner.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-b-0">
                    <div>
                      <p className="font-semibold text-gray-900">{scanner.fullName}</p>
                      <p className="text-xs text-gray-500">
                        {scanner.phone} · {scanner._count.scanRecords} scan(s)
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={scanner.scannerApproved ? "outline" : "primary"}
                      onClick={async () => {
                        const response = await fetch("/api/admin/scanners", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: scanner.id, approved: !scanner.scannerApproved }),
                        });
                        if (response.ok) await loadScanners();
                      }}
                    >
                      {scanner.scannerApproved ? "Revoke access" : "Approve scanner"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-700">
            Central Warehouse Stock
          </p>
          <p className="mt-2 text-3xl font-extrabold text-purple-700">
            {stockData?.totalCentral ?? 0}
          </p>
          <p className="mt-1 text-xs text-gray-400">T-shirts ready for allocation</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Selling Points
          </p>
          <p className="mt-2 text-3xl font-extrabold text-blue-700">
            {stockData?.sellingPoints.length ?? 0}
          </p>
          <p className="mt-1 text-xs text-gray-400">Active distribution locations</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Total Allocated
          </p>
          <p className="mt-2 text-3xl font-extrabold text-amber-700">
            {stockData?.sellingPoints.reduce((sum, sp) => sum + sp.totalAvailable, 0) ?? 0}
          </p>
          <p className="mt-1 text-xs text-gray-400">Available across all booths</p>
        </div>
      </div>

      {/* Central Stock Overview */}
      <Card>
        <CardHeader
          title="Central Warehouse Inventory"
          subtitle="Stock available for assignment to selling points"
        />
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {SIZES.map((size) => {
              const qty = stockData?.centralStock.find((s) => s.size === size)?.quantity ?? 0;
              return (
                <div
                  key={size}
                  className="rounded-xl border border-purple-100 bg-purple-50/50 p-4 text-center"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                    Size {size}
                  </span>
                  <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-gray-900">{qty}</p>
                  <span className="text-xs text-gray-400">units in warehouse</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stock Management Actions: Stock-In & Stock-Assignment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action 1: Stock-In */}
        <Card>
          <CardHeader
            title="1. Add Stock to Central Warehouse"
            subtitle="Record new physical inventory received into central storage"
          />
          <CardContent>
            {stockInMsg && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm font-medium ${
                  stockInMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {stockInMsg.text}
              </div>
            )}
            <form onSubmit={handleStockIn} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="T-Shirt Size"
                  value={stockInSize}
                  onChange={(e) => setStockInSize(e.target.value as Size)}
                  options={SIZES.map((s) => ({ label: `Size ${s}`, value: s }))}
                />
                <Input
                  label="Quantity"
                  type="number"
                  min="1"
                  placeholder="e.g. 50"
                  value={stockInQty}
                  onChange={(e) => setStockInQty(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-purple-700 hover:bg-purple-800"
                isLoading={stockInLoading}
                disabled={stockInLoading || !stockInQty}
              >
                + Add to Central Warehouse
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Action 2: Stock-Assignment */}
        <Card>
          <CardHeader
            title="2. Assign Stock to Selling Point"
            subtitle="Transfer inventory from Central Warehouse to a booth/seller"
          />
          <CardContent>
            {assignMsg && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm font-medium ${
                  assignMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {assignMsg.text}
              </div>
            )}
            <form onSubmit={handleStockAssign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selling Point Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Enter or select selling point"
                    value={assignSellingPoint}
                    onChange={(e) => setAssignSellingPoint(e.target.value)}
                    required
                  />
                  {stockData?.sellingPoints && stockData.sellingPoints.length > 0 && (
                    <select
                      className="rounded-lg border border-gray-300 px-2 py-2 text-xs bg-gray-50 text-gray-700 focus:outline-none"
                      onChange={(e) => {
                        if (e.target.value) setAssignSellingPoint(e.target.value);
                      }}
                      value=""
                    >
                      <option value="">Select known...</option>
                      {stockData.sellingPoints.map((sp) => (
                        <option key={sp.sellingPointName} value={sp.sellingPointName}>
                          {sp.sellingPointName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {SIZES.map((size) => (
                  <Input
                    key={size}
                    label={`Size ${size} (${stockData?.centralStock.find((cs) => cs.size === size)?.quantity ?? 0} avail)`}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={assignQuantities[size]}
                    onChange={(e) =>
                      setAssignQuantities((current) => ({ ...current, [size]: e.target.value }))
                    }
                  />
                ))}
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                isLoading={assignLoading}
                disabled={assignLoading || !assignSellingPoint}
              >
                Transfer to Selling Point
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Selling Point Stock Table */}
      <Card>
        <CardHeader
          title="Selling Points Stock Allocation"
          subtitle="Inventory balances actively held by points of sale"
        />
        <CardContent>
          {stockData?.sellingPoints.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              No selling points recorded yet. Once sellers register or stock is assigned, they will appear here.
            </p>
          ) : (
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-left text-sm text-gray-700">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-4 py-3 font-semibold text-gray-600">Selling Point</th>
                    {SIZES.map((size) => (
                      <th key={size} className="px-4 py-3 font-semibold text-center text-gray-600">
                        {size}
                      </th>
                    ))}
                    <th className="px-4 py-3 font-semibold text-right text-gray-600">Total Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stockData?.sellingPoints.map((sp) => (
                    <tr key={sp.sellingPointName} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">{sp.sellingPointName}</td>
                      {SIZES.map((size) => (
                        <td key={size} className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                              (sp.stock[size] ?? 0) > 0
                                ? "bg-blue-50 text-blue-700"
                                : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            {sp.stock[size] ?? 0}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {sp.totalAvailable}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warehouse and selling point activity */}
      <Card>
        <CardHeader
          title="Warehouse & Selling Point Activity"
          subtitle="Recent stock received into the warehouse and assignments to selling points"
        />
        <CardContent>
          {stockData?.recentLedger.length ? (
            <div className="max-h-80 overflow-auto rounded-lg border border-gray-100">
              <table className="w-full text-left text-sm text-gray-700">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-4 py-3 font-semibold text-gray-600">Action</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Details</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Performed by</th>
                    <th className="px-4 py-3 font-semibold text-right text-gray-600">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stockData.recentLedger.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                          entry.type === "STOCK_IN"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {entry.type === "STOCK_IN" ? "Warehouse stock-in" : "Selling point assignment"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold">{entry.quantity} × Size {entry.size}</span>
                        {entry.sellingPointName && (
                          <span className="block text-xs text-gray-500">To {entry.sellingPointName}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{entry.user.fullName}</span>
                        <span className="block text-xs text-gray-500">{entry.user.phone}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-gray-500">No warehouse or selling point activity yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Sales Transactions Log */}
      <Card>
        <CardHeader
          title="Sales Transactions"
          subtitle={`Showing ${sales.length} of ${salesCount} recorded orders`}
          action={
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search phone, order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadSales(1, searchQuery);
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
              />
              <Button size="sm" variant="outline" onClick={() => loadSales(1, searchQuery)}>
                Search
              </Button>
            </div>
          }
        />
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No sales transactions found matching your criteria.
            </p>
          ) : (
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-left text-sm text-gray-700">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-4 py-3 font-semibold text-gray-600">Order ID</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Date & Time</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Selling Point</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Seller</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Buyer Phone</th>
                    <th className="px-4 py-3 font-semibold text-center text-gray-600">Qty</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Sizes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-purple-700">
                        {sale.orderId}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(sale.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {sale.sellingPointSnapshot}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <div>{sale.seller.fullName}</div>
                        <div className="text-gray-400">{sale.seller.phone}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-gray-800">
                        {sale.buyerPhone}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-gray-900">
                        {sale.quantity}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {sale.items.map((item, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800"
                            >
                              {item.size}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {salesTotalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
                  <span className="text-xs text-gray-500">
                    Page {salesPage} of {salesTotalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={salesPage <= 1}
                      onClick={() => {
                        const next = salesPage - 1;
                        setSalesPage(next);
                        loadSales(next, searchQuery);
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={salesPage >= salesTotalPages}
                      onClick={() => {
                        const next = salesPage + 1;
                        setSalesPage(next);
                        loadSales(next, searchQuery);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
