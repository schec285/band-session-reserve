export async function validateVerificationCode(
  _challenge: string,
  _code: string
): Promise<"valid" | "invalid" | "expired"> {
  throw new Error("not implemented");
}

export async function activateUser(_challenge: string): Promise<void> {
  throw new Error("not implemented");
}

export async function validatePasswordResetCode(
  _challenge: string,
  _code: string
): Promise<"valid" | "invalid" | "expired"> {
  throw new Error("not implemented");
}

export async function updatePassword(
  _challenge: string,
  _newPassword: string
): Promise<void> {
  throw new Error("not implemented");
}
