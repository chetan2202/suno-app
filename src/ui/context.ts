// Shared context passed to every view. The controller (app.ts) builds this fresh on
// each render from the repositories plus transient UI state, so views never hold stale
// state.

import type { App } from "../storage/index.js";
import type { GroceryItem, MasterCatalog, MasterCategory, Member, TodoTask } from "../domain/types.js";
import type { GroceryState } from "../domain/reducer.js";
import type { TodoState } from "../domain/reducer-todo.js";
import type { AddPayload, TodoAddPayload } from "../domain/payloads.js";
import type { CatalogCustomization, HouseholdSettings } from "../domain/catalog.js";
import type { CloudSyncView } from "../sync/cloud-sync.js";

export type Tab = "list" | "browse";

/** Top-level super-app location: the home screen or a specific module. */
export type ModuleId = "home" | "grocery" | "todo";

/** Live sync display state, owned by the controller. */
export interface SyncView {
  active: boolean;
  role: "host" | "guest" | null;
  status: string;
  /** Code this device must show the other (host: offer; guest: answer). */
  shareCode: string;
  busy: boolean;
  /** Outcome of the last exchange: how many new operations arrived (null before any). */
  result: { newOps: number } | null;
}

export interface Actions {
  // navigation / transient UI
  dismissWhatsNew(): void;
  openModule(id: ModuleId): void;
  goHome(): void;
  setTab(tab: Tab): void;
  openMenu(): void;
  closeMenu(): void;
  toggleSection(id: string, open: boolean): void;
  selectCategory(categoryId: string | null): void;
  openAddSheet(item: { id: string; name: string; unit: string; categoryId: string }): void;
  closeAddSheet(): void;
  goToStep(step: 1 | 2): void;

  // first-run roles
  chooseAdmin(): void;
  startAsAdmin(householdName: string): Promise<void>;
  chooseMember(): void;
  joinFromCode(code: string): Promise<void>;
  finishOnboarding(): Promise<void>;
  resetHousehold(): Promise<void>;
  renameHousehold(name: string): Promise<void>;

  // members
  setProfile(profileId: string): Promise<void>;
  addMember(name: string): Promise<void>;
  renameMember(id: string, name: string): Promise<void>;
  removeMember(id: string): Promise<void>;

  // grocery
  addItem(input: AddPayload): Promise<void>;
  setQuantity(itemId: string, quantity: number): Promise<void>;
  togglePurchased(item: GroceryItem): Promise<void>;
  deleteItem(itemId: string): Promise<void>;

  // to-do
  identifyMember(memberId: string): Promise<void>;
  addSelfMember(name: string): Promise<void>;
  openTodoAdd(): void;
  closeTodoAdd(): void;
  addTask(input: TodoAddPayload): Promise<void>;
  setTaskDone(task: TodoTask, done: boolean): Promise<void>;
  respondTask(taskId: string, response: "accepted" | "rejected"): Promise<void>;
  deleteTask(taskId: string): Promise<void>;

  // catalog admin
  toggleItemRemoved(itemId: string, removed: boolean): Promise<void>;
  toggleCategoryRemoved(categoryId: string, removed: boolean): Promise<void>;
  addCustomItem(name: string, unit: string): Promise<void>;
  removeCustomItem(id: string): Promise<void>;

  // sync (symmetric: any phone can host or join). Serverless WebRTC over local Wi-Fi.
  syncStart(): Promise<void>;                    // become host: create an offer to be scanned
  syncApplyReply(replyCode: string): Promise<void>; // host: apply the joiner's reply code
  syncJoin(offerCode: string): Promise<void>;    // become guest: apply an offer, make a reply
  syncStop(): void;

  // opt-in Google Drive cloud sync (one shared household Google account).
  cloudConnect(): Promise<void>;
  cloudDisconnect(): Promise<void>;
  cloudSyncNow(): Promise<void>;
}

export interface ViewCtx {
  app: App;
  base: MasterCatalog;
  deviceId: string;
  appVersion: number;
  settings: HouseholdSettings;
  members: readonly Member[];
  customization: CatalogCustomization;
  resolved: MasterCategory[];
  groceryState: GroceryState;

  // transient UI state
  module: ModuleId;
  tab: Tab;
  menuOpen: boolean;
  /** Keys of expanded menu <details> sections, preserved across re-renders. */
  openSections: ReadonlySet<string>;
  browseCategoryId: string | null;
  addSheetItem: { id: string; name: string; unit: string; categoryId: string } | null;
  onboardingStep: 1 | 2;
  todoState: TodoState;
  todoAddOpen: boolean;
  sync: SyncView;
  cloud: CloudSyncView;

  actions: Actions;
}

/** Display label for a line's member (or "Shared"). */
export function memberLabel(ctx: ViewCtx, memberId: string | null): string {
  if (!memberId) return "Shared";
  return ctx.members.find((m) => m.member_id === memberId)?.display_name ?? "Unknown";
}
