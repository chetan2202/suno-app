// Thin Google Drive REST v3 wrapper for exactly what cloud sync needs: find-or-create
// the household folder, list the op-log files in it, download one, and create/update
// this device's file. Vendor code, isolated. Uses fetch with a bearer token supplied by
// the caller (google-identity.ts); no SDK.
//
// All operations stay within the drive.file scope: the app only ever sees files it
// created itself, which is exactly the household folder and the ops-*.json files. Under
// a single shared household Google account, every device's file is app-created, so all
// devices see all files.

const FILES = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

/** A source of a currently-valid access token (refreshed by the caller as needed). */
export type TokenSource = () => Promise<string>;

export class DriveClient {
  constructor(private readonly getToken: TokenSource) {}

  private async authHeaders(): Promise<Record<string, string>> {
    return { Authorization: `Bearer ${await this.getToken()}` };
  }

  private async json<T>(resp: Response): Promise<T> {
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`Drive API ${resp.status}: ${body.slice(0, 200)}`);
    }
    return (await resp.json()) as T;
  }

  /** Find the household folder by name, or create it. Returns its file id. */
  async ensureFolder(name: string): Promise<string> {
    const q = encodeURIComponent(
      `mimeType='${FOLDER_MIME}' and name='${name.replace(/'/g, "\\'")}' and trashed=false`,
    );
    const found = await this.json<{ files: DriveFile[] }>(
      await fetch(`${FILES}?q=${q}&fields=files(id,name)&spaces=drive`, {
        headers: await this.authHeaders(),
      }),
    );
    const existing = found.files[0];
    if (existing) return existing.id;

    const created = await this.json<DriveFile>(
      await fetch(FILES, {
        method: "POST",
        headers: { ...(await this.authHeaders()), "Content-Type": "application/json" },
        body: JSON.stringify({ name, mimeType: FOLDER_MIME }),
      }),
    );
    return created.id;
  }

  /** List the op-log files (ops-*.json) in the folder. */
  async listOpFiles(folderId: string): Promise<DriveFile[]> {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const data = await this.json<{ files: DriveFile[] }>(
      await fetch(`${FILES}?q=${q}&fields=files(id,name,modifiedTime)&spaces=drive`, {
        headers: await this.authHeaders(),
      }),
    );
    return data.files.filter((f) => f.name.startsWith("ops-") && f.name.endsWith(".json"));
  }

  /** Download a file's text content by id. */
  async download(fileId: string): Promise<string> {
    const resp = await fetch(`${FILES}/${fileId}?alt=media`, {
      headers: await this.authHeaders(),
    });
    if (!resp.ok) throw new Error(`Drive download ${resp.status}`);
    return resp.text();
  }

  /** Create a new file in the folder, returning its id. */
  async create(folderId: string, name: string, content: string): Promise<string> {
    const boundary = "suno_" + Math.random().toString(36).slice(2);
    const metadata = { name, parents: [folderId], mimeType: "application/json" };
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
      `${content}\r\n--${boundary}--`;
    const created = await this.json<DriveFile>(
      await fetch(`${UPLOAD}?uploadType=multipart&fields=id`, {
        method: "POST",
        headers: {
          ...(await this.authHeaders()),
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }),
    );
    return created.id;
  }

  /** Replace the content of an existing file. */
  async update(fileId: string, content: string): Promise<void> {
    const resp = await fetch(`${UPLOAD}/${fileId}?uploadType=media`, {
      method: "PATCH",
      headers: { ...(await this.authHeaders()), "Content-Type": "application/json" },
      body: content,
    });
    if (!resp.ok) throw new Error(`Drive update ${resp.status}`);
  }
}
