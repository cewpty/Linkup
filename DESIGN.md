---
name: Squadup
description: Departures. Every hangout is a departure; your plan is a boarding pass, the rides are a departure board.
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
typography:
  display:
    fontFamily: "Big Shoulders Display, Archivo Narrow, sans-serif"
    fontSize: "52px"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: "0.005em"
  pass-date:
    fontFamily: "Big Shoulders Display, Archivo Narrow, sans-serif"
    fontSize: "46px"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: "0.005em"
  headline:
    fontFamily: "Big Shoulders Display, Archivo Narrow, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "0.01em"
  sheet-title:
    fontFamily: "Big Shoulders Display, Archivo Narrow, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.02em"
  section:
    fontFamily: "Big Shoulders Display, Archivo Narrow, sans-serif"
    fontSize: "21px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0.03em"
  field-label:
    fontFamily: "Big Shoulders Display, Archivo Narrow, sans-serif"
    fontSize: "12px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.14em"
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
  code:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 700
    letterSpacing: "0.02em"
rounded:
  tile: "3px"
  tag: "4px"
  ctl: "8px"
  avatar: "10px"
  pass: "14px"
  sheet: "18px"
  pill: "9px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  pass: "14px"
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
  pass:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pass}"
  pass-band:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.on-violet}"
    padding: "10px 14px"
  board-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    padding: "10px 12px"
  flap-tile:
    backgroundColor: "{colors.ramp-0}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    width: "15px"
    height: "24px"
  outside-banner:
    backgroundColor: "{colors.bad}"
    textColor: "{colors.ramp-0}"
    rounded: "{rounded.pass}"
    padding: "18px 14px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    rounded: "{rounded.ctl}"
    padding: "12px 16px"
---

# Design System: Squadup

## Overview

**Creative North Star: "Departures"**

Every hangout is a departure. Home is your boarding pass, Rides is a departure board, and status changes flip like split-flap letters. The system borrows its materials from travel paper and station signage rather than from app dashboards: a printed pass with a violet carrier band, perforated tear lines with punched notches, condensed uppercase signage, monospaced times and seat numbers, and a board of tiles that flip letter by letter. It is dark by design, because it is opened on phones at night, in cars and outside venues.

Density is that of a ticket, not a feed: one pass carries the answer to "when, where, which car, which seat, am I coming", and everything below it is a ruled list. Surfaces sit on one violet-black ramp and are separated by a single 1px rule weight; only the pass, sheets and the toast lift off the page. The logo's two colours do all the brand work: violet fills, lavender marks.

The build refuses the stock dashboard look: rounded soft cards, gradient heroes and icon-box grids do not appear anywhere.

