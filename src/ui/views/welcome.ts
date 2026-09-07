// First-run role choice. One device belongs to exactly one household (home OR office
// OR farmhouse) — multiple households is a later version. To switch, Leave & reset.

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
    choice("home", "Start a household", "You become the admin — set up the list and invite family.", () =>
      ctx.actions.chooseAdmin(),
    ),
    choice("qr", "Join a household", "Scan or paste the invite your family admin shares.", () =>
      ctx.actions.chooseMember(),
    ),
    el("p", { class: "welcome-note", text: "One device joins one household at a time." }),
  ]);
}
