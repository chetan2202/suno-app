# Architecture

## 1. Architectural principles

The application follows five primary principles:

1. **Local first** — local storage is the primary source of user state.
2. **Offline first** — the application must remain useful without Internet access.
3. **Peer synchronization** — devices exchange changes directly over the local network.
4. **Temporary coordinator** — one device temporarily coordinates synchronization.
5. **No cloud dependency** — GitHub Pages distributes application code but does not store household data.

The central architectural rule is:

> The network is an occasional synchronization mechanism, not a dependency of the application.

---

## 2. Logical architecture

```text
+-------------------------------------------------------------+
|                        GitHub Pages                         |
|                                                             |
|  Static PWA: HTML + CSS + JS + Manifest + Service Worker   |
|  Base grocery catalog                                      |
+-------------------------------+-----------------------------+
                                |
                                | HTTPS / application delivery
                                v
+-------------------------------------------------------------+
|                         Each Phone                         |
|                                                             |
|  +-----------------------+                                  |
|  | PWA UI                |                                  |
|  +-----------+-----------+                                  |
|              |                                              |
|  +-----------v-----------+                                  |
|  | Application State     |                                  |
|  +-----------+-----------+                                  |
|              |                                              |
|  +-----------v-----------+                                  |
|  | IndexedDB             |                                  |
|  | - household           |                                  |
|  | - identity            |                                  |
|  | - members             |                                  |
|  | - catalog             |                                  |
|  | - grocery items       |                                  |
|  | - operation log       |                                  |
|  +-----------------------+                                  |
|                                                             |
|  Optional native Android networking layer                  |
+-------------------------------------------------------------+
```

---

## 3. Data ownership

There is no central database.

Every device owns a local database.

```text
Phone A
  └── Local state

Phone B
  └── Local state

Phone C
  └── Local state
```

During synchronization, devices exchange changes until they converge on the same household state.

The owner phone is a **coordinator**, not the permanent owner of everybody's data.

---

## 4. Application layers

### Layer 1 — Presentation

Responsible for:

- grocery list
- add/edit item UI
- household setup
- member management
- sync status
- settings

Possible technology:

- vanilla TypeScript
- React
- another lightweight web UI framework

The framework choice SHOULD remain independent of the synchronization model.

### Layer 2 — Domain

Responsible for:

- grocery item rules
- household rules
- member roles
- ownership
- merge rules
- operation generation

This layer SHOULD contain most business logic and SHOULD be testable without a browser.

### Layer 3 — Local persistence

Responsible for:

- IndexedDB
- database migrations
- operation log
- local identities
- local household state

The persistence layer SHOULD expose a clean repository API to the domain layer.

### Layer 4 — Synchronization

Responsible for:

- discovery
- authentication
- connection establishment
- operation exchange
- merge
- distribution
- verification

The synchronization layer SHOULD NOT depend on the UI.

### Layer 5 — Platform adapter

Responsible for capabilities that normal browser APIs cannot reliably provide.

Potential Android responsibilities:

- local HTTP/TCP server
- Wi-Fi/network discovery
- background service
- secure local networking
- integration with WebView/PWA

This layer is intentionally isolated so the core application remains web-based.

---

## 5. Data model

### Household

```text
Household
---------
household_id
name
owner_identity_id
created_at
version
```

### Identity

```text
Identity
--------
identity_id
display_name
role
public_key
created_at
```

### Device

```text
Device
------
device_id
identity_id
device_name
public_key
last_seen
status
```

A member may eventually have more than one device.

### Grocery item

Initial conceptual model:

```text
GroceryItem
-----------
item_id
catalog_item_id
name
quantity
unit
status
created_by
created_at
updated_at
```

### Catalog item

```text
CatalogItem
-----------
catalog_item_id
name
default_unit
category
source
```

`source` can distinguish:

```text
BASE
HOUSEHOLD
```

### Operation

```text
Operation
---------
operation_id
device_id
sequence
item_id
operation_type
payload
logical_version
created_at
```

Example:

```text
operation_id = 01J...
device_id    = D-ABC
sequence     = 184
item_id      = ITEM-MILK
operation    = ADD
payload      = { quantity: 2, unit: "litre" }
```

---

## 6. Why an operation log?

A naive synchronization implementation would copy the complete database:

```text
Phone A database
       |
       v
Phone B database
```

That creates overwrite problems.

Instead:

```text
Phone A
  |
  +-- operation 101
  +-- operation 102
  +-- operation 103

Phone B
  |
  +-- operation 201
  +-- operation 202
```

During synchronization:

```text
A asks B:
"Which operations do you have that I don't?"

B sends missing operations.

B asks A:
"Which operations do you have that I don't?"

A sends missing operations.

Both apply operations deterministically.
```

This makes synchronization incremental and idempotent.

---

## 7. Synchronization protocol

### Phase 1 — Start

Owner presses:

```text
SYNC HOUSEHOLD
```

The coordinator starts its temporary local service.

### Phase 2 — Discovery

The coordinator searches the local Wi-Fi network for household peers.

Discovery must identify:

- device ID
- household ID
- protocol version
- network endpoint

Unknown devices are ignored or rejected.

### Phase 3 — Authentication

The devices prove household membership.

Conceptually:

