import type { Reservation } from "@/types/reserve";

/**
 * in-memory 予約ストア（DB実装までの暫定）
 * テストでは beforeEach でクリアして使用する
 */
export const reservationStore = new Map<string, Reservation>();
