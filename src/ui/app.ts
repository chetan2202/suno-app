// The UI controller. Holds only view state (tab, onboarding step); everything else is
// read fresh from the repositories on each render. Actions call a repository method
// then re-render, so the screen always reflects persisted state.

import type { App } from "../storage/index.js";
import type { MasterCatalog } from "../domain/types.js";
import type { Actions, Tab, ViewCtx } from "./context.js";
import { resolveCatalog } from "../domain/catalog.js";
import { clear, el } from "./dom.js";
import { renderOnboarding } from "./views/onboarding.js";
import { renderList } from "./views/list.js";
import { renderMembers } from "./views/members.js";
import { renderCatalogEditor } from "./views/catalog-editor.js";

export class AppController {
  private tab: Tab = "list";
  private onboardingStep: 1 | 2 = 1;

  constructor(
    private readonly root: HTMLElement,
    private readonly app: App,
    private readonly base: MasterCatalog,
  ) {}

  mount(): void {
    this.render();
  }

  private readonly actions: Actions = {
    setTab: (tab) => {
      this.tab = tab;
      this.render();
    },
    setProfile: async (id) => {
      await this.app.household.setProfile(id);
      this.render();
    },
    goToStep: (step) => {
      this.onboardingStep = step;
      this.render();
      window.scrollTo(0, 0);
    },
    finishOnboarding: async () => {
      await this.app.household.completeOnboarding();
      this.tab = "list";
      this.render();
    },
    addMember: async (name) => {
      await this.app.household.addMember(name);
      this.render();
    },
    renameMember: async (id, name) => {
      await this.app.household.renameMember(id, name);
      this.render();
    },
    removeMember: async (id) => {
      await this.app.household.removeMember(id);
      this.render();
    },
    addItem: async (input) => {
      await this.app.grocery.addItem(input);
      this.render();
    },
    setQuantity: async (id, q) => {
      await this.app.grocery.setQuantity(id, q);
      this.render();
    },
    togglePurchased: async (item) => {
      if (item.status === "purchased") await this.app.grocery.restore(item.item_id);
      else await this.app.grocery.markPurchased(item.item_id);
      this.render();
    },
    deleteItem: async (id) => {
      await this.app.grocery.deleteItem(id);
      this.render();
    },
    toggleItemRemoved: async (id, removed) => {
      await this.app.household.setItemRemoved(id, removed);
      this.render();
    },
    toggleCategoryRemoved: async (id, removed) => {
      await this.app.household.setCategoryRemoved(id, removed);
      this.render();
    },
    addCustomItem: async (name, unit) => {
      await this.app.household.addCustomItem(name, unit);
      this.render();
    },
    removeCustomItem: async (id) => {
      await this.app.household.removeCustomItem(id);
      this.render();
    },
  };

  private buildCtx(): ViewCtx {
    const settings = this.app.household.getSettings();
    const customization = this.app.household.getCustomization();
    return {
      app: this.app,
      base: this.base,
      deviceId: this.app.deviceId,
      tab: this.tab,
      onboardingStep: this.onboardingStep,
      settings,
      members: this.app.household.getMembers(),
      customization,
      resolved: resolveCatalog(this.base, settings, customization),
      groceryState: this.app.grocery.getState(),
      actions: this.actions,
    };
  }

  private render(): void {
    const ctx = this.buildCtx();
    clear(this.root);
    if (!ctx.settings.onboarded) {
      this.root.append(renderOnboarding(ctx));
      return;
    }
    this.root.append(this.header(ctx), this.body(ctx));
  }

  private header(ctx: ViewCtx): HTMLElement {
    const tabButton = (tab: Tab, label: string) =>
      el("button", {
        class: `tab ${this.tab === tab ? "tab-active" : ""}`,
        text: label,
        onClick: () => this.actions.setTab(tab),
      });
    return el("header", { class: "app-header" }, [
      el("div", { class: "app-header-top" }, [
        el("h1", { text: "Family Grocery" }),
        el("span", {
          class: "profile-badge",
          text: ctx.settings.profile_id === "vegetarian" ? "Veg" : "Regular",
        }),
      ]),
      el("nav", { class: "tabs" }, [
        tabButton("list", "List"),
        tabButton("members", "Members"),
        tabButton("catalog", "Catalog"),
      ]),
    ]);
  }

  private body(ctx: ViewCtx): HTMLElement {
    const main = el("main", { class: "app-main" });
    if (this.tab === "list") main.append(renderList(ctx));
    else if (this.tab === "members") main.append(renderMembers(ctx));
    else main.append(renderCatalogEditor(ctx));
    return main;
  }
}
