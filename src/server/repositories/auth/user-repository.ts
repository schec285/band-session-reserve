export interface IUserRepository {
  /** メールアドレスでユーザーを検索する */
  findByEmail(email: string): Promise<{ id: string } | null>;
  /** ユーザーを新規作成する */
  create(data: { email: string; passwordHash: string; name: string }): Promise<void>;
}
