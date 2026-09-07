// To-do module UI: per-member lists with delegation. A device first identifies which
// member the user is, then sees tasks needing a response, their own tasks, and tasks they
// delegated. Adding parses a time/date from the text and lets the user adjust it.

import { el } from "../dom.js";
import type { ViewCtx } from "../context.js";
import type { TodoTask } from "../../domain/types.js";
import {
  isDelegated,
  selectForMember,
  selectDelegatedBy,
  selectIncomingPending,
} from "../../domain/reducer-todo.js";
import { parseWhen } from "../../domain/when-parser.js";
import { icon } from "../icon.js";

function memberName(ctx: ViewCtx, memberId: string): string {
  return ctx.members.find((m) => m.member_id === memberId)?.display_name ?? "Someone";
}

function formatDue(dueAt: number): string {
  const d = new Date(dueAt);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(d) - startOf(new Date())) / 86_400_000);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const day =
    days === 0 ? "Today" :
    days === 1 ? "Tomorrow" :
    days === -1 ? "Yesterday" :
    d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
  return `${day}, ${time}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
};

function dueMeta(task: TodoTask, extra?: string): HTMLElement {
  const bits: HTMLElement[] = [];
  if (task.due_at !== null) {
    const overdue = task.status === "open" && task.due_at < Date.now();
    bits.push(el("span", { class: `task-due ${overdue ? "overdue" : ""}` }, [icon("clock", 14), el("span", { text: formatDue(task.due_at) })]));
  }
  if (task.priority === "high") bits.push(el("span", { class: "task-flag", title: "High priority" }, [icon("flag", 14), el("span", { text: "High" })]));
  if (extra) bits.push(el("span", { class: "task-from", text: extra }));
  return el("div", { class: "task-meta" }, bits);
}

/** A task on my own list (personal or accepted delegation): toggle done + delete. */
function myTaskRow(ctx: ViewCtx, task: TodoTask): HTMLElement {
  const done = task.status === "done";
  const from = isDelegated(task) ? `from ${memberName(ctx, task.created_by_member_id)}` : undefined;
  return el("li", { class: `task ${done ? "done" : ""}` }, [
    el("button", { class: `task-check ${done ? "checked" : ""}`, "aria-label": "Toggle done", onClick: () => void ctx.actions.setTaskDone(task, !done) }, done ? [icon("check", 16)] : []),
    el("div", { class: "task-main" }, [
      el("span", { class: "task-title", text: task.title }),
      dueMeta(task, from),
    ]),
    el("button", { class: "icon-btn danger", "aria-label": "Delete", onClick: () => void ctx.actions.deleteTask(task.task_id) }, [icon("trash", 20)]),
  ]);
}

/** An incoming delegated task awaiting my accept/reject. */
function incomingRow(ctx: ViewCtx, task: TodoTask): HTMLElement {
  return el("li", { class: "task" }, [
    el("div", { class: "task-main" }, [
      el("span", { class: "task-title", text: task.title }),
      dueMeta(task, `from ${memberName(ctx, task.created_by_member_id)}`),
    ]),
    el("div", { class: "task-actions" }, [
      el("button", { class: "btn primary sm", text: "Accept", onClick: () => void ctx.actions.respondTask(task.task_id, "accepted") }),
      el("button", { class: "btn ghost sm", text: "Reject", onClick: () => void ctx.actions.respondTask(task.task_id, "rejected") }),
    ]),
  ]);
}

/** A task I delegated to someone else: shows the assignee + delegation status. */
function sentRow(ctx: ViewCtx, task: TodoTask): HTMLElement {
  const done = task.status === "done";
  const status = done ? "Done" : STATUS_LABEL[task.delegation_status ?? "pending"] ?? "Pending";
  return el("li", { class: `task ${done ? "done" : ""}` }, [
    el("div", { class: "task-main" }, [
      el("span", { class: "task-title", text: task.title }),
      dueMeta(task, `to ${memberName(ctx, task.for_member_id)}`),
    ]),
    el("span", { class: `chip-status s-${done ? "done" : task.delegation_status ?? "pending"}`, text: status }),
    el("button", { class: "icon-btn danger", "aria-label": "Delete", onClick: () => void ctx.actions.deleteTask(task.task_id) }, [icon("trash", 20)]),
  ]);
}

function byDue(a: TodoTask, b: TodoTask): number {
  if (a.due_at === null && b.due_at === null) return a.created_at - b.created_at;
  if (a.due_at === null) return 1;
  if (b.due_at === null) return -1;
  return a.due_at - b.due_at;
}

function section(title: string, rows: HTMLElement[]): HTMLElement | false {
  return rows.length > 0 && el("div", {}, [
    el("h2", { class: "section-title", text: title }),
    el("ul", { class: "list" }, rows),
  ]);
}

/** First run on a device: which family member is using this phone? */
function renderIdentify(ctx: ViewCtx): HTMLElement {
  const input = el("input", { class: "field grow", type: "text", placeholder: "Your name" }) as HTMLInputElement;
  const addSelf = () => { const v = input.value.trim(); if (v) void ctx.actions.addSelfMember(v); };

  const memberButtons = ctx.members.map((m) =>
    el("button", { class: "btn full", text: m.display_name, onClick: () => void ctx.actions.identifyMember(m.member_id) }),
  );

  const items: (HTMLElement | false)[] = [
    el("h2", { class: "screen-title", text: "Who are you on this phone?" }),
    el("p", { class: "hint", text: "Pick yourself so your tasks and delegations are yours on this device." }),
    ...memberButtons,
    memberButtons.length > 0 && el("p", { class: "or", text: "or add yourself" }),
    el("div", { class: "identify-add" }, [input, el("button", { class: "btn primary", text: "Add", onClick: addSelf })]),
  ];

  return el("section", { class: "view" }, [
    el("div", { class: "identify" }, items.filter((c): c is HTMLElement => c !== false)),
  ]);
}

export function renderTodo(ctx: ViewCtx): HTMLElement {
  const me = ctx.settings.my_member_id;
  if (!me) return renderIdentify(ctx);

  const state = ctx.todoState;
  const incoming = selectIncomingPending(state, me).sort(byDue);
  const mine = selectForMember(state, me).filter((t) => !(isDelegated(t) && t.delegation_status === "pending"));
  const myOpen = mine.filter((t) => t.status === "open").sort(byDue);
  const myDone = mine.filter((t) => t.status === "done").sort(byDue);
  const sent = selectDelegatedBy(state, me).filter((t) => t.status !== "done").sort(byDue);

  const sections = [
    section("Needs your response", incoming.map((t) => incomingRow(ctx, t))),
    section("To do", myOpen.map((t) => myTaskRow(ctx, t))),
    section("Assigned by you", sent.map((t) => sentRow(ctx, t))),
    section("Done", myDone.map((t) => myTaskRow(ctx, t))),
  ].filter((c): c is HTMLElement => c !== false);

  const body = sections.length > 0
    ? el("div", {}, sections)
    : el("div", { class: "empty-state" }, [
        el("span", { class: "empty-emoji" }, [icon("checklist", 40)]),
        el("p", { class: "empty-title", text: "No tasks yet" }),
        el("p", { class: "empty-sub", text: "Tap + to add one, or delegate to a family member." }),
      ]);

  return el("section", { class: "view" }, [
    body,
    el("button", { class: "fab", "aria-label": "New task", onClick: () => ctx.actions.openTodoAdd() }, [icon("plus", 26)]),
  ]);
}

/** Bottom sheet to add a task: title (time auto-detected), who it is for, when, priority. */
export function renderTodoAddSheet(ctx: ViewCtx): HTMLElement | null {
  if (!ctx.todoAddOpen) return null;
  const me = ctx.settings.my_member_id;
  if (!me) return null;

  let title = "";
  let forMemberId = me;
  let priority: "normal" | "high" = "normal";
  let manualEdit = false;

  // Date picker: chips for the current month, today onward (past dates are never shown,
  // so they cannot be selected). Time picker: a single time field. Date defaults to today.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let selectedDate = new Date(today);
  let timeStr = "";

  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const days: Date[] = [];
  for (let d = today.getDate(); d <= lastDay; d++) days.push(new Date(today.getFullYear(), today.getMonth(), d));

  const dayChips = new Map<number, HTMLElement>();
  const duePreview = el("p", { class: "hint due-preview", text: "No time set" });

  const dueAt = (): number | null => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(selectedDate);
    d.setHours(h || 0, m || 0, 0, 0);
    return d.getTime();
  };
  const refreshPreview = () => {
    const due = dueAt();
    duePreview.textContent = due === null ? "No time set" : `Due ${formatDue(due)}`;
  };
  const selectDay = (d: Date) => {
    selectedDate = d;
    for (const [key, chip] of dayChips) chip.classList.toggle("day-active", key === d.getTime());
    refreshPreview();
  };

  const dateRow = el("div", { class: "day-row" }, days.map((d) => {
    const chip = el("button", { class: `day-chip ${d.getTime() === selectedDate.getTime() ? "day-active" : ""}`, onClick: () => selectDay(d) }, [
      el("span", { class: "day-dow", text: d.getTime() === today.getTime() ? "Today" : WEEKDAY_SHORT[d.getDay()] }),
      el("span", { class: "day-num", text: String(d.getDate()) }),
    ]);
    dayChips.set(d.getTime(), chip);
    return chip;
  }));

  const timeInput = el("input", { class: "field time-input", type: "time" }) as HTMLInputElement;
  timeInput.addEventListener("change", () => { manualEdit = true; timeStr = timeInput.value; refreshPreview(); });

  const titleInput = el("input", {
    class: "field grow",
    type: "text",
    placeholder: 'e.g. "Papa drop me at class 6 PM today"',
    onInput: (e) => {
      title = (e.target as HTMLInputElement).value;
      if (manualEdit) return;
      const parsed = parseWhen(title);
      if (parsed.dueAt === null) return;
      const pd = new Date(parsed.dueAt);
      const match = days.find((d) => d.getTime() === new Date(pd.getFullYear(), pd.getMonth(), pd.getDate()).getTime());
      if (match) selectDay(match); // only within the current month
      timeStr = `${pad(pd.getHours())}:${pad(pd.getMinutes())}`;
      timeInput.value = timeStr;
      refreshPreview();
    },
  }) as HTMLInputElement;

  const forChip = (id: string, label: string) => {
    const b = el("button", { class: `chip ${forMemberId === id ? "chip-active" : ""}`, text: label, onClick: () => {
      forMemberId = id;
      sheet.querySelectorAll(".for-chips .chip").forEach((c) => c.classList.remove("chip-active"));
      b.classList.add("chip-active");
    } });
    return b;
  };
  const forChips = [
    forChip(me, "Me"),
    ...ctx.members.filter((m) => m.member_id !== me).map((m) => forChip(m.member_id, m.display_name)),
  ];

  const priChip = el("button", { class: "chip", text: "High priority", onClick: () => {
    priority = priority === "high" ? "normal" : "high";
    priChip.classList.toggle("chip-active", priority === "high");
  } });

  const add = () => {
    const t = title.trim();
    if (!t) return;
    void ctx.actions.addTask({
      title: t,
      created_by_member_id: me,
      for_member_id: forMemberId,
      due_at: dueAt(),
      priority,
      delegation_status: forMemberId === me ? null : "pending",
    });
  };

  const sheet = el("div", { class: "sheet" }, [
    el("div", { class: "sheet-grab" }),
    el("div", { class: "sheet-title" }, [el("span", { text: "New task" })]),
    titleInput,
    duePreview,
    el("span", { class: "field-label", text: "For whom?" }),
    el("div", { class: "chips-wrap for-chips" }, forChips),
    el("span", { class: "field-label", text: "Date" }),
    dateRow,
    el("span", { class: "field-label", text: "Time" }),
    timeInput,
    el("div", { class: "chips-wrap" }, [priChip]),
    el("div", { class: "sheet-actions" }, [
      el("button", { class: "btn ghost", text: "Cancel", onClick: () => ctx.actions.closeTodoAdd() }),
      el("button", { class: "btn primary", text: "Add task", onClick: add }),
    ]),
  ]);

  return el("div", { class: "sheet-backdrop", onClick: (e) => { if (e.target === e.currentTarget) ctx.actions.closeTodoAdd(); } }, [sheet]);
}
