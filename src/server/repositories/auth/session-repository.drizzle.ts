import type { ISessionRepository } from "./session-repository";

export class DrizzleSessionRepository implements ISessionRepository {
  async save(_token: string, _userId: string): Promise<void> {
    throw new Error("not implemented");
  }

  async findByToken(_token: string): Promise<{ userId: string } | null> {
    throw new Error("not implemented");
  }

  async deleteByToken(_token: string): Promise<void> {
    throw new Error("not implemented");
  }
}
