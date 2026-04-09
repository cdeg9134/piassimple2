import { Request, Response, NextFunction } from "express";
import { verifyToken, type TokenPayload } from "../lib/token";

declare global {
  namespace Express {
    interface Request {
      store?: TokenPayload;
    }
  }
}

export function requireStore(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  req.store = payload;
  next();
}
