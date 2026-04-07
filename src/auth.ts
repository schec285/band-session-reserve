import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts } from "@drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
       * passwordHash が存在しないアカウント（OAuthのみ）は拒否する。
       */
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    /**
     * JWT にユーザー ID を追加する。
     */
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    /**
     * セッションオブジェクトにユーザー ID を追加する。
     */
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
