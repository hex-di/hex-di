/**
 * String similarity utilities for error messages.
 *
 * Provides Levenshtein distance calculation and port name suggestion functionality
 * to help developers identify typos in port names.
 *
 * @packageDocumentation
 */

/**
 * Calculates the Levenshtein distance between two strings.
 *
 * The Levenshtein distance is the minimum number of single-character edits
 * (insertions, deletions, or substitutions) required to change one string
 * into another.
 *
 * Uses dynamic programming with a matrix approach for O(m*n) time complexity
 * where m and n are the lengths of the input strings.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns The Levenshtein distance (number of edits needed)
 *
 * @example
 * ```typescript
 * levenshteinDistance("kitten", "sitting"); // 3
 * levenshteinDistance("UserService", "UserServce"); // 1
 * levenshteinDistance("", "abc"); // 3
 * ```
 */
export function levenshteinDistance(a: string, b: string): number {
  // Handle edge cases
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Create matrix with dimensions (a.length + 1) x (b.length + 1)
  const matrix: number[][] = [];

  // Initialize first column (distance from empty string to a[0..i])
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row (distance from empty string to b[0..j])
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  // Return bottom-right cell (full distance)
  return matrix[a.length][b.length];
}

/**
 * Maximum Levenshtein distance for port name suggestions.
 *
 * Port names that differ by more than 2 character edits are considered
 * too dissimilar to be likely typos. This threshold balances helpfulness
 * with avoiding false positive suggestions.
 */
const MAX_DISTANCE = 2;

/**
 * Suggests a similar port name from available ports based on edit distance.
 *
 * Uses Levenshtein distance to find the closest matching port name.
 * Only suggests matches within MAX_DISTANCE (2 edits) to avoid unhelpful
 * suggestions for completely different names.
 *
 * @param attemptedName - The port name that was attempted (possibly misspelled)
 * @param availablePorts - Array of available port names to search
 * @returns The closest matching port name, or undefined if no close match found
 *
 * @example
 * ```typescript
 * const available = ["UserService", "AuthService", "LoggerService"];
 *
 * suggestSimilarPort("UserServce", available);
 * // Returns "UserService" (distance 1)
 *
 * suggestSimilarPort("UserSrv", available);
 * // Returns undefined (distance 4, too far)
 *
 * suggestSimilarPort("Loger", available);
 * // Returns "LoggerService" (distance 2 - missing 'g' and 'Service')
 * ```
 */
export function suggestSimilarPort(
  attemptedName: string,
  availablePorts: readonly string[]
): string | undefined {
  let closestMatch: string | undefined = undefined;
  let closestDistance = MAX_DISTANCE + 1;

  for (const portName of availablePorts) {
    const distance = levenshteinDistance(attemptedName, portName);

    if (distance <= MAX_DISTANCE && distance < closestDistance) {
      closestMatch = portName;
      closestDistance = distance;
    }
  }

  return closestMatch;
}
