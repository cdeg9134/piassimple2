import { Router } from "express";
import { db, storesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken } from "../lib/token";
import { requireStore } from "../middlewares/storeAuth";

const MASTER_ADMIN_USERNAME = "vule";
const MASTER_ADMIN_PASSWORD = "1234";

const router = Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const [store] = await db.select().from(storesTable).where(eq(storesTable.username, username));
  if (!store || store.password !== password) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = signToken({ storeId: store.id, storeName: store.name });
  res.json({ token, storeId: store.id, storeName: store.name, isAdmin: false });
});

router.post("/admin/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  if (username !== MASTER_ADMIN_USERNAME || password !== MASTER_ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid admin credentials" });
  }

  const token = signToken({ storeId: -1, storeName: "Admin", isAdmin: true });
  res.json({ token, storeId: -1, storeName: "Admin", isAdmin: true });
});

router.get("/me", requireStore, (req, res) => {
  res.json({
    storeId: req.store!.storeId,
    storeName: req.store!.storeName,
    isAdmin: req.store!.isAdmin ?? false,
  });
});

export default router;
