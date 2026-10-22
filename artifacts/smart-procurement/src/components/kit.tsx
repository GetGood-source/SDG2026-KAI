import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { STATUS, PRIORITY } from "@/lib/proc";
import { cn } from "@/lib/utils";

export function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.new;
  return (
    <span data-testid={`status-${status}`} className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap", s.cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {s.label}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: string }) {
  return <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", PRIORITY[priority])}>{priority}</span>;
}

export function DemoBadge() {
  return (
    <span title="Demo data, not a verified supplier record" className="rounded border border-dashed border-amber-400 bg-amber-50 px-1.5 py-px text-[10px] font-bold uppercase tracking-wider text-amber-700">
      Demo
    </span>
  );
}

export function PageHeader({ eyebrow, title, sub, actions }: { eyebrow: string; title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between rise">
      <div>
        <div className="num text-[11px] font-medium uppercase tracking-[0.18em] text-primary">{eyebrow}</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-[28px]">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, right, children, className }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-card-border bg-card shadow-[0_1px_0_hsl(214_40%_90%),0_8px_24px_-16px_hsl(217_60%_40%/0.25)]", className)}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h2 className="text-[13px] font-bold tracking-tight">{title}</h2>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function LoadingRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" data-testid="state-loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-10 text-center" data-testid="state-error">
      <AlertTriangle className="h-6 w-6 text-rose-600" />
      <div className="font-semibold">The workspace could not be loaded.</div>
      <button onClick={onRetry} data-testid="button-retry" className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white">
        <RefreshCw className="h-3.5 w-3.5" /> Retry
      </button>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="grid-bg flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-10 text-center">
      <div className="rounded-lg bg-white p-2.5 text-primary shadow-sm ring-1 ring-border">{icon}</div>
      <div className="mt-1 font-bold">{title}</div>
      <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export const inputCls =
  "w-full rounded-md border border-input bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Btn({ variant = "primary", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "outline" }) {
  const v = {
    primary: "bg-primary text-white hover:bg-[hsl(217_91%_40%)] shadow-sm",
    outline: "border border-input bg-white text-foreground hover:border-primary hover:text-primary",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  }[variant];
  return (
    <button
      {...p}
      className={cn("inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45", v, className)}
    />
  );
}
