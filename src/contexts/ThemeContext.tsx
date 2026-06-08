import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "dracula";
const STORAGE_KEY = "autocrm.theme";

interface Ctx { theme: Theme; setTheme: (t: Theme) => void; cycle: () => void; }
const ThemeContext = createContext<Ctx | undefined>(undefined);

const apply = (t: Theme) => {
  const root = document.documentElement;
  root.classList.remove("dark", "dracula");
  if (t === "dark") root.classList.add("dark");
  if (t === "dracula") root.classList.add("dracula");
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem(STORAGE_KEY) as Theme) || "light";
  });

  useEffect(() => { apply(theme); localStorage.setItem(STORAGE_KEY, theme); }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const cycle = () => setThemeState((t) => (t === "light" ? "dark" : t === "dark" ? "dracula" : "light"));

  return <ThemeContext.Provider value={{ theme, setTheme, cycle }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const c = useContext(ThemeContext);
  if (!c) throw new Error("useTheme must be used within ThemeProvider");
  return c;
};