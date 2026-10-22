import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Plus, Search, FileText, ChevronRight } from "lucide-react";
import { useWorkspace, money, deadlineLabel, hoursUntil, fmtDate, selectedQuote, STATUS } from "@/lib/proc";
import { PageHeader, Panel, StatusPill, PriorityPill, LoadingRows, ErrorState, EmptyState, Btn, inputCls } from "@/components/kit";
import { NewRequestDialog } from "@/components/dialogs";
import { cn } from "@/lib/utils";

export default function Requests() {
  const { data, isLoading, isError, refetch } = useWorkspace();
  const [, nav] = useLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [st, setSt] = useState("all");
  const rows = useMemo(() => (data?.requests ?? []).filter((r) => (st === "all" || r.status === st) && `${r.reference} ${r.partName} ${r.model} ${r.requestedBy}`.toLowerCase().includes(q.toLowerCase())), [data, q, st]);
  if (isLoading) return <LoadingRows />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;
  const cur = data.settings.currency;
  return (
    <div>
      <PageHeader eyebrow="Step 1" title="Part requests" sub="Log what the bay needs. Each request runs through sourcing, decision, approval and outcome."
        actions={<Btn onClick={() => setOpen(true)} data-testid="button-new-request"><Plus className="h-4 w-4" />New request</Btn>} />
      <div className="mb-3 flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className={cn(inputCls, "pl-8")} placeholder="Search reference, part, model, requester" value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-search-requests" /></div>
        <div className="flex flex-wrap gap-1">
          {["all", ...Object.keys(STATUS)].map((s) => (
            <button key={s} onClick={() => setSt(s)} data-testid={`filter-${s}`} className={cn("rounded-md px-2.5 py-1 text-xs font-semibold transition", st === s ? "bg-primary text-white" : "bg-card text-muted-foreground ring-1 ring-border hover:text-foreground")}>
              {s === "all" ? "All" : STATUS[s].label}
            </button>))}
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<FileText className="h-5 w-5" />} title={data.requests.length ? "No matches" : "No requests yet"} text={data.requests.length ? "Adjust the search or status filter." : "Log the first part the workshop needs."}
          action={!data.requests.length && <Btn onClick={() => setOpen(true)}>New request</Btn>} />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              {["Ref", "Part", "Qty", "Needed by", "Quotes", "Selected", "Status", ""].map((h) => <th key={h} className="px-4 py-2 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const sq = selectedQuote(r);
                const h = hoursUntil(r.neededBy);
                return (
                  <tr key={r.id} onClick={() => nav(`/requests/${r.id}`)} className="group cursor-pointer transition hover:bg-secondary/60" data-testid={`row-request-${r.id}`}>
                    <td className="num px-4 py-2.5 text-xs text-muted-foreground">{r.reference}</td>
                    <td className="px-4 py-2.5"><div className="flex items-center gap-2 font-semibold">{r.partName}<PriorityPill priority={r.priority} /></div><div className="text-xs text-muted-foreground">{r.model} / {r.requestedBy}</div></td>
                    <td className="num px-4 py-2.5">{r.quantity}</td>
                    <td className="px-4 py-2.5"><div className="num text-xs">{fmtDate(r.neededBy)}</div><div className={cn("num text-[11px]", h < 0 ? "text-rose-600" : h < 24 ? "text-amber-700" : "text-muted-foreground")}>{deadlineLabel(r.neededBy)}</div></td>
                    <td className="num px-4 py-2.5">{r.quotes.length}</td>
                    <td className="num px-4 py-2.5 text-xs">{sq ? money(sq.total, cur) : <span className="text-muted-foreground">-</span>}</td>
                    <td className="px-4 py-2.5"><StatusPill status={r.status} /></td>
                    <td className="px-2"><ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" /></td>
                  </tr>);
              })}
            </tbody>
          </table>
        </Panel>
      )}
      <NewRequestDialog open={open} onOpenChange={setOpen} onCreated={(id) => nav(`/requests/${id}`)} />
    </div>
  );
}
