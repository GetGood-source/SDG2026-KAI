import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Download, Search, ScrollText, Trash2 } from "lucide-react";
import { getGetWorkspaceQueryKey, useClearDemoHistory } from "@workspace/api-client-react";
import { useWorkspace, fmtDate } from "@/lib/proc";
import { PageHeader, Panel, LoadingRows, ErrorState, EmptyState, Btn, inputCls } from "@/components/kit";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAccount, apiErrorText } from "@/lib/account";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const visibleAuditActions = ["Request created", "Purchase approved"] as const;

function AuditDetail({ detail }: { detail: string }) {
  const sources: string[] = [];
  const text = detail
    .replace(/https?:\/\/[^\s<>"']+/gi, (raw) => {
      const url = raw.replace(/[),.;!?}\]]+$/, "");
      const punctuation = raw.slice(url.length);
      if (url) sources.push(url);
      return punctuation;
    })
    .replace(/\bsource(?:\s+url)?\s*:\s*(?=[.,;]|$)/gi, "")
    .replace(/\s+([,.;])/g, "$1")
    .replace(/([,.;])(?:\s*[.,;])+/g, "$1")
    .replace(/^[,.;]\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const uniqueSources = Array.from(new Set(sources));

  return (
    <div className="min-w-0 break-words">
      <p>{text || (uniqueSources.length ? "Supplier source links" : detail)}</p>
      {uniqueSources.length > 0 && (
        <details className="mt-1.5">
          <summary className="w-fit cursor-pointer text-xs font-medium text-primary hover:underline">
            View {uniqueSources.length} source {uniqueSources.length === 1 ? "link" : "links"}
          </summary>
          <ul className="mt-1 space-y-1">
            {uniqueSources.map((url, index) => {
              let label = `Source ${index + 1}`;
              try {
                label = new URL(url).hostname.replace(/^www\./, "");
              } catch {
                // Keep the concise fallback label for any malformed URL.
              }
              return (
                <li key={`${url}-${index}`}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    title={url}
                    className="inline-block max-w-full truncate text-xs text-primary hover:underline"
                  >
                    {label} <span className="text-muted-foreground">↗</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function Activity() {
  const { isManager } = useAccount();
  const { data, isLoading, isError, refetch } = useWorkspace();
  const clearHistory = useClearDemoHistory();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [action, setAction] = useState("all");
  const [confirmClear, setConfirmClear] = useState(false);
  const rows = useMemo(() => (data?.activity ?? []).filter((a) =>
    visibleAuditActions.includes(a.action as typeof visibleAuditActions[number]) &&
    (action === "all" || a.action === action) &&
    `${a.action} ${a.detail} ${a.actor}`.toLowerCase().includes(q.toLowerCase())
  ), [data, q, action]);
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
  const submitClear = () => {
    clearHistory.mutate(undefined, {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: getGetWorkspaceQueryKey() });
        setConfirmClear(false);
        setQ("");
        setAction("all");
        toast({
          title: "Demo history cleared",
          description: `${result.requestsRemoved} requests and ${result.activityEntriesRemoved} audit entries removed. Suppliers, inventory and settings were kept.`,
        });
      },
      onError: (error) => toast({
        title: "History was not cleared",
        description: apiErrorText(error),
        variant: "destructive",
      }),
    });
  };
  return (
    <div>
      <PageHeader eyebrow="Accountability" title="Audit trail" sub="Request creation and purchase approvals, in order."
        actions={<>
          <Btn variant="outline" onClick={exportCsv} disabled={!rows.length} data-testid="button-export-csv"><Download className="h-4 w-4" />Export CSV ({rows.length})</Btn>
          {data.demoMode && isManager && (
            <Btn variant="danger" onClick={() => setConfirmClear(true)} disabled={!data.requests.length && !data.activity.length} data-testid="button-clear-demo-history">
              <Trash2 className="h-4 w-4" />Clear history
            </Btn>
          )}
        </>} />
      <div className="mb-3 flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className={cn(inputCls, "pl-8")} placeholder="Search detail, actor, action" value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-search-activity" /></div>
        <select className={cn(inputCls, "md:w-56")} value={action} onChange={(e) => setAction(e.target.value)} data-testid="select-activity-action">
          <option value="all">All shown actions</option>{visibleAuditActions.map((a) => <option key={a} value={a}>{a}</option>)}
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
                  <td className="max-w-[34rem] px-4 py-2"><AuditDetail detail={a.detail} /></td>
                  <td className="px-4 py-2 text-xs">{a.actor}</td>
                  <td className="num px-4 py-2 text-xs">{a.requestId ? <Link href={`/requests/${a.requestId}`} className="text-primary hover:underline">{refOf(a.requestId) ?? `#${a.requestId}`}</Link> : "-"}</td>
                </tr>))}
            </tbody>
          </table>
        </Panel>}
      <AlertDialog open={confirmClear} onOpenChange={(open) => !clearHistory.isPending && setConfirmClear(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all demo request and audit history?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes every part request and its quotations, approvals, purchase-order records, plus all audit-trail entries. The clear action itself will not be added to the audit trail. Supplier records, inventory, settings, team access and live-search usage are kept. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearHistory.isPending} data-testid="button-cancel-clear-history">Keep history</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => { event.preventDefault(); submitClear(); }}
              disabled={clearHistory.isPending}
              data-testid="button-confirm-clear-history"
            >
              {clearHistory.isPending ? "Deleting..." : "Delete history"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
