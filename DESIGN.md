---
name: Squadup
description: Plain Night. One plan card answers where, when and your ride; everything else is a ruled list, and extras stay folded behind toggles.
colors:
  ramp-0: "#0a0910"
  bg: "#0f0e14"
  surface: "#17151f"
  surface-2: "#211d2c"
  rule: "#2a2638"
  edge: "#6e6789"
  muted: "#aaa4bf"
  ink: "#f5f3fa"
  violet: "#7030e0"
  violet-press: "#5f24c4"
  lav: "#a19df0"
  lav-wash: "rgba(161, 157, 240, .12)"
  good: "#5ee0a0"
  good-wash: "rgba(94, 224, 160, .12)"
  warn: "#f5c04e"
  warn-wash: "rgba(245, 192, 78, .12)"
  bad: "#ff7a90"
  bad-wash: "rgba(255, 122, 144, .12)"
  scrim: "rgba(5, 4, 9, .72)"
  on-violet: "#ffffff"
  placeholder: "#8f88a6"
typography:
  display:
    fontFamily: "Big Shoulders Display, Archivo Narrow, sans-serif"
    fontSize: "52px"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: "0.005em"
  plan-venue:
    fontFamily: "Big Shoulders Display, Archivo Narrow, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Big Shoulders Display, Archivo Narrow, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "0.01em"
  sheet-title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.2
  section:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.2
  data:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0em"
    fontFeature: "tnum"
  amount:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.1
    fontFeature: "tnum"
rounded:
  tag: "4px"
  ctl: "8px"
  avatar: "10px"
  card: "14px"
  sheet: "18px"
  pill: "9px"
  check: "7px"
  mark: "5px"
  pip: "2px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  card: "16px"
  gutter: "16px"
  page: "20px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.on-violet}"
    typography: "{typography.label}"
    rounded: "{rounded.ctl}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.violet-press}"
    textColor: "{colors.on-violet}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.ctl}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-2}"
  button-good:
    backgroundColor: "{colors.good}"
    textColor: "{colors.ramp-0}"
    rounded: "{rounded.ctl}"
    padding: "0 16px"
    height: "44px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.ctl}"
    padding: "0 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.ramp-0}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.ctl}"
    padding: "10px 12px"
    height: "44px"
  seg-selected:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.on-violet}"
    height: "44px"
  tab-active:
    textColor: "{colors.lav}"
    height: "62px"
  tag:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.tag}"
    padding: "2px 8px"
    height: "24px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px"
  fold-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.lav}"
    typography: "{typography.body-sm}"
    height: "44px"
  outside-banner:
    backgroundColor: "{colors.bad}"
    textColor: "{colors.ramp-0}"
    rounded: "{rounded.card}"
    padding: "18px 14px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    rounded: "{rounded.ctl}"
    padding: "12px 16px"
---

# Design System: Squadup

## Overview

**Creative North Star: "Plain Night"**

Squadup should feel as easy as the group chat it replaces. Open a squad and the first thing you see is one plan card: where, when, are you coming, and how you're getting there. Below it is a short "Needs you" list, then a two-line summary of the squad. Everything else is one tap away, and anything extra (adding a timetable stop, pinning info, adding a poll option, logging spending, the money breakdown, recent activity) stays folded behind a lavender toggle until someone asks for it.

It replaced the "Departures" look (boarding pass, departure board, split-flap letters, car codes like SQ10). Friends testing it found that look hard to use and confusing, so the metaphor is gone. The brand stays: the logo's violet and lavender on a violet-black night palette, and condensed Big Shoulders signage for the few big moments.

It is dark by design, because it is opened on phones at night, in cars and outside venues.

