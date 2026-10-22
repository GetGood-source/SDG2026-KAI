import { Router, type IRouter } from "express";
import { db, teamMembers } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { GetCurrentAccountResponse, ListTeamResponse, SaveTeamMemberBody, SaveTeamMemberResponse, type Account } from "@workspace/api-zod";
import { identifyAccount, requireMember, requireManager, requireSameOrigin } from "../middlewares/workspace-auth";
import { audit, withWorkspace, ProcurementError } from "../lib/procurement-store";

const router: IRouter = Router();
router.get("/auth/me", identifyAccount, (_req, res) => {
  res.json(GetCurrentAccountResponse.parse(res.locals.account));
});
router.use("/team", identifyAccount, requireMember, requireManager, requireSameOrigin);
router.get("/team", async (_req, res) => {
  const members = await db.select().from(teamMembers).orderBy(teamMembers.id);
  res.json(ListTeamResponse.parse(members.map(m => ({ ...m, joinedAt: m.joinedAt.toISOString() }))));
});
router.post("/team", async (req, res): Promise<void> => {
  const parsed = SaveTeamMemberBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Enter a valid email, role and access status." }); return; }
  const input = { ...parsed.data, email: parsed.data.email.trim().toLowerCase() };
  try {
    const member = await withWorkspace(async (state, tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(7392101)`);
      const account = res.locals.account as Account;
      const all = await tx.select().from(teamMembers);
      // Recheck inside the serialized mutation to avoid concurrent privilege changes.
      const actor = all.find(m => m.userId === account.userId);
      if (actor?.role !== "manager" || actor.status !== "active") throw new ProcurementError("Manager access is required.", 403);
      const existing = all.find(m => m.email === input.email);
      if (existing?.role === "manager" && existing.status === "active" &&
          (input.role !== "manager" || input.status !== "active") &&
          all.filter(m => m.role === "manager" && m.status === "active").length <= 1) {
        throw new ProcurementError("Keep at least one active manager. Add another manager first.");
      }
      const [saved] = existing
        ? await tx.update(teamMembers).set(input).where(eq(teamMembers.id, existing.id)).returning()
        : await tx.insert(teamMembers).values(input).returning();
      audit(state, "Team access updated", `${input.email}: ${input.role}, ${input.status}. ${saved.userId ? "Account linked." : "Email preauthorized; app link must be shared separately. No invitation email sent."}`);
      return saved;
    });
    res.json(SaveTeamMemberResponse.parse({ ...member, joinedAt: member.joinedAt.toISOString() }));
  } catch (err) {
    if (err instanceof ProcurementError) { res.status(err.status).json({ error: err.message }); return; }
    req.log.error({ err }, "Team update failed");
    res.status(503).json({ error: "Team access could not be updated. Please retry." });
  }
});
export default router;
