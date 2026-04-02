export interface IVerificationCodeRecord {
  userId: string;
  code: string;
  usedAt: Date | null;
  expiresAt: Date;
}

export interface IVerificationRepository {
  /** チャレンジに紐づく認証コードレコードを取得する */
  findCode(challenge: string): Promise<IVerificationCodeRecord | null>;
  /** 認証コードを使用済みにする */
  markCodeAsUsed(challenge: string): Promise<void>;
  /** ユーザーのメールアドレスを有効化する */
  activateUser(userId: string): Promise<void>;
  /** ユーザーのパスワードハッシュを更新する */
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
}
