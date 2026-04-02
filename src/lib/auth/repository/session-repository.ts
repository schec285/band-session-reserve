export interface ISessionRepository {
  /** セッションをDBに保存する */
  save(token: string, userId: string): Promise<void>;
  /** セッショントークンからセッションを取得する */
  findByToken(token: string): Promise<{ userId: string } | null>;
  /** セッションをDBから削除する */
  deleteByToken(token: string): Promise<void>;
}