**Key Characteristics:**
- One violet-black tonal ramp for every neutral, from tile black (#0a0910) to ink (#f5f3fa).
- Logo violet fills primary actions, the pass band and selected segments; lavender marks codes, the active tab, focus and whatever is yours.
- Three type voices with strict jobs: Big Shoulders Display for signage, Archivo for reading, JetBrains Mono for times, codes, seats and money.
- One 1px rule weight; dashed 2px lines only where paper tears or a fare totals.
- Split-flap tiles are the signature: status words flip in letter by letter when they change.

## Colors

A violet-black night palette carrying the logo's violet and lavender, with three signal colours that appear mostly as text, strokes and 12% washes.

### Primary
- **Carrier Violet** (`violet`): the logo's deep violet. Fills primary buttons, the boarding-pass carrier band, the selected RSVP segment, checkbox accents and text selection. White text on it reads at 6.6:1. Pressed and hover state is **Pressed Violet** (`violet-press`).

### Secondary
- **Logo Lavender** (`lav`): marks rather than fills. Car and poll codes, timetable times, the active tab and its dot, focus outlines, links, the caret, empty-state and note glyphs, the ring around your own avatar and your own car code, selected poll options. **Lavender Wash** (`lav-wash`) tints poll result bars, owner authority strips and incoming requests.

### Tertiary (signals)
- **Go Green** (`good`): confirmed, accepted, paid, winner, at the venue. Solid only on the Accept button and the confirmed segment of the money meter.
- **Amber Hold** (`warn`): pending, asked, offered, waiting for the Treasurer. Pending pass fields turn amber.
- **Alarm Rose** (`bad`): declined, overdue, still needs a lift, and the "driver is outside" banner, which is its one solid fill besides badge counts.
- Each has a 12% wash (`good-wash`, `warn-wash`, `bad-wash`) for notes and poll winners.

### Neutral
- **Tile Black** (`ramp-0`): split-flap tiles, inputs, poll options, the board frame, fare total row, punched holes and dark text on signal fills.
- **Night** (`bg`): the page, the app bar and the tab bar.
- **Pass Stock** (`surface`): the pass, board rows, sheets, polls, fact and fare rows.
- **Raised Stock** (`surface-2`): hover fills, quiet counts, scrollbar thumb.
- **Rule** (`rule`): every divider, row border and tile edge. Decorative only.
- **Edge** (`edge`): boundaries of controls (buttons, inputs, segments, steppers, checkboxes), 3:1 against surfaces.
- **Faded Ink** (`muted`): secondary text, field labels, inactive tabs.
- **Ink** (`ink`): primary text; also the toast background.
- **Scrim** (`scrim`): behind sheets.

### Named Rules
**The One Ramp Rule.** Every neutral comes from the violet-black ramp. No neutral grey from outside it, no pure black, no pure white except text on violet.

**The Fill and Mark Rule.** Violet fills; lavender marks. Violet is never used as a text or line colour on the dark ground, and lavender is never a large fill (its fill use is the 12% wash and the small selected-option mark).

**The Signal Wash Rule.** Green, amber and rose appear as text, 1px strokes at 40 to 55% opacity, or a 12% wash. A solid signal fill is reserved for the one control or alert that resolves the moment (Accept, a ticked task check, the outside banner, the error toast, badge counts, the money meter).

## Typography

**Display Font:** Big Shoulders Display (weights 700, 800, 900; fallback Archivo Narrow, sans-serif)
**Body Font:** Archivo (weights 400 to 800; fallback system-ui)
**Label/Mono Font:** JetBrains Mono (weights 500, 700; fallback ui-monospace)

**Character:** condensed station signage over a sturdy grotesque, with a monospace that reads like a printed timetable. The signage shouts in uppercase; the grotesque explains; the mono only ever carries numbers and codes.

### Hierarchy
- **Display** (900, 52px, 0.9, uppercase): the landing manifesto only; its emphasised phrase turns lavender. Drops to 44px under 370px.
- **Pass Date** (900, 46px, 0.92, uppercase): the date on the boarding pass. Drops to 40px under 370px.
- **Headline** (800, 40px, 0.95, uppercase): screen titles.
- **Sheet Title** (800, 28px, 1, uppercase): bottom-sheet titles.
- **Section** (800, 21px, 1.1, 0.03em, uppercase): section heads over a 1px rule, such as "Needs you".
- **Field Label** (800, 12 to 14px, 0.14em, uppercase, muted): pass field names (DEPART, CAR, SEAT), board column heads, fact labels, the pass stub question. Big-value pass fields that hold words use Big Shoulders at 21px.
- **Title** (Archivo 700, 17px, 1.3): poll questions, venue line on the pass.
- **Body** (Archivo 400, 16px, 1.5): default text. Secondary text is 14.5px muted, meta lines 13 to 13.5px. Lead paragraphs cap at 34 to 40ch.
- **Label** (Archivo 700, 15px; 14px small; tabs 600 12px): buttons, segments, row names.
- **Data** (JetBrains Mono 700, 15 to 22px, tabular numbers): times, seat counts, fares, totals, poll counts, the pass band countdown.
- **Code** (JetBrains Mono 700, 13px, 0.02em, lavender): car codes (SQ1) and poll codes.

### Named Rules
**The Three Voices Rule.** Big Shoulders is signage and is always uppercase; Archivo is everything you read; JetBrains Mono is only for times, codes, seats and money, always with tabular numbers. A sentence never sets in mono, and a number you compare never sets in Archivo.

**The Signage Has No Lowercase Rule.** Any Big Shoulders setting is uppercase with positive tracking (0.005em at display sizes, up to 0.14em at 12px labels).

## Layout

A single phone column. Content sits in a 560px max-width wrap with a 16px gutter, centred on wider screens. Each screen is a grid with 20px between blocks; sections stack with 10px internal gaps under a section head with an 8px bottom padding and a 1px rule. The app bar (60px min) is sticky at the top on Night with a bottom rule; the five-tab bar (62px tabs) is fixed at the bottom with a top rule, and the page reserves 108px plus the safe-area inset beneath it. Both respect safe-area insets.

Lists are ruled, not carded: rows of 56px minimum separated by 1px rules, first row without a top rule. Tables of facts, fares, timetables and boards are framed once (1px rule, 8px radius) with rows separated by inner rules. Two-up form rows collapse to one column under 370px. Above 700px the bottom sheet becomes a centred 540px dialog 24px off the bottom.

Spacing steps observed in use: 4, 8, 12, 14 (pass padding), 16 (gutter), 20 (page gap), 28 (landing gap).

### Named Rules
**The One Rule Weight Rule.** Every divider is 1px in `rule`. The only other line is a 2px dashed `rule`, and it means paper: the pass tear line and the fare total.

## Elevation & Depth

Mostly flat tonal layering: Night under Pass Stock under Raised Stock, separated by rules. A single lift shadow exists for objects that are physically handed to you.

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 22px 44px -20px rgba(0,0,0,.8), 0 2px 6px rgba(0,0,0,.35)`): the boarding pass, bottom sheets and the toast.
- **Your ring** (`box-shadow: 0 0 0 2px var(--bg), 0 0 0 3.5px var(--lav)`): your own avatar. Your car code on the board gets the same idea as a 1.5px lavender outline offset 3px.
- **Input focus halo** (`box-shadow: 0 0 0 3px var(--lav-wash)` with a lavender border).
- **Beacon** (`0 0 0 7px var(--bad-wash)`, pulsing every 1.4s): only the "driver is outside" banner.

### Named Rules
**The One Lift Rule.** Only the pass, sheets and the toast cast a shadow. Lists, boards, polls and fact tables are flat and framed by rules.

## Shapes

Small, deliberate radii that echo printed and mechanical objects: 3px split-flap tiles, 4px tags (square-ish like printed codes), 8px controls and framed tables, 10px avatars (rounded squares, 8px at small size), 14px for the pass and the outside banner, 18px for sheet tops. Counts are 9px pills; the active-tab marker and poll radio marks are circles; multi-select marks are 5px squares; seat pips are 10 by 14px with 2px corners.

The pass is the one silhouette with cut-outs: a 2px dashed tear line inset 16px from each side, with 22px circular notches in Night punched out of both edges.

### Named Rules
**The Three Radii Rule.** Tiles 3px, controls 8px, the pass 14px. Anything new picks one of those; nothing gets a soft 16 to 24px card radius.

## Components

### Buttons
Solid, compact, confident. Archivo 700 15px, 44px tall.
- **Shape:** gently squared (8px).
- **Primary:** Carrier Violet fill and border, white text, 0 16px padding. Hover and press to Pressed Violet.
- **Secondary (default):** transparent with a 1px Edge border, Ink text; hover fills Raised Stock, active fills Rule.
- **Good:** Go Green fill with Tile Black text, for Accept; hover dims to 92% brightness.
- **Quiet:** no border, muted text that turns Ink on hover.
- **Danger:** Alarm Rose text and a 55% rose border.
- **Small:** 40px tall, 0 12px, 14px text. **Disabled:** 40% opacity.
- **Icon button:** 44px square, transparent, Raised Stock on hover, with an optional count badge.
- Transitions are 140ms on the house ease-out.

### Segmented control (RSVP)
A single 1px Edge frame (8px) split into equal 44px cells by 1px Edge dividers. Unselected cells are muted text; hover goes Ink on Raised Stock; the selected cell fills Carrier Violet with white text.

### Chips / Tags
- **Style:** 24px tall, 4px radius, 1px Rule border, Archivo 600 12px, muted text.
- **Tones:** lavender, green, amber or rose text with the matching 40 to 45% border. No fills.
- **Counts:** 18px rose pills with Tile Black mono 11px numbers; the quiet count is Raised Stock with Ink.

### Cards / Containers
- **Corner Style:** 8px for framed tables, polls and notes; 14px only for the pass.
- **Background:** Pass Stock on Night; option rows and the board frame in Tile Black.
- **Shadow Strategy:** flat, except the pass (Lift).
- **Border:** 1px Rule.
- **Internal Padding:** 12px (14px for polls and the pass).
- **Notes:** 12px padded, Pass Stock with a Rule border and a lavender glyph; tone variants swap to a 12% wash with no border.

### Inputs / Fields
- **Style:** Tile Black field, 1px Edge border, 8px radius, 44px tall, 10px 12px padding, 16px text. Date and time inputs set in JetBrains Mono 15px.
- **Focus:** border turns lavender with a 3px lavender-wash halo; 140ms.
- **Labels:** Archivo 600 14px above the field, with a muted 13px hint.
- **Stepper:** Edge-framed pair of 44px buttons around a mono 17px value.

### Navigation
- **App bar:** logo mark (32px), squad name (Archivo 700 16px) over a muted 13px venue and time line, crew and menu icon buttons.
- **Tab bar:** five equal tabs, 23px stroke icon over a 600 12px label, muted at rest, Ink on hover, lavender when current with a 4px lavender dot 4px above the bottom edge. Count badges sit top right of the icon.
- **Icons:** one authored stroke family, 24px grid, 2px stroke, round caps and joins, `currentColor`; 16, 20 and 24px sizes.

### Boarding Pass (signature)
The Home hero. A Pass Stock ticket (14px radius, Lift) with a violet carrier band (logo mark on a Tile Black chip, the member's name in Big Shoulders 800 16px at 0.08em, countdown in mono), a Pass Date headline and venue line, a three-column field row (DEPART / CAR / SEAT, ratios 1.1 : 1.3 : 0.9, divided by 1px rules) with mono values or Big Shoulders words, the punched tear line, and a stub holding the "Coming?" RSVP segment and small secondary actions. Pending values (an offered car, an asked seat) turn amber with a trailing question mark.

### Departure Board and Split-Flap (signature)
A Tile Black frame (1px Rule, 8px) with a field-label header row and Pass Stock rows on a 44px / flexible / auto grid: lavender car code, driver name over muted riders, and a split-flap status cell. Your row rings its code in lavender. Each flap letter is a 15 by 24px Tile Black tile (3px, 1px Rule) with a dark hairline across its middle, Big Shoulders 800 16px, coloured by tone (lavender, green, amber, rose). When a status changes, and once when a cell first appears on page load, tiles flip in from rotateX(-90deg) with a brief brightness flash, 420ms each on the house ease-out, staggered 45ms per letter; a redraw mid-flip resumes rather than restarts, and finished cells revert to static tiles.

### Needs-you rows
Ruled rows with a 24px tone-coloured glyph, a 700 15px title over a muted 13.5px sub-line, and either a chevron (navigates; the title turns lavender on hover) or an inline action row indented 36px.

### Poll options
50px Tile Black rows with an Edge border and a round mark (square for multi-select), a lavender-wash result bar growing behind the text over 420ms, and a mono count. Selected: lavender border plus an inset 1px lavender ring, filled lavender mark. Winner: green border and green wash.

### Fare table
Framed rows of Archivo 600 15px labels and mono 18px tabular amounts; the total row sits on Tile Black under a 2px dashed rule with a Big Shoulders label and a 22px amount. Below it, a 10px meter splits green (confirmed) and amber (waiting).

### Outside banner
Full-width Alarm Rose block (14px radius), Tile Black Big Shoulders 900 26px uppercase, with the Beacon pulse. It appears only when your driver says they are outside.

### Sheets and toast
Bottom sheets on Pass Stock with 18px top corners, a 40 by 4px Edge grabber, a Sheet Title head and Lift; they rise 32px over 280ms over the Scrim. The toast is an inverted Ink block (8px) with Night text, rising 14px over 260ms; errors turn rose.

## Do's and Don'ts

### Do:
- **Do** take every neutral from the ramp: `ramp-0`, `bg`, `surface`, `surface-2`, `rule`, `edge`, `muted`, `ink`.
- **Do** fill only primary actions, the pass band and selected segments with Carrier Violet, and mark codes, the active tab, focus and "yours" with Logo Lavender.
- **Do** set every time, code, seat count and amount in JetBrains Mono with tabular numbers, and every Big Shoulders setting in uppercase.
- **Do** separate rows with the single 1px rule, and keep the 2px dashed line for tear lines and totals.
- **Do** show a status word on the board as split-flap tiles that flip only when the status changes, and render them static under reduced motion.
- **Do** strike through what is done or declined (line-through with muted colour) rather than hiding it.
- **Do** keep every touch target at least 44px and focus visible as a 2px lavender outline offset 2px.
- **Do** colour generated avatars with muted hues (`hsl(h 32% 34%)`) so faces never compete with the violet, and ring your own in lavender.

### Don't:
- **Don't** use rounded soft cards, gradient heroes or icon-box grids; this world is a ticket and a board, not a dashboard.
- **Don't** add a shadow to anything other than the pass, a sheet or the toast.
- **Don't** set sentences in mono or numbers you compare in Archivo.
- **Don't** use solid green, amber or rose fills outside Accept, ticked task checks, the outside banner, the error toast, badge counts and the money meter.
- **Don't** give a container any radius but 8px (controls, framed tables, polls), 14px (the pass and outside banner) or 18px (sheet tops); soft 16 to 24px card corners are out.
- **Don't** add a light theme; the product is dark by design for night use.
