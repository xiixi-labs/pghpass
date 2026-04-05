# PGH Pass — UI Design System
Version 1.0

---

## 1. Design Philosophy

Premium fintech aesthetic. Think Robinhood, Revolut, or a high-end banking app.
White dominant. Bold typography does the heavy lifting. Color is used like punctuation — sparingly, with intention.

**Rules:**
- Color is never decorative. Every use of blue, gold, or red has a semantic purpose.
- Large numbers use serif type. Everything else uses sans-serif.
- No colored header blocks, no gradient backgrounds, no colored card fills.
- Cards are white glass on a warm gray page.
- Shadows are subtle — just enough to lift, never dramatic.
- Rounded corners are consistent: 8px small, 12px medium, 16px large.

---

## 2. Color Palette

### Brand Colors (use sparingly)
```typescript
export const colors = {
  blue:     '#003087',  // Primary action, nav active, progress bars, buttons
  gold:     '#C8900A',  // Points values, financial figures, gold CTA buttons
  red:      '#C60C30',  // Flash deal live indicator, error states, alerts only

  // Tints (for backgrounds behind brand-colored icons/labels)
  blueTint: '#EEF1F8',
  goldTint: '#FDF8EE',
  redTint:  '#FCEEF1',
} as const;
```

### Neutrals (do all the work)
```typescript
export const neutrals = {
  ink:    '#0E0E10',  // Primary text, headings, strong labels
  ink2:   '#3A3A3E',  // Secondary text, body copy
  ink3:   '#7A7A82',  // Tertiary text, captions, metadata
  ink4:   '#B0B0B8',  // Disabled, placeholder, hint text
  rule:   '#E8E8EC',  // Borders, dividers, rules
  rule2:  '#F2F2F5',  // Subtle background fills, icon backgrounds
  white:  '#FFFFFF',  // Card backgrounds, inputs
  screen: '#F8F8F6',  // App screen background (warm white)
  page:   '#EEECEA',  // Page/shell background (warm gray with grain)
} as const;
```

### Semantic Colors
```typescript
export const semantic = {
  success: '#2A7A4A',  // Positive delta, confirmed states
  error:   '#C60C30',  // Errors (same as red)
  warning: '#B8760A',  // Warnings
} as const;
```

---

## 3. Typography

### Font Families
```typescript
// React Native font loading (Expo)
import { useFonts } from 'expo-font';

// Sans — UI, body, labels, buttons
// Load via Google Fonts or bundle locally
const [fontsLoaded] = useFonts({
  'Inter-Regular':  require('./assets/fonts/Inter-Regular.ttf'),
  'Inter-Medium':   require('./assets/fonts/Inter-Medium.ttf'),
  'Inter-SemiBold': require('./assets/fonts/Inter-SemiBold.ttf'),
  'Inter-Bold':     require('./assets/fonts/Inter-Bold.ttf'),
});

// Serif — large numbers, hero values only
// Used for: balance amounts, point totals, transaction amounts
const [fontsLoaded] = useFonts({
  'InstrumentSerif-Regular': require('./assets/fonts/InstrumentSerif-Regular.ttf'),
  'InstrumentSerif-Italic':  require('./assets/fonts/InstrumentSerif-Italic.ttf'),
});
```

