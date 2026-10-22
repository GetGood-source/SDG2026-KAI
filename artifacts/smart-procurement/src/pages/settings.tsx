import { useEffect, useRef, useState } from "react";
import { useSaveSettings } from "@workspace/api-client-react";
import type { Settings } from "@workspace/api-client-react";
import { useWorkspace, useInvalidateWorkspace, money } from "@/lib/proc";
import { PageHeader, Panel, LoadingRows, ErrorState, Field, Btn, inputCls } from "@/components/kit";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CURS = ["MYR", "USD", "SGD", "GBP"] as const;

export default function SettingsPage() {
  const { data, isLoading, isError, refetch } = useWorkspace();
  const m = useSaveSettings();
  const inv = useInvalidateWorkspace();
  const { toast } = useToast();
  const [f, setF] = useState<Settings | null>(null);
  const init = useRef(false);
  useEffect(() => { if (data && !init.current) { init.current = true; setF(data.settings); } }, [data]);
  if (isLoading || (!f && !isError)) return <LoadingRows rows={4} />;
  if (isError || !data || !f) return <ErrorState onRetry={() => refetch()} />;
  const loc = f.searchLocation ?? "Petaling Jaya, Selangor, Malaysia";
  const rad = f.searchRadiusKm ?? 25;
  const locOk = loc.trim().length >= 2 && loc.length <= 200;
  const radOk = Number.isFinite(rad) && rad >= 1 && rad <= 200;
  const dirty = JSON.stringify(f) !== JSON.stringify(data.settings);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locOk || !radOk) return;
    m.mutate({ data: { ...f, searchLocation: loc.trim(), searchRadiusKm: rad } }, { onSuccess: () => { inv(); toast({ title: "Settings saved" }); }, onError: (e) => toast({ title: "Could not save settings", description: (e as { data?: { error?: string } })?.data?.error, variant: "destructive" }) });
  };
  return (
    <div>
      <PageHeader eyebrow="Workspace" title="Settings" sub="Managers only. Changes apply to everyone on the team." />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Panel title="Company">
          <form onSubmit={save} className="space-y-4 p-4">
            <Field label="Company name"><input className={inputCls} value={f.companyName} onChange={(e) => setF({ ...f, companyName: e.target.value })} data-testid="input-company" /></Field>
            <Field label="Industry"><input className={inputCls} value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })} data-testid="input-industry" /></Field>
            <Field label="Currency">
              <div className="grid grid-cols-4 gap-2">
                {CURS.map((c) => (
                  <button type="button" key={c} onClick={() => setF({ ...f, currency: c })} data-testid={`button-currency-${c}`}
                    className={cn("rounded-md border px-3 py-2 text-left transition", f.currency === c ? "border-primary bg-secondary ring-2 ring-primary/20" : "hover:border-primary/50")}>
                    <div className="num text-sm font-semibold">{c}</div><div className="num text-[11px] text-muted-foreground">{money(1234.5, c)}</div>
                  </button>))}
              </div>
            </Field>
            <div className="rounded-md border border-primary/25 bg-secondary/40 p-3">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-primary">Live supplier search area</div>
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <Field label="Search centre" hint={locOk ? "City or area. Distances are straight-line from here." : "Enter 2 to 200 characters."}><input className={inputCls} value={loc} onChange={(e) => setF({ ...f, searchLocation: e.target.value })} data-testid="input-search-location" /></Field>
                <Field label="Radius (km)" hint={radOk ? "1 to 200" : "Must be 1 to 200"}><input type="number" min={1} max={200} className={inputCls} value={Number.isFinite(rad) ? rad : ""} onChange={(e) => setF({ ...f, searchRadiusKm: e.target.value === "" ? NaN : Number(e.target.value) })} data-testid="input-search-radius" /></Field>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Btn type="button" variant="ghost" disabled={!dirty} onClick={() => setF(data.settings)}>Discard</Btn>
              <Btn type="submit" disabled={!dirty || !f.companyName.trim() || !f.industry.trim() || !locOk || !radOk || m.isPending} data-testid="button-save-settings">{m.isPending ? "Saving..." : "Save changes"}</Btn>
            </div>
          </form>
        </Panel>
        <Panel title="Integrations">
          <div className="space-y-3 p-4 text-sm">
            <p className="text-muted-foreground">{data.integrationNote}</p>
            <div className="flex items-center justify-between rounded-md border border-primary/30 px-3 py-2"><span>Live Google search (SerpApi)</span><span className="rounded bg-secondary px-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">{data.liveSearchConfigured ? "Key configured" : "Not configured"}</span></div>
            <p className="text-xs text-muted-foreground">Fresh discovery uses up to 7 SerpApi requests, including location lookup and supplier-site price checks. Results are cached 15 minutes. Today: {data.liveSearchUsedToday ?? 0}/{data.liveSearchDailyLimit ?? 5} search runs (resets at 00:00 UTC). The API key stays on the server; configured does not guarantee provider quota.</p>
            {["Email sending", "Supplier ordering"].map((k) => (
              <div key={k} className="flex items-center justify-between rounded-md border px-3 py-2"><span>{k}</span><span className="rounded bg-muted px-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Not connected</span></div>))}
            {data.demoMode && <p className="rounded-md border border-dashed border-amber-400 bg-amber-50 p-2 text-xs text-amber-800">Demo mode is on. Records marked Demo are sample data. Employee and Manager roles are simulated and open to anyone.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
