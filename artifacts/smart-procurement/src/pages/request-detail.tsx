import { useState, type ReactNode } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Search, ExternalLink, Plus, Sparkles, Check, X, PackageCheck, FileSignature, Mail, Boxes, Star, Lock } from "lucide-react";
import { useRequestAction } from "@workspace/api-client-react";
import type { ActionInput, Supplier } from "@workspace/api-client-react";
import { useWorkspace, useInvalidateWorkspace, money, fmtDate, deadlineLabel, hoursUntil, selectedQuote, STATUS } from "@/lib/proc";
import { Panel, StatusPill, PriorityPill, DemoBadge, LoadingRows, ErrorState, Btn, inputCls } from "@/components/kit";
import { QuoteDialog, SupplierDialog } from "@/components/dialogs";
import { DiscoveryPanel, apiErr } from "@/components/discovery";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAccount } from "@/lib/account";

const STEPS = ["Request", "Connected data", "Decision", "Approval", "Outcome"];

function Step({ n, title, state, children }: { n: number; title: string; state: "done" | "current" | "locked"; children: ReactNode }) {
  return (
    <div className="relative min-w-0 pl-8 sm:pl-11" id={`step-${n}`}>
      <div className={cn("num absolute left-0 top-3 grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ring-4 ring-background",
        state === "done" ? "bg-primary text-white" : state === "current" ? "bg-white text-primary ring-2 ring-primary" : "bg-muted text-muted-foreground")}>
        {state === "done" ? <Check className="h-3.5 w-3.5" /> : n}
      </div>
      <Panel title={<span className="flex items-center gap-2">{title}{state === "locked" && <Lock className="h-3 w-3 text-muted-foreground" />}</span>} className={cn("transition", state === "locked" && "opacity-70")}>
        <div className="p-4">{children}</div>
      </Panel>
    </div>
  );
}

