import { Router } from "express";
import { db, ticketsTable, settingsTable, storesTable } from "@workspace/db";
import { eq, ilike, or, and, gte, lte } from "drizzle-orm";
import {
  ListTicketsQueryParams,
  CreateTicketBody,
  UpdateTicketParams,
  UpdateTicketBody,
  DeleteTicketParams,
  DeleteTicketBody,
  UnlockTicketParams,
  UnlockTicketBody,
  GetTicketParams,
} from "@workspace/api-zod";
import { requireStore } from "../middlewares/storeAuth";

const router = Router();

router.use(requireStore);

function generateTicketNumber(): string {
  return Math.floor(1000000 + Math.random() * 9000000).toString();
}

type TicketRow = typeof ticketsTable.$inferSelect;

function mapTicket(t: TicketRow, storeName?: string) {
  return {
    id: t.id,
    storeId: t.storeId,
    storeName: storeName ?? null,
    ticketNumber: t.ticketNumber,
    serviceType: t.serviceType,
    status: t.status,
    employeeInitials: t.employeeInitials ?? null,
    dropoffDate: t.dropoffDate ?? null,
    promiseDate: t.promiseDate ?? null,
    willCall: t.willCall,
    customerName: t.customerName ?? null,
    customerPhone: t.customerPhone ?? null,
    customerAddress: t.customerAddress ?? null,
    customerCity: t.customerCity ?? null,
    customerProvince: t.customerProvince ?? null,
    customerPostal: t.customerPostal ?? null,
    customerWeight: t.customerWeight ?? null,
    customerHeight: t.customerHeight ?? null,
    customerSignature: t.customerSignature ?? null,
    customerSignatureRole: t.customerSignatureRole ?? null,
    customerSignatureTimestamp: t.customerSignatureTimestamp ?? null,
    customerWaiverAccepted: t.customerWaiverAccepted,
    skiBrand: t.skiBrand ?? null,
    skiModel: t.skiModel ?? null,
    skiColor: t.skiColor ?? null,
    skiOwnership: t.skiOwnership ?? null,
    bootBrand: t.bootBrand ?? null,
    bootModel: t.bootModel ?? null,
    bootColor: t.bootColor ?? null,
    bootOwnership: t.bootOwnership ?? null,
    bootOutsoleLength: t.bootOutsoleLength ?? null,
    snowboardBrand: t.snowboardBrand ?? null,
    snowboardModel: t.snowboardModel ?? null,
    snowboardColor: t.snowboardColor ?? null,
    skiPrice: t.skiPrice ? Number(t.skiPrice) : null,
    bootPrice: t.bootPrice ? Number(t.bootPrice) : null,
    services: (t.services as string[]) ?? [],
    customServices: (t.customServices as Array<{ name: string; price: number }>) ?? [],
    serviceAdjustments: (t.serviceAdjustments as Record<string, number>) ?? {},
    expressService: t.expressService,
    ptexPrice: t.ptexPrice ? Number(t.ptexPrice) : null,
    taxRate: Math.round(Number(t.taxRate) * 10000) / 100,
    taxExempt: t.taxExempt,
    skiClassification: t.skiClassification ?? null,
    dinFrontLeft: t.dinFrontLeft ? Number(t.dinFrontLeft) : null,
    dinFrontRight: t.dinFrontRight ? Number(t.dinFrontRight) : null,
    dinRearLeft: t.dinRearLeft ? Number(t.dinRearLeft) : null,
    dinRearRight: t.dinRearRight ? Number(t.dinRearRight) : null,
    bindingBrand: t.bindingBrand ?? null,
    bindingModel: t.bindingModel ?? null,
    techInitials: t.techInitials ?? null,
    techSignature: t.techSignature ?? null,
    techSignatureTimestamp: t.techSignatureTimestamp ?? null,
    techCompletionDate: t.techCompletionDate ?? null,
    techNotes: t.techNotes ?? null,
    pickupSignature: t.pickupSignature ?? null,
    pickupSignatureRole: t.pickupSignatureRole ?? null,
    pickupSignatureTimestamp: t.pickupSignatureTimestamp ?? null,
    pickupWaiverAccepted: t.pickupWaiverAccepted,
    contactStatus: t.contactStatus ?? "none",
    lastContactAttempt: t.lastContactAttempt ?? null,
    contactNotes: t.contactNotes ?? null,
    equipmentDescription: t.equipmentDescription ?? null,
    lockedSections: (t.lockedSections as string[]) ?? [],
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

async function getSettings(storeId: number) {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.storeId, storeId));
  if (rows.length === 0) {
    const [newSettings] = await db.insert(settingsTable).values({ storeId }).returning();
    return newSettings;
  }
  return rows[0];
}

