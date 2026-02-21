// Predefined flavor tags for cigars
export const FLAVOR_TAGS = [
  { id: "cedar", label: "Cedar", emoji: "🌲" },
  { id: "leather", label: "Leather", emoji: "🧥" },
  { id: "pepper", label: "Pepper", emoji: "🌶️" },
  { id: "coffee", label: "Coffee", emoji: "☕" },
  { id: "chocolate", label: "Chocolate", emoji: "🍫" },
  { id: "earth", label: "Earth", emoji: "🌍" },
  { id: "cream", label: "Cream", emoji: "🥛" },
  { id: "nuts", label: "Nuts", emoji: "🥜" },
  { id: "spice", label: "Spice", emoji: "✨" },
  { id: "wood", label: "Wood", emoji: "🪵" },
  { id: "honey", label: "Honey", emoji: "🍯" },
  { id: "cocoa", label: "Cocoa", emoji: "🤎" },
  { id: "vanilla", label: "Vanilla", emoji: "🍦" },
  { id: "citrus", label: "Citrus", emoji: "🍊" },
  { id: "toast", label: "Toast", emoji: "🍞" },
  { id: "smoke", label: "Smoke", emoji: "💨" },
] as const;

export type FlavorTag = typeof FLAVOR_TAGS[number];
export type FlavorId = FlavorTag['id'];

// Helper to get flavor tag by id
export function getFlavorTag(id: string): FlavorTag | undefined {
  return FLAVOR_TAGS.find(t => t.id === id);
}