### Type Scale
```typescript
export const typography = {
  // Display — Instrument Serif — large financial numbers only
  display: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 52,
    letterSpacing: -1.5,
    lineHeight: 52,
  },
  displayMd: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 38,
    letterSpacing: -1.0,
    lineHeight: 38,
  },
  displaySm: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 28,
    letterSpacing: -0.5,
    lineHeight: 30,
  },

  // Headings — Inter Bold/SemiBold
  h1: { fontFamily: 'Inter-Bold',     fontSize: 20, letterSpacing: -0.4, lineHeight: 24 },
  h2: { fontFamily: 'Inter-Bold',     fontSize: 16, letterSpacing: -0.3, lineHeight: 20 },
  h3: { fontFamily: 'Inter-SemiBold', fontSize: 14, letterSpacing: -0.2, lineHeight: 18 },
  h4: { fontFamily: 'Inter-SemiBold', fontSize: 12, letterSpacing: -0.1, lineHeight: 16 },

  // Body — Inter Regular/Medium
  body:   { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 22 },
  bodySm: { fontFamily: 'Inter-Regular', fontSize: 12, lineHeight: 18 },

  // Labels & Metadata
  label:    { fontFamily: 'Inter-SemiBold', fontSize: 11, letterSpacing: 0.4, lineHeight: 14 },
  caption:  { fontFamily: 'Inter-Medium',   fontSize: 10, letterSpacing: 0.2, lineHeight: 13 },
  eyebrow:  { fontFamily: 'Inter-Bold',     fontSize:  9, letterSpacing: 0.8, lineHeight: 12, textTransform: 'uppercase' as const },
  micro:    { fontFamily: 'Inter-Medium',   fontSize:  8, letterSpacing: 0.3, lineHeight: 11 },

  // Buttons
  btnPrimary: { fontFamily: 'Inter-Bold', fontSize: 13, letterSpacing: 0.2 },
  btnSm:      { fontFamily: 'Inter-Bold', fontSize: 11, letterSpacing: 0.3 },
} as const;
```

---

## 4. Spacing

```typescript
export const spacing = {
  '0':  0,
  '1':  4,
  '2':  8,
  '3':  12,
  '4':  16,
  '5':  20,
  '6':  24,
  '8':  32,
  '10': 40,
  '12': 48,
} as const;

// Screen padding
export const screenPadding = { horizontal: 18, top: 20 };
```

---

## 5. Border Radius

```typescript
export const radius = {
  sm:   8,   // inputs, small tags, chips
  md:   12,  // cards, buttons, list rows
  lg:   16,  // hero cards, large containers
  full: 9999, // pills, avatars
} as const;
```

---

## 6. Shadows

```typescript
import { Platform } from 'react-native';

export const shadows = {
  xs: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    android: { elevation: 1 },
  }),
  sm: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 16 },
    android: { elevation: 4 },
  }),
} as const;
```

---

## 7. Component Patterns

### 7.1 Primary Button
```typescript
// Background: ink (#0E0E10) — the default primary action
// Text: white
// Border radius: 12
// Padding: 13px vertical

const PrimaryButton = styled.TouchableOpacity`
  background-color: ${colors.ink};
  border-radius: ${radius.md}px;
  padding-vertical: 13px;
  align-items: center;
`;
// Label: typography.btnPrimary, color: white
```

### 7.2 Gold Button
```typescript
// Used for: financial CTAs (Generate QR, redeem actions)
// Background: gold (#C8900A)
// Text: white
const GoldButton = styled.TouchableOpacity`
  background-color: ${colors.gold};
  border-radius: ${radius.md}px;
  padding-vertical: 13px;
  align-items: center;
`;
```

### 7.3 Ghost Button
```typescript
// Background: white
// Border: 1px rule (#E8E8EC)
// Text: ink2
const GhostButton = styled.TouchableOpacity`
  background-color: ${neutrals.white};
  border-width: 1px;
  border-color: ${neutrals.rule};
  border-radius: ${radius.md}px;
  padding-vertical: 11px;
  align-items: center;
`;
```

### 7.4 Card
```typescript
// All cards: white background, rule border, xs shadow
const Card = styled.View`
  background-color: ${neutrals.white};
  border-width: 1px;
  border-color: ${neutrals.rule};
  border-radius: ${radius.md}px;
  ${shadows.xs}
`;
```

### 7.5 List Row
```typescript
// Used for: ledger entries, check-ins, redemptions, feed items
// Pattern: flex row, items center, padding 10px vertical, bottom border
const ListRow = styled.View`
  flex-direction: row;
  align-items: center;
  padding-vertical: 10px;
  border-bottom-width: 1px;
  border-bottom-color: ${neutrals.rule};
