import { useQueryClient } from "@tanstack/react-query";
import { useGetWorkspace, getGetWorkspaceQueryKey } from "@workspace/api-client-react";
import type { PartRequest } from "@workspace/api-client-react";

export function useWorkspace() {
  return useGetWorkspace({ query: { queryKey: getGetWorkspaceQueryKey(), refetchInterval: 20000 } });
}

export function useInvalidateWorkspace() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: getGetWorkspaceQueryKey() });
}

export function money(n: number, currency = "MYR") {
  try {
    return new Intl.NumberFormat("en-MY", { style: "currency", currency, minimumFractionDigits: 2 }).format(n || 0);
  } catch {
    return `${currency} ${(n || 0).toFixed(2)}`;
  }
}

export function fmtDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function hoursUntil(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 36e5);
}

export function deadlineLabel(iso: string) {
  const h = hoursUntil(iso);
  if (h < 0) return `${Math.abs(h)}h overdue`;
  if (h < 48) return `${h}h left`;
  return `${Math.round(h / 24)}d left`;
}

export const STATUS: Record<string, { label: string; cls: string; step: number }> = {
  new: { label: "New", cls: "bg-slate-100 text-slate-700 ring-slate-200", step: 1 },
  sourcing: { label: "Sourcing", cls: "bg-sky-50 text-sky-700 ring-sky-200", step: 2 },
  awaiting_approval: { label: "Awaiting approval", cls: "bg-amber-50 text-amber-800 ring-amber-200", step: 4 },
  approved: { label: "Approved", cls: "bg-blue-50 text-blue-700 ring-blue-200", step: 5 },
  ordered: { label: "PO recorded", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200", step: 5 },
  delivered: { label: "Delivered", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", step: 6 },
  rejected: { label: "Rejected", cls: "bg-rose-50 text-rose-700 ring-rose-200", step: 6 },
};

export const PRIORITY: Record<string, string> = {
  normal: "text-slate-600 bg-slate-100",
  urgent: "text-amber-800 bg-amber-100",
  critical: "text-white bg-rose-600",
};

export function selectedQuote(r: PartRequest) {
  return r.quotes.find((q) => q.id === r.selectedQuoteId) ?? null;
}
