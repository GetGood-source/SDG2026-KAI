import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, FileText, Search, Scale, ShieldCheck, Truck, Lock } from "lucide-react";

const STEPS = [
  { icon: FileText, t: "Request", d: "The bay logs the part, the vehicle and the hour it is needed." },
  { icon: Search, t: "Source", d: "Stock and recorded quotes are checked first. If nothing fits, live Google results are fetched as unconfirmed leads." },
  { icon: Scale, t: "Decide", d: "Price, rating and delivery time are weighed into one clear recommendation." },
  { icon: ShieldCheck, t: "Approve", d: "A manager signs off with a note before anything is bought." },
  { icon: Truck, t: "Receive", d: "Purchase orders and deliveries are tracked; stock updates itself." },
];

export default function Landing() {
  const queryClient = useQueryClient();
  const demoMode = import.meta.env.VITE_PROCUREMENT_DEMO_MODE === "true";
  const chooseAccount = (role: "staff" | "manager") => () => {
    window.sessionStorage.setItem("smart-procurement-login-choice", role);
    if (demoMode) queryClient.clear();
  };
  const entryHref = demoMode ? "/dashboard" : "/sign-in";
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="h-8 w-8" />
          <span className="max-w-[100px] text-[10px] font-bold leading-tight sm:max-w-none sm:text-sm">One Stop Smart Procurement</span>
        </div>
        <div className="flex items-center gap-2">
          {demoMode && <span className="hidden rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-900 sm:inline">Demo · no sign-in · no real data</span>}
          <Link href={entryHref} onClick={chooseAccount("staff")} className="rounded-md border bg-card px-3 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-secondary" data-testid="link-employee-login">Employee</Link>
          <Link href={entryHref} onClick={chooseAccount("manager")} className="rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90" data-testid="link-manager-login">Manager</Link>
        </div>
      </header>

      <section className="grid-bg border-y">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div className="rise">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Urgent parts sourcing for small teams</div>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">The car is on the lift.<br /><span className="text-primary">The part is not.</span></h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">A shared workspace for repair shops and other SMEs to request a part, compare verified quotes, get a manager's sign-off and track the order to the door, with every step on the record.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={entryHref} onClick={chooseAccount("staff")} className="group inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90" data-testid="link-hero-sign-up">{demoMode ? "Enter as employee" : "Employee Login"} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
              <Link href={entryHref} onClick={chooseAccount("manager")} className="inline-flex items-center rounded-md border bg-card px-5 py-3 text-sm font-semibold transition hover:bg-secondary" data-testid="link-hero-sign-in">{demoMode ? "Enter as manager" : "Manager Login"}</Link>
            </div>
          </div>
          <div className="rise relative self-center" style={{ animationDelay: ".12s" }}>
            <div className="overflow-hidden rounded-xl border bg-card shadow-[0_30px_60px_-30px_hsl(217_80%_30%/0.4)]">
              <div className="flex items-center justify-between border-b bg-sidebar px-4 py-2.5 text-[11px] text-sidebar-foreground"><span className="num">Demo illustration · REQ-0142</span><span className="rounded bg-rose-500/20 px-1.5 font-bold uppercase text-rose-200">Critical</span></div>
              <div className="space-y-3 p-4">
                <div><div className="text-sm font-bold">Front brake pads</div><div className="text-xs text-muted-foreground">Toyota Vios 2019 / needed in 5h</div></div>
                {[["Jaya Auto Parts", "RM 148.40", "2h", true], ["KL Spares Hub", "RM 136.90", "26h", false], ["Bengkel Supply", "RM 171.00", "4h", false]].map(([n, p, l, best]) => (
                  <div key={n as string} className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs ${best ? "border-primary bg-secondary/70" : ""}`}>
                    <span className="font-semibold">{n}</span><span className="num text-muted-foreground">{l}</span><span className="num font-semibold text-primary">{p}</span>
                  </div>
                ))}
                <div className="rounded-md bg-primary/10 px-3 py-2 text-[11px] text-primary">Recommended: arrives before the deadline at a fair price. Waiting on manager approval.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-2xl font-bold">Five steps, one record</h2>
        <p className="mt-1 text-sm text-muted-foreground">Each request moves through the same path, so nobody buys on a guess.</p>
        <ol className="mt-8 grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.t} className="bg-card p-5">
              <div className="num text-[11px] text-muted-foreground">0{i + 1}</div>
              <s.icon className="mt-3 h-5 w-5 text-primary" />
              <div className="mt-2 font-semibold">{s.t}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t bg-sidebar text-sidebar-foreground">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-2">
          <div>
            <Lock className="h-5 w-5 text-sidebar-primary" />
            <h2 className="mt-3 text-xl font-bold text-white">Access by invitation of a manager</h2>
            <p className="mt-2 text-sm leading-relaxed">{demoMode ? "Choose Employee or Manager at the top to enter immediately. This is an open demo: the role switch is simulated and is not a security boundary." : "Signing up does not open the workspace on its own. A manager authorizes your email first, then you verify it. Staff source and order; managers also approve purchases and manage the team."}</p>
          </div>
          <div className="text-sm leading-relaxed">
            <div className="font-semibold text-white">What it does not do</div>
            <p className="mt-2">It does not email suppliers or place orders for you. Live Google results (via SerpApi) are shown as unconfirmed leads with their source links; a quote only counts once a person records what the supplier confirmed. Demo data is clearly labelled until you replace it.</p>
          </div>
        </div>
      </section>
      <footer className="mx-auto max-w-6xl px-5 py-6 text-xs text-muted-foreground">One Stop Smart Procurement</footer>
    </div>
  );
}
