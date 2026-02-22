/**
 * Text normalization utilities for Puffed
 */

/**
 * Normalize a brand name:
 * - Trim leading/trailing whitespace
 * - Remove duplicate spaces
 * - Apply smart title case (preserves common abbreviations)
 */
export function normalizeBrandName(input: string): string {
  if (!input) return input;

  // Common abbreviations and words to preserve
  const preserveUppercase = new Set([
    'USA', 'UK', 'NY', 'NYC', 'LA', 'CBD', 'THC', 'OG', 'XL',
  ]);
  
  const preserveLowercase = new Set([
    'de', 'la', 'el', 'y', 'e', 'da', 'do', 'of', 'and', 'the',
  ]);

  // Trim and normalize whitespace
  let normalized = input.trim().replace(/\s+/g, ' ');

  // Title case with smart handling
  normalized = normalized
    .split(' ')
    .map((word, index) => {
      const upper = word.toUpperCase();
      const lower = word.toLowerCase();

      // Preserve common abbreviations
      if (preserveUppercase.has(upper)) {
        return upper;
      }

      // Keep lowercase for small words (except at start)
      if (index > 0 && preserveLowercase.has(lower)) {
        return lower;
      }

      // Standard title case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  return normalized;
}

/**
 * Normalize a product/vitola name (similar to brand, but less aggressive)
 */
export function normalizeProductName(input: string | null): string | null {
  if (!input) return null;
  return input.trim().replace(/\s+/g, ' ');
}
