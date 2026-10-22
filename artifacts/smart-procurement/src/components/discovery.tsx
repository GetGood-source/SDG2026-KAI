import { useState } from "react";
import { Radar, MapPin, Globe, Phone, ExternalLink, Star, ShieldAlert, Crosshair, RefreshCw, BadgeCheck, ClipboardCheck, AlertTriangle } from "lucide-react";
import { useConfirmDiscoveredQuote } from "@workspace/api-client-react";
import type { PartRequest, SupplierCandidate, SupplierDiscovery } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useInvalidateWorkspace, useWorkspace, fmtDate } from "@/lib/proc";
import { Field, inputCls, Btn } from "@/components/kit";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function apiErr(e: unknown): string {
  const d = (e as { data?: { error?: unknown } } | null)?.data;
  if (d && typeof d.error === "string") return d.error;
  return e instanceof Error ? e.message : "Something went wrong";
}

const STATUS_CLS: Record<string, string> = {
  searching: "bg-secondary text-secondary-foreground",
  complete: "bg-emerald-50 text-emerald-800",
  partial: "bg-amber-50 text-amber-800",
  failed: "bg-rose-50 text-rose-700",
};

const Unknown = () => <span className="text-muted-foreground/70 italic">unknown</span>;

function Link2({ href, label, testid }: { href: string; label: string; testid: string }) {
  if (!href) return null;
  return <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline" data-testid={testid}>{label}<ExternalLink className="h-2.5 w-2.5" /></a>;
}

