import type { Variants, Transition } from 'framer-motion';

export type { Variants };

/**
 * Shared framer-motion variants with a single spring/easing language so
 * animations feel cohesive across the app.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const springSoft: Transition = { type: 'spring', stiffness: 260, damping: 30 };

/** Parent container that staggers its children. */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
};

/** Standard list/card item entrance. */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3, ease: EASE_OUT } },
};

/** Modal content: scale + fade. */
export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: springSoft },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.15 } },
};

export const backdrop: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};
