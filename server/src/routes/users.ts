import { Router } from "express";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../lib/prisma.ts";
import { Role } from "../generated/prisma/enums.js";
import { requireAuth, requireAdmin } from "../middleware/auth.ts";

const router = Router();

router.get("/users", requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ users });
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/users", requireAuth, requireAdmin, async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (name.length < 3) {
    res.status(400).json({ error: "Name must be at least 3 characters" });
    return;
  }
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "A user with this email already exists" });
    return;
  }

  const hashed = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name,
      email,
      emailVerified: true,
      role: Role.agent,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  await prisma.account.create({
    data: {
      id: crypto.randomUUID(),
      accountId: email,
      providerId: "credential",
      userId: user.id,
      password: hashed,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  res.status(201).json({ user });
});

export default router;
