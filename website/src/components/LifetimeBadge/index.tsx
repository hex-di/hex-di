import type { ReactNode } from 'react';
import styles from './styles.module.css';

export type LifetimeType = 'singleton' | 'scoped' | 'transient';

export interface LifetimeBadgeProps {
  /**
   * The lifetime scope type
   * - singleton: Teal colored badge
   * - scoped: Amber colored badge
   * - transient: Purple colored badge
   */
  type: LifetimeType;
  /**
   * Optional variant for light background contexts
   * @default false
   */
  lightBackground?: boolean;
}

/**
 * Display text for each lifetime type
 */
const lifetimeLabels: Record<LifetimeType, string> = {
  singleton: 'Singleton',
  scoped: 'Scoped',
  transient: 'Transient',
};

/**
 * Icon characters for each lifetime type (based on design specs)
 * - Singleton: Single circle
 * - Scoped: Nested circles
 * - Transient: Multiple circles
 */
const lifetimeIcons: Record<LifetimeType, string> = {
  singleton: '\u2022', // bullet point
  scoped: '\u2299', // circled dot
  transient: '\u2234', // therefore symbol (three dots)
};

/**
 * LifetimeBadge component displays a color-coded badge for lifetime scopes.
 *
 * Colors (based on design specifications):
 * - Singleton: Teal (#00897B to #26A69A gradient)
 * - Scoped: Amber (#FF8F00 to #FFA726 gradient)
 * - Transient: Purple (#7B1FA2 to #AB47BC gradient)
 *
 * @example
 * ```tsx
 * <LifetimeBadge type="singleton" />
 * <LifetimeBadge type="scoped" />
 * <LifetimeBadge type="transient" lightBackground />
 * ```
 */
export default function LifetimeBadge({
  type,
  lightBackground = false,
}: LifetimeBadgeProps): ReactNode {
  const baseClass = styles.badge;
  const typeClass = styles[type];
  const variantClass = lightBackground ? styles.lightBg : '';

  return (
    <span className={`${baseClass} ${typeClass} ${variantClass}`.trim()}>
      <span className={styles.icon} aria-hidden="true">
        {lifetimeIcons[type]}
      </span>
      {lifetimeLabels[type]}
    </span>
  );
}
