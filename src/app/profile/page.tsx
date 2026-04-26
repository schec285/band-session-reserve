import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProfile } from "@/server/services/user/profile";
import { DrizzleUserRepository } from "@/server/repositories/auth/user-repository.drizzle";
import { ProfileForm } from "@/components/ProfileForm";

/**
 * プロフィールページ。ログイン中ユーザーの情報を表示・編集する。
 * 未認証の場合はサインインページにリダイレクトする。
 */
export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const repo = new DrizzleUserRepository();
  const profile = await getProfile(repo, session.user.id);

  if (!profile) {
    redirect("/auth/signin");
  }

  return (
    <div className="max-w-lg mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">プロフィール</h1>
      <ProfileForm profile={profile} />
    </div>
  );
}
