# Architecture

Suno is a **local-first family super-app**: a static PWA made of modules (Grocery,
To-do, …) that store data on each phone and reconcile peer-to-peer over the local network.

## 1. Principles

1. **Local first** — local storage is the primary source of user state.
2. **Offline first** — every module remains useful with no Internet.
3. **Peer synchronization (mesh)** — any device exchanges changes directly with any other
   family device; there is no fixed coordinator/owner and no host.
4. **No cloud dependency** — GitHub Pages distributes code only; family data never leaves
   the devices. There is **no cloud data backend**, and one is deferred unless the owner
   explicitly requests it (any future relay would carry sync *signalling* only, never data).
5. **Modules over monolith** — features are modules behind one home screen; a module owns
   its screens and its permission model.

Central rule:

> The network is an occasional synchronization mechanism, not a dependency of the app.

## 2. Super-app structure

```text
Home (module tiles)
  ├── Grocery       — shared household list; admin curates, members request
  ├── To-do         — per-member private lists + delegation; flat peer-to-peer
  └── (backlog)     — Notice board, Ledger, Calendar (see below)
```

Backlog modules (not built): **Notice board** (today's menu, birthdays, functions, kids'
exams / matches / PTM); **Ledger** (milkman tally, maid leaves; personal and shared
ledgers); **Calendar** (family calendar with the Indian Panchang and shubh muhurt). Each
will be a module on the same substrate (op log + local persistence + peer sync), choosing
its own role/sharing model like the existing two.

- A **module** is a self-contained feature: its own domain rules, UI screens, and (where it
  needs one) its own role model. Grocery keeps a light **admin/member** split; To-do is
  **flat — no admin**.
- All modules share the same substrate: the family/identity model, the operation log, local
  persistence, and the sync transport.

## 3. Layers

- **Layer 1 — Presentation.** Home shell + per-module UI (grocery list/browse, to-do lists,
  add flows), family setup, sync status. Vanilla TypeScript, no framework; the UI does not
  touch persistence or transport directly.
- **Layer 2 — Domain.** Pure, browser-free, testable: item/task rules, roles, operation
  generation, the deterministic merge/reducer, and helpers such as natural-language
  date/time parsing.
- **Layer 3 — Local persistence.** IndexedDB behind a repository API: operation log, local
  identity/device id, family settings, members, module state. Additive migrations.
- **Layer 4 — Synchronization.** Peer-to-peer operation exchange + merge, behind a transport
  interface. Independent of the UI.
- **Layer 5 — Platform adapter.** Optional native capabilities the browser lacks (LAN
  discovery, a local listening socket, background service), isolated so the core stays
  web-based.

## 4. Data ownership

There is no central database. Every device owns a local database and its own slice of the
operation log. During sync, devices exchange operations until they converge. No device is
the permanent owner of anyone else's data.

## 5. Data model

### Family (household)

```text
Family
------
family_id
name
created_at
```

### Identity / member and device

```text
Member                         Device (local identity)
------                         ----------------------
member_id                      device_id      generated once per install
display_name                   member_id      the person this device belongs to
role (per module; grocery)     public_key     where cryptographic identity is used
created_at
```

A member is a real person on their own device; a member may eventually have more than one
device.

### Grocery item (shared family data)

```text
GroceryItem
-----------
item_id, catalog_item_id, name, for_member_id (nullable = shared),
quantity, unit, status (needed | purchased), done_at (nullable),
created_by (device_id), created_at, updated_at
```

### To-do task (private, or targeted when delegated)

```text
TodoTask
--------
task_id
owner_member_id       whose list it belongs to
title
due_at                nullable epoch; parsed from text, editable
priority              optional
status                open | done
delegated_to          member_id, or null for a personal task
delegation_status     null | pending | accepted | rejected   (set when delegated)
created_by            device_id
created_at, updated_at
```

Personal tasks (`delegated_to = null`) never leave the device. A delegated task is shared
only with the delegator and the assignee.

### Operation (append-only log)

```text
Operation
---------
operation_id (globally unique), device_id, sequence (per-device),
target_id (item/task), operation_type, payload, logical_version, created_at
```

Operation types cover both modules (grocery: ADD/UPDATE/SET_QUANTITY/SET_STATUS/DELETE/
RESTORE; to-do adds delegation/response/due operations). Family settings, members, and
catalog customization are currently local config records; folding them into the log is a
later refinement.

## 6. Why an operation log

