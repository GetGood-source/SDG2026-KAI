import { pgTable, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const procurementWorkspace = pgTable("procurement_workspace", {
  id: integer("id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProcurementWorkspaceSchema = createInsertSchema(procurementWorkspace);
export type ProcurementWorkspace = typeof procurementWorkspace.$inferSelect;
