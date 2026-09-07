# Requirements

Suno is a **local-first family super-app** made of modules (Grocery today, To-do next).
Requirement numbers below are stable identifiers referenced elsewhere (code, commits);
their text may be revised, but a number keeps its meaning.

## 1. App-wide product requirements

### R1 — Local-first operation

The application MUST work without Internet access after it has been installed/cached. Every
module MUST remain usable when the device has no network connection.

### R2 — Local storage

Each device MUST maintain its own persistent local database (IndexedDB or equivalent).
Family data MUST NOT require a cloud database.

### R3 — PWA

The application MUST be installable as a Progressive Web App on supported Android browsers,
including a Web App Manifest, Service Worker, application icons, an offline application
shell, and HTTPS deployment.

### R4 — Static distribution

The application MUST be deployable as a static site on GitHub Pages. No application backend
is required for normal (offline) operation.

### R5 — Family creation

The first device MUST be able to create a family (household), generating a family id, the
creator's identity, and a device id (plus cryptographic key material where required). The
creator becomes the family **admin** for admin-gated modules (see R7).

### R6 — Family membership

A member MUST be able to invite another device into the family. V1 SHOULD use a locally
shared invite (code or QR / short-range transfer). The invitation MUST identify the family
and let the new device establish membership. Each member is a real person on their **own**
device.

### R7 — Roles are per-module

Roles are scoped to a module, not global:

- **Grocery** MUST support an **admin/member** split: the admin curates the shared catalog
  and marks items done; members raise requests (add/edit/quantity/remove). A member MUST
  NOT gain admin privileges automatically.
- **To-do** MUST be **flat peer-to-peer with no admin** — every member is equal.

### R23 — Super-app shell and modules

The application MUST present a **home screen** listing available modules as tiles (with
icons), and MUST let the user enter a module and return home. The app's identity (name,
icon) MUST represent Suno as a family app, not a single module.

## 2. Grocery module

### R8 — Grocery entry

Members MUST be able to add a grocery item, edit it, change quantity, remove it, mark it
done (purchased), and restore it to needed.

### R9 — Base catalog

The application MUST ship a built-in read-only base grocery catalog, represented separately
from family data (category > subcategory > item; region-specific starter list).

### R10 — Family catalog

A family MUST be able to add custom grocery entries locally; custom entries MUST synchronize
as shared family data.

### R24 — Done and archive

Marking a grocery item done MUST move it to a Done view. Done items SHOULD auto-archive
after a fixed window (currently 2 days from when marked done); archived items MUST remain in
the operation log (archiving is a view-time filter, not a deletion).

## 3. To-do module

### R25 — Per-member private lists

Each member MUST have their own to-do list. Personal (non-delegated) tasks MUST be private:
they MUST NOT be sent to any other device.

### R26 — Delegation

A member MUST be able to delegate a task to another family member. A delegated task MUST be
visible to both the delegator and the assignee, and MUST be shared **only** with the members
it involves (targeted sync — see R27).

### R27 — Delegated-task lifecycle

A delegated task MUST carry a status both parties can see: **pending → accepted / rejected →
done**, plus whether it has **synced** to the other device. Either the delegator or the
assignee MUST be able to mark it done; the assignee MUST be able to accept or reject it.

### R28 — Natural-language time/date

When a task is entered as free text, the module MUST attempt to parse a time (and date) from
the text (e.g. "...6 PM today"; mixed Hindi/English acceptable). If a time is detected with
no date, the date MUST default to today; an explicit date MUST be used as given. The parsed
date/time MUST be editable with a minimalist, theme-matching datetime picker.

## 4. Synchronization

### R11 — Peer-to-peer sync, no fixed coordinator

Synchronization MUST be **peer-to-peer**: any device MAY sync with any other family device,
in any order, with no permanently designated coordinator/owner. A device MUST be able to
initiate a sync itself.

### R12 — Device discovery

