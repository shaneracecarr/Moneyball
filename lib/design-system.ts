/**
 * Moneyball Design System
 *
 * Dark theme design tokens and patterns inspired by the player card modal.
 * Use these constants throughout the app for consistent styling.
 */

// =============================================================================
// COLOR PALETTE
// =============================================================================

/**
 * Base dark theme colors
 * These create the layered depth effect for cards and surfaces
 */
export const DARK_THEME = {
  // Background layers (darkest to lightest)
  bg: {
    base: "#1a1d24",      // Main background, deepest layer
    elevated: "#1e2128",  // Slightly raised surfaces (table rows, nav bars)
    card: "#252830",      // Card headers, prominent sections
    overlay: "rgba(0, 0, 0, 0.6)", // Modal/dialog backdrop
  },

  // Text colors
  text: {
    primary: "#ffffff",   // White - headings, important text
    secondary: "#9ca3af", // gray-400 - labels, descriptions
    muted: "#6b7280",     // gray-500 - disabled, placeholders
    accent: "#818cf8",    // indigo-400 - links, interactive elements
  },

  // Border colors
  border: {
    subtle: "#374151",    // gray-700 - subtle dividers
    default: "#4b5563",   // gray-600 - standard borders
  },

  // Semantic colors
  semantic: {
    success: "#4ade80",   // green-400 - positive values, free agents
    successBg: "rgba(34, 197, 94, 0.2)", // green-500/20 - success badges
    warning: "#f97316",   // orange-500 - injury status, alerts
    error: "#f87171",     // red-400 - errors, drop actions
    errorBg: "rgba(239, 68, 68, 0.2)", // red-500/20 - error badges
    info: "#818cf8",      // indigo-400 - owned by user
    infoBg: "rgba(99, 102, 241, 0.2)", // indigo-500/20 - info badges
  },
} as const;

/**
 * Position-specific colors
 * Used for player cards, badges, and position indicators
 */
export const POSITION_COLORS = {
  QB: {
    bg: "bg-red-500",
    border: "border-red-500",
    text: "text-red-500",
    hex: "#ef4444",
  },
  RB: {
    bg: "bg-green-500",
    border: "border-green-500",
    text: "text-green-500",
    hex: "#22c55e",
  },
  WR: {
    bg: "bg-blue-500",
    border: "border-blue-500",
    text: "text-blue-500",
    hex: "#3b82f6",
  },
  TE: {
    bg: "bg-orange-500",
    border: "border-orange-500",
    text: "text-orange-500",
    hex: "#f97316",
  },
  K: {
    bg: "bg-purple-500",
    border: "border-purple-500",
    text: "text-purple-500",
    hex: "#a855f7",
  },
  DEF: {
    bg: "bg-slate-600",
    border: "border-slate-600",
    text: "text-slate-500",
    hex: "#475569",
  },
} as const;

// Helper to get position color (with fallback)
export function getPositionColor(position: string) {
  return POSITION_COLORS[position as keyof typeof POSITION_COLORS] || {
    bg: "bg-gray-500",
    border: "border-gray-500",
    text: "text-gray-500",
    hex: "#6b7280",
  };
}

// =============================================================================
// TAILWIND CLASS PATTERNS
// =============================================================================

/**
 * Common component class patterns
 * Copy these directly into className attributes
 */