`;
// Last row: no bottom border (use :last-child pattern or pass prop)
```

### 7.6 Section Header
```typescript
// Small eyebrow label + optional "See all" link
// eyebrow: typography.eyebrow, color: ink
// link: typography.eyebrow, color: blue
const SectionHeader = ({ title, onSeeAll }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
    <Text style={[typography.eyebrow, { color: neutrals.ink }]}>{title}</Text>
    {onSeeAll && <Text style={[typography.eyebrow, { color: colors.blue }]}>See all</Text>}
  </View>
);
```

### 7.7 Input Field
```typescript
const Input = styled.TextInput`
  background-color: ${neutrals.white};
  border-width: 1px;
  border-color: ${neutrals.rule};
  border-radius: ${radius.sm}px;
  padding: 10px 12px;
  font-family: 'Inter-Regular';
  font-size: 13px;
  color: ${neutrals.ink};
`;
// Focus state: border-color: ink3
// Error state: border-color: red
```

### 7.8 Tag / Chip
```typescript
// Small label for status, category, plan tier
// Example: "Pro · Active" on vendor dashboard
const Tag = ({ label, variant = 'neutral' }) => {
  const variants = {
    neutral: { bg: neutrals.rule2,  text: neutrals.ink3  },
    gold:    { bg: colors.goldTint, text: colors.gold    },
    blue:    { bg: colors.blueTint, text: colors.blue    },
    red:     { bg: colors.redTint,  text: colors.red     },
    green:   { bg: '#EAF5EE',       text: semantic.success },
  };
  // Border radius: 4, padding: 3px 7px
  // Typography: micro, fontWeight 700, letterSpacing 0.05
};
```

### 7.9 Live Indicator (Flash Deals)
```typescript
// Animated red dot + "Live" text
// Dot: 5×5, border-radius full, background red
// Animation: opacity 1 → 0.2 → 1, 1.4s ease-in-out infinite
const LiveIndicator = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
    <Animated.View style={[liveDotStyle, animatedOpacity]} />
    <Text style={[typography.eyebrow, { color: colors.red }]}>Live</Text>
  </View>
);
```

---

## 8. Screen Background

The app screen background has a subtle warm grain texture, not pure white.

```typescript
// Page background (shell/chrome outside phone): #EEECEA with SVG grain overlay
// Screen background (inside phone): #F8F8F6 (slightly warm white)

// The grain is achieved via a fixed-position SVG noise overlay at 3% opacity.
// In React Native, use a static grain PNG as an absolutely positioned image
// behind the screen content, or use expo-linear-gradient sparingly.

// Recommended: include a pre-generated grain.png asset at ~300×300px,
// tile it as a background pattern at low opacity.
```

---

## 9. Color Usage Rules (Strict)

| Color | Use for | Never use for |
|-------|---------|---------------|
| Blue `#003087` | Nav active state, progress bars, primary links, "Following" button | Backgrounds, decorative fills, general text |
| Gold `#C8900A` | Points values, $ equivalents, gold CTA buttons, earned amounts | Section titles, general labels, borders |
| Red `#C60C30` | "Live" flash deal dot, error messages, notification badge | Card fills, large backgrounds, decorative use |
| Ink `#0E0E10` | Primary button, headings, strong labels | Do not lighten for decoration |
| Instrument Serif | Balance numbers, point totals, transaction amounts | Body copy, labels, buttons |

---

## 10. Icons

Use `@expo/vector-icons` with the `Feather` icon set throughout.
Icon size: 16px for inline/nav, 20px for action icons, 24px for hero/empty states.
Icon color: always inherit from context — never hardcode a color on the icon itself.

