import type { RequestHandler } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db, teamMembers, type TeamMemberRecord } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { Account } from "@workspace/api-zod";
import { accountContext } from "../lib/account-context";
import { getClerkProxyHost } from "./clerkProxyMiddleware";
import { audit, withWorkspace } from "../lib/procurement-store";

// Authentication verifies identity; membership is independently controlled by managers.
export const identifyAccount: RequestHandler = async (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (process.env.PROCUREMENT_DEMO_MODE === "true") {
    const requestedRole = req.get("x-demo-role");
    const role = requestedRole === "manager" ? "manager" : "staff";
    const account: Account = {
      userId: `demo-${role}`,
      name: role === "manager" ? "Demo Manager" : "Demo Employee",
      email: role === "manager" ? "manager@demo.local" : "employee@demo.local",
      role,
      status: "active",
    };
    res.locals.account = account;
    accountContext.run(account, next);
    return;
  }
  const userId = getAuth(req).userId;
  if (!userId) { res.status(401).json({ error: "Sign in to continue." }); return; }
  try {
    const user = await clerkClient.users.getUser(userId);
    const primary = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId);
    const email = primary?.emailAddress.trim().toLowerCase() ?? "";
    const verified = primary?.verification?.status === "verified";
    let member: TeamMemberRecord | undefined = (await db.select().from(teamMembers).where(eq(teamMembers.userId, userId)))[0];
    if (verified && !member) {
      member = await withWorkspace(async (state, tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(7392101)`);
        const ownerEmail = process.env.INITIAL_MANAGER_EMAIL?.trim().toLowerCase();
        // Only the configured, verified owner can claim this grant. Existing rows,
        // including revocations and role changes, always win on subsequent logins.
        if (email && email === ownerEmail) {
          const created = await tx.insert(teamMembers).values({ email, userId, role: "manager" }).onConflictDoNothing().returning();
          if (created.length) audit(state, "First manager verified", "Owner-configured email verified. Initial manager access established.", null, `${email} [manager; ${userId}]`);
        }
        const invited = (await tx.select().from(teamMembers).where(eq(teamMembers.email, email)))[0];
        if (invited && (!invited.userId || invited.userId === userId)) {
          if (!invited.userId && invited.status === "active") {
            audit(state, "Team account linked", "Verified account linked to manager-granted email access.", null, `${email} [${invited.role}; ${userId}]`);
            return (await tx.update(teamMembers).set({ userId }).where(eq(teamMembers.id, invited.id)).returning())[0];
          }
          return invited;
        }
        return undefined;
      });
    }
    const account: Account = {
      userId,
      email,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || email || "Team member",
      role: verified && member ? member.role : null,
      status: !verified ? "unverified" : member?.status ?? "pending",
    };
    res.locals.account = account;
    accountContext.run(account, next);
  } catch (err) {
    req.log.error({ err }, "Account verification unavailable");
    res.status(503).json({ error: "Unable to verify account access. Please retry." });
  }
};

export const requireMember: RequestHandler = (_req, res, next) => {
  const account = res.locals.account as Account | undefined;
  if (account?.status !== "active") {
    res.status(403).json({ error: "Verified email and active manager-granted workspace access are required." }); return;
  }
  next();
};

export const requireManager: RequestHandler = (_req, res, next) => {
  if ((res.locals.account as Account | undefined)?.role !== "manager") {
    res.status(403).json({ error: "Only a manager can perform this action." }); return;
  }
  next();
};

export const requireSameOrigin: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) { next(); return; }
  const origin = req.get("origin");
  const host = getClerkProxyHost(req) ?? req.get("host");
  try {
    if (!origin || new URL(origin).host !== host || req.get("sec-fetch-site") === "cross-site") {
      res.status(403).json({ error: "Cross-site requests are not allowed." }); return;
    }
  } catch {
    res.status(403).json({ error: "Invalid request origin." }); return;
  }
  next();
};
