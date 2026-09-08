// First-run choice: create a household or join one. There is no admin - everyone in a
// household is an equal participant. One device belongs to one household for now;
// multiple households is a later version. To switch, Leave & reset.

import { el } from "../dom.js";
import type { ViewCtx } from "../context.js";
import { icon, type IconName } from "../icon.js";

function choice(name: IconName, title: string, desc: string, onClick: () => void): HTMLElement {
  return el("button", { class: "role-card", onClick }, [
    el("span", { class: "role-icon" }, [icon(name, 26)]),
    el("span", { class: "role-title", text: title }),
    el("span", { class: "role-desc", text: desc }),
  ]);
}

export function renderWelcome(ctx: ViewCtx): HTMLElement {
  return el("div", { class: "welcome" }, [
    el("div", { class: "brand" }, [
      el("span", { class: "brand-mark" }, [icon("users", 40)]),
      el("h1", { class: "brand-name", text: "Suno" }),
      el("p", { class: "brand-tag", text: "Your family, in sync" }),
    ]),
    choice("home", "Start a household", "Set up the list and invite your family to join.", () =>
      ctx.actions.chooseCreate(),
    ),
    choice("qr", "Join a household", "Scan or paste the invite a family member shares.", () =>
      ctx.actions.chooseJoin(),
    ),
    el("p", { class: "welcome-note", text: "One device joins one household at a time." }),
  ]);
}
