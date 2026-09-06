# Local-First Family Grocery PWA

A privacy-first household grocery utility designed for families who want to maintain a shared grocery list without accounts, cloud storage, or a permanent backend.

The application is a **local-first PWA**. Each family member keeps their own data locally. When the family is on the same Wi-Fi network, the household owner can start a temporary sync coordinator on their phone. The coordinator discovers participating devices, fetches their changes, merges them, distributes the result, verifies synchronization, and shuts the server down.

## Goals

- Work offline during normal use.
- Store grocery data locally on each phone.
- Require no Google account, cloud account, or application backend.
- Distribute the application as a PWA from GitHub Pages.
- Allow one household to have an owner and multiple members.
- Let the owner initiate synchronization without requiring other family members to press a sync button.
- Synchronize only over the household's local Wi-Fi network.
- Keep the temporary sync server off except when explicitly started.
- Keep the architecture small enough to remain a personal/family utility.

## Non-goals for V1

- Cloud synchronization.
- User accounts based on email/password.
- Advertising or analytics.
- A permanent server.
- Social features.
- Multi-household collaboration through the Internet.
- A large commercial product catalog.
- Full supermarket inventory/pricing integration.

## High-level model

```text
                         GitHub Pages
                              |
                     Application only
                              |
                              v
                   +-------------------+
                   |       PWA         |
                   +-------------------+
                     /        |        \
                    /         |         \
                   v          v          v
              Phone A     Phone B     Owner Phone
              Local DB    Local DB     Local DB
                                           |
                                           | Start Sync
                                           v
                                  Temporary Sync
                                    Coordinator
                                           |
                                      Home Wi-Fi
                                           |
                         +-----------------+----------------+
                         |                 |                |
                         v                 v                v
                      Phone A          Phone B          Phone C
```

## Distribution

The initial application is hosted as a static PWA on GitHub Pages.

The repository contains application code and a read-only base grocery catalog. Household data is never committed to GitHub.

Example:

```text
https://<github-user>.github.io/<repository>/
```

A future Android wrapper can be introduced if native networking/background capabilities are needed, without changing the core local-first data model.

## Core concepts

### Household

A household is the logical shared space.

It has:

- a household identity
- an owner identity
- member identities
- devices associated with members
- a household-specific catalog
- shared grocery state

### Owner

The first person creating a household becomes its owner.

The owner can:

- manage household membership
- manage household settings
- manage the household catalog
- initiate synchronization
- transfer ownership

The owner is an identity, not permanently tied to one physical phone.

### Member

A member can:

- view the household grocery list
- add items
- change quantities
- mark items purchased
- participate in synchronization

### Device

A phone is a device belonging to a household member.

Each device has its own local database and unique device ID.

### Catalog

The application has a base read-only grocery catalog distributed with the application.

Households can extend this catalog locally.

The base catalog is application data; household additions are household data.

## Suggested V1 workflow

1. Install/open the PWA.
2. Create a household on the first phone.
3. The creator becomes the owner.
4. Add family members by locally exchanging a join invitation, preferably through QR code.
5. Each phone stores its own local copy.
6. Family members add grocery requirements whenever they need.
7. When the owner is on the same Wi-Fi network, they press `Sync Household`.
8. The owner's phone discovers household devices.
9. The coordinator fetches changes from each device.
10. Changes are merged.
11. Missing changes are distributed back to devices.
12. Synchronization is verified.
13. The temporary server stops.

## Design principle

> The network is an occasional synchronization mechanism, not a dependency of the application.

The application should remain useful when:

```text
Internet = OFF
Wi-Fi = OFF
Sync server = OFF
```

