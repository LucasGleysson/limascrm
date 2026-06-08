import { Sun, Moon, Sparkles } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export const ThemeToggle = ({ className = "" }: { className?: string }) => {
  const { theme, cycle } = useTheme();
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Sparkles;
  const label = theme === "light" ? "Claro" : theme === "dark" ? "Escuro" : "Drácula";
  const next = theme === "light" ? "Escuro" : theme === "dark" ? "Drácula" : "Claro";
  return (
    <button
      onClick={cycle}
      title={`Tema: ${label} • Clique para ${next}`}
      className={`inline-flex items-center justify-center h-8 w-8 rounded-md border border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground hover:bg-sidebar-accent transition-colors ${className}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
};