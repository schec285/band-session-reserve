export type UserRole = "member" | "admin";

export interface RegisterBody {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  challenge: string;
}

export interface VerifyEmailBody {
  code: string;
  challenge: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  role: UserRole;
  csrfToken: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface CsrfResponse {
  csrfToken: string;
}

export interface PasswordResetRequestBody {
  email: string;
}

export interface PasswordResetRequestResponse {
  success: boolean;
  message: string;
  challenge: string;
}

export interface PasswordResetBody {
  code: string;
  challenge: string;
  password: string;
}
