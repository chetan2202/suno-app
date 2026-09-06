// Members management: add, rename (inline), remove. Names are whatever the user
// chooses ("Mother", "Priya", ...).

import { el } from "../dom.js";
import type { ViewCtx } from "../context.js";

function addForm(ctx: ViewCtx): HTMLElement {
  const input = el("input", { class: "field grow", type: "text", placeholder: "Add a family member (e.g. Mother)" });
  return el("form", {
    class: "add-form",
    onSubmit: (e) => {
      e.preventDefault();
      const name = input.value.trim();
      if (!name) return;
      input.value = "";
      void ctx.actions.addMember(name);
    },
  }, [input, el("button", { class: "btn primary", type: "submit", text: "Add" })]);
}

function memberRow(ctx: ViewCtx, id: string, name: string): HTMLElement {
  const input = el("input", {
    class: "field grow",
    type: "text",
    value: name,
    onChange: () => {
      const next = input.value.trim();
      if (next) void ctx.actions.renameMember(id, next);
      else input.value = name; // reject empty
    },
  });
  return el("li", { class: "row" }, [
    el("div", { class: "row-main" }, [input]),
    el("div", { class: "row-actions" }, [
      el("button", { class: "btn small danger", text: "Remove", onClick: () => void ctx.actions.removeMember(id) }),
    ]),
  ]);
}

export function renderMembers(ctx: ViewCtx): HTMLElement {
  return el("section", { class: "view" }, [
    addForm(ctx),
    ctx.members.length === 0
      ? el("p", { class: "empty", text: "No members yet. Add the people you shop for." })
      : el("ul", { class: "list" }, ctx.members.map((m) => memberRow(ctx, m.member_id, m.display_name))),
  ]);
}
