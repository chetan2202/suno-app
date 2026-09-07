// To-do module. Placeholder for the v0.3 build (per-member private lists + delegation,
// natural-language time/date). Wired into the home shell now; screens land in later steps.

import { el } from "../dom.js";
import type { ViewCtx } from "../context.js";

export function renderTodo(_ctx: ViewCtx): HTMLElement {
  return el("section", { class: "view" }, [
    el("div", { class: "empty-state" }, [
      el("span", { class: "empty-emoji", text: "✅" }),
      el("p", { class: "empty-title", text: "To-do is coming next" }),
      el("p", { class: "empty-sub", text: "Per-member tasks and delegation are on the way." }),
    ]),
  ]);
}
