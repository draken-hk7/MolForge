import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge conditional class names with Tailwind conflict resolution.
 * @param {...unknown} inputs Class name inputs.
 * @returns {string} Merged class name string.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
