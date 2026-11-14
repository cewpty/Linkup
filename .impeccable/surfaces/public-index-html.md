---
version: 1
slug: "public-index-html"
primary_target: "public/index.html"
related_targets: ["public/app.js","public/style.css"]
---

# Squadup app (public/)

Scope: the whole mobile web app (landing, join, Home, Plan, Polls, Rides, Money, Crew, sheets). Mode: Operate (the landing page leans Persuade inside the same world).

Audience and job: teen friend groups on phones, often at night or in a car; know what's happening, what needs you, and act (RSVP, accept a pickup, vote, pay). Judges watch a demo video.

## Direction contract

THESIS: As easy as the group chat it replaces. One plan card answers where, when, am I coming and how am I getting there; everything else is a ruled list, and extra options stay folded until asked for. Replaces "Departures" (boarding pass, departure board, split-flap letters, car codes), which testers found hard to use.

OWN-WORLD: one violet-black tonal ramp for every neutral; logo violet #7030E0 fills primary actions and selected segments; lavender #A19DF0 marks links, fold toggles, the active tab and what's yours (ringed avatar). One 1px rule weight. Big Shoulders Display only for the landing headline, screen titles and the plan-card venue; Archivo for everything else in sentence case; JetBrains Mono only for times and money.

STORY: open the link and in one glance know where, when, whether you said yes, and your ride; then act in one tap from "Needs you".

FIRST VIEWPORT: app bar (logo mark, squad name, crew, menu); plan card (countdown tag, venue, date and time, Maps / Calendar / Full plan links, "Are you coming?" segment, "Your ride" row); "Needs you" below; bottom tabs Home, Plan, Polls, Rides, Money.

FORM: Plain Night, a distill of Departures (seed:f442b05ed1a15705). Signature interaction: fold toggles that keep each screen short and survive live updates.

FINISH: unreviewed and undocumented is unfinished; DESIGN.md and the sidecar describe Plain Night.