export const PATTERNS = {
  // Modal/Dialog
  modalOverlay: "fixed inset-0 z-50 flex items-center justify-center bg-black/60",
  modalContainer: "bg-[#1a1d24] rounded-xl shadow-2xl overflow-hidden",

  // Cards
  card: "bg-[#252830] rounded-xl",
  cardHeader: "bg-[#252830] px-6 py-5",
  cardBody: "bg-[#1a1d24] px-6 py-4",

  // Info boxes (small labeled value displays)
  infoBox: "text-center",
  infoBoxLabel: "text-[10px] text-gray-400 uppercase tracking-wider",
  infoBoxValue: "text-sm font-semibold text-white",

  // Dividers
  verticalDivider: "w-px h-8 bg-gray-700",
  horizontalDivider: "border-t border-gray-700",

  // Tabs/Buttons
  tabActive: "bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium",
  tabInactive: "text-gray-400 hover:bg-gray-700 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",

  // Tables
  tableHeader: "text-gray-400 text-xs uppercase sticky top-0 bg-[#1a1d24]",
  tableHeaderCell: "text-left py-2 px-2 font-medium",
  tableRowEven: "bg-[#1e2128]",
  tableRowOdd: "bg-[#1a1d24]",
  tableTotalsRow: "border-t border-gray-600 bg-[#252830] font-semibold",

  // Badges
  badgeSuccess: "text-sm font-medium text-green-400 bg-green-500/20 px-2 py-1 rounded",
  badgeInfo: "text-sm font-medium text-indigo-400 bg-indigo-500/20 px-2 py-1 rounded",
  badgeWarning: "px-3 py-1 rounded-full text-sm font-semibold bg-orange-500 text-white",
  badgeError: "text-sm font-medium text-red-400 bg-red-500/20 px-2 py-1 rounded",

  // Buttons
  buttonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors",
  buttonSecondary: "bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors",
  buttonDanger: "text-red-400 border-red-400/50 hover:bg-red-500/20 hover:text-red-300",
  buttonClose: "text-gray-400 hover:text-white text-2xl leading-none p-1",

  // Images/Avatars
  avatarLarge: "w-28 h-28 object-cover bg-gray-800 rounded-xl",
  avatarMedium: "w-16 h-16 object-cover bg-gray-800 rounded-lg",
  avatarSmall: "w-10 h-10 object-cover bg-gray-800 rounded-md",

  // Section backgrounds
  sectionDark: "bg-[#1a1d24]",
  sectionMedium: "bg-[#1e2128]",
  sectionLight: "bg-[#252830]",

  // Text styles
  heading1: "text-2xl font-bold text-white",
  heading2: "text-xl font-semibold text-white",
  heading3: "text-lg font-semibold text-white",
  textSecondary: "text-gray-400 text-sm",
  textMuted: "text-gray-500 text-sm",
  textSuccess: "text-green-400",
  textError: "text-red-400",

  // Layout helpers
  infoRow: "flex items-center gap-6 bg-[#1a1d24] rounded-lg px-4 py-3",
  spaceBetween: "flex items-center justify-between",
} as const;

// =============================================================================
// EXAMPLE USAGE
// =============================================================================

/**
 * Example: Dark theme card with header
 *
 * ```tsx
 * <div className={PATTERNS.card}>
 *   <div className={PATTERNS.cardHeader}>
 *     <h2 className={PATTERNS.heading1}>Card Title</h2>
 *   </div>
 *   <div className={PATTERNS.cardBody}>
 *     <p className={PATTERNS.textSecondary}>Card content here</p>
 *   </div>
 * </div>
 * ```
 *
 * Example: Info box row
 *
 * ```tsx
 * <div className={PATTERNS.infoRow}>
 *   <div className={PATTERNS.infoBox}>
 *     <p className={PATTERNS.infoBoxLabel}>Label</p>
 *     <p className={PATTERNS.infoBoxValue}>Value</p>
 *   </div>
 *   <div className={PATTERNS.verticalDivider} />
 *   <div className={PATTERNS.infoBox}>
 *     <p className={PATTERNS.infoBoxLabel}>Another</p>
 *     <p className={PATTERNS.infoBoxValue}>123</p>
 *   </div>
 * </div>
 * ```
 *
 * Example: Position badge
 *
 * ```tsx
 * const posColor = getPositionColor(player.position);
 * <span className={`${posColor.bg} text-white px-2 py-1 rounded text-xs font-bold`}>
 *   {player.position}
 * </span>
 * ```
 *
 * Example: Tab buttons
 *
 * ```tsx
 * <button className={selectedTab === 'stats' ? PATTERNS.tabActive : PATTERNS.tabInactive}>
 *   Stats
 * </button>
 * ```
 */
