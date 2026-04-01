export type Part =
  | "readGuitar"
  | "backingGuitar"
  | "bass"
  | "drums"
  | "keyboard"
  | "vocal"
  | "other";

export interface ApiResponse {
  success: boolean;
  message: string;
  token?: string;
}
