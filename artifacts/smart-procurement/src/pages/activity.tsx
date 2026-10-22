import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Download, Search, ScrollText } from "lucide-react";
import { useWorkspace, fmtDate } from "@/lib/proc";
import { PageHeader, Panel, LoadingRows, ErrorState, EmptyState, Btn, inputCls } from "@/components/kit";
import { cn } from "@/lib/utils";

export default function Activity() {
  const { data, isLoading, isError, refetch } = useWorkspace();
  const [q, setQ] = useState("");
  const [action, setAction] = useState("all");
  const actions = useMemo(() => Array.from(new Set((data?.activity ?? []).map((a) => a.action))), [data]);
  const rows = useMemo(() => (data?.activity ?? []).filter((a) => (action === "all" || a.action === action) && `${a.action} ${a.detail} ${a.actor}`.toLowerCase().includes(q.toLowerCase())), [data, q, action]);
  if (isLoading) return <LoadingRows />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;
  const refOf = (id: number | null) => data.requests.find((r) => r.id === id)?.reference;
  const exportCsv = () => {
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [["id", "timestamp", "action", "detail", "actor", "request"].join(","), ...rows.map((a) => [a.id, a.createdAt, a.action, a.detail, a.actor, refOf(a.requestId) ?? ""].map((v) => esc(String(v))).join(","))];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const el = document.createElement("a");
    el.href = url; el.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`; el.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div>
      <PageHeader eyebrow="Accountability" title="Audit trail" sub="Every action, in order. Actors are self-reported names; this workspace has no sign-in."
        actions={<Btn variant="outline" onClick={exportCsv} disabled={!rows.length} data-testid="button-export-csv"><Download className="h-4 w-4" />Export CSV ({rows.length})</Btn>} />
      <div className="mb-3 flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className={cn(inputCls, "pl-8")} placeholder="Search detail, actor, action" value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-search-activity" /></div>
        <select className={cn(inputCls, "md:w-56")} value={action} onChange={(e) => setAction(e.target.value)} data-testid="select-activity-action">
          <option value="all">All actions</option>{actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      {rows.length === 0 ? <EmptyState icon={<ScrollText className="h-5 w-5" />} title="No entries" text="Nothing matches this search." /> :
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">{["Time", "Action", "Detail", "Actor", "Request"].map((h) => <th key={h} className="px-4 py-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {rows.map((a) => (
                <tr key={a.id} className="align-top transition hover:bg-secondary/40" data-testid={`row-activity-${a.id}`}>
                  <td className="num whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">{fmtDate(a.createdAt)}</td>
                  <td className="px-4 py-2"><span className="whitespace-nowrap rounded bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">{a.action}</span></td>
                  <td className="px-4 py-2">{a.detail}</td>
                  <td className="px-4 py-2 text-xs">{a.actor}</td>
                  <td className="num px-4 py-2 text-xs">{a.requestId ? <Link href={`/requests/${a.requestId}`} className="text-primary hover:underline">{refOf(a.requestId) ?? `#${a.requestId}`}</Link> : "-"}</td>
                </tr>))}
            </tbody>
          </table>
        </Panel>}
    </div>
  );
}
