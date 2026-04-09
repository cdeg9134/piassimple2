import { Router } from "express";
import { db, storesTable, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireStore } from "../middlewares/storeAuth";

const router = Router();

async function getStoreSettings(storeId: number) {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.storeId, storeId));
  if (rows.length === 0) {
    const [created] = await db.insert(settingsTable).values({ storeId }).returning();
    return created;
  }
  return rows[0];
}

router.get("/", requireStore, async (req, res) => {
  const stores = await db.select({ id: storesTable.id, name: storesTable.name, username: storesTable.username, createdAt: storesTable.createdAt }).from(storesTable);
  return res.json(stores);
});

router.post("/", requireStore, async (req, res) => {
  const isAdmin = req.store!.isAdmin;
  const { name, username, password, adminPassword } = req.body ?? {};
  if (!name || !username || !password) {
    return res.status(400).json({ error: "name, username, and password are required" });
  }

  if (!isAdmin) {
    const settings = await getStoreSettings(req.store!.storeId);
    if (adminPassword !== settings.adminPassword) {
      return res.status(403).json({ error: "Invalid admin password" });
    }
  }

  const existing = await db.select().from(storesTable).where(eq(storesTable.username, username));
  if (existing.length > 0) {
    return res.status(409).json({ error: "Username already taken" });
  }

  const [store] = await db.insert(storesTable).values({ name, username, password }).returning();
  res.status(201).json({ id: store.id, name: store.name, username: store.username, createdAt: store.createdAt });
});

router.put("/:id", requireStore, async (req, res) => {
  const isAdmin = req.store!.isAdmin;
  const storeId = parseInt(req.params.id);
  const { name, username, password, adminPassword } = req.body ?? {};

  if (!isAdmin) {
    const settings = await getStoreSettings(req.store!.storeId);
    if (adminPassword !== settings.adminPassword) {
      return res.status(403).json({ error: "Invalid admin password" });
    }
  }

  const set: Record<string, string> = {};
  if (name) set.name = name;
  if (username) set.username = username;
  if (password) set.password = password;

  if (Object.keys(set).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  const [updated] = await db.update(storesTable).set(set).where(eq(storesTable.id, storeId)).returning();
  if (!updated) return res.status(404).json({ error: "Store not found" });
  res.json({ id: updated.id, name: updated.name, username: updated.username, createdAt: updated.createdAt });
});

router.delete("/:id", requireStore, async (req, res) => {
  const isAdmin = req.store!.isAdmin;
  const storeId = parseInt(req.params.id);
  const { adminPassword } = req.body ?? {};

  if (!isAdmin && storeId === req.store!.storeId) {
    return res.status(400).json({ error: "Cannot delete your own store" });
  }

  if (!isAdmin) {
    const settings = await getStoreSettings(req.store!.storeId);
    if (adminPassword !== settings.adminPassword) {
      return res.status(403).json({ error: "Invalid admin password" });
    }
  }

  await db.delete(storesTable).where(eq(storesTable.id, storeId));
  res.json({ success: true });
});

export default router;
