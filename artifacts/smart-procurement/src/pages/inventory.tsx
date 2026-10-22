import { useMemo, useState } from "react";
import { Plus, Search, Boxes, Pencil } from "lucide-react";
import type { InventoryItem } from "@workspace/api-client-react";
import { useWorkspace } from "@/lib/proc";
import { PageHeader, Panel, LoadingRows, ErrorState, EmptyState, Btn, inputCls } from "@/components/kit";
import { InventoryDialog } from "@/components/dialogs";
import { cn } from "@/lib/utils";

export default function Inventory() {
  const { data, isLoading, isError, refetch } = useWorkspace();
  const [edit, setEdit] = useState<InventoryItem | null | undefined>(undefined);
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const rows = useMemo(() => (data?.inventory ?? []).filter((i) => (!lowOnly || i.quantity <= i.minimum) && `${i.partName} ${i.model} ${i.location}`.toLowerCase().includes(q.toLowerCase())), [data, q, lowOnly]);
  if (isLoading) return <LoadingRows />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;
  return (
    <div>
      <PageHeader eyebrow="Stock" title="Inventory" sub="Checked first when sourcing. Deliveries add to these counts automatically."
        actions={<Btn onClick={() => setEdit(null)} data-testid="button-add-inventory"><Plus className="h-4 w-4" />Add item</Btn>} />
      <div className="mb-3 flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className={cn(inputCls, "pl-8")} placeholder="Search part, model, bin" value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-search-inventory" /></div>
        <button onClick={() => setLowOnly(!lowOnly)} className={cn("rounded-md px-3 py-1.5 text-xs font-semibold ring-1 transition", lowOnly ? "bg-primary text-white ring-primary" : "bg-card ring-border")} data-testid="toggle-low-stock">Below minimum only</button>
      </div>
      {rows.length === 0 ? <EmptyState icon={<Boxes className="h-5 w-5" />} title="Nothing here" text={lowOnly ? "No lines below their reorder point." : "Add the parts you keep on the shelf."} /> :
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead><tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">{["Part", "Model", "Bin", "Level", "On hand", ""].map((h) => <th key={h} className="px-4 py-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {rows.map((i) => {
                const low = i.quantity <= i.minimum;
                const pct = Math.min(100, (i.quantity / Math.max(1, i.minimum * 2)) * 100);
                return (
                  <tr key={i.id} className="group transition hover:bg-secondary/50" data-testid={`row-inventory-${i.id}`}>
                    <td className="px-4 py-2.5 font-semibold">{i.partName}</td>
                    <td className="px-4 text-muted-foreground">{i.model}</td>
                    <td className="num px-4 text-xs">{i.location || "-"}</td>
                    <td className="px-4"><div className="h-1.5 w-28 overflow-hidden rounded bg-muted"><div className={cn("h-full transition-all", low ? "bg-amber-500" : "bg-primary")} style={{ width: `${pct}%` }} /></div></td>
                    <td className="num px-4"><span className={cn("font-semibold", low && "text-amber-700")}>{i.quantity}</span><span className="text-muted-foreground"> / min {i.minimum}</span></td>
                    <td className="px-4 text-right"><Btn variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEdit(i)} data-testid={`button-edit-inventory-${i.id}`}><Pencil className="h-3 w-3" />Edit</Btn></td>
                  </tr>);
              })}
            </tbody>
          </table>
        </Panel>}
      {edit !== undefined && <InventoryDialog key={edit?.id ?? "new"} open onOpenChange={(o) => !o && setEdit(undefined)} item={edit} />}
    </div>
  );
}
