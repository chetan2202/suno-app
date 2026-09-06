// The UI controller. Holds transient view state (tab, menu, sheets, onboarding step,
// sync session); everything else is read fresh from the repositories on each render.

import type { App } from "../storage/index.js";
import type { MasterCatalog } from "../domain/types.js";
import type { Actions, SyncView, Tab, ViewCtx } from "./context.js";
import type { SyncStatus } from "../sync/index.js";
import { resolveCatalog } from "../domain/catalog.js";
import { decodeInvite } from "../domain/invite.js";
import { WebRtcSession, SyncService } from "../sync/index.js";
import { clear, el } from "./dom.js";
import { renderWelcome } from "./views/welcome.js";
import { renderJoin } from "./views/join.js";
import { renderOnboarding } from "./views/onboarding.js";
import { renderList } from "./views/list.js";
import { renderBrowse, renderAddSheet } from "./views/browse.js";
import { renderMenu } from "./views/menu.js";
import { updateBanner } from "./views/update.js";

const SYNC_TEXT: Record<SyncStatus, string> = {
  idle: "Not connected.",
  waiting: "Waiting for the other device…",
  connected: "Connected. Exchanging lists…",
  synced: "Synced ✓",
  closed: "Disconnected.",
};

export class AppController {
  private tab: Tab = "list";
  private menuOpen = false;
  private memberJoining = false;
  private browseCategoryId: string | null = null;
  private addSheetItem: ViewCtx["addSheetItem"] = null;
  private onboardingStep: 1 | 2 = 1;
  private updateApply: (() => void) | null = null;

  private session: WebRtcSession | null = null;
  private sync: SyncView = { active: false, role: null, status: "", shareCode: "", busy: false };

  constructor(
    private readonly root: HTMLElement,
    private readonly app: App,
    private readonly base: MasterCatalog,
    private readonly appVersion: number,
  ) {}

  mount(): void {
    this.render();
  }

  showUpdateAvailable(apply: () => void): void {
    this.updateApply = apply;
    this.render();
  }

  private readonly actions: Actions = {
    setTab: (tab) => { this.tab = tab; this.browseCategoryId = null; this.render(); },
    openMenu: () => { this.menuOpen = true; this.render(); },
    closeMenu: () => { this.menuOpen = false; this.render(); },
    selectCategory: (id) => { this.browseCategoryId = id; this.render(); },
    openAddSheet: (item) => { this.addSheetItem = item; this.render(); },
    closeAddSheet: () => { this.addSheetItem = null; this.render(); },
    goToStep: (step) => { this.onboardingStep = step; this.render(); window.scrollTo(0, 0); },

    chooseAdmin: () => { void this.startAdminFlow(); },
    startAsAdmin: async (name) => { await this.app.household.startAsAdmin(name); this.render(); },
    chooseMember: () => { this.memberJoining = true; this.render(); },
    joinFromCode: async (code) => {
      const invite = decodeInvite(code);
      if (!invite) throw new Error("invalid invite");
      await this.app.household.joinAsMember(invite);
      this.memberJoining = false;
      this.render();
    },
    finishOnboarding: async () => { await this.app.household.completeOnboarding(); this.tab = "list"; this.render(); },
    resetHousehold: async () => {
      this.syncStopInternal();
      await this.app.household.resetHousehold();
      this.menuOpen = false;
      this.memberJoining = false;
      this.render();
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

    toggleItemRemoved: async (id, removed) => { await this.app.household.setItemRemoved(id, removed); this.render(); },
    toggleCategoryRemoved: async (id, removed) => { await this.app.household.setCategoryRemoved(id, removed); this.render(); },
    addCustomItem: async (name, unit) => { await this.app.household.addCustomItem(name, unit); this.render(); },
    removeCustomItem: async (id) => { await this.app.household.removeCustomItem(id); this.render(); },

    syncHostStart: async () => {
      const session = this.newSession();
      this.sync = { active: true, role: "host", status: SYNC_TEXT.waiting, shareCode: "", busy: true };
      this.render();
      this.sync.shareCode = await session.createOffer();
      this.sync.busy = false;
      this.sync.status = "Share the code below, then paste the member's reply.";
      this.render();
    },
    syncHostConnect: async (answerCode) => {
      if (!this.session || !answerCode.trim()) return;
      this.sync.status = "Connecting…";
      this.render();
      try { await this.session.applyAnswer(answerCode); } catch { this.sync.status = "That reply code was not valid."; this.render(); }
    },
    syncGuestAnswer: async (offerCode) => {
      if (!offerCode.trim()) return;
      const session = this.newSession();
      this.sync = { active: true, role: "guest", status: "Generating reply…", shareCode: "", busy: true };
      this.render();
      try {
        this.sync.shareCode = await session.applyOffer(offerCode);
        this.sync.status = "Send the reply back to the admin.";
      } catch {
        this.sync.status = "That sync code was not valid.";
      }
      this.sync.busy = false;
      this.render();
    },
    syncStop: () => { this.syncStopInternal(); this.render(); },
  };

  private async startAdminFlow(): Promise<void> {
    if (this.app.household.getRole() !== "admin") {
      await this.app.household.startAsAdmin(this.app.household.getSettings().household_name);
    }
    this.onboardingStep = 1;
    this.render();
  }

  private newSession(): WebRtcSession {
    this.syncStopInternal();
    const session = new WebRtcSession();
    const service = new SyncService(
      this.app.grocery,
      (status) => { this.sync.status = SYNC_TEXT[status]; this.render(); },
      () => this.render(),
    );
    service.attach(session);
    this.session = session;
    return session;
  }

  private syncStopInternal(): void {
    this.session?.close();
    this.session = null;
    this.sync = { active: false, role: null, status: "", shareCode: "", busy: false };
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
      browseCategoryId: this.browseCategoryId,
      addSheetItem: this.addSheetItem,
      onboardingStep: this.onboardingStep,
      sync: this.sync,
      actions: this.actions,
    };
  }

