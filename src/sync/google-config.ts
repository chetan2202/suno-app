// Google/Drive vendor configuration. Kept in one place so the rest of the app never
// hard-codes Google specifics. All values here are PUBLIC (safe to commit): the OAuth
// client id for a browser app is not a secret, and the browser token flow uses no
// client secret.
//
// SETUP (owner, one-time): create an OAuth 2.0 Client ID of type "Web application" in
// Google Cloud Console, enable the Google Drive API, and add these Authorized JavaScript
// origins:
//   https://chetan2202.github.io      (production, GitHub Pages)
//   http://localhost:5199             (local dev)
// Then paste the client id below. Until it is set, the Cloud sync UI stays disabled.
export const GOOGLE_CLIENT_ID = "";

// drive.file: the app sees ONLY the files it creates (minimal consent, no "all your
// Drive" prompt). email: so we can show which account is connected.
export const GOOGLE_SCOPES = "email https://www.googleapis.com/auth/drive.file";

/** Whether cloud sync is configured for this build. */
export function isCloudConfigured(): boolean {
  return GOOGLE_CLIENT_ID.trim().length > 0;
}

/** The Drive folder name for a household (one folder per household name). */
export function driveFolderName(householdName: string): string {
  return `Suno - ${householdName.trim() || "Home"}`;
}
