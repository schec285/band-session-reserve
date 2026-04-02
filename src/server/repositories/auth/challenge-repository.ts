export interface IChallengeRecord {
  usedAt: Date | null;
  expiresAt: Date;
}

export interface IChallengeRepository {
  /** チャレンジをDBに保存する */
  save(challenge: string, expiresAt: Date): Promise<void>;
  /** チャレンジをDBから取得する */
  findByChallenge(challenge: string): Promise<IChallengeRecord | null>;
  /** チャレンジを使用済みにする */
  markAsUsed(challenge: string): Promise<void>;
}
