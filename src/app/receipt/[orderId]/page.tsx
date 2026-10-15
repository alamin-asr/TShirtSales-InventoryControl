import QRCode from "qrcode";
import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/db";

type ReceiptPageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { orderId } = await params;
  const sale = await prisma.sale.findUnique({
    where: { orderId },
    include: { items: { orderBy: { serialNo: "asc" } } },
  });

  if (!sale) notFound();

  const publicOrigin = process.env.PUBLIC_APP_URL || "http://localhost:3000";
  const receiptUrl = `${publicOrigin.replace(/\/$/, "")}/receipt/${encodeURIComponent(sale.orderId)}`;
  const qrDataUrl = await QRCode.toDataURL(receiptUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 240,
  });

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <section className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-purple-700">
            Purchase Verification
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900">Order Receipt</h1>
          <p className="mt-1 text-sm text-gray-500">Scan this QR code to verify this purchase.</p>
        </div>

        <div className="my-6 flex justify-center">
          <Image
            src={qrDataUrl}
            alt="QR code for purchase verification"
            width={240}
            height={240}
            unoptimized
          />
        </div>

        <dl className="divide-y divide-gray-100 rounded-xl border border-gray-100 text-sm">
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-gray-500">Order ID</dt>
            <dd className="font-semibold text-gray-900">{sale.orderId}</dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-gray-500">T-shirt</dt>
            <dd className="font-semibold text-gray-900">{sale.quantity}</dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-gray-500">Size</dt>
            <dd className="font-semibold text-gray-900">
              {sale.items.map((item) => item.size).join(", ")}
            </dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-gray-500">Selling point</dt>
            <dd className="text-right font-semibold text-gray-900">{sale.sellingPointSnapshot}</dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-gray-500">Date</dt>
            <dd className="text-right font-semibold text-gray-900">
              {sale.createdAt.toLocaleString()}
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
