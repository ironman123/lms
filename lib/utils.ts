import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { colors } from "@/constants/index"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getColor = (item: string) => {
  return colors[item as keyof typeof colors];
}