Copying whole databases overwrites concurrent edits. Instead each device appends operations;
during sync each side sends the operations the other lacks, and both fold the union through a
deterministic reducer:

- **Idempotent** — dedup by `operation_id`; applying the same op twice is a no-op.
- **Commutative / order-independent** — a total order by `(logical_version, device_id,
  sequence)` means any exchange order converges to the same state.
- **Conflict policy (R15)** — last-write-wins by logical version; DELETE is terminal.

This is what makes **mesh** sync safe: A↔B then B↔C propagates A's changes to C transitively,
in any order.

## 7. Synchronization (peer-to-peer mesh)

No owner-coordinator. Any device can sync with any peer:

```text
1. Connect        two family devices establish a channel (see §8)
2. Authenticate   each proves family membership (S1/S4)
3. Exchange       each sends the operations the other lacks
4. Merge          both fold the union deterministically (idempotent)
5. Confirm        compare op counts / a state summary to confirm convergence
```

Run pairwise across devices, in any order, the whole family converges. A transient session
or relay connection is started only for the exchange and then dropped (R18).

### Data classes in sync (§R29)

- **Shared** (grocery list, family catalog): every operation replicates to all family
  devices.
- **Private / targeted** (to-do): personal-task operations are never transmitted; a
  delegated task's operations are sent only to the delegator and assignee. The sync layer
  therefore filters which operations a peer is entitled to receive — it does not ship the
  whole log blindly.

## 8. Transport and discovery

Browser PWAs cannot open a LAN listening socket or discover peers (no mDNS/UDP/broadcast),
and WebRTC still needs a signalling channel to introduce two devices. So transport sits
behind an interface the domain never imports:

```text
SyncTransport
-------------
discoverPeers()      startSession()      stopSession()
connect(peer)        send(...)           receive(...)
```

Implementations, lightest to heaviest:

- **Manual signalling** — devices exchange offer/answer codes by hand (works today, no
  infra; poor UX at family scale).
- **Relay-assisted** — a tiny signalling relay lets devices find each other and exchange
  WebRTC handshakes automatically; **data still flows peer-to-peer**, the relay only carries
  signalling/presence. This is the path to "open app, tap sync, they connect".
- **Native adapter** — an Android wrapper providing real LAN discovery + a local socket.

The desired experience is automatic discovery; the merge (Layer 2/4) is unaffected by which
transport introduces the peers.

## 9. Security model

```text
Internet ──X── (no family data)
GitHub Pages ──> application code only
Devices ── local network ──> family peers
```

- Same Wi-Fi does not imply membership; membership is an explicit invitation (S1).
- Each device has a unique identity (S2); sync rejects unauthenticated devices (S4).
- Preferred identity is public-key based; private keys stay on the device.
- Private-by-default modules (to-do) never put personal data on the wire (S6).
- No secrets in the repo (S5).

## 10. Failure scenarios

- **Peer disappears mid-sync** — no data lost; each device keeps its log; a later sync
  resumes from the logs.
- **Network drops** — sync stops safely; no partially applied operation corrupts local data.
- **Duplicate operation** — the operation id prevents double application.
- **App update** — a new version is served from Pages; the local DB survives via migrations.
- **Device replacement** — membership is recoverable/transferable via an explicit local flow.

## 11. Repository structure

```text
suno-app/
├── public/            icons, base catalog
├── src/
│   ├── ui/            home shell + per-module views
│   ├── domain/        types, operations, reducer, parsers (browser-free)
│   ├── storage/       IndexedDB repositories, migrations
│   ├── sync/          transport(s) + operation exchange/merge
│   └── platform/      native adapter (isolated)
├── index.html, manifest, service worker
└── README.md, requirements.md, architecture.md
```

## 12. Implementation status and order

Done:

```text
1. Local grocery list  →  2. IndexedDB persistence  →  3. PWA/offline install
→  4. Family + grocery admin/member roles  →  5. Operation log
→  6. Local two-device sync (manual-signalled WebRTC, idempotent merge)
→  7. Conflict policy (LWW + terminal delete)  →  8. GitHub Pages deploy
```

Next (v0.3+):

```text
9.  Super-app home shell + module navigation + Suno identity
10. To-do module (private lists, delegation lifecycle, NL date/time)
11. Targeted/private sync (share only delegated tasks)
12. Automatic peer discovery (relay-assisted or native adapter)
13. Cryptographic device/member identity + authenticated peers (S1–S4)
```

The first milestones deliberately avoided network complexity: prove the local data model
and operation log first, then layer synchronization and discovery on top.
