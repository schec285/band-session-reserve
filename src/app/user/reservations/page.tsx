import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyReservations } from "@/server/services/user/my-reservations";
import { DrizzleReservationRepository } from "@/server/repositories/reserve/reservation-repository.drizzle";
import { MyReservationList } from "@/features/user/MyReservationList";

/**
 * マイ予約ページ。ログイン中ユーザーの今後の予約一覧を表示する。
 * 未認証の場合はサインインページにリダイレクトする。
 */
export default async function MyReservationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const repo = new DrizzleReservationRepository();
  const reservations = await getMyReservations(repo, session.user.id);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">マイ予約</h1>
      <MyReservationList reservations={reservations} />
    </main>
  );
}
