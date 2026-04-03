export interface IVerificationCodeRecord {
  userId: string;
  code: string;
  expiresAt: Date;
}

export interface IVerificationRepository {
  /** 認証コードをDBに保存する */
  save(sessionId: string, userId: string, code: string, expiresAt: Date): Promise<void>;
  /** セッションIDで認証コードレコードを取得する */
  findBySessionId(sessionId: string): Promise<IVerificationCodeRecord | null>;
  /** 認証コードをDBから削除する */
  deleteBySessionId(sessionId: string): Promise<void>;
}