export default function RequestDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data, isLoading, isError, refetch } = useWorkspace();
  const { isManager } = useAccount();
  const act = useRequestAction();
  const inv = useInvalidateWorkspace();
  const { toast } = useToast();
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [supOpen, setSupOpen] = useState(false);
  const [preset, setPreset] = useState<number | undefined>();
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  if (isLoading) return <LoadingRows rows={10} />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;
  const r = data.requests.find((x) => x.id === id);
  if (!r) return <div className="p-10 text-center"><div className="font-bold">Request not found</div><Link href="/requests" className="text-sm text-primary">Back to requests</Link></div>;

  const cur = data.settings.currency;
  const sq = selectedQuote(r);
  const supplierOf = (sid: number): Supplier | undefined => data.suppliers.find((s) => s.id === sid);
  const stage = STATUS[r.status]?.step ?? 1;
  const hasRec = !!r.recommendation;
  const sorted = [...r.quotes].sort((a, b) => Number(b.available) - Number(a.available) || b.score - a.score);
  const best = sorted.find((q) => q.available);
  const bestLead = best && r.discovery?.candidates.find(candidate => best.sourceUrl === (candidate.priceSourceUrl || candidate.sourceUrl));
  const bestNeedsLeadPreference = !!bestLead && r.discovery?.preferredCandidateId !== bestLead.id;
  const decided = ["awaiting_approval", "approved", "ordered", "delivered"].includes(r.status) || (r.status === "rejected" && !!sq);
  const approved = ["approved", "ordered", "delivered"].includes(r.status);

  const run = (input: ActionInput, ok: string, after?: (res: typeof r) => void) => {
    setPending(input.action + (input.quoteId ?? input.candidateId ?? ""));
    act.mutate({ id: r.id, data: input }, {
      onSuccess: (res) => { inv(); toast({ title: ok }); after?.(res); },
      onError: (e) => toast({ title: "Action failed", description: apiErr(e), variant: "destructive" }),
      onSettled: () => setPending(null),
    });
  };
  const busy = (k: string) => pending === k;

  const stepState = (n: number): "done" | "current" | "locked" => {
    if (r.status === "delivered") return "done";
    if (r.status === "rejected") return n <= 4 ? "done" : "locked";
    const cur = r.status === "new" ? 2 : r.status === "sourcing" ? (r.quotes.length && r.selectedQuoteId ? 3 : 2) : stage;
    return n < cur ? "done" : n === cur ? "current" : "locked";
  };

  const supp = sq ? supplierOf(sq.supplierId) : undefined;
  const draftText = `Hello ${sq?.supplierName ?? "team"},\n\nFollowing up on ${r.reference}: ${r.quantity} x ${r.partName} for ${r.model}.${r.orderReference ? ` Our purchase order reference is ${r.orderReference}.` : ""} We need it by ${fmtDate(r.neededBy)}. Could you confirm availability and dispatch time?\n\nThank you,\n${data.settings.companyName}`;
  const mailto = `mailto:${supp?.email ?? ""}?subject=${encodeURIComponent(`${r.reference} ${r.partName}`)}&body=${encodeURIComponent(draft ?? draftText)}`;

  return (
    <div>
      <Link href="/requests" className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary" data-testid="link-back"><ArrowLeft className="h-3.5 w-3.5" />Requests</Link>
      <div className="mb-6 flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between rise">
        <div>
          <div className="flex items-center gap-2"><span className="num text-xs text-primary">{r.reference}</span><StatusPill status={r.status} /><PriorityPill priority={r.priority} /></div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-[28px]" data-testid="text-part-name">{r.partName}</h1>
          <div className="text-sm text-muted-foreground">{r.model} / qty {r.quantity} / requested by {r.requestedBy}</div>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-y-2">
          {STEPS.map((s, i) => {
            const st = stepState(i + 1);
            return (
              <a key={s} href={`#step-${i + 1}`} className="flex items-center">
                <span className={cn("rounded px-2 py-1 text-[11px] font-semibold", st === "done" ? "text-primary" : st === "current" ? "bg-primary text-white" : "text-muted-foreground")}>{s}</span>
                {i < 4 && <span className={cn("h-px w-3", st === "done" ? "bg-primary" : "bg-border")} />}
              </a>);
          })}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="relative min-w-0 space-y-4 before:absolute before:bottom-4 before:left-[13px] before:top-4 before:w-px before:bg-border">
          <Step n={1} title="Request" state="done">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
              {[["Needed by", fmtDate(r.neededBy)], ["Time left", deadlineLabel(r.neededBy)], ["Logged", fmtDate(r.createdAt)], ["Requester", r.requestedBy]].map(([k, v]) => (
                <div key={k}><dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt><dd className={cn("num font-medium", k === "Time left" && hoursUntil(r.neededBy) < 24 && "text-amber-700")}>{v}</dd></div>))}
            </dl>
            <p className="mt-3 rounded-md bg-muted/60 p-3 text-sm">{r.description}</p>
          </Step>

          <Step n={2} title="Connected data: stock and supplier quotes" state={stepState(2)}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Btn onClick={() => run({ action: "source" }, "Stock and recorded quotes checked")} disabled={busy("source") || ["ordered", "delivered", "rejected"].includes(r.status)} data-testid="button-source">
                <Search className="h-4 w-4" />{busy("source") ? "Checking, may search live..." : "Check stock and quotes"}
              </Btn>
              <Btn variant="outline" onClick={() => { setPreset(undefined); setQuoteOpen(true); }} disabled={!data.suppliers.length} data-testid="button-add-quote"><Plus className="h-4 w-4" />Manual verified quote</Btn>
              <Btn variant="outline" onClick={() => setSupOpen(true)} data-testid="button-add-supplier"><Plus className="h-4 w-4" />External supplier</Btn>
              <a href={r.searchUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline" data-testid="link-google-search">Google search <ExternalLink className="h-3 w-3" /></a>
            </div>
            <div className={cn("mb-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm", r.inventoryAvailable >= r.quantity ? "bg-emerald-50 text-emerald-800" : "bg-secondary text-secondary-foreground")}>
              <Boxes className="h-4 w-4" />In-house stock matching this part: <span className="num font-semibold" data-testid="text-inventory-available">{r.inventoryAvailable}</span> of {r.quantity} needed
            </div>
            {r.quotes.length === 0 ? (
              <div className="grid-bg rounded-lg border border-dashed border-primary/40 p-5 text-center">
                <div className="font-bold">No recorded quotes for this part.</div>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Search the open web, call the supplier, then record what they confirmed. Nothing is purchased or emailed from here.</p>
                <a href={r.searchUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px" data-testid="button-google-search-primary">
                  <Search className="h-4 w-4" />Search Google for "{r.partName} {r.model}"<ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead><tr className="border-b text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    {["Supplier", "Price", "Ship", "Total", "Lead", "Rating", "Score", ""].map((h) => <th key={h} className="px-2 py-1.5 font-semibold">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {sorted.map((q) => {
                      const lead = r.discovery?.candidates.find(candidate => q.sourceUrl === (candidate.priceSourceUrl || candidate.sourceUrl));
                      const needsLeadPreference = !!lead && r.discovery?.preferredCandidateId !== lead.id;
                      return (
                      <tr key={q.id} className={cn("transition", !q.available && "text-muted-foreground line-through decoration-muted-foreground/40", q.id === r.selectedQuoteId && "bg-secondary")} data-testid={`row-quote-${q.id}`}>
                        <td className="px-2 py-2 no-underline">
                          <div className="flex items-center gap-1.5 font-semibold">{q.supplierName}{q.isDemo && <DemoBadge />}{q.id === best?.id && <span className="rounded bg-primary px-1.5 text-[10px] font-bold uppercase text-white">Top score</span>}</div>
                          <div className="text-[11px]">{q.available ? (q.onTime ? <span className="text-emerald-700">Arrives before deadline</span> : <span className="text-amber-700">Misses deadline</span>) : "Unavailable, excluded"}{q.sourceUrl && <> / <a href={q.sourceUrl} target="_blank" rel="noreferrer" className="text-primary">source</a></>}</div>
                        </td>
                        <td className="num px-2">{money(q.price, cur)}</td>
                        <td className="num px-2">{money(q.shipping, cur)}</td>
                        <td className="num px-2 font-semibold">{money(q.total, cur)}</td>
                        <td className="num px-2">{q.leadHours}h</td>
                        <td className="num px-2"><span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3 fill-current text-primary" />{q.rating.toFixed(1)}</span></td>
                        <td className="px-2"><div className="flex items-center gap-1.5"><div className="h-1.5 w-12 overflow-hidden rounded bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, q.score)}%` }} /></div><span className="num text-xs">{q.score.toFixed(1)}</span></div></td>
                        <td className="px-2 text-right">
                          {q.id === r.selectedQuoteId ? <span className="text-xs font-bold text-primary">Selected</span> :
                            <Btn variant="outline" className="px-2 py-1 text-xs" disabled={!q.available || needsLeadPreference || approved || r.status === "rejected" || busy("select" + q.id)} onClick={() => run({ action: "select", quoteId: q.id }, `${q.supplierName} selected, sent for approval`)} data-testid={`button-select-${q.id}`}>{needsLeadPreference ? "Prefer lead first" : "Select"}</Btn>}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <DiscoveryPanel r={r} searchUrl={r.searchUrl} busy={busy} run={(action, ok, candidateId) => run(candidateId ? { action, candidateId } : { action }, ok)} />
          </Step>

          <Step n={3} title="Decision: transparent scoring" state={stepState(3)}>
            <div className="mb-3 grid gap-2 sm:grid-cols-4">
              {[["Price", 50], ["Supplier rating", 30], ["Delivery speed", 20]].map(([k, w]) => (
                <div key={k} className="rounded-md border p-2"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div><div className="num text-lg font-semibold text-primary">{w}%</div><div className="mt-1 h-1 rounded bg-muted"><div className="h-full rounded bg-primary" style={{ width: `${w}%` }} /></div></div>))}
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2"><div className="text-[10px] uppercase tracking-wider text-amber-800">Deadline</div><div className="num text-sm font-semibold">{fmtDate(r.neededBy)}</div><div className="text-[10px] text-amber-800">Unavailable quotes excluded</div></div>
            </div>
            {hasRec ? (
              <div className="rounded-md border-l-4 border-primary bg-secondary/60 p-3 text-sm" data-testid="text-recommendation">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary"><Sparkles className="h-3 w-3" />Explanation ({r.recommendationMode})</div>
                <p className="whitespace-pre-line">{r.recommendation}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">Applies to recorded quotes only; online leads are ranked separately above. Ranking is computed by the fixed formula above. The text only explains it; a person still makes the selection.</p>
              </div>
            ) : <p className="text-sm text-muted-foreground">Generate an explanation of the ranking once at least one available quote is recorded.</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn variant={hasRec ? "outline" : "primary"} onClick={() => run({ action: "recommend" }, "Recommendation generated")} disabled={!r.quotes.some((q) => q.available) || busy("recommend") || approved} data-testid="button-recommend">
                <Sparkles className="h-4 w-4" />{busy("recommend") ? "Scoring..." : hasRec ? "Re-explain" : "Explain ranking"}
              </Btn>
              {best && !decided && <Btn onClick={() => run({ action: "select", quoteId: best.id }, "Top-scoring quote selected")} disabled={bestNeedsLeadPreference || busy("select" + best.id)} data-testid="button-select-best">{bestNeedsLeadPreference ? `Prefer ${bestLead?.name} first` : `Select ${best.supplierName} (${money(best.total, cur)})`}</Btn>}
            </div>
          </Step>

          <Step n={4} title="Approval: manager sign-off" state={stepState(4)}>
            {r.status === "awaiting_approval" && sq && !isManager ? (
              <div className="flex items-start gap-2 rounded-md border border-dashed border-primary/40 bg-secondary/60 p-3 text-sm text-secondary-foreground" data-testid="text-manager-required"><Lock className="mt-0.5 h-4 w-4 shrink-0" /><div><div className="font-semibold">Waiting for a manager</div>{sq.supplierName} at {money(sq.total * r.quantity, cur)} is queued for sign-off. Only managers can approve or reject; you will see the outcome here.</div></div>
            ) : r.status === "awaiting_approval" && sq ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                  <div><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Proposed purchase</div><div className="font-semibold">{sq.supplierName} {sq.isDemo && <DemoBadge />}</div></div>
                  <div className="num text-xl font-semibold text-primary">{money(sq.total * r.quantity, cur)}<span className="ml-1 text-xs text-muted-foreground">({r.quantity} x {money(sq.total, cur)})</span></div>
                </div>
                <textarea rows={2} className={inputCls} placeholder="Decision note (why you are approving or rejecting)" value={note} onChange={(e) => setNote(e.target.value)} data-testid="input-approval-note" />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="h-4 w-4 accent-[hsl(217_91%_45%)]" data-testid="checkbox-confirm" />I have reviewed the cost and deadline and take responsibility for this decision.</label>
                <div className="flex gap-2">
                  <Btn disabled={!confirm || !note.trim() || busy("approve")} onClick={() => run({ action: "approve", note }, "Approved", () => { setNote(""); setConfirm(false); })} data-testid="button-approve"><Check className="h-4 w-4" />Approve</Btn>
                  <Btn variant="danger" disabled={!confirm || !note.trim() || busy("reject")} onClick={() => run({ action: "reject", note }, "Rejected", () => { setNote(""); setConfirm(false); })} data-testid="button-reject"><X className="h-4 w-4" />Reject</Btn>
                </div>
              </div>
            ) : r.status === "rejected" ? <p className="text-sm text-rose-700">Rejected. See the audit trail for the decision note.</p>
              : approved ? <p className="text-sm text-emerald-700">Approved by a manager. Purchase recording is unlocked.</p>
              : <p className="text-sm text-muted-foreground">Select a quote first. Nothing can be ordered before explicit approval.</p>}
          </Step>

          <Step n={5} title="Outcome: purchase record and delivery" state={stepState(5)}>
            <div className="space-y-3">
              {r.orderReference && <div className="flex items-center gap-2 text-sm"><FileSignature className="h-4 w-4 text-primary" />Purchase order recorded: <span className="num font-semibold" data-testid="text-order-ref">{r.orderReference}</span></div>}
              <div className="flex flex-wrap gap-2">
                <Btn disabled={r.status !== "approved" || busy("order")} onClick={() => run({ action: "order" }, "Purchase order recorded")} data-testid="button-order"><FileSignature className="h-4 w-4" />Record purchase order</Btn>
                <Btn variant="outline" disabled={r.status !== "ordered" || busy("deliver")} onClick={() => run({ action: "deliver" }, "Delivery confirmed, stock updated")} data-testid="button-deliver"><PackageCheck className="h-4 w-4" />Mark delivered</Btn>
                <Btn variant="outline" disabled={!sq || busy("follow_up")} onClick={() => run({ action: "follow_up", note: draftText }, "Follow-up draft saved", () => setDraft(draftText))} data-testid="button-follow-up"><Mail className="h-4 w-4" />Draft follow-up</Btn>
              </div>
              <p className="text-[11px] text-muted-foreground">Recording a PO does not place the order. Contact the supplier yourself to complete the purchase. Delivered quantities are added to inventory.</p>
              {draft && (
                <div className="rise rounded-md border border-dashed border-primary/40 p-3">
                  <div className="mb-2 flex items-center justify-between"><span className="rounded bg-secondary px-1.5 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">Draft saved, not sent</span>
                    <a href={mailto} className="inline-flex items-center gap-1 text-xs font-semibold text-primary" data-testid="link-mailto">Open in your email app <ExternalLink className="h-3 w-3" /></a></div>
                  <textarea rows={7} className={cn(inputCls, "num text-xs")} value={draft} onChange={(e) => setDraft(e.target.value)} data-testid="input-draft" />
                </div>)}
            </div>
          </Step>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Panel title="Cost at a glance">
            <dl className="divide-y text-sm">
              {[["Selected unit total", sq ? money(sq.total, cur) : "-"], ["Line total", sq ? money(sq.total * r.quantity, cur) : "-"], ["Cheapest available", best ? money(Math.min(...r.quotes.filter((q) => q.available).map((q) => q.total)), cur) : "-"], ["Quotes on file", String(r.quotes.length)], ["Deadline", deadlineLabel(r.neededBy)]].map(([k, v]) => (
                <div key={k} className="flex justify-between px-4 py-2"><dt className="text-muted-foreground">{k}</dt><dd className="num font-medium">{v}</dd></div>))}
            </dl>
          </Panel>
          <Panel title="Request history">
            <ul className="max-h-80 overflow-auto p-2">
              {data.activity.filter((a) => a.requestId === r.id).map((a) => (
                <li key={a.id} className="border-l-2 border-primary/20 py-1.5 pl-3 text-xs"><div className="font-semibold">{a.action}</div><div className="text-muted-foreground">{a.detail}</div><div className="num text-[10px] text-muted-foreground">{fmtDate(a.createdAt)} / {a.actor}</div></li>))}
            </ul>
          </Panel>
        </aside>
      </div>

      {quoteOpen && <QuoteDialog open={quoteOpen} onOpenChange={setQuoteOpen} requestId={r.id} suppliers={data.suppliers} presetSupplier={preset} onAddSupplier={() => { setQuoteOpen(false); setSupOpen(true); }} />}
      <SupplierDialog open={supOpen} onOpenChange={setSupOpen} onCreated={(s) => { setPreset(s.id); setTimeout(() => setQuoteOpen(true), 300); }} />
    </div>
  );
}
