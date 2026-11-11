"use client";
import { useState } from "react";
import clsx from "clsx";

type Theme = "light" | "dark" | "system";
function applyTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
  document.cookie = `theme=${t}; path=/; max-age=31536000; samesite=lax`;
}
const OPTIONS: [Theme, string][] = [["light", "Світла"], ["dark", "Темна"], ["system", "Як у системі"]];

export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  function pick(t: Theme) {
    setTheme(t);
    applyTheme(t);
  }
  return (
    <div className="seg" role="radiogroup" aria-label="Тема оформлення">
      {OPTIONS.map(([t, label]) => <button key={t} type="button" role="radio" aria-checked={theme === t} className={clsx(theme === t && "on")} onClick={() => pick(t)}>{label}</button>)}
    </div>
  );
}
