import { useMemo, useState } from "react";
import { Plus, Search, Building2, Star, MapPin, Mail } from "lucide-react";
import { useWorkspace } from "@/lib/proc";
import { PageHeader, Panel, DemoBadge, LoadingRows, ErrorState, EmptyState, Btn, inputCls } from "@/components/kit";
import { SupplierDialog } from "@/components/dialogs";
import { cn } from "@/lib/utils";

export default function Suppliers() {
  const { data, isLoading, isError, refetch } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rows = useMemo(() => (data?.suppliers ?? []).filter((s) => `${s.name} ${s.category} ${s.location}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.rating - a.rating), [data, q]);
  if (isLoading) return <LoadingRows />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;
  return (
    <div>
      <PageHeader eyebrow="Directory" title="Suppliers" sub="Ratings and lead times feed the 30% rating and 20% delivery weights in every recommendation."
        actions={<Btn onClick={() => setOpen(true)} data-testid="button-add-supplier"><Plus className="h-4 w-4" />Add supplier</Btn>} />
      <div className="relative mb-3"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className={cn(inputCls, "pl-8")} placeholder="Search name, category, location" value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-search-suppliers" /></div>
      {rows.length === 0 ? <EmptyState icon={<Building2 className="h-5 w-5" />} title="No suppliers" text="Add the parts houses and distributors you already trust." action={<Btn onClick={() => setOpen(true)}>Add supplier</Btn>} /> :
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">{["Supplier", "Category", "Location", "Rating", "Lead time", "Contact"].map((h) => <th key={h} className="px-4 py-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {rows.map((s) => (
                <tr key={s.id} className="transition hover:bg-secondary/50" data-testid={`row-supplier-${s.id}`}>
                  <td className="px-4 py-2.5"><div className="flex items-center gap-2"><div className="grid h-7 w-7 place-items-center rounded bg-secondary text-[11px] font-bold text-primary">{s.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div><span className="font-semibold">{s.name}</span>{s.isDemo && <DemoBadge />}</div></td>
                  <td className="px-4 text-muted-foreground">{s.category}</td>
                  <td className="px-4 text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{s.location || "-"}</span></td>
                  <td className="px-4"><span className="num inline-flex items-center gap-1"><Star className="h-3 w-3 fill-primary text-primary" />{s.rating.toFixed(1)}</span></td>
                  <td className="num px-4">{s.leadHours}h</td>
                  <td className="px-4">{s.email ? <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><Mail className="h-3 w-3" />{s.email}</a> : <span className="text-xs text-muted-foreground">-</span>}</td>
                </tr>))}
            </tbody>
          </table>
        </Panel>}
      <SupplierDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
