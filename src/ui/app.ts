// The UI controller. Holds transient view state (tab, menu, sheets, onboarding step,
// sync session); everything else is read fresh from the repositories on each render.

import type { App } from "../storage/index.js";
import type { MasterCatalog } from "../domain/types.js";
import type { Actions, ModuleId, SyncView, Tab, ViewCtx } from "./context.js";
import type { SyncStatus } from "../sync/index.js";
import { resolveCatalog } from "../domain/catalog.js";
import { decodeInvite } from "../domain/invite.js";
import { WebRtcSession, SyncService, DriveCloudSync } from "../sync/index.js";
import { clear, el } from "./dom.js";
import { renderWelcome } from "./views/welcome.js";
import { renderJoin } from "./views/join.js";
import { renderOnboarding } from "./views/onboarding.js";
import { renderHome } from "./views/home.js";
import { renderList } from "./views/list.js";
import { renderBrowse, renderAddSheet } from "./views/browse.js";
import { renderTodo, renderTodoAddSheet } from "./views/todo.js";
import { renderMenu } from "./views/menu.js";
import { icon, type IconName } from "./icon.js";
import { updateBanner } from "./views/update.js";
import { renderWhatsNew, shouldShowWhatsNew, markWhatsNewSeen } from "./views/whatsnew.js";

const SYNC_TEXT: Record<SyncStatus, string> = {
  idle: "Not connected.",
  waiting: "Waiting for the other device…",
  connected: "Connected. Exchanging lists…",
  synced: "Synced",
  closed: "Disconnected.",
};

export class AppController {
  private module: ModuleId = "home";
  private tab: Tab = "list";
  private menuOpen = false;
  private readonly openSections = new Set<string>();
  private memberJoining = false;
  private browseCategoryId: string | null = null;
  private addSheetItem: ViewCtx["addSheetItem"] = null;
  private onboardingStep: 1 | 2 = 1;
  private todoAddOpen = false;
  private whatsNewOpen = false;
  private updateApply: (() => void) | null = null;

  private session: WebRtcSession | null = null;
  private sync: SyncView = { active: false, role: null, status: "", shareCode: "", busy: false, result: null };
  private readonly cloud: DriveCloudSync;

  constructor(
    private readonly root: HTMLElement,
    private readonly app: App,
    private readonly base: MasterCatalog,
    private readonly appVersion: number,
  ) {
    this.cloud = new DriveCloudSync({
      grocery: this.app.grocery,
      config: this.app.cloudConfig,
      deviceId: this.app.deviceId,
      householdName: () => this.app.household.getSettings().household_name,
      onStatus: () => this.render(),
      onChange: () => this.render(),
    });
  }

  mount(): void {
    // Show the welcome / what's-new panel on first open and after each release.
    this.whatsNewOpen = shouldShowWhatsNew(this.appVersion);
    this.render();
    void this.cloud.resume(); // silently reconnect if cloud sync was enabled
  }

  showUpdateAvailable(apply: () => void): void {
    this.updateApply = apply;
    this.render();
  }

