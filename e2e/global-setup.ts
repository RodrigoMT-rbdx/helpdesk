import { execSync } from "child_process";
import { config } from "dotenv";
import path from "path";

const serverDir = path.resolve(__dirname, "../server");

export default async function globalSetup() {
  config({ path: path.resolve(serverDir, ".env.test") });

  execSync("bunx prisma migrate reset --force --skip-generate", {
    cwd: serverDir,
    env: { ...process.env, NODE_ENV: "test" },
    stdio: "inherit",
  });
}
