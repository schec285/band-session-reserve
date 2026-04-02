import type { IChallengeRecord, IChallengeRepository } from "./challenge-repository";

export class DrizzleChallengeRepository implements IChallengeRepository {
  async save(_challenge: string, _expiresAt: Date): Promise<void> {
    throw new Error("not implemented");
  }

  async findByChallenge(_challenge: string): Promise<IChallengeRecord | null> {
    throw new Error("not implemented");
  }

  async markAsUsed(_challenge: string): Promise<void> {
    throw new Error("not implemented");
  }
}