  private readonly actions: Actions = {
    dismissWhatsNew: () => { markWhatsNewSeen(this.appVersion); this.whatsNewOpen = false; this.render(); window.scrollTo(0, 0); },
    openModule: (id) => { this.module = id; this.tab = "list"; this.browseCategoryId = null; this.render(); window.scrollTo(0, 0); },
    goHome: () => { this.module = "home"; this.menuOpen = false; this.render(); window.scrollTo(0, 0); },
    setTab: (tab) => { this.tab = tab; this.browseCategoryId = null; this.render(); },
    openMenu: () => { this.menuOpen = true; this.render(); },
    closeMenu: () => { this.menuOpen = false; this.render(); },
    // Remember which menu sections are expanded so a re-render (e.g. sync producing a
    // code) does not collapse the open section. The DOM already reflects the user's
    // toggle, so this must NOT re-render — it only records state for the next render.
    toggleSection: (id, open) => { if (open) this.openSections.add(id); else this.openSections.delete(id); },
    selectCategory: (id) => { this.browseCategoryId = id; this.render(); },
    openAddSheet: (item) => { this.addSheetItem = item; this.render(); },
    closeAddSheet: () => { this.addSheetItem = null; this.render(); },
    goToStep: (step) => { this.onboardingStep = step; this.render(); window.scrollTo(0, 0); },

    chooseCreate: () => { void this.startCreateFlow(); },
    chooseJoin: () => { this.memberJoining = true; this.render(); },
    joinFromCode: async (code) => {
      const invite = decodeInvite(code);
      if (!invite) throw new Error("invalid invite");
      await this.app.household.joinHousehold(invite);
      this.memberJoining = false;
      this.render();
    },
    finishOnboarding: async () => { await this.app.household.completeOnboarding(); this.module = "home"; this.render(); },
    cancelJoin: () => { this.memberJoining = false; this.render(); },
    // Leave & reset: erase ALL local data, then reload so the app re-boots into first-run
    // state (fresh device id). This is the reliable way to fully clear the device.
    resetHousehold: async () => {
      this.syncStopInternal();
      this.cloud.stop();
      await this.app.wipe();
      location.reload();
    },
    // Rename actions fire on blur; do NOT re-render (it would steal focus from a field
    // the user may still be filling). The DOM already shows the new value.
    renameHousehold: async (name) => { await this.app.household.renameHousehold(name); },

    setProfile: async (id) => { await this.app.household.setProfile(id); this.render(); },
    addMember: async (name) => { await this.app.household.addMember(name); this.render(); },
    renameMember: async (id, name) => { await this.app.household.renameMember(id, name); },
    removeMember: async (id) => { await this.app.household.removeMember(id); this.render(); },

    addItem: async (input) => { await this.app.grocery.addItem(input); this.addSheetItem = null; this.tab = "list"; this.browseCategoryId = null; this.render(); },
    setQuantity: async (id, q) => { await this.app.grocery.setQuantity(id, q); this.render(); },
    togglePurchased: async (item) => {
      if (item.status === "purchased") await this.app.grocery.restore(item.item_id);
      else await this.app.grocery.markPurchased(item.item_id);
      this.render();
    },
    deleteItem: async (id) => { await this.app.grocery.deleteItem(id); this.render(); },

    identifyMember: async (memberId) => { await this.app.household.setMyMember(memberId); this.render(); },
    addSelfMember: async (name) => { const m = await this.app.household.addMember(name); await this.app.household.setMyMember(m.member_id); this.render(); },
    openTodoAdd: () => { this.todoAddOpen = true; this.render(); },
    closeTodoAdd: () => { this.todoAddOpen = false; this.render(); },
    addTask: async (input) => { await this.app.todo.addTask(input); this.todoAddOpen = false; this.render(); },
    setTaskDone: async (task, done) => { await this.app.todo.setStatus(task.task_id, done ? "done" : "open"); this.render(); },
    respondTask: async (id, response) => { await this.app.todo.respond(id, response); this.render(); },
    deleteTask: async (id) => { await this.app.todo.deleteTask(id); this.render(); },

    toggleItemRemoved: async (id, removed) => { await this.app.household.setItemRemoved(id, removed); this.render(); },
    toggleCategoryRemoved: async (id, removed) => { await this.app.household.setCategoryRemoved(id, removed); this.render(); },
    addCustomItem: async (name, unit) => { await this.app.household.addCustomItem(name, unit); this.render(); },
    removeCustomItem: async (id) => { await this.app.household.removeCustomItem(id); this.render(); },

    syncStart: async () => {
      const session = this.newSession();
      this.sync = { active: true, role: "host", status: SYNC_TEXT.waiting, shareCode: "", busy: true, result: null };
      this.render();
      this.sync.shareCode = await session.createOffer();
      this.sync.busy = false;
      this.sync.status = "Let the other phone scan this, then scan their reply.";
      this.render();
    },
    syncApplyReply: async (replyCode) => {
      if (!this.session || !replyCode.trim()) return;
      this.sync.status = "Connecting…";
      this.render();
      try { await this.session.applyAnswer(replyCode); } catch { this.sync.status = "That reply code was not valid."; this.render(); }
    },
    syncJoin: async (offerCode) => {
      if (!offerCode.trim()) return;
      const session = this.newSession();
      this.sync = { active: true, role: "guest", status: "Generating reply…", shareCode: "", busy: true, result: null };
      this.render();
      try {
        this.sync.shareCode = await session.applyOffer(offerCode);
        this.sync.status = "Show this reply back to the other phone.";
      } catch {
        this.sync.status = "That sync code was not valid.";
      }
      this.sync.busy = false;
      this.render();
    },
    syncStop: () => { this.syncStopInternal(); this.render(); },

    cloudConnect: () => this.cloud.connect(),
    cloudDisconnect: () => this.cloud.disconnect(),
    cloudSyncNow: () => this.cloud.syncNow(),
  };

  private async startCreateFlow(): Promise<void> {
    if (this.app.household.getRole() === null) {
      await this.app.household.createHousehold(this.app.household.getSettings().household_name);
    }
    this.onboardingStep = 1;
    this.render();
  }

  private newSession(): WebRtcSession {
    this.syncStopInternal();
    const session = new WebRtcSession();
    const service = new SyncService({
      getOperations: () => this.app.grocery.getOperations(),
      myMemberId: () => this.app.household.getSettings().my_member_id,
      ingest: async (ops) => { const n = await this.app.grocery.ingestOperations(ops); this.app.todo.refresh(); return n; },
      onStatus: (status) => { this.sync.status = SYNC_TEXT[status]; this.render(); },
      onResult: (newOps) => { this.sync.result = { newOps }; this.render(); },
      onChange: () => this.render(),
    });
    service.attach(session);
    this.session = session;
    return session;
  }

