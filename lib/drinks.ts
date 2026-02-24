// Drink pairing options for check-ins 🥃

export interface DrinkTag {
  id: string;
  name: string;
  emoji: string;
  category: 'coffee' | 'alcohol' | 'other';
}

export const DRINK_TAGS: DrinkTag[] = [
  // Coffee & Tea
  { id: 'coffee', name: 'Coffee', emoji: '☕', category: 'coffee' },
  { id: 'espresso', name: 'Espresso', emoji: '☕', category: 'coffee' },
  { id: 'tea', name: 'Tea', emoji: '🍵', category: 'coffee' },
  
  // Whiskey & Bourbon
  { id: 'bourbon', name: 'Bourbon', emoji: '🥃', category: 'alcohol' },
  { id: 'scotch', name: 'Scotch', emoji: '🥃', category: 'alcohol' },
  { id: 'whiskey', name: 'Whiskey', emoji: '🥃', category: 'alcohol' },
  { id: 'irish', name: 'Irish Whiskey', emoji: '🥃', category: 'alcohol' },
  { id: 'rye', name: 'Rye', emoji: '🥃', category: 'alcohol' },
  
  // Other Spirits
  { id: 'rum', name: 'Rum', emoji: '🍹', category: 'alcohol' },
  { id: 'cognac', name: 'Cognac', emoji: '🥃', category: 'alcohol' },
  { id: 'brandy', name: 'Brandy', emoji: '🍷', category: 'alcohol' },
  { id: 'tequila', name: 'Tequila', emoji: '🥃', category: 'alcohol' },
  { id: 'mezcal', name: 'Mezcal', emoji: '🥃', category: 'alcohol' },
  
  // Wine & Beer
  { id: 'red-wine', name: 'Red Wine', emoji: '🍷', category: 'alcohol' },
  { id: 'white-wine', name: 'White Wine', emoji: '🥂', category: 'alcohol' },
  { id: 'port', name: 'Port', emoji: '🍷', category: 'alcohol' },
  { id: 'beer', name: 'Beer', emoji: '🍺', category: 'alcohol' },
  { id: 'stout', name: 'Stout', emoji: '🍺', category: 'alcohol' },
  { id: 'craft-beer', name: 'Craft Beer', emoji: '🍻', category: 'alcohol' },
  
  // Non-Alcoholic
  { id: 'water', name: 'Water', emoji: '💧', category: 'other' },
  { id: 'soda', name: 'Soda', emoji: '🥤', category: 'other' },
  { id: 'cola', name: 'Cola', emoji: '🥤', category: 'other' },
  { id: 'ginger-ale', name: 'Ginger Ale', emoji: '🥤', category: 'other' },
  { id: 'lemonade', name: 'Lemonade', emoji: '🍋', category: 'other' },
  { id: 'nothing', name: 'Nothing', emoji: '❌', category: 'other' },
];

export function getDrinkTag(id: string): DrinkTag | undefined {
  return DRINK_TAGS.find(d => d.id === id);
}

export function getDrinksByCategory(category: 'coffee' | 'alcohol' | 'other'): DrinkTag[] {
  return DRINK_TAGS.filter(d => d.category === category);
}
