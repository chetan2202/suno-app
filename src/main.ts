import "./styles.css";
import { renderAppShell } from "./ui/app-shell.js";

const root = document.querySelector<HTMLDivElement>("#app");
if (root) {
  void renderAppShell(root);
}