// GET /tickets
router.get("/", async (req, res) => {
  const isAdmin = req.store!.isAdmin;
  const storeId = req.store!.storeId;
  const query = ListTicketsQueryParams.parse(req.query);

  const conditions: ReturnType<typeof eq>[] = [];
  const adminStoreFilter = req.query.storeId ? Number(req.query.storeId) : null;

  if (!isAdmin) {
    conditions.push(eq(ticketsTable.storeId, storeId));
  } else if (adminStoreFilter) {
    conditions.push(eq(ticketsTable.storeId, adminStoreFilter));
  }

  if (query.search) {
    conditions.push(
      or(
        ilike(ticketsTable.customerName, `%${query.search}%`),
        ilike(ticketsTable.ticketNumber, `%${query.search}%`)
      )! as ReturnType<typeof eq>
    );
  }
  if (query.status) conditions.push(eq(ticketsTable.status, query.status));
  if (query.serviceType) conditions.push(eq(ticketsTable.serviceType, query.serviceType));
  if (query.dateFrom) conditions.push(gte(ticketsTable.dropoffDate, query.dateFrom) as ReturnType<typeof eq>);
  if (query.dateTo) conditions.push(lte(ticketsTable.dropoffDate, query.dateTo) as ReturnType<typeof eq>);
  if (query.contactStatus) conditions.push(eq(ticketsTable.contactStatus, query.contactStatus));

  const tickets = await db.select().from(ticketsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(ticketsTable.createdAt);

  if (isAdmin) {
    const stores = await db.select({ id: storesTable.id, name: storesTable.name }).from(storesTable);
    const storeMap = new Map(stores.map(s => [s.id, s.name]));
    return res.json(tickets.map(t => mapTicket(t, storeMap.get(t.storeId))));
  }

  res.json(tickets.map(t => mapTicket(t)));
});

// GET /tickets/stats
router.get("/stats", async (req, res) => {
  const isAdmin = req.store!.isAdmin;
  const storeId = req.store!.storeId;

  const all = isAdmin
    ? await db.select().from(ticketsTable)
    : await db.select().from(ticketsTable).where(eq(ticketsTable.storeId, storeId));

  const today = new Date().toISOString().split("T")[0];

  const stats = {
    total: all.length,
    received: all.filter(t => t.status === "received").length,
    inProgress: all.filter(t => t.status === "in_progress").length,
    readyForPickup: all.filter(t => t.status === "ready_for_pickup").length,
    completed: all.filter(t => t.status === "completed").length,
    byServiceType: {
      ski_full: all.filter(t => t.serviceType === "ski_full").length,
      ski_service: all.filter(t => t.serviceType === "ski_service").length,
      snowboard_service: all.filter(t => t.serviceType === "snowboard_service").length,
    },
    todayCount: all.filter(t => t.dropoffDate === today).length,
  };

  res.json(stats);
});

// POST /tickets
router.post("/", async (req, res) => {
  const isAdmin = req.store!.isAdmin;
  if (isAdmin) {
    return res.status(403).json({ error: "Admin cannot create tickets. Log in as a store." });
  }
  const storeId = req.store!.storeId;
  const body = CreateTicketBody.parse(req.body);
  const settings = await getSettings(storeId);

  let ticketNumber = generateTicketNumber();
  let exists = await db.select().from(ticketsTable).where(eq(ticketsTable.ticketNumber, ticketNumber));
  while (exists.length > 0) {
    ticketNumber = generateTicketNumber();
    exists = await db.select().from(ticketsTable).where(eq(ticketsTable.ticketNumber, ticketNumber));
  }

  const today = new Date().toISOString().split("T")[0];

  const [ticket] = await db.insert(ticketsTable).values({
    storeId,
    ticketNumber,
    serviceType: body.serviceType,
    status: "received",
    employeeInitials: body.employeeInitials ?? null,
    dropoffDate: body.dropoffDate ?? today,
    promiseDate: body.promiseDate ?? null,
    willCall: body.willCall,
    customerName: body.customerName ?? null,
    customerPhone: body.customerPhone ?? null,
    customerAddress: body.customerAddress ?? null,
    customerCity: body.customerCity ?? null,
    customerProvince: body.customerProvince ?? null,
    customerPostal: body.customerPostal ?? null,
    customerWeight: body.customerWeight ?? null,
    customerHeight: body.customerHeight ?? null,
    customerWaiverAccepted: false,
    skiBrand: body.skiBrand ?? null,
    skiModel: body.skiModel ?? null,
    skiColor: body.skiColor ?? null,
    skiOwnership: body.skiOwnership ?? null,
    bootBrand: body.bootBrand ?? null,
    bootModel: body.bootModel ?? null,
    bootColor: body.bootColor ?? null,
    bootOwnership: body.bootOwnership ?? null,
    bootOutsoleLength: body.bootOutsoleLength ?? null,
    snowboardBrand: body.snowboardBrand ?? null,
    snowboardModel: body.snowboardModel ?? null,
    snowboardColor: body.snowboardColor ?? null,
    skiPrice: body.skiPrice?.toString() ?? null,
    bootPrice: body.bootPrice?.toString() ?? null,
    services: body.services ?? [],
    customServices: body.customServices ?? [],
    expressService: body.expressService,
    ptexPrice: body.ptexPrice?.toString() ?? null,
    taxRate: body.taxRate !== undefined ? (body.taxRate / 100).toFixed(4) : settings.taxRate,
    taxExempt: body.taxExempt,
    skiClassification: body.skiClassification ?? null,
    dinFrontLeft: body.dinFrontLeft?.toString() ?? null,
    dinFrontRight: body.dinFrontRight?.toString() ?? null,
    dinRearLeft: body.dinRearLeft?.toString() ?? null,
    dinRearRight: body.dinRearRight?.toString() ?? null,
    bindingBrand: body.bindingBrand ?? null,
    bindingModel: body.bindingModel ?? null,
    techInitials: body.techInitials ?? null,
    techNotes: body.techNotes ?? null,
    equipmentDescription: body.equipmentDescription ?? null,
    lockedSections: [],
    pickupWaiverAccepted: false,
  }).returning();

  res.status(201).json(mapTicket(ticket));
});

// GET /tickets/:id
router.get("/:id", async (req, res) => {
  const isAdmin = req.store!.isAdmin;
  const storeId = req.store!.storeId;
  const { id } = GetTicketParams.parse({ id: parseInt(req.params.id) });

  const [ticket] = isAdmin
    ? await db.select().from(ticketsTable).where(eq(ticketsTable.id, id))
    : await db.select().from(ticketsTable).where(and(eq(ticketsTable.id, id), eq(ticketsTable.storeId, storeId)));

  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  if (isAdmin) {
    const [store] = await db.select({ name: storesTable.name }).from(storesTable).where(eq(storesTable.id, ticket.storeId));
    return res.json(mapTicket(ticket, store?.name));
  }

  res.json(mapTicket(ticket));
});

// PUT /tickets/:id
router.put("/:id", async (req, res) => {
  const isAdmin = req.store!.isAdmin;
  const storeId = req.store!.storeId;
  const { id } = UpdateTicketParams.parse({ id: parseInt(req.params.id) });
  const body = UpdateTicketBody.parse(req.body);

  const [existing] = isAdmin
    ? await db.select().from(ticketsTable).where(eq(ticketsTable.id, id))
    : await db.select().from(ticketsTable).where(and(eq(ticketsTable.id, id), eq(ticketsTable.storeId, storeId)));

  if (!existing) return res.status(404).json({ error: "Ticket not found" });

  const lockedSections = (existing.lockedSections as string[]) ?? [];
  const newLockedSections = [...lockedSections];

  if (body.customerSignature && !newLockedSections.includes("customer")) newLockedSections.push("customer");
  if (body.pickupSignature && !newLockedSections.includes("pickup")) newLockedSections.push("pickup");
  if (body.techSignature && !newLockedSections.includes("tech")) newLockedSections.push("tech");

  const set: Partial<typeof ticketsTable.$inferInsert> & { updatedAt: Date; lockedSections: string[] } = {
    lockedSections: newLockedSections,
    updatedAt: new Date(),
  };

  const b = body as Record<string, unknown>;

  const str = (f: string) => { const v = b[f]; if (v !== undefined) (set as Record<string, unknown>)[f] = v ?? null; };
  const bool = (f: string) => { const v = b[f]; if (v !== undefined) (set as Record<string, unknown>)[f] = v; };
  const num = (f: string) => { const v = b[f]; if (v !== undefined) (set as Record<string, unknown>)[f] = v === null ? null : String(v); };

  str("serviceType"); str("status"); str("employeeInitials"); str("dropoffDate"); str("promiseDate");
  str("customerName"); str("customerPhone"); str("customerAddress"); str("customerCity");
  str("customerProvince"); str("customerPostal"); str("customerWeight"); str("customerHeight");
  str("customerSignature"); str("customerSignatureRole"); str("customerSignatureTimestamp");
  str("skiBrand"); str("skiModel"); str("skiColor"); str("skiOwnership");
  str("bootBrand"); str("bootModel"); str("bootColor"); str("bootOwnership"); str("bootOutsoleLength");
  str("snowboardBrand"); str("snowboardModel"); str("snowboardColor");
  str("skiClassification"); str("bindingBrand"); str("bindingModel"); str("techInitials");
  str("techSignature"); str("techSignatureTimestamp"); str("techCompletionDate"); str("techNotes");
  str("pickupSignature"); str("pickupSignatureRole"); str("pickupSignatureTimestamp");
  str("contactNotes"); str("equipmentDescription");

  if (b["contactStatus"] !== undefined) {
    (set as Record<string, unknown>)["contactStatus"] = b["contactStatus"] ?? "none";
    const newStatus = b["contactStatus"] as string | null;
    if (newStatus && newStatus !== "none" && newStatus !== existing.contactStatus) {
      (set as Record<string, unknown>)["lastContactAttempt"] = new Date().toISOString();
    }
  }

  bool("willCall"); bool("customerWaiverAccepted"); bool("expressService");
  bool("taxExempt"); bool("pickupWaiverAccepted");

  num("skiPrice"); num("bootPrice"); num("ptexPrice");
  num("dinFrontLeft"); num("dinFrontRight"); num("dinRearLeft"); num("dinRearRight");

  if (b["taxRate"] !== undefined) {
    const tr = b["taxRate"];
    (set as Record<string, unknown>)["taxRate"] = tr === null ? null : (Number(tr) / 100).toFixed(4);
  }

  if (b["services"] !== undefined) (set as Record<string, unknown>)["services"] = b["services"];
  if (b["customServices"] !== undefined) (set as Record<string, unknown>)["customServices"] = b["customServices"];
  if (b["serviceAdjustments"] !== undefined) (set as Record<string, unknown>)["serviceAdjustments"] = b["serviceAdjustments"];

  const whereClause = isAdmin
    ? eq(ticketsTable.id, id)
    : and(eq(ticketsTable.id, id), eq(ticketsTable.storeId, storeId));

  const [updated] = await db.update(ticketsTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(set as any)
    .where(whereClause)
    .returning();

  res.json(mapTicket(updated));
});

// DELETE /tickets/:id
router.delete("/:id", async (req, res) => {
  const isAdmin = req.store!.isAdmin;
  const storeId = req.store!.storeId;
  const { id } = DeleteTicketParams.parse({ id: parseInt(req.params.id) });
  const body = DeleteTicketBody.parse(req.body);

  if (!isAdmin) {
    const settings = await getSettings(storeId);
    if (body.password !== settings.adminPassword) {
      return res.status(403).json({ error: "Invalid admin password" });
    }
  }

  const whereClause = isAdmin
    ? eq(ticketsTable.id, id)
    : and(eq(ticketsTable.id, id), eq(ticketsTable.storeId, storeId));

  await db.delete(ticketsTable).where(whereClause);
  res.json({ success: true });
});

// POST /tickets/:id/unlock
router.post("/:id/unlock", async (req, res) => {
  const isAdmin = req.store!.isAdmin;
  const storeId = req.store!.storeId;
  const { id } = UnlockTicketParams.parse({ id: parseInt(req.params.id) });
  const body = UnlockTicketBody.parse(req.body);

  const [existing] = isAdmin
    ? await db.select().from(ticketsTable).where(eq(ticketsTable.id, id))
    : await db.select().from(ticketsTable).where(and(eq(ticketsTable.id, id), eq(ticketsTable.storeId, storeId)));

  if (!existing) return res.status(404).json({ error: "Ticket not found" });

  let role: string | null = isAdmin ? "admin" : null;

  if (!isAdmin) {
    const settings = await getSettings(storeId);
    if (body.password === settings.adminPassword) role = "admin";
    else if (body.password === settings.staffPassword) role = "staff";
    if (!role) return res.status(403).json({ success: false, error: "Invalid password" });
  }

  const lockedSections = (existing.lockedSections as string[]) ?? [];
  const newLocked = lockedSections.filter(s => s !== body.section);

  const whereClause = isAdmin
    ? eq(ticketsTable.id, id)
    : and(eq(ticketsTable.id, id), eq(ticketsTable.storeId, storeId));

  await db.update(ticketsTable)
    .set({ lockedSections: newLocked, updatedAt: new Date() })
    .where(whereClause);

  res.json({ success: true, role });
});

export default router;
