import { db, procurementWorkspace, teamMembers } from "@workspace/db";
import { eq } from "drizzle-orm";
import { seedState, type ProcurementState } from "./procurement-seed";
import { accountContext } from "./account-context";

export class ProcurementError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function withWorkspace<T>(fn: (state: ProcurementState, tx: Transaction) => T | Promise<T>): Promise<T> {
  return db.transaction(async tx => {
    await tx.insert(procurementWorkspace).values({ id: 1, data: seedState() }).onConflictDoNothing();
    const [row] = await tx.select().from(procurementWorkspace).where(eq(procurementWorkspace.id, 1)).for("update");
    if (!row) throw new ProcurementError("Workspace unavailable", 503);
    const account = accountContext.getStore();
    if (account) {
      const member = (await tx.select().from(teamMembers).where(eq(teamMembers.userId, account.userId)))[0];
      if (member?.status !== "active" || member.role !== account.role) {
        throw new ProcurementError("Your workspace access has changed. Refresh to continue.", 403);
      }
    }
    const state = row.data as ProcurementState;
    const result = await fn(state, tx);
    await tx.update(procurementWorkspace).set({ data: state, updatedAt: new Date() }).where(eq(procurementWorkspace.id, 1));
    return result;
  });
}

export function audit(state: ProcurementState, action: string, detail: string, requestId: number | null = null, actor = "Procurement team"): void {
  const account = accountContext.getStore();
  if (account) {
    const automation = actor !== "Procurement team" && actor !== account.name ? `; via ${actor}` : "";
    actor = `${account.name} [${account.role}; ${account.userId}${automation}]`;
  }
  state.activity.unshift({
    id: Math.max(0, ...state.activity.map(a => a.id)) + 1,
    action, detail, requestId, actor, createdAt: new Date().toISOString(),
  });
}

export function refreshSummary(s: ProcurementState): void {
  const purchased = s.requests.filter(r => ["ordered", "delivered"].includes(r.status));
  const selected = (r: ProcurementState["requests"][number]) => r.quotes.find(q => q.id === r.selectedQuoteId);
  s.summary = {
    activeRequests: s.requests.filter(r => !["delivered", "rejected"].includes(r.status)).length,
    pendingApprovals: s.requests.filter(r => r.status === "awaiting_approval").length,
    inTransit: s.requests.filter(r => r.status === "ordered").length,
    delivered: s.requests.filter(r => r.status === "delivered").length,
    totalSpend: purchased.reduce((sum, r) => sum + (selected(r)?.total ?? 0), 0),
    lowStock: s.inventory.filter(i => i.quantity < i.minimum).length,
    savings: purchased.reduce((sum, r) => sum + Math.max(0, Math.max(...r.quotes.filter(q => q.available).map(q => q.total)) - (selected(r)?.total ?? 0)), 0),
  };
}