```typescript
import { Feather } from '@expo/vector-icons';

// Nav icons
<Feather name="home"    size={16} color={isActive ? colors.blue : neutrals.ink4} />
<Feather name="compass" size={16} color={neutrals.ink4} />
<Feather name="zap"     size={16} color={neutrals.ink4} /> // Flash deals
<Feather name="user"    size={16} color={neutrals.ink4} />

// Action icons
<Feather name="chevron-right" size={14} color={neutrals.ink4} />
<Feather name="bell"          size={18} color={neutrals.ink2} />
<Feather name="camera"        size={20} color={neutrals.ink3} />
<Feather name="grid"          size={18} color={neutrals.white} /> // QR icon in button

// Vendor dashboard
<Feather name="users"        size={16} color={neutrals.ink3} /> // Followers
<Feather name="trending-up"  size={12} color={semantic.success} />
<Feather name="trending-down" size={12} color={colors.red} />
```

---

## 9. ATM-Style Numpad (Vendor QR Generator — critical component)

The numpad on the vendor QR generator uses ATM-style decimal-locked input. This is the primary error and fraud prevention mechanism for Phase 1. It makes entering $1069 instead of $10.69 physically impossible.

```typescript
// Amount stored as integer cents internally — never floats
// Every keypress shifts digits left, appends new digit on right
// Display: Math.floor(cents/100) + '.' + (cents%100).toString().padStart(2,'0')
//
// Key sequence for $10.69:
// Press 1 → cents:    1 → display: $0.01
// Press 0 → cents:   10 → display: $0.10
// Press 6 → cents:  106 → display: $1.06
// Press 9 → cents: 1069 → display: $10.69
//
// To accidentally enter $1069.00 you'd need 6 keypresses: 1,0,6,9,0,0
// which is visually obvious on screen as it builds — not a realistic mistake.

interface NumpadState { cents: number; }

function handleKeyPress(state: NumpadState, key: string): NumpadState {
  if (key === 'del') return { cents: Math.floor(state.cents / 10) };
  const digit = parseInt(key);
  const newCents = state.cents * 10 + digit;
  return { cents: newCents > 99999 ? state.cents : newCents }; // max $999.99
}

function formatDisplay(cents: number): string {
  return `$${Math.floor(cents/100)}.${(cents%100).toString().padStart(2,'0')}`;
}

// Convert to decimal before sending to API:
const dollarAmount = cents / 100; // 1069 → 10.69
```

**Confirmation screen shown before QR generates:**
- Large dollar amount: "$10.69"
- Points preview: "= 106 points"
- "Edit" button (go back) + "Generate QR" button (proceed)

**Numpad layout:**
```
[ 1 ] [ 2 ] [ 3 ]
[ 4 ] [ 5 ] [ 6 ]
[ 7 ] [ 8 ] [ 9 ]
[   0 0   ] [ ⌫ ]
```

---

## 10. Tablet Kiosk Mode (Vendor Display — Amazon Fire 7)

The vendor app runs on a dedicated Amazon Fire 7 tablet locked to kiosk mode.
Included with Pro and Premium subscription plans.

**Android kiosk setup:**
- Android Device Policy (free MDM) locks device to PGH Pass vendor app only
- Home button, recent apps, and notifications disabled
- App auto-restarts on crash
- Screen timeout disabled — always-on display
- Auto-brightness for counter visibility

**Tablet UI adaptations (vendor app on tablet):**
- QR code: minimum 280×280px, centered on screen
- Amount + points shown prominently above QR: "$10.69 · 106 pts"
- No bottom nav bar — tablet is QR-only device
- PGH Pass logo + business name at top
- After successful customer scan → auto-return to numpad in 3 seconds
- Idle state: full-screen "Tap to generate QR" CTA

**Feather icons for tablet vendor app:**
```typescript
<Feather name="grid"       size={22} color={neutrals.white} />  // Generate QR button
<Feather name="check-circle" size={48} color={semantic.success} /> // Success state
<Feather name="delete"     size={20} color={neutrals.ink3} />   // Backspace
```
