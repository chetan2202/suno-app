# Suno — a local-first family super-app

**Suno** is a privacy-first app for a family to coordinate everyday life — without
accounts, cloud storage, or a permanent backend. It is a **local-first PWA**: every family
member keeps their own data on their own phone, and devices reconcile directly with each
other over the local network.

Suno is not a single-purpose app. It is a **super-app made of modules**:

- **Grocery** — a shared household grocery list (the first module; complete).
- **To-do** — per-member task lists with delegation between family members (built).
- More family modules can be added over time behind the same home screen.

**Planned modules (backlog, not built yet):**

- **Family notice board** — today's menu / food notices, upcoming birthdays, functions to
  attend, kids' exams, sports matches, parent-teacher meetings, and similar family notices.
- **Ledger** — track running accounts like the milkman's tally or the maid's leaves, as
  both **personal** ledgers and **shared** household ledgers.
- **Calendar** — a family calendar including the Indian **Panchang** (tithi/dates) and
  **shubh muhurt** (auspicious timings).

A home screen presents the modules as tiles; each module owns its own screens.

## Guiding principle

> The network is an occasional synchronization mechanism, not a dependency of the app.

Suno must stay fully useful with:

```text
Internet = OFF
Wi-Fi    = OFF
Sync     = OFF
```

## Goals

- Work offline during normal use; store each person's data locally on their phone.
- Require no Google/Apple account, no cloud account, no application backend.
- Distribute as a PWA from GitHub Pages (static hosting).
- Support one family (household) with multiple members, each on their own device.
- Synchronize **peer-to-peer** over the local network — any device with any device, in any
  order, converging to the same state.
- Keep private data private: a module may share only what it must (see To-do below).

## Non-goals

- **No cloud data backend.** All family data stays on the family's own devices and syncs
  peer-to-peer. A cloud option (e.g. Drive or a hosted store) is **deferred and will not be
  added unless the owner explicitly asks for it.**
- Mandatory accounts, advertising/analytics, a permanent server, internet-based multi-family
  collaboration, or a commercial catalog.

## Family, members, and devices

- **Family (household):** the shared space. Created on the first device; others join with a
  locally shared invite code. It has an id, members, and per-module shared data.
- **Member:** a real person. Each member installs Suno on their **own** phone and becomes a
  peer in the family. A member is bound to a device id (generated once per install).
- **Device:** one phone. Each device has its own local database and unique device id.

Roles differ **per module** (this is deliberate):

- **Grocery** keeps a light **admin/member** model: the admin curates the shared catalog
  and marks items done; members raise requests (add/adjust items). The grocery list is
  **household-shared** — everyone sees the same list.
- **To-do** is **flat peer-to-peer — there is no admin.** Every member is equal.

## To-do module (peer-to-peer, private by default)

- Each member keeps their **own** to-do list. Personal tasks are **private** and never
  leave the device.
- A member can **delegate** a task to another member (e.g. "remind Papa to drop me at class
  6 PM today", "ask Grandma for morning sprouts"). Only **delegated** tasks are shared, and
  only with the members involved — a task "in your name" syncs to you.
- A delegated task has a lifecycle both people can see: **pending → accepted / rejected →
  done**, plus whether it has **synced**. Either the delegator or the assignee can mark it
  done.
- Tasks understand **time**: the time (and date) is parsed from the task text
  ("...6 PM today"). Time with no date defaults to today; an explicit date is used as-is.
  The date/time is editable with a minimalist datetime picker.

## Synchronization (peer-to-peer mesh)

Sync is built on an **append-only operation log** that merges idempotently and
commutatively (dedup by operation id, deterministic order by logical clock + device id).
Because of that, **any two devices can exchange logs in any order and converge** — no
central owner, no "host". If several devices are on the same network and each syncs, the
whole family converges pairwise.

Two classes of data ride the same log:

- **Shared** (e.g. the grocery list, household catalog) — replicated to all family devices.
- **Private / targeted** (to-do) — personal tasks stay local; delegated tasks are sent only
  to the members they involve.

Automatic peer discovery (open app, sync, devices find each other) is the desired
experience. A pure-browser PWA cannot discover LAN peers on its own, so discovery lives
behind a transport interface with a fallback; the merge itself is transport-independent.

## Distribution

Static PWA on GitHub Pages. The repository holds application code and a read-only base
grocery catalog only — **family data is never committed**. A thin native adapter (Android
wrapper) can be added later for capabilities the browser lacks (e.g. LAN discovery) without
changing the local-first data model.

```text
https://<github-user>.github.io/<repository>/
```

## Working docs

`requirements.md` (product/security/usability requirements), `architecture.md` (design and
layering), and the git-ignored working files `plan.md` / `progress.md` / `discussion.md`
(planning, append-only progress log, and cross-session Q&A).
