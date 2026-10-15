import React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100/70 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 group focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 group-hover:bg-blue-700 transition-colors text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20">
            T
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-gray-900">
            T-Shirt Portal
          </span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        {children}
      </div>
    </div>
  );
}
