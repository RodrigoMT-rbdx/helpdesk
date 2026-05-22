import "./lib/env.ts";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import healthRouter from "./routes/health.ts";
import usersRouter from "./routes/users.ts";
import { auth } from "./lib/auth.ts";
import { authMiddleware, requireAuth } from "./middleware/auth.ts";
import { env } from "./lib/env.ts";

const signInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: env.NODE_ENV === "production" ? { maxAge: 31536000, includeSubDomains: true } : false,
}));
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use("/api/auth/sign-in/email", signInLimiter);
app.use("/api/auth", authLimiter);
app.all("/api/auth/{*path}", toNodeHandler(auth));
app.use(express.json());
app.use(cookieParser());
app.use(authMiddleware);

app.use("/api", healthRouter);
app.use("/api", usersRouter);

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});
