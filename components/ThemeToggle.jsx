"use client";

import React, { useEffect, useState } from "react";
import { MONO } from "@/lib/ui";

/* Small light/dark toggle. The actual attribute is set pre-paint by the inline
   script in layout.jsx; this button flips it and remembers the choice. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") || "light");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle light or dark mode"
      title="Toggle light/dark"
      className="text-[10px] tracking-widest px-2 py-1 border"
      style={{
        fontFamily: MONO,
        color: "var(--fg)",
        borderColor: "var(--border)",
        background: "transparent",
      }}
    >
      {theme === "dark" ? "☀ LIGHT" : "☾ DARK"}
    </button>
  );
}
