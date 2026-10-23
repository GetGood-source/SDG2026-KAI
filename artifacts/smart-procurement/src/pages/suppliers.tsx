import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Building2, Star, MapPin, Mail, Trash2 } from "lucide-react";
import { getGetWorkspaceQueryKey, useDeleteSupplier } from "@workspace/api-client-react";
import type { Supplier as SupplierRecord } from "@workspace/api-client-react";
import { useWorkspace } from "@/lib/proc";
import { PageHeader, Panel, DemoBadge, LoadingRows, ErrorState, EmptyState, Btn, inputCls } from "@/components/kit";
import { SupplierDialog } from "@/components/dialogs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAccount, apiErrorText } from "@/lib/account";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Suppliers() {
  const { isManager } = useAccount();
  const { data, isLoading, isError, refetch } = useWorkspace();
  const deleteSupplier = useDeleteSupplier();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<SupplierRecord | null>(null);
  const [q, setQ] = useState("");
  const rows = useMemo(() => (data?.suppliers ?? []).filter((s) => `${s.name} ${s.category} ${s.location}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.rating - a.rating), [data, q]);
  if (isLoading) return <LoadingRows />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;
  const canDelete = data.demoMode && isManager;
  const submitDelete = () => {
    if (!removing) return;
    deleteSupplier.mutate({ id: removing.id }, {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: getGetWorkspaceQueryKey() });
        setRemoving(null);
        toast({
          title: `${result.name} removed from the directory`,
          description: `${result.historicalQuotesRetained} historical quote(s) remain on their original requests.`,
        });
      },
      onError: (error) => toast({
        title: "Supplier was not removed",
        description: apiErrorText(error),
        variant: "destructive",
      }),
    });
  };
  return (
    <div>
      <PageHeader eyebrow="Directory" title="Suppliers" sub="Ratings and lead times feed the 30% rating and 20% delivery weights in every recommendation."
        actions={<Btn onClick={() => setOpen(true)} data-testid="button-add-supplier"><Plus className="h-4 w-4" />Add supplier</Btn>} />
      <div className="relative mb-3"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className={cn(inputCls, "pl-8")} placeholder="Search name, category, location" value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-search-suppliers" /></div>
      {rows.length === 0 ? <EmptyState icon={<Building2 className="h-5 w-5" />} title="No suppliers" text="Add the parts houses and distributors you already trust." action={<Btn onClick={() => setOpen(true)}>Add supplier</Btn>} /> :
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">{["Supplier", "Category", "Location", "Rating", "Lead time", "Contact", ...(canDelete ? [""] : [])].map((h, i) => <th key={`${h}-${i}`} className="px-4 py-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {rows.map((s) => (
                <tr key={s.id} className="transition hover:bg-secondary/50" data-testid={`row-supplier-${s.id}`}>
                  <td className="px-4 py-2.5"><div className="flex items-center gap-2"><div className="grid h-7 w-7 place-items-center rounded bg-secondary text-[11px] font-bold text-primary">{s.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div><span className="font-semibold">{s.name}</span>{s.isDemo && <DemoBadge />}</div></td>
                  <td className="px-4 text-muted-foreground">{s.category}</td>
                  <td className="px-4 text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{s.location || "-"}</span></td>
                  <td className="px-4"><span className="num inline-flex items-center gap-1"><Star className="h-3 w-3 fill-primary text-primary" />{s.rating.toFixed(1)}</span></td>
                  <td className="num px-4">{s.leadHours}h</td>
                  <td className="px-4">{s.email ? <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><Mail className="h-3 w-3" />{s.email}</a> : <span className="text-xs text-muted-foreground">-</span>}</td>
                  {canDelete && <td className="px-2 text-right">
                    <Btn variant="ghost" className="px-2 py-1 text-rose-700" onClick={() => setRemoving(s)} title={`Remove ${s.name} from the directory`} data-testid={`button-remove-supplier-${s.id}`}>
                      <Trash2 className="h-3.5 w-3.5" /><span className="sr-only">Remove {s.name}</span>
                    </Btn>
                  </td>}
                </tr>))}
            </tbody>
          </table>
        </Panel>}
      <SupplierDialog open={open} onOpenChange={setOpen} />
      <AlertDialog open={!!removing} onOpenChange={(value) => !deleteSupplier.isPending && !value && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.name} from the supplier directory?</AlertDialogTitle>
            <AlertDialogDescription>
              Only this supplier record will be removed. Existing requests, quotations, and audit entries will stay as historical records with their saved supplier details. The supplier will no longer be available for new quotes. This demo-only action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSupplier.isPending} data-testid="button-cancel-remove-supplier">Keep supplier</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => { event.preventDefault(); submitDelete(); }}
              disabled={deleteSupplier.isPending}
              data-testid="button-confirm-remove-supplier"
            >
              {deleteSupplier.isPending ? "Removing..." : "Remove supplier"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
