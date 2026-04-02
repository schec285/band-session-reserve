import type { IUserRecord, IUserRepository } from "./user-repository";

export class DrizzleUserRepository implements IUserRepository {
  async findByUsername(_username: string): Promise<IUserRecord | null> {
    throw new Error("not implemented");
  }

  async findByEmail(_email: string): Promise<IUserRecord | null> {
    throw new Error("not implemented");
  }

  async create(_data: { username: string; email: string; passwordHash: string }): Promise<void> {
    throw new Error("not implemented");
  }
}
