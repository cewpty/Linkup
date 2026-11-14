# Squadup

**Plans that don't die in the group chat.**

Planning a hangout in a group chat goes like this: 20 unrelated reels, the venue buried under 300 messages, someone waiting at home for a pickup nobody saw, and two people arguing about money afterwards.

Squadup is one link per hangout. Everyone opens it, types their name and they're in. There are no accounts and no passwords.

### 👉 Live app: **https://squadup-app.pages.dev**

**Try it:** open the live site and tap **"Try the demo squad"**. You land in a squad that already has five friends, cars, polls and a budget. Aisha has offered you a lift, so you can try accepting a ride request straight away.

## The look

Simple on purpose. Home opens on one **plan card**: where, when, "Are you coming?" and your ride in plain words ("Aisha is picking you up"). Below it is **Needs you**, then a short summary of the squad. Extra options, like adding a timetable stop, pinning info, adding a poll option or logging spending, stay folded behind a **+** toggle until you need them. It's built dark-first in the logo's violet and lavender.

## What it does

| Where | What's in it |
|---|---|
| **Home** | The plan card (where, when, RSVP, your ride), a **Needs you** list of everything waiting on you (ride requests to accept, nudges, money to bring, polls to vote on, tasks), a squad summary, and recent activity (folded). |
| **Plan** | Venue, date, time, address, notes and a timetable. **Only the Planner can edit or lock it**; everyone else views it. An info board anyone can pin prices and links to. |
| **Polls** | **Anyone can start a poll and vote**: where, when, or anything ("Food after?"). Anyone can add options. The Planner taps **Use** to put a winning place or time into the plan. |
| **Rides** | **Drivers offer a lift to anyone who needs one; riders ask a driver for one. Only the person receiving the request can accept or decline.** Riders share a rough area publicly and an exact pickup spot privately with their driver. "Leaving now" with an arrival time, "I'm outside" alerts that buzz the rider's phone, and check-ins at the venue. |
| **Money** | Same amount each, or a group target with pledges. People enter **how much they've paid**; every new amount and **every change waits for the Treasurer to confirm**. The Treasurer can confirm, reject or undo. A spending log shows where the money went. |
| **Crew** | Who's going, roles (Planner, Treasurer, Info gatherer, custom), a shared to-do list, and private **nudges** (remind someone to RSVP, sort a ride, pay or check a task). |

### Privacy and trust rules
- **Invite-only.** You can't see or join a squad without the secret invite link.
- **Pickup locations go only to your driver.** The server never sends them to anyone else, so nobody else can see them even by inspecting the page. A location is **deleted** the moment the driver marks you picked up.
- **Data doesn't hang around.**
  - A pickup spot is wiped 12 hours after it's shared, even if nobody marks the pickup.
  - A whole squad deletes itself 7 days after the hangout date (or after 30 days of no activity if there's no date). Demo squads go after 2 days.
  - **Only the Planner** can delete the trip for everyone, at any time.
  - A Durable Object alarm does all this on schedule, even when nobody has the app open.
- **No request logs.** Cloudflare request logging is switched off, so member tokens never end up in logs.
- **Money never moves through the app.** It only tracks who owes what and who has paid.
- **Ride requests are private.** Only the driver and the rider involved can see a request.
- **Roles carry power.** Only the Planner can edit, lock or delete the plan, or make a poll result official. Only the Treasurer can confirm payments or change the budget. Every change shows in the log, so nobody can argue about it later.

## How it's built

It runs on **Cloudflare Pages + Workers**, on the free plan.

- `public/`: the app itself, in plain HTML, CSS and JS. It's built for phones first, supports dark mode and needs no build step. Cloudflare serves it as static assets.
- `src/worker.js`: the API. **Each squad is its own Durable Object**, a tiny database that lives at Cloudflare. Phones get live updates over WebSockets, so when a driver taps "I'm outside", the rider's screen changes instantly.
- `src/core.js`: all the squad rules (who can see and do what). The Worker and the local Node server share this file.
- Each member gets a secret token, saved on their device, which identifies them. The server decides what each person is allowed to see and do.

## Run it locally

You need [Node.js](https://nodejs.org) 20 or newer.

**Quickest, no install:**
```bash
node server.js
```
Then open http://localhost:3000. This runs the same rules on a small Node server.

**Exactly like production (Cloudflare runtime):**
```bash
npm install
npx wrangler dev
```

## Deploy

There are two parts, and one command deploys both:

| Part | Name on Cloudflare | Address |
|---|---|---|
| The app's public address (Pages): serves `public/` and passes `/api/*` to the Worker through a service binding (`pages/`) | `squadup-app` | https://squadup-app.pages.dev |
| The backend (Worker + Durable Objects, `src/`) | `linkup` | https://linkup.nafasat253.workers.dev (same data, older link) |

```bash
npx wrangler login
npm run deploy          # Worker first, then the Pages site
```
`npm run deploy:worker` and `npm run deploy:pages` deploy one part at a time.
