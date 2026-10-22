import { db, procurementWorkspace } from "@workspace/db";
import { eq } from "drizzle-orm";
import { seedState, type ProcurementState } from "./procurement-seed";

export class ProcurementError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function withWorkspace<T>(fn: (state: ProcurementState) => T | Promise<T>): Promise<T> {
  return db.transaction(async tx => {
    await tx.insert(procurementWorkspace).values({ id: 1, data: seedState() }).onConflictDoNothing();
    const [row] = await tx.select().from(procurementWorkspace).where(eq(procurementWorkspace.id, 1)).for("update");
    if (!row) throw new ProcurementError("Workspace unavailable", 503);
    const state = row.data as ProcurementState;
    const result = await fn(state);
    await tx.update(procurementWorkspace).set({ data: state, updatedAt: new Date() }).where(eq(procurementWorkspace.id, 1));
    return result;
  });
}

export function audit(state: ProcurementState, action: string, detail: string, requestId: number | null = null, actor = "Procurement team"): void {
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
