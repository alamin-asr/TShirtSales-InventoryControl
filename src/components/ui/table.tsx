import React from "react";
import { Spinner } from "./spinner";
import { Button } from "./button";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  keyExtractor?: (item: T, index: number) => string | number;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No data available",
  currentPage = 1,
  totalPages = 1,
  totalCount,
  pageSize,
  onPageChange,
  keyExtractor,
  className = "",
}: DataTableProps<T>) {
  const getAlignment = (align?: "left" | "center" | "right") => {
    if (align === "right") return "text-right";
    if (align === "center") return "text-center";
    return "text-left";
  };

  return (
    <div className={`w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm text-gray-700">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-600 ${getAlignment(
                    col.align
                  )} ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Spinner size="lg" className="text-blue-600" />
                    <span className="text-sm font-medium">Loading records...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-gray-400"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <svg
                      className="w-10 h-10 text-gray-300 stroke-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                    <span className="text-sm font-medium">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => {
                const rowKey = keyExtractor
                  ? keyExtractor(item, rowIdx)
                  : ((item as Record<string, unknown>)?.id as string) || rowIdx;
                return (
                  <tr
                    key={rowKey}
                    className="hover:bg-gray-50/75 transition-colors"
                  >
                    {columns.map((col) => {
                      const val = (item as Record<string, unknown>)?.[col.key];
                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-3.5 align-middle text-gray-800 ${getAlignment(
                            col.align
                          )} ${col.className || ""}`}
                        >
                          {col.render
                            ? col.render(item, rowIdx)
                            : (val as React.ReactNode) ?? "-"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && onPageChange && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 bg-white px-4 py-3 sm:px-6">
          <div className="text-xs text-gray-500">
            {totalCount !== undefined ? (
              <>
                Showing{" "}
                <span className="font-semibold text-gray-800">
                  {Math.min((currentPage - 1) * (pageSize || 10) + 1, totalCount)}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-gray-800">
                  {Math.min(currentPage * (pageSize || 10), totalCount)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-800">{totalCount}</span>{" "}
                results
              </>
            ) : (
              <>
                Page <span className="font-semibold">{currentPage}</span> of{" "}
                <span className="font-semibold">{totalPages}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => onPageChange(currentPage - 1)}
            >
              Previous
            </Button>
            <div className="px-2 text-xs font-semibold text-gray-600">
              {currentPage} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => onPageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Low-level table primitives
export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className = "",
  children,
  ...props
}) => (
  <div className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white">
    <table className={`w-full text-left border-collapse text-sm ${className}`} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<
  React.HTMLAttributes<HTMLTableSectionElement>
> = ({ className = "", children, ...props }) => (
  <thead className={`border-b border-gray-200 bg-gray-50/80 ${className}`} {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<
  React.HTMLAttributes<HTMLTableSectionElement>
> = ({ className = "", children, ...props }) => (
  <tbody className={`divide-y divide-gray-100 ${className}`} {...props}>
    {children}
  </tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className = "",
  children,
  ...props
}) => (
  <tr className={`hover:bg-gray-50/75 transition-colors ${className}`} {...props}>
    {children}
  </tr>
);

export const TableHead: React.FC<
  React.ThHTMLAttributes<HTMLTableCellElement>
> = ({ className = "", children, ...props }) => (
  <th
    className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-600 ${className}`}
    {...props}
  >
    {children}
  </th>
);

export const TableCell: React.FC<
  React.TdHTMLAttributes<HTMLTableCellElement>
> = ({ className = "", children, ...props }) => (
  <td className={`px-4 py-3.5 align-middle text-gray-800 ${className}`} {...props}>
    {children}
  </td>
);

export default DataTable;
