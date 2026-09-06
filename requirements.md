# Requirements

## 1. Product requirements

### R1 — Local-first operation

The application MUST work without Internet access after the application has been installed/cached.

The grocery list MUST remain usable when the device has no network connection.

### R2 — Local storage

Each device MUST maintain its own persistent local database.

The database SHOULD use IndexedDB or an equivalent browser-local persistent storage mechanism.

Household grocery data MUST NOT require a cloud database.

### R3 — PWA

The application MUST be installable as a Progressive Web App on supported Android browsers.

It MUST include:

- Web App Manifest
- Service Worker
- application icons
- offline application shell
- HTTPS deployment

### R4 — Static distribution

The initial release MUST be deployable as a static site on GitHub Pages.

No application backend is required for normal operation.

### R5 — Household creation

The first device MUST be able to create a household.

Creating a household MUST generate:

- household ID
- owner identity
- device ID
- cryptographic identity/key material where required

The household creator becomes the owner.

### R6 — Family membership

The owner MUST be able to invite another device into the household.

V1 SHOULD use a locally displayed QR code or equivalent short-range/manual transfer mechanism.

The invitation MUST identify the household and provide sufficient information for the new device to establish membership securely.

### R7 — Roles

V1 MUST support:

- OWNER
- MEMBER

The owner MUST be able to manage membership.

A member MUST be able to manage grocery items but MUST NOT automatically gain owner privileges.

### R8 — Local grocery entry

Members MUST be able to:

- add a grocery item
- edit an item
- change quantity
- remove an item
- mark an item purchased
- restore an item to needed status

### R9 — Basic catalog

The application MUST ship with a built-in read-only base grocery catalog.

Example entries:

- Milk
- Bread
- Eggs
- Rice
- Atta
- Sugar
- Salt
- Onions
- Potatoes
- Tomatoes

The catalog SHOULD be represented separately from household-specific data.

### R10 — Household catalog

A household MUST be able to add custom grocery entries locally.

Custom entries MUST synchronize as household data.

### R11 — Sync initiation

Only the owner needs to initiate synchronization in the initial design.

The owner MUST be able to explicitly start the temporary sync coordinator.

### R12 — Device discovery

When synchronization starts, the coordinator SHOULD discover household devices on the current local Wi-Fi network.

Discovery SHOULD require no manual IP address entry.

Potential mechanisms include:

- mDNS/Bonjour-style discovery
- local UDP discovery
- Android/native networking support
- another secure local discovery mechanism

The final mechanism depends on the browser/Android capabilities available to the implementation.

### R13 — Peer sync endpoint

A participating device MUST expose a local synchronization endpoint when technically possible.

The endpoint MUST NOT be publicly accessible through the Internet.

It MUST accept synchronization requests only from authenticated household peers.

### R14 — Change synchronization

The system MUST synchronize changes rather than blindly copying one complete database over another.

Each change SHOULD have:

- operation ID
- device ID
- local sequence number
- item ID
- operation type
- operation payload
- logical timestamp/version information

### R15 — Conflict handling

The system MUST define deterministic conflict rules.

Two devices changing the same item independently MUST NOT result in silent database corruption.

The initial implementation SHOULD favor simple deterministic rules over a general-purpose CRDT implementation.

### R16 — Idempotent synchronization

Receiving the same operation more than once MUST NOT duplicate its effect.

Operations SHOULD therefore have globally unique IDs.

### R17 — Sync verification

After synchronization, the coordinator SHOULD verify that participating devices have received the changes they are expected to have.

### R18 — Temporary server lifecycle

The owner device MUST NOT run a permanent server.

Expected lifecycle:

```text
Stopped
  |
  | Start Sync
  v
Discover
  |
  v
Authenticate
  |
  v
Fetch changes
  |
  v
Merge
  |
  v
Distribute changes
  |
  v
Verify
  |
  v
Stop server
```

### R19 — Privacy

The application MUST NOT send household grocery data to GitHub, analytics systems, advertising systems, or a third-party backend.

### R20 — No mandatory account system

The application MUST NOT require:

- Google login
- Apple login
- email/password
- phone-number authentication

### R21 — Failure tolerance

If synchronization is interrupted, local data MUST remain intact.

A later synchronization MUST be able to continue safely.

### R22 — Device replacement

The design MUST support replacing a device without destroying the household.

Ownership SHOULD be transferable.

## 2. Security requirements

### S1 — Household authentication

A device on the same Wi-Fi network MUST NOT automatically be trusted.

Household membership MUST be established through an explicit invitation/authorization process.

### S2 — Device identity

Each installation MUST have a unique device identity.

### S3 — Encrypted local synchronization

Synchronization SHOULD use an encrypted authenticated channel where the platform permits it.

### S4 — Authorization

The coordinator MUST reject unknown devices.

### S5 — No secrets in repository

Private keys, household databases, member data, or synchronization credentials MUST NOT be committed to GitHub.

## 3. Usability requirements

### U1 — Simple main screen

The main screen SHOULD primarily show:

- items needed
- quantities
- purchased items
- add-item control

### U2 — Minimal synchronization UI

The owner should have a prominent:

`SYNC HOUSEHOLD`

button.

The UI SHOULD show:

```text
Discovering devices...
Found 3 household devices
Syncing...
3/3 devices synchronized
Sync complete
```

### U3 — No synchronization burden on family members

Family members SHOULD NOT need to open the application or press a sync button merely because the owner is synchronizing.

### U4 — Status visibility

The application SHOULD show:

- last successful sync
- current device name
- household name
- synchronization errors

## 4. Future requirements

Potential future features:

- recurring grocery items
- shopping history
- quantities and units
- categories
- favorite items
- supermarket-specific products
- barcode scanning
- household audit/history
- encrypted backups
- manual export/import
- Android native wrapper
- Play Store distribution

These SHOULD NOT complicate V1 unnecessarily.

