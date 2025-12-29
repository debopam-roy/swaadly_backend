import { createAvatar } from '@dicebear/core';
import { initials } from '@dicebear/collection';

/**
 * Avatar Utility
 *
 * Generates avatar images from user initials using DiceBear library.
 * Provides secure, consistent avatar generation for users without profile pictures.
 */

export interface GenerateAvatarOptions {
  name: string;
  size?: number;
  backgroundColor?: string[];
}

/**
 * Generate SVG avatar from user's name
 *
 * @param options - Avatar generation options
 * @returns SVG data URI string
 */
export function generateInitialsAvatar(options: GenerateAvatarOptions): string {
  const {
    name,
    size = 200,
    backgroundColor = ['28a777', '44c997', 'FF6B6B', '4ECDC4', '45B7D1', 'FFA07A'],
  } = options;

  // Extract initials from name
  const userInitials = extractInitials(name);

  // Generate avatar using dicebear
  const avatar = createAvatar(initials, {
    seed: name, // Use name as seed for consistent avatars
    size,
    backgroundColor,
    fontSize: 50,
  });

  // Convert to SVG data URI
  const svg = avatar.toString();
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

  return dataUri;
}

/**
 * Extract initials from a name
 *
 * @param name - Full name
 * @returns Initials (max 2 characters)
 */
export function extractInitials(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'U'; // Default for 'User'
  }

  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return 'U';
  }

  // Split name into parts and filter out empty strings
  const nameParts = trimmedName
    .split(/\s+/)
    .filter(part => part.length > 0);

  if (nameParts.length === 0) {
    return trimmedName[0].toUpperCase();
  }

  if (nameParts.length === 1) {
    // Single name: take first 2 characters or just 1 if name is 1 char
    const firstPart = nameParts[0];
    return firstPart.length === 1
      ? firstPart.toUpperCase()
      : (firstPart[0] + (firstPart[1] || '')).toUpperCase();
  }

  // Multiple names: take first character of first and last name
  const firstInitial = nameParts[0][0];
  const lastInitial = nameParts[nameParts.length - 1][0];
  return (firstInitial + lastInitial).toUpperCase();
}

/**
 * Generate avatar URL for storage
 * This can be used to generate a consistent avatar reference
 *
 * @param userId - User ID
 * @param name - User name
 * @returns Avatar reference string
 */
export function generateAvatarReference(userId: string, name: string): string {
  const initials = extractInitials(name);
  return `avatar://initials/${userId}/${encodeURIComponent(initials)}`;
}

/**
 * Check if URL is a Google profile picture
 *
 * @param url - URL to check
 * @returns true if it's a Google profile picture
 */
export function isGoogleAvatarUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('googleusercontent.com') || url.includes('google.com/');
}

/**
 * Check if URL is an initials-based avatar reference
 *
 * @param url - URL to check
 * @returns true if it's an initials avatar reference
 */
export function isInitialsAvatarReference(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('avatar://initials/');
}

/**
 * Parse initials avatar reference
 *
 * @param reference - Avatar reference string
 * @returns Parsed initials or null
 */
export function parseAvatarReference(reference: string): { userId: string; initials: string } | null {
  if (!isInitialsAvatarReference(reference)) {
    return null;
  }

  try {
    const parts = reference.replace('avatar://initials/', '').split('/');
    if (parts.length !== 2) return null;

    return {
      userId: parts[0],
      initials: decodeURIComponent(parts[1]),
    };
  } catch {
    return null;
  }
}
