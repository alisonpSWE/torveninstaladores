---
name: Torven Instaladores Design System
description: High-contrast, industrial black & #ffc61e solar yellow theme for field operations
colors:
  primary: "#ffc61e"
  primary-hover: "#e5b010"
  primary-ink: "#000000"
  neutral-bg: "#000000"
  neutral-surface: "#121215"
  neutral-border: "#27272a"
  neutral-ink: "#fafafa"
  neutral-muted-ink: "#a1a1aa"
  success: "#059669"
  destructive: "#dc2626"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(1.75rem, 5vw, 2.5rem)"
    fontWeight: 700
    lineHeight: "1.2"
    letterSpacing: "-0.02em"
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5"
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  card:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: Torven Instaladores

## 1. Overview

**Creative North Star: "The High-Vis Solar Rig"**

Torven Instaladores is an ultra-reliable, high-visibility mobile-first design system engineered for solar installation teams on job sites. By pairing deep black surfaces (`#000000` / `#121215`) with high-chroma Torven Solar Yellow (`#ffc61e`), the interface delivers maximum readability under bright outdoor sunlight and extreme physical environments.

Text on primary buttons and high-vis badges uses solid black (`#000000`) text over `#ffc61e`, achieving an exceptional **14:1 WCAG AAA contrast ratio**.

**Key Characteristics:**
- Deep black canvas (`#000000`) with high-visibility Torven Solar Yellow (`#ffc61e`) primary accent.
- 14:1 contrast ratio on primary action buttons for instant outdoor legibility.
- Touch targets engineered for single-thumb field navigation (minimum 44px–48px height).
- Clean, 1px subtle zinc borders (`#27272a`) with zero glassmorphism or distracting gradients.

## 2. Colors

The color palette centers on high-contrast solar yellow and deep black, supported by semantic state indicators.

### Primary
- **Torven Solar Yellow** (`#ffc61e` / `oklch(82% 0.19 85)`): Reserved for primary CTAs, active filter triggers, and key status highlights. Always paired with black text for 14:1 contrast ratio.

### Neutral
- **Deep Black Canvas** (`#000000`): Pure black base background providing absolute contrast.
- **Surface Card** (`#121215`): Container background for work cards and modals.
- **Rim Border** (`#27272a`): 1px structural boundaries.
- **High-Vis Ink** (`#fafafa`): Body and heading copy maintaining ≥10:1 contrast against black surfaces.
- **Muted Steel Ink** (`#a1a1aa`): Secondary labels maintaining ≥6.2:1 contrast against `#121215`.

### Utility & State
- **Signal Emerald** (`#059669`): Completed milestones and online status.
- **Alert Crimson** (`#dc2626`): Destructive actions and sync errors.

### Named Rules
**The 14:1 Solar Yellow Contrast Rule.** Primary action triggers using `#ffc61e` MUST use black `#000000` text for maximum outdoor visibility. Light or white text on yellow is strictly prohibited.

**The Pure Black Rule.** Background surfaces use deep black (`#000000`) to save OLED battery on site and maximize visual depth.

## 3. Typography

**Display Font:** System Sans (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
**Body Font:** System Sans (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)

**Character:** Technical, crisp, high-density system-ui font stack.

### Hierarchy
- **Display** (Bold 700, `clamp(1.75rem, 5vw, 2.5rem)`, line-height 1.2): Title headers.
- **Headline** (Semi-bold 600, `1.25rem` / 20px): Card titles.
- **Body** (Regular 400, `1rem` / 16px): Task copy & field descriptions.
- **Label** (Medium 500, `0.875rem` / 14px): Metadata & badges.

## 4. Elevation

**The Flat-By-Default Rule.** Containers derive depth from background tone step (`#000000` canvas vs `#121215` card surface) and 1px `#27272a` borders rather than heavy drop shadows.

## 5. Components

### Buttons
- **Primary:** Background `#ffc61e`, Text `#000000`, Font Weight `700`, Min-height 48px (`h-11`). Hover background `#e5b010`.

### Cards / Containers
- **Background:** `#121215`, Border 1px solid `#27272a`, Padding `16px`.

### Badges / Status Chips
- **Default / Active:** Background `rgba(255, 198, 30, 0.15)`, Text `#ffc61e`, Border `rgba(255, 198, 30, 0.3)`.

## 6. Do's and Don'ts

### Do:
- **Do** pair `#ffc61e` primary buttons with black `#000000` text for 14:1 contrast ratio.
- **Do** maintain a minimum 44px–48px touch target for all field actions.
- **Do** use pure black `#000000` base backgrounds for OLED power savings and crisp visual contrast.

### Don't:
- **Don't** put white text on `#ffc61e` yellow backgrounds (fails WCAG contrast).
- **Don't** use decorative hero text gradients or background blurs.
- **Don't** use low-contrast gray text for body copy or input placeholders.
