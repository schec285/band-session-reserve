import type { IVerificationCodeRecord, IVerificationRepository } from "./verification-repository";

export class DrizzleVerificationRepository implements IVerificationRepository {
  async findCode(_challenge: string): Promise<IVerificationCodeRecord | null> {
    throw new Error("not implemented");
  }

  async markCodeAsUsed(_challenge: string): Promise<void> {
    throw new Error("not implemented");
  }

  async activateUser(_userId: string): Promise<void> {
    throw new Error("not implemented");
  }

  async updateUserPassword(_userId: string, _passwordHash: string): Promise<void> {
    throw new Error("not implemented");
  }
}
