import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListTeam, getListTeamQueryKey, useSaveTeamMember, getGetCurrentAccountQueryKey, getGetWorkspaceQueryKey } from "@workspace/api-client-react";
import type { TeamMember, TeamMemberInput } from "@workspace/api-client-react";
import { UserPlus, Users, ShieldCheck, Link2, Ban, RotateCcw } from "lucide-react";
import { PageHeader, Panel, LoadingRows, ErrorState, EmptyState, Field, Btn, inputCls } from "@/components/kit";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAccount, apiErrorText } from "@/lib/account";
import { fmtDate } from "@/lib/proc";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Team() {
  const { account } = useAccount();
  const { data, isLoading, isError, refetch } = useListTeam({ query: { queryKey: getListTeamQueryKey() } });
  const save = useSaveTeamMember();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamMemberInput["role"]>("staff");
  const [revoking, setRevoking] = useState<TeamMember | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const appLink = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = (input: TeamMemberInput, ok: string, key: string, after?: () => void) => {
    setBusyId(key);
    save.mutate({ data: input }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTeamQueryKey() });
        qc.invalidateQueries({ queryKey: getGetCurrentAccountQueryKey() });
        qc.invalidateQueries({ queryKey: getGetWorkspaceQueryKey() });
        toast({ title: ok });
        after?.();
      },
      onError: (e) => toast({ title: "Change not saved", description: apiErrorText(e), variant: "destructive" }),
      onSettled: () => setBusyId(null),
    });
  };

  const members = [...(data ?? [])].sort((a, b) => (a.status === b.status ? a.email.localeCompare(b.email) : a.status === "active" ? -1 : 1));
  const activeManagers = members.filter((m) => m.status === "active" && m.role === "manager").length;

  return (
    <div className="rise">
      <PageHeader eyebrow="Managers only" title="Team access" sub="Decide which email addresses may enter this workspace and what they can do. Staff run sourcing and orders; managers also approve purchases and manage settings and team." />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Panel title="Members" right={<span className="num text-xs text-muted-foreground">{members.filter((m) => m.status === "active").length} active</span>}>
          {isLoading ? <LoadingRows rows={4} /> : isError ? <ErrorState onRetry={() => refetch()} /> : members.length === 0 ? (
            <EmptyState icon={<Users className="h-5 w-5" />} title="No one added yet" text="Authorize an email on the right to let a teammate in." />
          ) : (
            <ul className="divide-y">
              {members.map((m) => {
                const me = m.email.toLowerCase() === account.email.toLowerCase();
                const lastMgr = m.role === "manager" && m.status === "active" && activeManagers <= 1;
                const k = String(m.id);
                return (
                  <li key={m.id} className={cn("flex flex-wrap items-center gap-3 py-3 transition-opacity", m.status === "revoked" && "opacity-60")} data-testid={`row-member-${m.id}`}>
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">{m.email.slice(0, 2).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 truncate text-sm font-semibold" data-testid={`text-member-email-${m.id}`}>{m.email}{me && <span className="rounded bg-primary/10 px-1.5 text-[10px] font-bold uppercase text-primary">You</span>}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.status === "revoked" ? "Access revoked" : m.userId ? `Joined ${fmtDate(m.joinedAt)}` : "Authorized, has not signed in yet"}
                      </div>
                    </div>
                    <select
                      className={cn(inputCls, "w-auto py-1.5 text-xs")}
                      value={m.role}
                      disabled={m.status === "revoked" || busyId === k || (lastMgr && m.role === "manager")}
                      title={lastMgr ? "The last active manager cannot be demoted" : undefined}
                      onChange={(e) => submit({ email: m.email, role: e.target.value as TeamMemberInput["role"], status: m.status }, `${m.email} is now ${e.target.value}`, k)}
                      data-testid={`select-role-${m.id}`}
                    >
                      <option value="staff">Staff</option><option value="manager">Manager</option>
                    </select>
                    {m.status === "active" ? (
                      <Btn variant="ghost" className="px-2 py-1 text-xs text-rose-700" disabled={lastMgr || busyId === k} title={lastMgr ? "The last active manager cannot be revoked" : undefined} onClick={() => setRevoking(m)} data-testid={`button-revoke-${m.id}`}><Ban className="h-3.5 w-3.5" />Revoke</Btn>
                    ) : (
                      <Btn variant="outline" className="px-2 py-1 text-xs" disabled={busyId === k} onClick={() => submit({ email: m.email, role: m.role, status: "active" }, `Access restored for ${m.email}`, k)} data-testid={`button-restore-${m.id}`}><RotateCcw className="h-3.5 w-3.5" />Restore</Btn>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {activeManagers <= 1 && members.length > 0 && <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-primary" />At least one active manager must remain, so the last one cannot be demoted or revoked.</p>}
        </Panel>

        <div className="space-y-4">
          <Panel title="Authorize an email">
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (validEmail) submit({ email: email.trim().toLowerCase(), role, status: "active" }, `${email.trim()} authorized`, "new", () => setEmail("")); }}>
              <Field label="Email address"><input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mechanic@yourshop.my" data-testid="input-team-email" /></Field>
              <Field label="Role">
                <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as TeamMemberInput["role"])} data-testid="select-team-role">
                  <option value="staff">Staff - request, source, quote, order, receive</option>
                  <option value="manager">Manager - all staff work plus approvals, settings, team</option>
                </select>
              </Field>
              <Btn type="submit" className="w-full justify-center" disabled={!validEmail || busyId === "new"} data-testid="button-add-member"><UserPlus className="h-4 w-4" />{busyId === "new" ? "Saving..." : "Authorize email"}</Btn>
            </form>
          </Panel>
          <div className="rounded-lg border border-dashed border-primary/40 bg-secondary/50 p-4 text-sm text-secondary-foreground">
            <div className="mb-1 flex items-center gap-1.5 font-semibold"><Link2 className="h-4 w-4" />No invitation email is sent</div>
            <p className="text-xs leading-relaxed">Authorizing only adds the address to the allowlist. Share the app link yourself (chat, SMS). Your teammate signs up with that exact email and must verify it before the workspace opens.</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="num min-w-0 flex-1 truncate rounded border bg-card px-2 py-1 text-[11px]" data-testid="text-app-link">{appLink}</code>
              <Btn variant="outline" className="px-2 py-1 text-xs" onClick={() => { navigator.clipboard?.writeText(appLink).then(() => toast({ title: "Link copied" }), () => toast({ title: "Copy failed", variant: "destructive" })); }} data-testid="button-copy-link">Copy</Btn>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={!!revoking} onOpenChange={(o) => !o && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke access for {revoking?.email}?</AlertDialogTitle>
            <AlertDialogDescription>They will lose access to all requests, suppliers and orders on their next status check (within 15 seconds). Their past actions stay in the audit trail. You can restore access later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-revoke">Keep access</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (revoking) submit({ email: revoking.email, role: revoking.role, status: "revoked" }, `Access revoked for ${revoking.email}`, String(revoking.id)); setRevoking(null); }} data-testid="button-confirm-revoke">Revoke access</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
