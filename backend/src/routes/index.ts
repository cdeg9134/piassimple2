import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ticketsRouter from "./tickets";
import settingsRouter from "./settings";
import authRouter from "./auth";
import storesRouter from "./stores";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/stores", storesRouter);
router.use("/tickets", ticketsRouter);
router.use("/settings", settingsRouter);

export default router;
