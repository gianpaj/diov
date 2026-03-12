import { clsx, type ClassValue } from 'clsx'

/**
 * Merge class names safely using clsx.
 *
 * This helper combines multiple class values (strings, objects, arrays) into a
 * single space-separated string. It's the standard pattern for conditional
 * Tailwind classes in React.
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-blue-500', { 'text-white': isActive })
 * // → "px-4 py-2 bg-blue-500 text-white"
 *
 * @example
 * cn('text-red-500', someCondition ? 'text-green-500' : '')
 * // Last class wins if there's a conflict (no automatic merge)
 *
 * Note: If class conflicts become an issue (e.g., `text-red-500` vs
 * `text-green-500` both present), add `tailwind-merge` and wrap with twMerge:
 *   import { twMerge } from 'tailwind-merge'
 *   return twMerge(clsx(inputs))
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
