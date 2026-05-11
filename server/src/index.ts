import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import healthRouter from "./routes/health.ts";
import { auth } from "./lib/auth.ts";
import { authMiddleware, requireAuth } from "./middleware/auth.ts";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.all("/api/auth/{*path}", toNodeHandler(auth));
app.use(express.json());
app.use(cookieParser());
app.use(authMiddleware);

app.use("/api", healthRouter);

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
