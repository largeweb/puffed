// Category definitions for multi-category support

import type { CheckinCategory } from "./types";

export interface CategoryInfo {
  id: CheckinCategory;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: "cigar", label: "Cigar", emoji: "🚬", color: "text-amber-500", bgColor: "bg-amber-500/10" },
  { id: "cannabis", label: "Cannabis", emoji: "🌿", color: "text-green-500", bgColor: "bg-green-500/10" },
  { id: "hookah", label: "Hookah", emoji: "💨", color: "text-blue-400", bgColor: "bg-blue-400/10" },
  { id: "vape", label: "Vape", emoji: "🌫️", color: "text-purple-400", bgColor: "bg-purple-400/10" },
  { id: "snus", label: "Snus", emoji: "🫦", color: "text-rose-400", bgColor: "bg-rose-400/10" },
];

export function getCategory(id: CheckinCategory | undefined): CategoryInfo {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[0]; // default to cigar
}

export function getCategoryEmoji(id: CheckinCategory | undefined): string {
  return getCategory(id).emoji;
}
