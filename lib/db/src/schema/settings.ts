import { pgTable, serial, text, numeric, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id"),
  shopName: text("shop_name").notNull().default("Ski & Snowboard Service"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 4 }).notNull().default("0.05"),
  staffPassword: text("staff_password").notNull().default("1234"),
  adminPassword: text("admin_password").notNull().default("pias1234"),
  customServices: jsonb("custom_services").notNull().default([]),
  autoLockMinutes: integer("auto_lock_minutes").notNull().default(30),
  waiverUrl: text("waiver_url").notNull().default(""),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