Automatic discovery of family devices on the current local network is the desired
experience and SHOULD require no manual IP entry. Because a pure-browser PWA cannot perform
LAN discovery, discovery MUST sit behind a transport interface (R13) with a manual fallback;
candidate mechanisms include a small local signalling helper, a native discovery adapter, or
a lightweight signalling relay (data still flows peer-to-peer).

### R13 — Transport abstraction

Connection establishment and transport MUST sit behind an interface the domain does not
depend on, so the merge logic is independent of how two devices are introduced (manual code
exchange, relay-assisted WebRTC, or a native adapter).

### R14 — Change synchronization

The system MUST synchronize **operations**, not whole-database copies. Each operation
SHOULD carry: operation id, device id, local sequence, target id, operation type, payload,
and logical version.

### R15 — Conflict handling

The system MUST define deterministic conflict rules; two devices editing the same item
independently MUST NOT cause silent corruption. The initial implementation SHOULD favor
simple deterministic rules (last-write-wins by logical version; DELETE terminal) over a
general CRDT framework.

### R16 — Idempotent synchronization

Receiving the same operation more than once MUST NOT duplicate its effect; operations MUST
have globally unique ids.

### R17 — Convergence check

After an exchange, devices SHOULD be able to confirm convergence (e.g. compare operation
counts / a state summary). No single device is privileged in this check.

### R18 — No permanent server

No device MAY run a permanent server. Any transient sync service (or relay session) MUST be
explicitly started and MUST stop after use. Family data MUST stay peer-to-peer / local.

### R29 — Data classes in sync

Sync MUST distinguish **shared** data (e.g. grocery list and catalog — replicated to all
family devices) from **private/targeted** data (to-do — personal tasks never sent; delegated
tasks sent only to involved members).

## 5. Security requirements

### S1 — Family authentication

Being on the same Wi-Fi MUST NOT imply family membership. Membership MUST be established
through an explicit invitation/authorization.

### S2 — Device identity

Each installation MUST have a unique device identity.

### S3 — Encrypted synchronization

Synchronization SHOULD use an encrypted authenticated channel where the platform permits.

### S4 — Authorization

A device MUST reject sync from devices it cannot authenticate as family peers.

### S5 — No secrets in repository

Private keys, family databases, member data, and sync credentials MUST NOT be committed.

### S6 — Private-by-default modules

A module that holds private data (to-do) MUST NOT place that data on the wire at all; only
explicitly shared items (delegated tasks) may be transmitted, and only to involved members.

## 6. Usability requirements

### U1 — Simple module screens

A module's main screen SHOULD show its essentials directly (grocery: needed / done /
quantities / add; to-do: my tasks / delegated, with a clear add).

### U2 — Minimal, symmetric sync UI

Any device SHOULD have a clear way to sync; the UI SHOULD show progress and result (e.g.
"Syncing…", "Synced ✓ / couldn't sync", last-synced time). There is no owner-only sync
button.

### U3 — No coordination burden

Members SHOULD NOT need special coordination for a routine sync; devices reconcile pairwise
and converge.

### U4 — Status visibility

The application SHOULD surface last successful sync, current device/member, family name, and
sync errors.

### U5 — Home and navigation

The home screen SHOULD make modules obvious (labelled tiles/icons) and returning home from a
module SHOULD be one tap.

## 7. Failure tolerance and lifecycle

### R21 — Failure tolerance

If synchronization is interrupted, local data MUST remain intact and a later sync MUST be
able to continue safely. App updates MUST preserve the local database through migrations.

### R22 — Device replacement

The design MUST support replacing a device without destroying the family; family membership
SHOULD be recoverable/transferable.

## 8. Future requirements

Potential future features (SHOULD NOT complicate current work): recurring grocery items,
shopping history, task recurrence/reminders/notifications, additional family modules,
encrypted backups, manual export/import, an Android native wrapper, and Play Store
distribution.
