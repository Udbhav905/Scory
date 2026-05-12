import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { query } from "./app/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const result = await query(
          "SELECT id, name, email, password_hash FROM users WHERE email = $1",
          [credentials.email]
        );
        const user = result.rows[0];

        if (user && await bcrypt.compare(String(credentials.password), user.password_hash)) {
          return {
            id: user.id.toString(),
            name: user.name,
            email: user.email,
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const existing = await query(
          "SELECT id FROM users WHERE google_id = $1 OR email = $2",
          [profile?.sub, profile?.email]
        );
        if (existing.rows.length === 0) {
          // Create new user
          await query(
            "INSERT INTO users (name, email, google_id) VALUES ($1, $2, $3)",
            [profile?.name, profile?.email, profile?.sub]
          );
        } else if (!existing.rows[0].google_id) {
          // Link google_id to existing email account
          await query(
            "UPDATE users SET google_id = $1 WHERE email = $2",
            [profile?.sub, profile?.email]
          );
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
  },
  pages: {
    signIn: "/auth-page", //no used!
  },
  session: { strategy: "jwt" },
});