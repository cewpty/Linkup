# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Teen friend groups (ages 13–19) planning a hangout together, on their phones, usually alongside a busy group chat full of unrelated messages. Inside a squad, members take roles: the Planner (owns the plan), the Treasurer (holds and confirms money), drivers, riders, and everyone else who just needs to know what's happening and what they owe.

Secondary audience: hackathon judges (Build Sprint, ages 13–19 theme "build something for someone you actually know") who evaluate the product from a demo video and by opening the demo squad.

## Product Purpose

Squadup replaces the chaos of planning a hangout in a group chat with one link per hangout: the plan, decisions, rides, jobs and money in one place. Success is a hangout where nobody waits at home for a pickup nobody saw, nobody argues about who paid, and everyone knows the plan.

## Positioning

- One link, no accounts: open the invite, type a name, you're in.
- Authority is explicit: only the Planner edits and locks the plan and can delete the trip; only the Treasurer confirms money.
- Pickups are requests, not grabs: drivers invite riders, riders ask drivers, and the receiver accepts or declines.
- Exact pickup spots are private to the rider's driver and deleted after pickup (or 12 hours).
- Every payment, and every change to a payment, waits for the Treasurer's confirmation.

## Operating Context

Used on phones, often at night or on the move, opened from a link pasted in a group chat. Live updates across phones (WebSockets). Decisions happen through polls anyone can start; the Planner turns a winning place or time into the plan. On the day: "I'm leaving now" with arrival time, "I'm outside" alerts, check-ins at the venue.

## Capabilities and Constraints

- Plain HTML/CSS/JS front end in `public/`, no build step; Cloudflare Worker + Durable Objects backend (`src/`), Pages front door (`pages/`).
- Tabs: Home (what needs you), Plan, Polls, Rides, Money; Crew page (people, roles, to-do); bottom sheets for settings, people and new polls.
- No money moves through the app; it only tracks.
- Squads auto-delete (7 days after the hangout, 30 days idle, demos 2 days).

## Brand Commitments

- Name: Squadup.
- Logo provided by the team: violet loop-path forming an S with a location pin (`public/brand/`). Wordmark "Squad" white + "up" violet.
- Palette is binding: the logo's deep violet (~#7030E0) and lavender (~#A19DF0) on near-black.
- The team asked for a design that looks human-made, bold ("tuff"), not like a generic AI-generated site.

## Evidence on Hand

- A built-in demo squad (synthetic friends Sam, Aisha, Ravi, Mia, Leo) for judges. No real users, testimonials or metrics exist; do not invent any.

## Product Principles

1. Answer "what do I need to do?" before anything else.
2. Make authority visible: who decides, who confirms.
3. Privacy by default for location; data that isn't needed gets deleted.
4. Every request has a receiver who says yes or no.

## Accessibility & Inclusion

Text contrast at least 4.5:1, touch targets at least 44px, reduced-motion respected, every control labelled.
