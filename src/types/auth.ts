export type UserRole = "member" | "admin";

export interface RegisterBody {
  username: string;
  email: string;
  password: string;
}

export interface VerifyEmailBody {
  email: string;
  code: string;
  challenge: string;
}

export interface LoginBody {
  email: string;
  password: string;
  challenge: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  role: UserRole;
}

export interface ChallengeResponse {
  challenge: string;
}
