# MoneyKeeper — Visual Direction

**Design concept:** Obsidian Finance — a premium, calm financial cockpit with a sharp electric accent. The interface should feel confident and modern, not like a spreadsheet wrapped in a dark theme.

## Visual principles

1. **Dark-first, not dark-only.** The primary experience uses deep graphite surfaces. A light theme can follow after the core UI is stable.
2. **One strong accent.** Electric lime marks the primary action, positive cash flow and the most important active state. Cyan and violet are supporting accents, not competing primary colors.
3. **Numbers are the heroes.** Balances, cash flow and budget progress get clear hierarchy, tabular numerals and generous breathing room.
4. **Dense information, calm layout.** Show useful financial context without turning the dashboard into a wall of cards.
5. **Glow with restraint.** Gradients and soft light are used for focus and depth, never behind every component.
6. **Mobile-first behavior.** The Telegram Mini App must feel native on a phone; desktop gets a wider dashboard and persistent navigation.
7. **Accessible by default.** Text contrast, keyboard focus, reduced motion and non-color status indicators are required.

## Core palette

| Token | Value | Purpose |
|---|---|---|
| Background | `#0B0F14` | Main canvas |
| Surface | `#121922` | Cards and panels |
| Surface elevated | `#18232D` | Menus, dialogs, elevated panels |
| Border | `#263340` | Quiet separators |
| Text primary | `#F3F6F8` | Main content |
| Text muted | `#91A0AE` | Secondary labels |
| Accent lime | `#C7F36B` | Primary actions, positive states |
| Accent cyan | `#55D6FF` | Charts and informational highlights |
| Accent violet | `#A78BFA` | AI features and special insights |
| Negative | `#FF7474` | Expenses, errors and warnings |

Color is never the only way to communicate income, expense, success or error; labels and icons accompany it.

## Typography and shape

- Use Inter or Geist Sans for interface text.
- Use tabular numerals for balances, amounts, percentages and dates.
- Large balance values should be prominent but not oversized to the point of hiding context.
- Use a consistent spacing scale based on 4 px.
- Cards use restrained 12–16 px corner radii and a subtle 1 px border.
- Prefer clear hierarchy and whitespace over excessive shadows.

## Dashboard composition

1. Compact navigation with a clear active state.
2. Header with page title, period selector and profile actions.
3. Main balance / net position area with a clear period comparison.
4. Cash-flow chart with income and expense series.
5. Budget progress and category breakdown.
6. Recent transactions with readable merchant/category, date and amount.

The first screen should answer: **How much do I have, where did it go, and what needs attention?**

## Interaction and motion

- Primary actions are visually obvious and reachable on mobile.
- Use short transitions (roughly 160–220 ms) for menus, tabs and feedback.
- Respect reduced-motion preferences.
- Forms show inline validation and preserve user input after recoverable errors.
- Destructive actions require clear confirmation and explain what will happen.

## Product personality

MoneyKeeper should feel precise, reassuring and a little bold. Avoid childish gamification, generic bank-template visuals, excessive glassmorphism, rainbow gradients and neon glow on every element.

This document is the visual contract for the future React + TypeScript interface and Telegram Mini App.