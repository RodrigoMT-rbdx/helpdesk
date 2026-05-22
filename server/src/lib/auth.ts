import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.ts";
import { env } from "./env.ts";

export const auth = betterAuth({
  basePath: "/api/auth",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  trustedOrigins: [env.CLIENT_ORIGIN],
  advanced: {
    cookies: {
      sessionToken: {
        attributes: {
          secure: env.NODE_ENV === "production",
          sameSite: "lax",
        },
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: ["admin", "agent"] as const,
        required: true,
        defaultValue: "agent",
        input: false,
      },
    },
  },
});
