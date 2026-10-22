import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  userId: text("user_id").unique(),
  role: text("role", { enum: ["staff", "manager"] }).notNull(),
  status: text("status", { enum: ["active", "revoked"] }).notNull().default("active"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({ id: true, joinedAt: true });
export type TeamMemberRecord = typeof teamMembers.$inferSelect;
