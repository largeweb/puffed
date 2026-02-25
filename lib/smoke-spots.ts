// Smoke spot/location options for check-ins

export type SmokeSpot = 
  | 'backyard'
  | 'porch'
  | 'balcony'
  | 'lounge'
  | 'home'
  | 'walking'
  | 'car'
  | 'golf'
  | 'beach'
  | 'camping'
  | 'rooftop'
  | 'office'
  | 'bar'
  | 'other';

export interface SmokeSpotTag {
  id: SmokeSpot;
  label: string;
  emoji: string;
}

export const SMOKE_SPOTS: SmokeSpotTag[] = [
  { id: 'backyard', label: 'Backyard', emoji: '🏡' },
  { id: 'porch', label: 'Porch', emoji: '🪑' },
  { id: 'balcony', label: 'Balcony', emoji: '🌆' },
  { id: 'lounge', label: 'Cigar Lounge', emoji: '🛋️' },
  { id: 'home', label: 'Home/Indoor', emoji: '🏠' },
  { id: 'walking', label: 'Walking', emoji: '🚶' },
  { id: 'car', label: 'Car', emoji: '🚗' },
  { id: 'golf', label: 'Golf Course', emoji: '⛳' },
  { id: 'beach', label: 'Beach', emoji: '🏖️' },
  { id: 'camping', label: 'Camping', emoji: '🏕️' },
  { id: 'rooftop', label: 'Rooftop', emoji: '🌃' },
  { id: 'office', label: 'Office/Work', emoji: '🏢' },
  { id: 'bar', label: 'Bar/Restaurant', emoji: '🍺' },
  { id: 'other', label: 'Other', emoji: '📍' },
];

export function getSmokeSpot(id: string): SmokeSpotTag | undefined {
  return SMOKE_SPOTS.find(s => s.id === id);
}
