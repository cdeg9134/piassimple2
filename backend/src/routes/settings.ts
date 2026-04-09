import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateSettingsBody } from "@workspace/api-zod";
import { requireStore } from "../middlewares/storeAuth";

const router = Router();

router.use(requireStore);

async function getOrCreateSettings(storeId: number) {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.storeId, storeId));
  if (rows.length === 0) {
    const [newSettings] = await db.insert(settingsTable).values({ storeId }).returning();
    return newSettings;
  }
  return rows[0];
}

function mapSettings(s: typeof settingsTable.$inferSelect) {
  return {
    taxRate: Math.round(Number(s.taxRate) * 10000) / 100,
    staffPassword: s.staffPassword,
    adminPassword: s.adminPassword,
    customServices: (s.customServices as Array<{ name: string; defaultPrice: number }>) ?? [],
    autoLockMinutes: s.autoLockMinutes,
    shopName: s.shopName,
    waiverUrl: s.waiverUrl,
  };
}

router.get("/", async (req, res) => {
  const settings = await getOrCreateSettings(req.store!.storeId);
  res.json(mapSettings(settings));
});

router.put("/", async (req, res) => {
  const body = UpdateSettingsBody.parse(req.body);
  const settings = await getOrCreateSettings(req.store!.storeId);

  if (body.password !== settings.adminPassword) {
    return res.status(403).json({ error: "Invalid admin password" });
  }

  const set: Record<string, unknown> = {};

  if (body.taxRate !== undefined) set["taxRate"] = (body.taxRate / 100).toFixed(4);
  if (body.staffPassword !== undefined) set["staffPassword"] = body.staffPassword;
  if (body.adminPassword !== undefined) set["adminPassword"] = body.adminPassword;
  if (body.customServices !== undefined) set["customServices"] = body.customServices;
  if (body.autoLockMinutes !== undefined) set["autoLockMinutes"] = body.autoLockMinutes;
  if (body.shopName !== undefined) set["shopName"] = body.shopName;
  if (body.waiverUrl !== undefined) set["waiverUrl"] = body.waiverUrl;

  const [updated] = await db.update(settingsTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(set as any)
    .where(eq(settingsTable.id, settings.id))
    .returning();

  res.json(mapSettings(updated));
});

export default router;
