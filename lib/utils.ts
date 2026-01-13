import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

export function sanitizeText(text: string): string {
  // Remove any null bytes and normalize whitespace
  return text.replace(/\0/g, "").trim();
}
