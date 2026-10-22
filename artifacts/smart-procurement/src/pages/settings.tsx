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
  const dirty = JSON.stringify(f) !== JSON.stringify(data.settings);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    m.mutate({ data: f }, { onSuccess: () => { inv(); toast({ title: "Settings saved" }); }, onError: () => toast({ title: "Could not save settings", variant: "destructive" }) });
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
            <div className="flex justify-end gap-2">
              <Btn type="button" variant="ghost" disabled={!dirty} onClick={() => setF(data.settings)}>Discard</Btn>
              <Btn type="submit" disabled={!dirty || !f.companyName.trim() || !f.industry.trim() || m.isPending} data-testid="button-save-settings">{m.isPending ? "Saving..." : "Save changes"}</Btn>
            </div>
          </form>
        </Panel>
        <Panel title="Integrations">
          <div className="space-y-3 p-4 text-sm">
            <p className="text-muted-foreground">{data.integrationNote}</p>
            {["Email sending", "Supplier ordering", "User sign-in"].map((k) => (
              <div key={k} className="flex items-center justify-between rounded-md border px-3 py-2"><span>{k}</span><span className="rounded bg-muted px-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Not connected</span></div>))}
            {data.demoMode && <p className="rounded-md border border-dashed border-amber-400 bg-amber-50 p-2 text-xs text-amber-800">Demo mode is on. Records marked Demo are sample data.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
