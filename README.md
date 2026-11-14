# Linkup

**Hangout planning without the group-chat chaos.**

Planning a hangout in a group chat goes like this: 20 unrelated reels, the venue buried under 300 messages, someone waiting at home for a pickup nobody saw, and two people arguing about money afterwards.

Linkup is one link per hangout. Everyone opens it, types their name and they're in. There are no accounts and no passwords.

### 👉 Live app: **https://linkup.nafasat253.workers.dev**

**Try it:** open the live site and tap **"🎳 Try a demo squad"**. You land in a squad that already has five friends, a plan, cars and a budget.

## What it does

| Tab | What's in it |
|---|---|
| **Plan** | Your own checklist (am I going, how am I getting there, what do I owe). The plan (venue, address, date, time, notes). Voting on places and times. An info board for prices and opening hours. A feed of every change. |
| **Crew** | Who's going, maybe or out, and who hasn't answered. Invite link. Personal link for using Linkup on a second device. |
| **Rides** | Drivers post their seats. Riders grab a seat and share a pickup spot, typed or GPS. The driver taps **"I'm outside"**, which shows a big alert on the rider's phone and vibrates it. Riders tap **"I'm ready"** so the driver isn't left waiting. |
| **Jobs** | Planner, Info gatherer and Treasurer roles, plus custom ones. A shared to-do list with assignees. |
| **Money** | Same amount each, or a group target with pledges. Each person taps "I've paid", then the **treasurer confirms it**. A spending log shows where every bit of money went. |

### Privacy and trust rules
- **Invite-only.** You can't see or join a squad without the secret invite link.
- **Pickup locations go only to your driver.** The server never sends them to anyone else, so nobody else can see them even by inspecting the page. A location is **deleted** the moment the driver marks you picked up.
- **Data doesn't hang around.**
  - A pickup spot is wiped 12 hours after it's shared, even if nobody marks the pickup.
  - A whole squad deletes itself 7 days after the hangout date (or after 30 days of no activity if there's no date). Demo squads go after 2 days.
  - The Planner can delete a squad for everyone at any time.
  - A Durable Object alarm does all this on schedule, even when nobody has the app open.
- **No request logs.** Cloudflare request logging is switched off, so member tokens never end up in logs.
- **Money never moves through the app.** It only tracks who owes what and who has paid.
- **Roles carry power.** Only the Planner can lock the plan or make a voted option official. Only the Treasurer can confirm payments or change the budget. Every change shows in the feed, so nobody can argue about it later.

## How it's built

It runs on **Cloudflare Workers**, on the free plan.

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

```bash
npx wrangler login
npm run deploy
```

This prints a `https://linkup.<your-subdomain>.workers.dev` link.
