import { Link } from "wouter";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { useWorkspace, money, deadlineLabel, selectedQuote } from "@/lib/proc";
import { PageHeader, Panel, PriorityPill, DemoBadge, LoadingRows, ErrorState, EmptyState } from "@/components/kit";

export default function Approvals() {
  const { data, isLoading, isError, refetch } = useWorkspace();
  if (isLoading) return <LoadingRows />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;
  const cur = data.settings.currency;
  const pending = data.requests.filter((r) => r.status === "awaiting_approval");
  const total = pending.reduce((s, r) => s + (selectedQuote(r)?.total ?? 0) * r.quantity, 0);
  return (
    <div>
      <PageHeader eyebrow="Step 4" title="Pending decisions" sub="Nothing can be bought until a person approves it with a note. No roles are verified in this shared workspace; the note is the accountability record." />
      {pending.length === 0 ? <EmptyState icon={<ShieldCheck className="h-5 w-5" />} title="Queue clear" text="No purchases waiting for sign-off." /> : (
        <>
          <div className="mb-3 text-sm text-muted-foreground"><span className="num font-semibold text-foreground">{pending.length}</span> waiting, <span className="num font-semibold text-foreground">{money(total, cur)}</span> combined</div>
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((r, i) => {
              const q = selectedQuote(r);
              return (
                <Link key={r.id} href={`/requests/${r.id}#step-4`} className="rise group" style={{ animationDelay: `${i * 50}ms` }} data-testid={`card-approval-${r.id}`}>
                  <Panel className="h-full p-4 transition group-hover:-translate-y-0.5 group-hover:border-primary/50">
                    <div className="flex items-start justify-between gap-2">
                      <div><div className="num text-[11px] text-primary">{r.reference}</div><div className="font-bold">{r.partName}</div><div className="text-xs text-muted-foreground">{r.model} / qty {r.quantity}</div></div>
                      <PriorityPill priority={r.priority} />
                    </div>
                    <div className="mt-3 flex items-end justify-between border-t pt-3">
                      <div className="text-xs"><div className="flex items-center gap-1 font-semibold">{q?.supplierName ?? "No quote"}{q?.isDemo && <DemoBadge />}</div><div className="text-muted-foreground">{q ? `${q.leadHours}h lead / ${q.onTime ? "on time" : "late"}` : ""} / {deadlineLabel(r.neededBy)}</div></div>
                      <div className="num text-lg font-semibold text-primary">{q ? money(q.total * r.quantity, cur) : "-"}</div>
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1 text-xs font-semibold text-primary">Review and decide <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" /></div>
                  </Panel>
                </Link>);
            })}
          </div>
        </>)}
    </div>
  );
}
