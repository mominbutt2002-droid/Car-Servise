"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "nord-theme";

function preferredTheme() {
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export default function ThemeSwitch() {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    const applied = document.documentElement.getAttribute("data-theme");
    if (applied === "light" || applied === "dark") {
      setTheme(applied);
      return;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    const next = saved === "light" || saved === "dark" ? saved : preferredTheme();
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
  }, []);

  function choose(next) {
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
  }

  return (
    <div className="theme-switch">
      <span className="theme-label">Тема</span>
      <div role="group" aria-label="Переключатель тёмной и светлой темы">
        <button type="button" aria-pressed={theme === "light"} onClick={() => choose("light")}>
          Светлая
        </button>
        <button type="button" aria-pressed={theme === "dark"} onClick={() => choose("dark")}>
          Тёмная
        </button>
      </div>
    </div>
  );
}