function CandidateRow({ c, d, onChoose, onConfirm, choosing, locked, canAct }: { c: SupplierCandidate; d: SupplierDiscovery; onChoose: () => void; onConfirm: () => void; choosing: boolean; locked: boolean; canAct: boolean }) {
  const preferred = d.preferredCandidateId === c.id;
  const recommended = d.recommendedCandidateId === c.id;
  return (
    <li className={cn("group relative rounded-lg border bg-card p-3 transition hover:-translate-y-px hover:border-primary/40 hover:shadow-[0_8px_20px_-14px_hsl(217_80%_30%/0.5)]", preferred && "border-primary ring-2 ring-primary/15")} data-testid={`card-candidate-${c.id}`}>
      {preferred && <span className="absolute -left-px top-3 h-8 w-1 rounded-r bg-primary" />}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold" data-testid={`text-candidate-name-${c.id}`}>{c.name || "Unnamed result"}</span>
            {recommended && <span className="rounded bg-primary px-1.5 text-[10px] font-bold uppercase text-white">Top lead</span>}
            {preferred && <span className="rounded border border-primary px-1.5 text-[10px] font-bold uppercase text-primary">Preferred lead</span>}
            <span className="rounded bg-amber-50 px-1.5 text-[10px] font-bold uppercase text-amber-800">Unconfirmed</span>
          </div>
          {c.title && c.title !== c.name && <div className="truncate text-xs text-muted-foreground">{c.title}</div>}
        </div>
        <div className="flex items-center gap-1.5" title="Online lead score from the server. Separate from confirmed-quote scoring.">
          <div className="h-1.5 w-14 overflow-hidden rounded bg-muted"><div className="h-full bg-primary transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, c.score))}%` }} /></div>
          <span className="num text-xs" data-testid={`text-candidate-score-${c.id}`}>{c.score.toFixed(1)}</span>
        </div>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <div><dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Distance*</dt><dd className="num">{c.distanceKm != null ? `${c.distanceKm.toFixed(1)} km` : <Unknown />}</dd></div>
        <div><dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Google rating</dt><dd className="num">{c.rating != null ? <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3 fill-current text-primary" />{c.rating.toFixed(1)}<span className="text-muted-foreground">({c.reviewCount ?? "?"})</span></span> : <Unknown />}</dd></div>
        <div><dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Advertised price</dt><dd className="num">{c.publishedPrice != null ? `${c.priceCurrency ?? ""} ${c.publishedPrice.toFixed(2)}` : c.priceText || <Unknown />}</dd></div>
        <div><dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Phone</dt><dd className="num">{c.phone ? <a href={`tel:${c.phone}`} className="inline-flex items-center gap-0.5 text-primary"><Phone className="h-3 w-3" />{c.phone}</a> : <Unknown />}</dd></div>
      </dl>
      <div className="mt-1.5 text-xs text-muted-foreground"><MapPin className="mr-0.5 inline h-3 w-3" />{c.address || "Address unknown"}</div>
      {c.snippet && <p className="mt-1.5 line-clamp-2 text-xs">{c.snippet}</p>}
      {c.reason && <p className="mt-1.5 rounded bg-secondary/60 px-2 py-1 text-[11px] text-secondary-foreground"><span className="font-semibold">Why ranked: </span>{c.reason}</p>}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-[11px]">
        <div className="flex flex-wrap gap-3">
          <Link2 href={c.sourceUrl} label="Source" testid={`link-candidate-source-${c.id}`} />
          <Link2 href={c.website} label="Website" testid={`link-candidate-website-${c.id}`} />
          <Link2 href={c.priceSourceUrl} label="Price source" testid={`link-candidate-price-${c.id}`} />
        </div>
        {canAct && <div className="flex gap-1.5">
          {!preferred && <Btn variant="outline" className="px-2 py-1 text-xs" disabled={choosing || locked} onClick={onChoose} data-testid={`button-choose-${c.id}`}><Crosshair className="h-3 w-3" />{choosing ? "Saving..." : "Prefer lead"}</Btn>}
          <Btn variant={preferred ? "primary" : "ghost"} className="px-2 py-1 text-xs" disabled={locked} onClick={onConfirm} data-testid={`button-confirm-${c.id}`}><ClipboardCheck className="h-3 w-3" />Record confirmed quote</Btn>
        </div>}
      </div>
    </li>
  );
}

export function DiscoveryPanel({ r, run, busy, searchUrl }: { r: PartRequest; run: (action: "discover" | "choose_candidate", ok: string, candidateId?: string) => void; busy: (k: string) => boolean; searchUrl: string }) {
  const [confirming, setConfirming] = useState<SupplierCandidate | null>(null);
  const d = r.discovery;
  const closed = ["approved", "ordered", "delivered", "rejected"].includes(r.status);
  const discovering = busy("discover") || busy("source") || (d?.status === "searching" && Date.parse(d.cacheUntil) > Date.now());
  const nearby = d?.candidates.filter((c) => c.kind === "nearby") ?? [];
  const web = d?.candidates.filter((c) => c.kind === "web") ?? [];
  const preferred = d?.candidates.find((c) => c.id === d.preferredCandidateId);

  const list = (items: SupplierCandidate[]) => (
    <ul className="space-y-2">
      {items.map((c, i) => (
        <div key={c.id} className="rise" style={{ animationDelay: `${i * 40}ms` }}>
          <CandidateRow c={c} d={d!} canAct={!closed} locked={closed} choosing={busy("choose_candidate" + c.id)}
            onChoose={() => run("choose_candidate", `${c.name} set as preferred lead. Confirm a quote before it can be approved.`, c.id)}
            onConfirm={() => setConfirming(c)} />
        </div>))}
    </ul>
  );

  return (
    <div className="mt-4 rounded-lg border border-primary/25 bg-gradient-to-b from-secondary/50 to-transparent p-3" data-testid="panel-discovery">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radar className={cn("h-4 w-4 text-primary", discovering && "animate-spin")} />
          <span className="text-sm font-bold">Live Google discovery</span>
          {d && <span className={cn("rounded px-1.5 text-[10px] font-bold uppercase tracking-wider", STATUS_CLS[d.status])} data-testid="status-discovery">{d.status}</span>}
        </div>
        <Btn variant="outline" className="px-2 py-1 text-xs" disabled={discovering || closed} onClick={() => run("discover", "Live discovery refreshed")} data-testid="button-discover">
          <RefreshCw className={cn("h-3 w-3", discovering && "animate-spin")} />{discovering ? "Searching, up to 40s..." : d ? "Search again" : "Search live now"}
        </Btn>
      </div>

      {discovering && <div className="mb-2 space-y-1.5">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />)}</div>}

      {!d ? (
        <p className="text-xs text-muted-foreground">No live search on this request yet. It runs automatically when stock and recorded quotes cannot cover the need, or you can run it now. Results use API credits and are cached 15 minutes.</p>
      ) : (
        <>
          <div className="num mb-2 grid gap-x-4 gap-y-0.5 rounded-md border bg-card px-3 py-2 text-[11px] sm:grid-cols-2" data-testid="text-discovery-meta">
            <div><span className="text-muted-foreground">Query </span>{d.query || "-"}</div>
            <div><span className="text-muted-foreground">Centre </span>{d.location} / {d.radiusKm} km{d.centerLatitude != null && d.centerLongitude != null ? ` (${d.centerLatitude.toFixed(4)}, ${d.centerLongitude.toFixed(4)})` : " (coords unknown)"}</div>
            <div><span className="text-muted-foreground">Fetched </span>{fmtDate(d.fetchedAt)}</div>
            <div><span className="text-muted-foreground">Cached until </span>{fmtDate(d.cacheUntil)}</div>
          </div>
          {d.note && <div className={cn("mb-2 flex gap-2 rounded-md px-3 py-2 text-xs", d.status === "failed" ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-900")} data-testid="text-discovery-note"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{d.note}</div>}
          {d.recommendation && <div className="mb-2 rounded-md border-l-4 border-primary bg-card p-2.5 text-xs" data-testid="text-discovery-recommendation"><div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">Server lead ranking (separate from quote scoring)</div><p className="whitespace-pre-line">{d.recommendation}</p></div>}
          {preferred && (
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-primary bg-card px-3 py-2 text-xs" data-testid="text-preferred-lead">
              <span><Crosshair className="mr-1 inline h-3.5 w-3.5 text-primary" />Preferred lead: <b>{preferred.name}</b>. Not approvable until a confirmed quote is recorded.</span>
              {!closed && <Btn className="px-2 py-1 text-xs" onClick={() => setConfirming(preferred)} data-testid="button-confirm-preferred"><ClipboardCheck className="h-3 w-3" />Record confirmed quote</Btn>}
            </div>)}

          <div className="mb-1.5 mt-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><MapPin className="h-3 w-3" />Nearby on Google Maps ({nearby.length})</div>
          {nearby.length ? list(nearby) : <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">No Maps results within {d.radiusKm} km.</p>}
          <p className="mt-1 text-[10px] text-muted-foreground">*Straight-line distance from the search centre, not the shop's exact location or driving time.</p>

          <div className="mb-1.5 mt-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><Globe className="h-3 w-3" />Web listings ({web.length})</div>
          <p className="mb-1.5 flex gap-1 text-[11px] text-amber-800"><ShieldAlert className="h-3 w-3 shrink-0" />Seller identity and distance unverified. Listings carry no Google rating.</p>
          {web.length ? list(web) : <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">No web listings found.</p>}
        </>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-2 text-[11px] text-muted-foreground">
        <BadgeCheck className="h-3.5 w-3.5 text-primary" />Fit, stock, delivery and prices are unconfirmed until someone checks with the supplier.
        <a href={searchUrl} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-0.5 font-semibold text-primary" data-testid="link-google-backup">Open Google yourself <ExternalLink className="h-2.5 w-2.5" /></a>
      </div>

      {confirming && <ConfirmQuoteDialog key={confirming.id} requestId={r.id} c={confirming} onClose={() => setConfirming(null)} />}
    </div>
  );
}

function ConfirmQuoteDialog({ requestId, c, onClose }: { requestId: number; c: SupplierCandidate; onClose: () => void }) {
  const { data: workspace } = useWorkspace();
  const currency = workspace?.settings.currency ?? "MYR";
  const m = useConfirmDiscoveredQuote();
  const inv = useInvalidateWorkspace();
  const { toast } = useToast();
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    supplierName: c.kind === "nearby" ? c.name : "",
    price: c.publishedPrice != null && c.priceCurrency === currency ? String(c.publishedPrice) : "",
    shipping: "", leadHours: "", available: true,
    rating: c.rating != null ? String(c.rating) : "",
    fitConfirmed: false, confirmationNote: "",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const rating = Number(f.rating);
  const valid = f.supplierName.trim() && Number(f.price) > 0 && f.shipping !== "" && Number(f.shipping) >= 0 && f.leadHours !== "" && Number(f.leadHours) >= 0
    && f.rating !== "" && rating >= 0 && rating <= 5 && f.fitConfirmed && f.confirmationNote.trim().length >= 8;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || m.isPending) return;
    setErr(null);
    m.mutate({ id: requestId, data: { candidateId: c.id, supplierName: f.supplierName.trim(), price: Number(f.price), shipping: Number(f.shipping), leadHours: Number(f.leadHours), available: f.available, rating, fitConfirmed: f.fitConfirmed, confirmationNote: f.confirmationNote.trim() } }, {
      onSuccess: (res) => { inv(); toast({ title: `Confirmed quote recorded for ${res.reference}`, description: res.status === "awaiting_approval" ? "Ready for manager approval." : "Unavailable quote retained; continue sourcing." }); onClose(); },
      onError: (e) => setErr(apiErr(e)),
    });
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !m.isPending && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">Record supplier-confirmed quote</DialogTitle>
          <DialogDescription>From lead "{c.name}". Enter only what the seller confirmed to you directly. Nothing here is taken as fact from the search result.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Field label="Verified seller name" hint={c.kind === "web" ? "Web listings may be marketplaces or resellers. Enter the actual seller you spoke to." : "Change it if the actual seller differs from the Maps listing."}>
            <input className={inputCls} value={f.supplierName} onChange={set("supplierName")} data-testid="input-confirm-supplier" /></Field></div>
          <Field label={`Confirmed unit price (${currency})`} hint={c.publishedPrice != null ? c.priceCurrency === currency ? "Prefilled advertised price; reconfirm directly with the supplier." : `Listing uses ${c.priceCurrency}; enter a confirmed ${currency} quote. No currency conversion is performed.` : undefined}>
            <input type="number" step="0.01" min={0.01} className={inputCls} value={f.price} onChange={set("price")} data-testid="input-confirm-price" /></Field>
          <Field label={`Shipping (${currency})`}><input type="number" step="0.01" min={0} className={inputCls} value={f.shipping} onChange={set("shipping")} data-testid="input-confirm-shipping" /></Field>
          <Field label="Lead time (hours)"><input type="number" min={0} className={inputCls} value={f.leadHours} onChange={set("leadHours")} data-testid="input-confirm-lead" /></Field>
          <Field label="Stock confirmed">
            <select className={inputCls} value={f.available ? "1" : "0"} onChange={(e) => setF({ ...f, available: e.target.value === "1" })} data-testid="select-confirm-available">
              <option value="1">In stock</option><option value="0">Unavailable</option></select></Field>
          <div className="col-span-2"><Field label={c.rating != null ? "Rating (Google Maps, from listing)" : "Recorded reliability rating (0-5)"} hint={c.rating != null ? `${c.rating} from ${c.reviewCount ?? "unknown"} Google reviews.` : "No Google rating exists for this lead. This is your team's own reliability rating, not a Google rating."}>
            <input type="number" step="0.1" min={0} max={5} className={inputCls} value={f.rating} onChange={set("rating")} readOnly={c.rating != null} data-testid="input-confirm-rating" /></Field></div>
          <div className="col-span-2"><Field label="How was this confirmed?" hint="At least 8 characters: who, how, when.">
            <textarea rows={2} className={inputCls} value={f.confirmationNote} onChange={set("confirmationNote")} placeholder="Called Ah Seng 3:10pm, part no. matches VIN, 2 units on shelf" data-testid="input-confirm-note" /></Field></div>
          <label className={cn("col-span-2 flex items-start gap-2 rounded-md border p-2.5 text-sm transition", f.fitConfirmed ? "border-primary bg-secondary/60" : "border-dashed")}>
            <input type="checkbox" checked={f.fitConfirmed} onChange={(e) => setF({ ...f, fitConfirmed: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[hsl(217_91%_45%)]" data-testid="checkbox-confirm-fit" />
            I confirmed with the seller the exact fitment, price, stock and delivery shown above.
          </label>
          {err && <div className="col-span-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700" data-testid="text-confirm-error">{err}</div>}
          <div className="col-span-2 flex justify-end gap-2 pt-1">
            <Btn type="button" variant="ghost" disabled={m.isPending} onClick={onClose}>Cancel</Btn>
            <Btn type="submit" disabled={!valid || m.isPending} data-testid="button-submit-confirm">{m.isPending ? "Recording..." : "Record and send for approval"}</Btn>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
