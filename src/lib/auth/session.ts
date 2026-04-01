export async function createSession(_userId: string): Promise<string> {
  throw new Error("not implemented");
}

export async function getSession(_request: Request): Promise<{ userId: string } | null> {
  throw new Error("not implemented");
}

export async function invalidateSession(_sessionToken: string): Promise<void> {
  throw new Error("not implemented");
}
