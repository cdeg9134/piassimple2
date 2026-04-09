import { db, storesTable, ticketsTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { logger } from "./logger";

export async function seedDefaultStore() {
  try {
    const existing = await db.select().from(storesTable).limit(1);
    if (existing.length === 0) {
      const [store] = await db.insert(storesTable).values({
        name: "Main Store",
        username: "store",
        password: "1234",
      }).returning();
      logger.info({ storeId: store.id }, "Created default store (username: store, password: 1234)");

      await db.update(ticketsTable)
        .set({ storeId: store.id })
        .where(isNull(ticketsTable.storeId));
      logger.info("Assigned existing tickets to default store");
    } else {
      const storeId = existing[0].id;
      await db.update(ticketsTable)
        .set({ storeId })
        .where(isNull(ticketsTable.storeId));
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed default store");
  }
}
