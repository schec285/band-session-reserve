export interface IUserRepository {
  /** メールアドレスでユーザーを検索する */
  findByEmail(email: string): Promise<{ id: string; name: string; emailVerified: Date | null } | null>;
  /** IDでユーザーを検索する */
  findById(id: string): Promise<{ id: string; email: string; name: string } | null>;
  /** 認証用にメールアドレスでユーザーを検索する（passwordHash・emailVerified 含む） */
  findByEmailForAuth(email: string): Promise<{
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: string;
    passwordHash: string | null;
    emailVerified: Date | null;
  } | null>;
  /** ユーザーを新規作成する */
  create(data: { email: string; passwordHash: string; name: string }): Promise<{ id: string }>;
  /** 名前とパスワードハッシュを更新する */
  update(id: string, data: { passwordHash: string; name: string }): Promise<void>;
  /** email_verified を現在時刻でセットする */
  setEmailVerified(id: string): Promise<void>;
  /** パスワードハッシュのみを更新する */
  updatePassword(id: string, passwordHash: string): Promise<void>;
  /** プロフィール情報（メール・名前・パート・コメント）を取得する */
  getProfile(id: string): Promise<{ email: string; name: string; part: string | null; comment: string | null } | null>;
  /** プロフィール情報（名前・パート・コメント）を更新する */
  updateProfile(id: string, data: { name?: string; part?: string | null; comment?: string | null }): Promise<void>;
}
