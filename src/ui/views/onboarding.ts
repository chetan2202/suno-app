// Admin onboarding. Step 1: name the household, pick a diet profile, add members.
// Step 2: customize the catalog. Then Start.

import { el } from "../dom.js";
import type { ViewCtx } from "../context.js";
import { renderMembers } from "./members.js";
import { renderCatalogEditor } from "./catalog-editor.js";

function profileChoice(ctx: ViewCtx, id: string, title: string, desc: string): HTMLElement {
  return el("button", {
    class: `big-choice ${ctx.settings.profile_id === id ? "chosen" : ""}`,
    onClick: () => void ctx.actions.setProfile(id),
  }, [
    el("span", { class: "big-choice-title", text: title }),
    el("span", { class: "big-choice-desc", text: desc }),
  ]);
}

function step1(ctx: ViewCtx): HTMLElement {
  const name = el("input", {
    class: "field grow",
    type: "text",
    value: ctx.settings.household_name,
    placeholder: "Household name (e.g. Home)",
    onChange: () => void ctx.actions.renameHousehold((name as HTMLInputElement).value),
  });
  return el("div", { class: "onboard" }, [
    el("h1", { class: "onboard-title", text: "Set up your household" }),
    el("p", { class: "onboard-step", text: "Step 1 of 2" }),
    el("span", { class: "field-label", text: "Household name" }),
    name,
    el("span", { class: "field-label", text: "Diet profile" }),
    el("div", { class: "choices" }, [
      profileChoice(ctx, "vegetarian", "Vegetarian", "Only vegetarian items"),
      profileChoice(ctx, "regular", "Regular", "Everything, including non-veg"),
    ]),
    el("span", { class: "field-label", text: "Family members" }),
    renderMembers(ctx),
    el("div", { class: "onboard-actions" }, [
      el("button", { class: "btn primary big", text: "Next", onClick: () => ctx.actions.goToStep(2) }),
    ]),
  ]);
}

function step2(ctx: ViewCtx): HTMLElement {
  return el("div", { class: "onboard" }, [
    el("h1", { class: "onboard-title", text: "Customize your list" }),
    el("p", { class: "onboard-step", text: "Step 2 of 2" }),
    renderCatalogEditor(ctx),
    el("div", { class: "onboard-actions" }, [
      el("button", { class: "btn ghost", text: "Back", onClick: () => ctx.actions.goToStep(1) }),
      el("button", { class: "btn primary big", text: "Start", onClick: () => void ctx.actions.finishOnboarding() }),
    ]),
  ]);
}

export function renderOnboarding(ctx: ViewCtx): HTMLElement {
  return ctx.onboardingStep === 1 ? step1(ctx) : step2(ctx);
}
