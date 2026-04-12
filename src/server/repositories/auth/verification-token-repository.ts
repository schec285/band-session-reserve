export interface IVerificationTokenRepository {
  /** IDで認証トークンを検索する */
  findById(id: string): Promise<{
    id: string;
    userId: string;
    codeHash: string | null;
    attempts: number;
    expiresAt: Date;
  } | null>;
  /** ユーザーIDで認証トークンを検索する */
  findByUserId(userId: string): Promise<{
    id: string;
    codeHash: string | null;
    attempts: number;
    expiresAt: Date;
  } | null>;
  /** 認証トークンを新規作成する */
  create(data: { userId: string; codeHash: string | null; expiresAt: Date }): Promise<{ id: string }>;
  /** 試行回数をインクリメントする */
  incrementAttempts(id: string): Promise<void>;
  /** ユーザーIDに紐づく認証トークンを削除する */
  deleteByUserId(userId: string): Promise<void>;
  /** IDに紐づく認証トークンを削除する */
  deleteById(id: string): Promise<void>;
}
