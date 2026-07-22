// Light/dark theme persistence. The saved value is applied pre-hydration by an
// inline script in __root.tsx so dark mode never flashes white on load.

export type Theme = "light" | "dark";
const KEY = "bf-theme";

export function getTheme(): Theme {
  if (typeof document === "undefined") return "light";
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* storage unavailable */
  }
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* storage unavailable */
  }
}
