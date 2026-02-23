// Smoke Moods - How are you feeling when you light up?

export interface MoodTag {
  id: string;
  emoji: string;
  label: string;
  color: string; // Tailwind color class
}

export const MOOD_TAGS: MoodTag[] = [
  { id: 'relaxed', emoji: '😌', label: 'Relaxed', color: 'bg-green-500/20 text-green-400' },
  { id: 'social', emoji: '🎉', label: 'Social', color: 'bg-pink-500/20 text-pink-400' },
  { id: 'celebratory', emoji: '🥳', label: 'Celebrating', color: 'bg-amber-500/20 text-amber-400' },
  { id: 'thoughtful', emoji: '🤔', label: 'Thoughtful', color: 'bg-purple-500/20 text-purple-400' },
  { id: 'stressed', emoji: '😤', label: 'Stressed', color: 'bg-red-500/20 text-red-400' },
  { id: 'creative', emoji: '✨', label: 'Creative', color: 'bg-cyan-500/20 text-cyan-400' },
  { id: 'tired', emoji: '😴', label: 'Winding Down', color: 'bg-indigo-500/20 text-indigo-400' },
  { id: 'focused', emoji: '🎯', label: 'Focused', color: 'bg-blue-500/20 text-blue-400' },
  { id: 'bored', emoji: '😐', label: 'Just Because', color: 'bg-gray-500/20 text-gray-400' },
  { id: 'adventurous', emoji: '🚀', label: 'Adventurous', color: 'bg-orange-500/20 text-orange-400' },
];

export function getMoodTag(id: string): MoodTag | undefined {
  return MOOD_TAGS.find(m => m.id === id);
}

export function getMoodLabel(id: string): string {
  const mood = getMoodTag(id);
  return mood ? `${mood.emoji} ${mood.label}` : id;
}
