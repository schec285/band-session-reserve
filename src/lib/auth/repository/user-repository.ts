export interface IUserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: string;
  emailVerifiedAt: Date | null;
}

export interface IUserRepository {
  /** ユーザー名でユーザーを検索する */
  findByUsername(username: string): Promise<IUserRecord | null>;
  /** メールアドレスでユーザーを検索する */
  findByEmail(email: string): Promise<IUserRecord | null>;
  /** ユーザーを新規作成する */
  create(data: { username: string; email: string; passwordHash: string }): Promise<void>;
}
