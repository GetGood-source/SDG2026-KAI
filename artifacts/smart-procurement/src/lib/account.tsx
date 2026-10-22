import { createContext, useContext, type ReactNode } from "react";
import { useAuth, useClerk } from "@clerk/react";
import { useGetCurrentAccount, getGetCurrentAccountQueryKey } from "@workspace/api-client-react";
import type { Account } from "@workspace/api-client-react";
import { ShieldAlert, Clock, MailCheck, Ban, RefreshCw, LogOut } from "lucide-react";

type AccountCtx = { account: Account; isManager: boolean };
const Ctx = createContext<AccountCtx | null>(null);

export function useAccount(): AccountCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAccount must be used inside an active account gate");
  return v;
}

export function apiErrorText(e: unknown, fallback = "Something went wrong") {
  const d = (e as { data?: { error?: unknown } } | null)?.data;
  if (d && typeof d.error === "string") return d.error;
  return e instanceof Error ? e.message : fallback;
}

const COPY = {
  pending: { icon: Clock, title: "Your email is not on the team yet", text: "You are signed in, but a manager has not added this email to the workspace. Ask a manager to add it on the Team page, then check again. Nothing from the workspace is loaded until then." },
  revoked: { icon: Ban, title: "Access has been revoked", text: "A manager removed this account's access to the workspace. If you think this is a mistake, contact a manager. They can restore access from the Team page." },
  unverified: { icon: MailCheck, title: "Verify your email address", text: "Workspace access is matched to a verified email. Finish the verification step from the email Clerk sent you, then check again." },
  unknown: { icon: ShieldAlert, title: "We could not confirm your access", text: "The server did not return an account status. This can be a temporary connection problem. Try again in a moment." },
  roleMismatch: { icon: ShieldAlert, title: "Manager access is required", text: "This account has employee access. Employees can source and track purchases, but only a manager account can approve or reject them. Ask a manager to update your role, or sign out and choose Employee Login." },
} as const;

function AccessScreen({ kind, email, onRetry, retrying }: { kind: keyof typeof COPY; email?: string; onRetry: () => void; retrying: boolean }) {
  const { signOut } = useClerk();
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const c = COPY[kind];
  return (
    <div className="grid-bg flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="rise w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-[0_20px_50px_-24px_hsl(217_80%_30%/0.35)]">
        <div className="h-1 bg-primary" />
        <div className="p-7">
          <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-secondary text-primary"><c.icon className="h-5 w-5" /></div>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary" data-testid="status-account">Account status: {kind}</div>
          <h1 className="mt-1 text-xl font-bold" data-testid="text-access-title">{c.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
          {email && <div className="mt-4 rounded-md border bg-muted/60 px-3 py-2 text-sm"><span className="text-muted-foreground">Signed in as </span><span className="font-semibold" data-testid="text-access-email">{email}</span></div>}
          <div className="mt-6 flex gap-2">
            <button onClick={onRetry} disabled={retrying} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60" data-testid="button-retry-access">
              <RefreshCw className={retrying ? "h-4 w-4 animate-spin" : "h-4 w-4"} />Check again
            </button>
            <button onClick={() => signOut({ redirectUrl: base || "/" })} className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-muted" data-testid="button-access-signout">
              <LogOut className="h-4 w-4" />Sign out
            </button>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">Status is rechecked every 15 seconds and whenever you return to this tab.</p>
        </div>
      </div>
    </div>
  );
}

function GateSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background md:pl-60">
      <div className="fixed inset-y-0 left-0 hidden w-60 bg-sidebar md:block" />
      <div className="mx-auto max-w-[1280px] space-y-3 px-4 py-8 md:px-8">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-7 w-64 animate-pulse rounded bg-muted" />
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-card ring-1 ring-border" />)}
      </div>
    </div>
  );
}

export function AccountGate({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const q = useGetCurrentAccount({ query: { queryKey: [...getGetCurrentAccountQueryKey(), userId], refetchInterval: 15000, retry: false } });
  const account = q.data;
  const loginChoice = window.sessionStorage.getItem("smart-procurement-login-choice");
  if (q.isLoading) return <GateSkeleton />;
  if (!account || q.isError) return <AccessScreen kind="unknown" email={account?.email} onRetry={() => q.refetch()} retrying={q.isFetching} />;
  if (account.status !== "active" || !account.role) {
    const kind = account.status === "active" ? "unknown" : account.status;
    return <AccessScreen kind={kind} email={account.email} onRetry={() => q.refetch()} retrying={q.isFetching} />;
  }
  if (loginChoice === "manager" && account.role !== "manager") {
    return <AccessScreen kind="roleMismatch" email={account.email} onRetry={() => q.refetch()} retrying={q.isFetching} />;
  }
  return <Ctx.Provider value={{ account, isManager: account.role === "manager" }}>{children}</Ctx.Provider>;
}
