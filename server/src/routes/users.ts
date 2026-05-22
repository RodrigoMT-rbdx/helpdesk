import { Router } from "express";
import { prisma } from "../lib/prisma.ts";
import { requireAuth, requireAdmin } from "../middleware/auth.ts";

const router = Router();

router.get("/users", requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ users });
});

export default router;
