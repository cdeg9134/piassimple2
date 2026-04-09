import { pgTable, serial, text, boolean, numeric, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id"),
  ticketNumber: text("ticket_number").notNull().unique(),
  serviceType: text("service_type").notNull().default("ski_full"),
  status: text("status").notNull().default("received"),
  employeeInitials: text("employee_initials"),
  dropoffDate: text("dropoff_date"),
  promiseDate: text("promise_date"),
  willCall: boolean("will_call").notNull().default(false),

  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerAddress: text("customer_address"),
  customerCity: text("customer_city"),
  customerProvince: text("customer_province"),
  customerPostal: text("customer_postal"),
  customerWeight: text("customer_weight"),
  customerHeight: text("customer_height"),
  customerSignature: text("customer_signature"),
  customerSignatureRole: text("customer_signature_role"),
  customerSignatureTimestamp: text("customer_signature_timestamp"),
  customerWaiverAccepted: boolean("customer_waiver_accepted").notNull().default(false),

  skiBrand: text("ski_brand"),
  skiModel: text("ski_model"),
  skiColor: text("ski_color"),
  skiOwnership: text("ski_ownership"),
  bootBrand: text("boot_brand"),
  bootModel: text("boot_model"),
  bootColor: text("boot_color"),
  bootOwnership: text("boot_ownership"),
  bootOutsoleLength: text("boot_outsole_length"),
  snowboardBrand: text("snowboard_brand"),
  snowboardModel: text("snowboard_model"),
  snowboardColor: text("snowboard_color"),

  skiPrice: numeric("ski_price", { precision: 10, scale: 2 }),
  bootPrice: numeric("boot_price", { precision: 10, scale: 2 }),
  services: jsonb("services").notNull().default([]),
  customServices: jsonb("custom_services").notNull().default([]),
  serviceAdjustments: jsonb("service_adjustments").notNull().default({}),
  expressService: boolean("express_service").notNull().default(false),
  ptexPrice: numeric("ptex_price", { precision: 10, scale: 2 }),
  taxRate: numeric("tax_rate", { precision: 5, scale: 4 }).notNull().default("0.05"),
  taxExempt: boolean("tax_exempt").notNull().default(false),

  skiClassification: text("ski_classification"),
  dinFrontLeft: numeric("din_front_left", { precision: 5, scale: 2 }),
  dinFrontRight: numeric("din_front_right", { precision: 5, scale: 2 }),
  dinRearLeft: numeric("din_rear_left", { precision: 5, scale: 2 }),
  dinRearRight: numeric("din_rear_right", { precision: 5, scale: 2 }),
  bindingBrand: text("binding_brand"),
  bindingModel: text("binding_model"),
  techInitials: text("tech_initials"),
  techSignature: text("tech_signature"),
  techSignatureTimestamp: text("tech_signature_timestamp"),
  techCompletionDate: text("tech_completion_date"),
  techNotes: text("tech_notes"),

  pickupSignature: text("pickup_signature"),
  pickupSignatureRole: text("pickup_signature_role"),
  pickupSignatureTimestamp: text("pickup_signature_timestamp"),
  pickupWaiverAccepted: boolean("pickup_waiver_accepted").notNull().default(false),

  contactStatus: text("contact_status").default("none"),
  lastContactAttempt: text("last_contact_attempt"),
  contactNotes: text("contact_notes"),

  equipmentDescription: text("equipment_description"),
  lockedSections: jsonb("locked_sections").notNull().default([]),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTicketSchema = createInsertSchema(ticketsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof ticketsTable.$inferSelect;
