// Layer 4 — Synchronization. Serverless local-network sync over WebRTC data channels
// with manual signalling (the admin hosts a session and can stop it at will). Built on
// the operation log, which merges idempotently. See architecture.md sections 7 and 9.
export * from "./webrtc-session.js";
export * from "./sync-service.js";
