export interface IChallengeRecord {
  id: string;
  type: string;
}

export interface IChallengeRepository {
  /** チャレンジをDBに保存する */
  save(sessionId: string, challengeId: string, type: string): Promise<void>;
  /** セッションIDでチャレンジを取得する */
  findBySessionId(sessionId: string): Promise<IChallengeRecord | null>;
  /** チャレンジをDBから削除する */
  deleteBySessionId(sessionId: string): Promise<void>;
}