  private render(): void {
    const ctx = this.buildCtx();
    clear(this.root);
    if (this.updateApply) this.root.append(updateBanner(this.updateApply));

    // First-run and setup states.
    if (ctx.settings.role === null && !this.memberJoining) { this.root.append(renderWelcome(ctx)); return; }
    if (ctx.settings.role === null && this.memberJoining) { this.root.append(renderJoin(ctx)); return; }
    if (!ctx.settings.onboarded) { this.root.append(renderOnboarding(ctx)); return; }

    // Main app.
    this.root.append(this.header(ctx), this.body(ctx), this.bottomNav(ctx));
    if (this.menuOpen) this.root.append(renderMenu(ctx));
    const sheet = renderAddSheet(ctx);
    if (sheet) this.root.append(sheet);
  }

  private header(ctx: ViewCtx): HTMLElement {
    return el("header", { class: "app-bar" }, [
      el("button", { class: "icon-btn light", text: "☰", "aria-label": "Menu", onClick: () => this.actions.openMenu() }),
      el("div", { class: "app-bar-title" }, [
        el("span", { class: "app-name", text: "Suno" }),
        el("span", { class: "app-house", text: ctx.settings.household_name }),
      ]),
      el("span", { class: "profile-badge", text: ctx.settings.profile_id === "vegetarian" ? "Veg" : "Regular" }),
    ]);
  }

  private body(ctx: ViewCtx): HTMLElement {
    const main = el("main", { class: "app-main" });
    main.append(this.tab === "list" ? renderList(ctx) : renderBrowse(ctx));
    return main;
  }

  private bottomNav(ctx: ViewCtx): HTMLElement {
    const item = (tab: Tab, icon: string, label: string) =>
      el("button", { class: `nav-item ${this.tab === tab ? "nav-active" : ""}`, onClick: () => ctx.actions.setTab(tab) }, [
        el("span", { class: "nav-icon", text: icon }),
        el("span", { class: "nav-label", text: label }),
      ]);
    return el("nav", { class: "bottom-nav" }, [
      item("list", "🧾", "List"),
      item("browse", "🛒", "Browse"),
    ]);
  }
}
