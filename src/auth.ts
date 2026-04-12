import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts } from "@drizzle/schema";
import { login } from "@/server/services/auth/login";
import { DrizzleUserRepository } from "@/server/repositories/auth/user-repository.drizzle";

/**
 * NextAuth の設定。
 * Google OAuth と メール/パスワード認証をサポートする。
 * セッションは JWT 方式。
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
  }),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    Google,
    Credentials({
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      /**
       * メール/パスワードで認証する。
       * passwordHash が存在しないアカウント（OAuthのみ）・パスワード不一致・
       * emailVerified が null（未認証）のいずれかの場合は拒否する。
       */
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        return login(new DrizzleUserRepository(), {
          email: credentials.email as string,
          password: credentials.password as string,
        });
      },
    }),
  ],
  callbacks: {
    /**
     * JWT にユーザー ID と role を追加する。
     */
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }
      return token;
    },
    /**
     * セッションオブジェクトにユーザー ID と role を追加する。
     */
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.role) session.user.role = token.role;
      return session;
    },
  },
});