**Key Characteristics:**
- One plan card on Home; everything else is a ruled list.
- Extras are folded: an option appears only when someone taps its toggle.
- One violet-black tonal ramp for every neutral, from `ramp-0` (#0a0910) to `ink` (#f5f3fa).
- Logo violet fills primary actions and selected segments; lavender marks links, toggles, the active tab, focus and whatever is yours.
- Big Shoulders only for the landing headline, screen titles and the venue on the plan card. Archivo for everything you read. JetBrains Mono only for times and money.
- No codes, no flipping letters, no ticket shapes.

## Colors

A violet-black night palette carrying the logo's violet and lavender, with three signal colours that appear mostly as text, strokes and 12% washes.

### Primary
- **Logo Violet** (`violet`): fills primary buttons, the selected segment (RSVP, ride choice), checkbox accents and text selection. White text on it reads at 6.6:1. Hover and press go to `violet-press`.

### Secondary
- **Logo Lavender** (`lav`): marks rather than fills. Links, toggles, plan-card links, the active tab and its dot, focus outlines, the caret, glyphs in notes and lists, timetable times, the ring around your own avatar, selected poll options. **Lavender Wash** (`lav-wash`) tints poll result bars, owner authority strips and incoming requests.

### Tertiary (signals)
- **Go Green** (`good`): confirmed, accepted, paid, winner, at the venue, "Locked in".
- **Amber Hold** (`warn`): pending, waiting for the Treasurer, "Draft".
- **Alarm Rose** (`bad`): declined, still needs a lift, badge counts, and the "driver is outside" banner.
- Each has a 12% wash for notes and poll winners.

### Neutral
- **Ramp 0** (`ramp-0`): inputs, poll options, the money meter track, the fare total row, dark text on signal fills.
- **Night** (`bg`): the page, app bar and tab bar.
- **Surface** (`surface`): the plan card, the start form, polls, fact and fare rows, sheets.
- **Raised** (`surface-2`): hover fills, quiet counts, scrollbar thumb.
- **Rule** (`rule`): every divider and row border.
- **Edge** (`edge`): control boundaries, 3:1 against surfaces.
- **Muted** (`muted`): secondary text, labels, inactive tabs.
- **Ink** (`ink`): primary text; also the toast background.

### Named Rules
**The One Ramp Rule.** Every neutral comes from the violet-black ramp.

**The Fill and Mark Rule.** Violet fills; lavender marks.

**The Signal Wash Rule.** Green, amber and rose appear as text, 1px strokes at 40 to 55% opacity, or a 12% wash. Solid fills are only for the control or alert that resolves the moment (Accept, a ticked task, the outside banner, the error toast, badge counts, the money meter).

## Typography

**Display Font:** Big Shoulders Display (700 to 900; fallback Archivo Narrow)
**Body Font:** Archivo (400 to 800; fallback system-ui)
**Number Font:** JetBrains Mono (500, 700; fallback ui-monospace)

### Hierarchy
- **Display** (900, 52px, uppercase): the landing headline only. 44px under 370px.
- **Headline** (800, 40px, uppercase): screen titles (Rides, Polls, Money).
- **Plan Venue** (800, 30px, uppercase): the venue on the Home plan card. 26px under 370px.
- **Sheet Title** (Archivo 700, 21px): bottom-sheet titles.
- **Section** (Archivo 700, 17px, sentence case): section heads over a 1px rule, such as "Needs you".
- **Title** (Archivo 700, 17px): poll questions, card titles.
- **Body** (Archivo 400, 16px, 1.5). Secondary 14.5px muted, meta 13.5px muted.
- **Label** (Archivo 700, 15px; 14px small; tabs 600 12px): buttons, segments, row names.
- **Amount** (JetBrains Mono 700, 30px, tabular): the budget figure. Other times and amounts use mono at 14.5 to 18px.

### Named Rules
**The Few Signs Rule.** Big Shoulders appears in three places only: the landing headline, screen titles and the plan-card venue. Section heads, sheet titles, labels and facts are Archivo in sentence case.

**The Numbers Rule.** Times and money use JetBrains Mono with tabular numbers. Dates and sentences never do.

## Layout

A single phone column in a 560px wrap with a 16px gutter. Screens are a grid with 20px between blocks; sections stack with 10px gaps under a section head with an 8px bottom padding and a 1px rule. The app bar is sticky at the top; the five-tab bar is fixed at the bottom, and the page reserves 108px plus the safe-area inset beneath it.

Lists are ruled, not carded: rows of 56px minimum separated by 1px rules. The plan card and the landing's start form are the only cards. Fact and fare tables are framed once (1px rule, 8px radius).

**Home order:** outside banner (only when relevant), plan card, Needs you, At the venue (only on the day), The squad (two summary rows), Recent activity (folded).

### Named Rules
**The Fold Rule.** A screen shows what most people need right now. Secondary actions and detail (add a stop, pin info, add a poll option, close or delete a poll, rough area, change pickup spot, log spending, money breakdown, recent activity) sit behind a lavender toggle with a plus icon and open in place. A toggle's open state survives live updates.

**The One Rule Weight Rule.** Every divider is 1px in `rule`.

## Elevation & Depth

Flat tonal layering: Night under Surface under Raised, separated by rules.
- **Lift** (`0 22px 44px -20px rgba(0,0,0,.8), 0 2px 6px rgba(0,0,0,.35)`): sheets and the toast only.
- **Your ring** (`0 0 0 2px var(--bg), 0 0 0 3.5px var(--lav)`): your own avatar, including your car in the cars list.
- **Input focus halo**: lavender border with a 3px lavender-wash halo.
- **Beacon** (pulsing 7px rose wash): only the "driver is outside" banner.

## Shapes

4px tags, 8px controls and framed tables, 10px avatars (8px small), 14px for the plan card, the start form and the outside banner, 18px sheet tops. Counts are 9px pills; poll radio marks are circles and multi-select marks 5px squares; task checks 7px; seat pips 2px.

### Named Rules
**The Three Radii Rule.** Controls 8px, cards 14px, sheets 18px.

## Components

### Buttons
Archivo 700 15px, 44px tall, 8px radius. Primary is violet with white text; secondary is a 1px Edge outline; Good is green with dark text (Accept); Quiet is borderless muted text; Danger is rose text with a rose border. Small is 40px. Disabled is 40% opacity.

### Fold toggle
A borderless lavender text button (Archivo 600 14.5px, 44px tall) with a 16px plus icon that becomes a minus when open, with `aria-expanded` set. Its content appears directly below with a 180ms fade.

### Plan card
Surface card (14px radius, 1px rule, no shadow). From top: a countdown tag and a "Locked in" tag; the venue in Plan Venue type; the date and time in Archivo 600 16px; lavender text links (Maps, Calendar, Full plan); a ruled "Are you coming?" segment; and a ruled "Your ride" row that says where your ride stands in plain words and opens Rides.

### Segmented control
One 1px Edge frame split into equal 44px cells. Selected fills violet with white text.

### Tags and counts
24px tall, 4px radius, 1px rule border, Archivo 600 12px. Tone variants change text and border colour, never fill. Counts are 18px rose pills.

### Lists and the cars list
Ruled rows: avatar, name over a muted meta line, then a tag or action. The cars list shows each driver with their riders and a plain status tag (2 free, Full, On way, Outside, Arrived).

### Needs-you rows
Ruled rows with a 24px tone glyph, a 700 15px title over a muted sub-line, and either a chevron or inline actions.

### Poll options
50px rows with an Edge border, a round or square mark, a lavender-wash result bar and a mono count. Selected: lavender border and filled mark. Winner: green.

### Money
The budget amount in mono, one line of context, a 10px meter (green confirmed, amber waiting), and one sentence: "X of Y collected". The full breakdown table is folded.

### Outside banner, sheets and toast
The outside banner is a full-width rose block with the Beacon. Sheets rise from the bottom on Surface with an Archivo title. The toast is an inverted Ink block.

## Do's and Don'ts

### Do:
- **Do** answer "where, when, am I coming, how am I getting there" in the plan card before anything else.
- **Do** fold secondary actions behind a lavender toggle instead of showing every form at once.
- **Do** describe status in plain words ("Aisha is picking you up", "2 free").
- **Do** take every neutral from the ramp and keep violet for fills, lavender for marks.
- **Do** keep touch targets at least 44px and focus visible as a 2px lavender outline.
- **Do** strike through what is done rather than hiding it.

### Don't:
- **Don't** bring back ticket or airport metaphors: no boarding pass, tear lines, departure board, split-flap letters or codes like SQ10 and P01.
- **Don't** set section heads, labels or sheet titles in uppercase Big Shoulders.
- **Don't** show a form that most people won't use on this visit; fold it.
- **Don't** add shadows outside sheets and the toast.
- **Don't** add a light theme; the product is dark by design for night use.
