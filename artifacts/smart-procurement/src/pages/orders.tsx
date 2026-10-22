import { useLocation } from "wouter";
import { Truck } from "lucide-react";
import { useWorkspace, money, fmtDate, deadlineLabel, selectedQuote } from "@/lib/proc";
import { PageHeader, Panel, StatusPill, DemoBadge, LoadingRows, ErrorState, EmptyState } from "@/components/kit";

export default function Orders() {
  const { data, isLoading, isError, refetch } = useWorkspace();
  const [, nav] = useLocation();
  if (isLoading) return <LoadingRows />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;
  const cur = data.settings.currency;
  const rows = data.requests.filter((r) => ["approved", "ordered", "delivered"].includes(r.status));
  const groups = [["approved", "Approved, PO not yet recorded"], ["ordered", "PO recorded, awaiting delivery"], ["delivered", "Delivered"]];
  return (
    <div>
      <PageHeader eyebrow="Step 5" title="Purchase tracking" sub="Purchase orders recorded here are internal records. Placing the order with the supplier is done by you, outside this system." />
      {rows.length === 0 ? <EmptyState icon={<Truck className="h-5 w-5" />} title="No purchases yet" text="Approved requests appear here." /> :
        <div className="space-y-5">
          {groups.map(([st, label]) => {
            const g = rows.filter((r) => r.status === st);
            if (!g.length) return null;
            return (
              <Panel key={st} title={<span>{label} <span className="num ml-1 text-muted-foreground">{g.length}</span></span>} className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm"><tbody className="divide-y">
                  {g.map((r) => {
                    const q = selectedQuote(r);
                    return (
                      <tr key={r.id} onClick={() => nav(`/requests/${r.id}`)} className="cursor-pointer transition hover:bg-secondary/50" data-testid={`row-order-${r.id}`}>
                        <td className="num w-28 px-4 py-2.5 text-xs">{r.orderReference ?? <span className="text-muted-foreground">no PO</span>}</td>
                        <td className="px-4"><div className="font-semibold">{r.partName}</div><div className="text-xs text-muted-foreground">{r.reference} / {r.model}</div></td>
                        <td className="px-4 text-xs"><span className="inline-flex items-center gap-1">{q?.supplierName ?? "-"}{q?.isDemo && <DemoBadge />}</span></td>
                        <td className="num px-4 text-xs">{fmtDate(r.neededBy)}<div className="text-muted-foreground">{st !== "delivered" && deadlineLabel(r.neededBy)}</div></td>
                        <td className="num px-4 text-right font-semibold">{q ? money(q.total * r.quantity, cur) : "-"}</td>
                        <td className="px-4"><StatusPill status={r.status} /></td>
                      </tr>);
                  })}
                </tbody></table>
              </Panel>);
          })}
        </div>}
    </div>
  );
}
