import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, Plus, AlertTriangle, Clock } from "lucide-react";
import { useWorkspace, money, deadlineLabel, hoursUntil, fmtDate } from "@/lib/proc";
import { PageHeader, Panel, StatusPill, PriorityPill, LoadingRows, ErrorState, Btn } from "@/components/kit";
import { NewRequestDialog } from "@/components/dialogs";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data, isLoading, isError, refetch } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [, nav] = useLocation();
  if (isLoading) return <LoadingRows rows={8} />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;
  const cur = data.settings.currency;
  const s = data.summary;
  const active = data.requests.filter((r) => !["delivered", "rejected"].includes(r.status)).sort((a, b) => +new Date(a.neededBy) - +new Date(b.neededBy));
  const low = data.inventory.filter((i) => i.quantity <= i.minimum);
  const kpis = [
    { k: "Active requests", v: s.activeRequests, href: "/requests" },
    { k: "Awaiting approval", v: s.pendingApprovals, href: "/approvals", hot: s.pendingApprovals > 0 },
    { k: "POs in transit", v: s.inTransit, href: "/orders" },
    { k: "Delivered", v: s.delivered, href: "/orders" },
    { k: "Low stock lines", v: s.lowStock, href: "/inventory", hot: s.lowStock > 0 },
  ];
  return (
    <div>
      <PageHeader eyebrow={`${data.settings.industry} / ${cur}`} title={data.settings.companyName}
        sub="Every urgent part, its cost, its deadline and who signed off. One page."
        actions={<Btn onClick={() => setOpen(true)} data-testid="button-new-request"><Plus className="h-4 w-4" />New request</Btn>} />
      <div className="mb-5 grid gap-px overflow-hidden rounded-xl border border-card-border bg-border md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr] rise">
        <div className="bg-primary p-4 text-white">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Committed spend</div>
          <div className="num mt-1 text-2xl font-semibold" data-testid="text-total-spend">{money(s.totalSpend, cur)}</div>
          <div className="mt-1 text-[11px] text-white/80">Saved vs. highest quote <span className="num font-semibold">{money(s.savings, cur)}</span></div>
        </div>
        {kpis.map((k) => (
          <Link key={k.k} href={k.href} className="group bg-card p-4 transition hover:bg-secondary" data-testid={`link-kpi-${k.k.toLowerCase().replace(/\s/g, "-")}`}>
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k.k}<ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" /></div>
            <div className={cn("num mt-1 text-2xl font-semibold", k.hot && "text-primary")}>{k.v}</div>
          </Link>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Panel title="Deadline board" right={<Link href="/requests" className="text-xs font-semibold text-primary">All requests</Link>}>
          {active.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No open requests. The workshop is fully supplied.</div> :
            <ul className="divide-y divide-border">
              {active.slice(0, 8).map((r, i) => {
                const h = hoursUntil(r.neededBy);
                return (
                  <li key={r.id} style={{ animationDelay: `${i * 40}ms` }} className="rise">
                    <button onClick={() => nav(`/requests/${r.id}`)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 text-left transition hover:bg-secondary/60 md:grid-cols-[90px_1fr_140px_100px]" data-testid={`row-deadline-${r.id}`}>
                      <span className="num hidden text-xs text-muted-foreground md:block">{r.reference}</span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{r.partName}</span><PriorityPill priority={r.priority} /></span>
                        <span className="block truncate text-xs text-muted-foreground">{r.model} / qty {r.quantity}</span>
                      </span>
                      <span className="hidden md:block"><StatusPill status={r.status} /></span>
                      <span className={cn("num flex items-center justify-end gap-1 text-xs font-medium", h < 0 ? "text-rose-600" : h < 24 ? "text-amber-700" : "text-muted-foreground")}><Clock className="h-3 w-3" />{deadlineLabel(r.neededBy)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>}
        </Panel>
        <div className="space-y-5">
          <Panel title="Stock below minimum" right={<Link href="/inventory" className="text-xs font-semibold text-primary">Inventory</Link>}>
            {low.length === 0 ? <div className="p-4 text-sm text-muted-foreground">All lines above reorder point.</div> :
              <ul className="divide-y divide-border">{low.slice(0, 5).map((i) => (
                <li key={i.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="min-w-0"><span className="block truncate font-medium">{i.partName}</span><span className="block truncate text-xs text-muted-foreground">{i.model}</span></span>
                  <span className="num flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="h-3 w-3" />{i.quantity}/{i.minimum}</span>
                </li>))}</ul>}
          </Panel>
          <Panel title="Latest activity" right={<Link href="/activity" className="text-xs font-semibold text-primary">Audit trail</Link>}>
            <ul className="space-y-0 p-2">{data.activity.slice(0, 6).map((a) => (
              <li key={a.id} className="border-l-2 border-primary/20 py-1.5 pl-3 text-xs">
                <div className="font-semibold">{a.action}</div>
                <div className="line-clamp-1 text-muted-foreground">{a.detail}</div>
                <div className="num text-[10px] text-muted-foreground/80">{fmtDate(a.createdAt)} / {a.actor}</div>
              </li>))}</ul>
          </Panel>
          <p className="rounded-lg border border-dashed border-primary/30 bg-secondary/50 p-3 text-[11px] text-secondary-foreground">{data.integrationNote}</p>
        </div>
      </div>
      <NewRequestDialog open={open} onOpenChange={setOpen} onCreated={(id) => nav(`/requests/${id}`)} />
    </div>
  );
}
