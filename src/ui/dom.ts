// Tiny DOM helpers. No framework: views build element trees with el() and attach
// handlers directly, and the controller re-renders the whole screen on each change
// (cheap for a household-sized app).

type Child = Node | string | null | undefined | false;

interface Attrs {
  class?: string;
  text?: string;
  type?: string;
  value?: string | number;
  placeholder?: string;
  min?: string | number;
  disabled?: boolean;
  checked?: boolean;
  selected?: boolean;
  title?: string;
  "aria-label"?: string;
  onClick?: (e: MouseEvent) => void;
  onInput?: (e: Event) => void;
  onChange?: (e: Event) => void;
  onSubmit?: (e: SubmitEvent) => void;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (attrs.class) node.className = attrs.class;
  if (attrs.text !== undefined) node.textContent = attrs.text;
  if (attrs.type) node.setAttribute("type", attrs.type);
  if (attrs.value !== undefined) (node as HTMLInputElement).value = String(attrs.value);
  if (attrs.placeholder) node.setAttribute("placeholder", attrs.placeholder);
  if (attrs.min !== undefined) node.setAttribute("min", String(attrs.min));
  if (attrs.title) node.setAttribute("title", attrs.title);
  if (attrs["aria-label"]) node.setAttribute("aria-label", attrs["aria-label"]);
  if (attrs.disabled) (node as HTMLButtonElement).disabled = true;
  if (attrs.checked) (node as HTMLInputElement).checked = true;
  if (attrs.selected) (node as HTMLOptionElement).selected = true;
  if (attrs.onClick) node.addEventListener("click", attrs.onClick as EventListener);
  if (attrs.onInput) node.addEventListener("input", attrs.onInput as EventListener);
  if (attrs.onChange) node.addEventListener("change", attrs.onChange as EventListener);
  if (attrs.onSubmit) node.addEventListener("submit", attrs.onSubmit as EventListener);
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}

/** Remove all children of a node. */
export function clear(node: HTMLElement): void {
  node.replaceChildren();
}
