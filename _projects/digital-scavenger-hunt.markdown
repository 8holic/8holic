---
layout: post

title: Digital Scavenger Hunt

banner_image: digital-scavenger-hunt.jpeg

start: 2025-06-09

end: 2025-06-29

tags:
  - Project

---

## Inspiration

The event organisers wanted to spread the crowd across food booths to eliminate the long queues at any one stall. I proposed an optional, web-based activity tracker that adds a hunt layer on top of the event without forcing participation.

## What I did

This was my first application — the project where everything started. I built a check-in and scavenger-hunt web app for Kampung Spirit 2025 with HTML/JS and a Firebase backend, available at [github.com/8holic/kampungspirit25](https://github.com/8holic/kampungspirit25). Around 50 participants used it at the event.

- Participants register and get a digital card, plus a map of where the stations are
- Session state is kept server-side via a session ID, so progress persists across browsers
- Check-in on arrival by scanning a QR code
- Each food booth has a QR code; scanning once records the claim, and a second scan prompts "already got once"
- Only some booths are hidden "Treasure" booths — scanning reveals whether it's a treasure or not
- Rotating treasure codes keep the hunt fresh, so people can't learn which booths are treasure booths
- A mini-game at certain booths recognises parts of olden days, records the fastest time and score, and feeds into the prizes
- The tracker is fully optional — if participants skip it, the event runs exactly as before

## What I'm proud of

- Designing it as a low-barrier, optional layer — no negative impact on the event if unused
- Rotating treasure codes, a detail that keeps the game fair and replayable
- Seeking committee approval for a trial run before going ahead
- Users were impressed by how the app caches progress and keeps the session alive across browsers

## What can be further improved

- Group registration. The event is family-oriented, yet the app only registers per person — a common feedback point was that families with multiple members want to register together. This was overlooked and is the top candidate for the next iteration.
- Responsive UI. The interface is basic and barebones, and lacks proper mobile layout — on phones it scales awkwardly. A mobile-first pass is long overdue.

