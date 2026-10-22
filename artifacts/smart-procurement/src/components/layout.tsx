import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutGrid, FileText, Building2, Boxes, ShieldCheck, Truck, ScrollText, Settings2, Menu, X, Info } from "lucide-react";
import { useWorkspace } from "@/lib/proc";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/requests", label: "Requests", icon: FileText },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck, badge: "approvals" },
  { href: "/orders", label: "Orders", icon: Truck },
  { href: "/suppliers", label: "Suppliers", icon: Building2 },
  { href: "/inventory", label: "Inventory", icon: Boxes, badge: "stock" },
  { href: "/activity", label: "Audit trail", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function Layout({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);
  const { data } = useWorkspace();
  const counts: Record<string, number> = { approvals: data?.summary.pendingApprovals ?? 0, stock: data?.summary.lowStock ?? 0 };

  const nav = (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV.map((n) => {
        const active = n.href === "/" ? loc === "/" : loc.startsWith(n.href);
        const c = n.badge ? counts[n.badge] : 0;
        return (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)} data-testid={`link-nav-${n.label.toLowerCase().replace(/\s/g, "-")}`}
            className={cn("group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition",
              active ? "bg-white/10 text-white" : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white")}>
            {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-sidebar-primary" />}
            <n.icon className={cn("h-4 w-4 transition group-hover:translate-x-0.5", active && "text-sidebar-primary")} />
            {n.label}
            {c > 0 && <span className="num ml-auto rounded bg-sidebar-primary px-1.5 text-[10px] font-semibold text-white">{c}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="px-5 pb-5 pt-5">
      <div className="flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-sidebar-primary text-[13px] font-extrabold text-white">SP</div>
        <div>
          <div className="text-[13px] font-bold leading-tight text-white">Smart Procurement</div>
          <div className="truncate text-[11px] text-sidebar-foreground/60">{data?.settings.companyName ?? "Workspace"}</div>
        </div>
      </div>
    </div>
  );

  const foot = (
    <div className="mt-auto space-y-2 p-4 text-[11px] text-sidebar-foreground/60">
      {data?.demoMode && <div className="rounded border border-dashed border-amber-400/60 px-2 py-1.5 text-amber-200">Demo mode: some suppliers and quotes are sample data.</div>}
      <div className="flex gap-1.5"><Info className="mt-0.5 h-3 w-3 shrink-0" />Shared workspace. No sign-in, no verified roles. No email or purchasing integrations connected.</div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-sidebar md:flex">{brand}{nav}{foot}</aside>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-sidebar px-4 py-2.5 md:hidden">
        <span className="text-sm font-bold text-white">Smart Procurement</span>
        <button onClick={() => setOpen(!open)} className="text-white" data-testid="button-menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {open && <div className="fixed inset-0 top-11 z-20 flex flex-col bg-sidebar pt-3 md:hidden">{nav}{foot}</div>}
      <main className="md:pl-60">
        <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