  private syncStopInternal(): void {
    this.session?.close();
    this.session = null;
    this.sync = { active: false, role: null, status: "", shareCode: "", busy: false, result: null };
  }

  private buildCtx(): ViewCtx {
    const settings = this.app.household.getSettings();
    const customization = this.app.household.getCustomization();
    return {
      app: this.app,
      base: this.base,
      deviceId: this.app.deviceId,
      appVersion: this.appVersion,
      settings,
      members: this.app.household.getMembers(),
      customization,
      resolved: resolveCatalog(this.base, settings, customization),
      groceryState: this.app.grocery.getState(),
      tab: this.tab,
      menuOpen: this.menuOpen,
      openSections: this.openSections,
      browseCategoryId: this.browseCategoryId,
      addSheetItem: this.addSheetItem,
      onboardingStep: this.onboardingStep,
      module: this.module,
      todoState: this.app.todo.getState(),
      todoAddOpen: this.todoAddOpen,
      sync: this.sync,
      cloud: this.cloud.getView(),
      actions: this.actions,
    };
  }

  private render(): void {
    const ctx = this.buildCtx();
    clear(this.root);
    if (this.updateApply) this.root.append(updateBanner(this.updateApply));

    // Welcome / what's-new comes first, over everything, until dismissed.
    if (this.whatsNewOpen) { this.root.append(renderWhatsNew(ctx)); return; }

    // First-run and setup states.
    if (ctx.settings.role === null && !this.memberJoining) { this.root.append(renderWelcome(ctx)); return; }
    if (ctx.settings.role === null && this.memberJoining) { this.root.append(renderJoin(ctx)); return; }
    if (!ctx.settings.onboarded) { this.root.append(renderOnboarding(ctx)); return; }

    // Super-app: home shell, or a specific module.
    this.root.append(this.header(ctx));
    if (this.module === "home") {
      this.root.append(renderHome(ctx));
    } else if (this.module === "grocery") {
      this.root.append(this.body(ctx), this.bottomNav(ctx));
      const sheet = renderAddSheet(ctx);
      if (sheet) this.root.append(sheet);
    } else {
      this.root.append(renderTodo(ctx));
      const todoSheet = renderTodoAddSheet(ctx);
      if (todoSheet) this.root.append(todoSheet);
    }
    if (this.menuOpen) this.root.append(renderMenu(ctx));
  }

  private static readonly MODULE_NAMES: Record<Exclude<ModuleId, "home">, string> = {
    grocery: "Grocery",
    todo: "To-do",
  };

  private header(ctx: ViewCtx): HTMLElement {
    const onHome = this.module === "home";
    // On home the left button opens the family menu; inside a module it returns home.
    const leftBtn = onHome
      ? el("button", { class: "icon-btn light", "aria-label": "Menu", onClick: () => this.actions.openMenu() }, [icon("menu", 22)])
      : el("button", { class: "icon-btn light", "aria-label": "Home", onClick: () => this.actions.goHome() }, [icon("back", 22)]);
    const subtitle = this.module === "home" ? ctx.settings.household_name : AppController.MODULE_NAMES[this.module];
    const header = el("header", { class: "app-bar" }, [
      leftBtn,
      el("div", { class: "app-bar-title" }, [
        el("span", { class: "app-name", text: "Suno" }),
        el("span", { class: "app-house", text: subtitle }),
      ]),
    ]);
    // The diet badge is a grocery concern; only show it in the grocery module.
    if (this.module === "grocery") {
      header.append(el("span", { class: "profile-badge", text: ctx.settings.profile_id === "vegetarian" ? "Veg" : "Regular" }));
    }
    return header;
  }

  private body(ctx: ViewCtx): HTMLElement {
    const main = el("main", { class: "app-main" });
    main.append(this.tab === "list" ? renderList(ctx) : renderBrowse(ctx));
    return main;
  }

  private bottomNav(ctx: ViewCtx): HTMLElement {
    const navItem = (tab: Tab, name: IconName, label: string) =>
      el("button", { class: `nav-item ${this.tab === tab ? "nav-active" : ""}`, onClick: () => ctx.actions.setTab(tab) }, [
        el("span", { class: "nav-icon" }, [icon(name, 24)]),
        el("span", { class: "nav-label", text: label }),
      ]);
    return el("nav", { class: "bottom-nav" }, [
      navItem("list", "checklist", "List"),
      navItem("browse", "cart", "Browse"),
    ]);
  }
}