```text
Coordinator
    |
    | challenge
    v
Peer
    |
    | signed response
    v
Coordinator
```

The exact cryptographic protocol should be selected during implementation.

### Phase 4 — Capability/version negotiation

Peers exchange:

- protocol version
- application version
- supported features

This protects future versions from blindly exchanging incompatible data.

### Phase 5 — Operation exchange

The coordinator requests operations it does not have.

Peers respond with missing operations.

The coordinator then sends its missing operations to each peer.

### Phase 6 — Merge

All received operations are validated and applied.

The merge function MUST be deterministic.

### Phase 7 — Distribution

The coordinator sends the required operations/state updates to peers.

Each peer applies them idempotently.

### Phase 8 — Verification

Each peer reports a synchronization summary, such as:

```text
household_id
operation_count
highest_sequence_by_device
state_hash
```

The coordinator checks that peers have converged.

### Phase 9 — Shutdown

After successful synchronization:

```text
Stop local sync service
```

The device returns to normal offline operation.

---

## 8. Conflict model

Conflict handling should be deliberately simple in V1.

Possible operations:

```text
ADD
UPDATE
SET_QUANTITY
SET_STATUS
DELETE
RESTORE
```

Each operation receives a deterministic ordering/version.

The initial implementation SHOULD avoid pretending to solve every distributed-systems problem.

For example, if two devices independently edit the quantity of the same item, the system needs an explicit policy.

Possible V1 policy:

- use deterministic last-write-wins based on a logical version
- retain the operation history
- optionally surface conflicting edits in the UI

The exact rule should be finalized before implementation.

---

## 9. Discovery architecture

Browser-only PWA APIs are not sufficient to guarantee that an Android phone can expose a local listening server and participate in automatic network discovery.

Therefore the architecture should isolate discovery/server functionality behind an interface:

```text
SyncTransport
-------------
discoverPeers()
startServer()
stopServer()
connect(peer)
send(...)
receive(...)
```

The web application depends only on this interface.

A future Android adapter can implement it using native Android networking.

This avoids locking the application domain to a specific networking technology.

---

## 10. PWA and Android relationship

### Initial target

```text
GitHub Pages
     |
     v
PWA
     |
     +-- Service Worker
     +-- IndexedDB
     +-- Web UI
```

### If native networking is required

```text
Android application shell
        |
        +-- WebView / web application
        |
        +-- Native sync service
```

The native component should remain small.

The goal is not to create a traditional Android application with a cloud backend.

It is a web application with a thin platform adapter for capabilities unavailable to the browser.

---

## 11. Security model

### Trust boundaries

```text
Internet
   X
   |
   | no household data
   |
GitHub Pages
   |
   | application code only
   v
Devices
   |
   | local Wi-Fi
   v
Household peers
```

A device being connected to the same Wi-Fi network does NOT imply household membership.

Household membership is established through an explicit invitation.

### Cryptographic identity

The preferred model is public-key identity.

A household has an identity/key structure, and authorized members/devices possess credentials proving membership.

Private keys remain on the device.

The precise key hierarchy can be refined during implementation.

---

## 12. Failure scenarios

### Owner phone disappears during sync

No data should be lost.

Other devices retain their local operation logs.

A later synchronization can restart from those logs.

### Wi-Fi disconnects

Synchronization stops safely.

No partially applied operation should corrupt the local database.

### Peer disappears

The coordinator continues with other available peers.

The missing peer synchronizes during the next session.

### Duplicate operation

The operation ID prevents duplicate application.

### Application update

The PWA receives a new application version from GitHub Pages.

The local database remains intact through database migrations.

### Owner replaces phone

Ownership should be transferable through an explicit local recovery/transfer flow.

---

## 13. Repository structure

Suggested initial repository:

```text
grocery-pwa/
|
+-- public/
|   +-- icons/
|   +-- catalog/
|
+-- src/
|   +-- ui/
|   +-- domain/
|   +-- storage/
|   +-- sync/
|   +-- platform/
|
+-- tests/
|
+-- docs/
|   +-- requirements.md
|   +-- architecture.md
|
+-- index.html
+-- manifest.json
+-- service-worker.ts
+-- package.json
+-- README.md
```

The exact frontend framework can be chosen later.

---

## 14. Architectural decisions to finalize before implementation

The following decisions should be made before serious coding:

1. IndexedDB schema.
2. Operation/event format.
3. Conflict resolution policy.
4. Household/member cryptographic identity model.
5. QR-code join protocol.
6. Local peer discovery mechanism.
7. Android native networking mechanism.
8. Whether the sync service must remain alive when the PWA UI is closed.
9. Database migration strategy.
10. Export/import and recovery strategy.

These are the areas most likely to affect the long-term architecture.

---

## 15. Recommended implementation order

```text
1. Local grocery list
       ↓
2. IndexedDB persistence
       ↓
3. PWA/offline installation
       ↓
4. Household + owner/member identities
       ↓
5. Operation log
       ↓
6. Local two-device synchronization
       ↓
7. Conflict resolution
       ↓
8. Automatic device discovery
       ↓
9. Android networking adapter
       ↓
10. QR-based household joining
       ↓
11. Sync verification
       ↓
12. GitHub Pages deployment
```

The first milestone should deliberately avoid network complexity.

Prove that the local data model and operation log work correctly first. Then add synchronization on top.
