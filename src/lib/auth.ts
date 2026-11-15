import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type DefaultSession } from "next-auth";
import Resend from "next-auth/providers/resend";
import { SignInLinkEmail, signInLinkText } from "@/emails/sign-in-link";
import type { Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getEmailEnv } from "@/lib/env";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
  interface User {
    role?: Role;
  }
}

// The adapter is typed against `@prisma/client`; our client is generated to
// src/generated with the same model delegates, so the shapes line up.
const adapter = PrismaAdapter(db as unknown as Parameters<typeof PrismaAdapter>[0]);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  session: { strategy: "database" },
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/sign-in/check-email",
    error: "/sign-in",
  },
  providers: [
    Resend({
      from: getEmailEnv().EMAIL_FROM,
      // Delegate to our sender so dev without RESEND_API_KEY logs the link.
      async sendVerificationRequest({ identifier, url }) {
        await sendEmail({
          to: identifier,
          subject: "Your ShopLane sign-in link",
          react: SignInLinkEmail({ url }),
          text: signInLinkText(url),
        });
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role ?? "CUSTOMER";
      return session;
    },
  },
});
