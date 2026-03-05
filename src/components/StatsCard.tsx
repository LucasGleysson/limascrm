import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  variant?: "default" | "primary" | "success" | "warning" | "info" | "destructive";
}

const variantStyles = {
  default: "bg-card border-border",
  primary: "bg-card border-primary/20 stat-glow",
  success: "bg-card border-success/20",
  warning: "bg-card border-warning/20",
  info: "bg-card border-info/20",
  destructive: "bg-card border-destructive/20",
};

const iconVariantStyles = {
  default: "bg-muted text-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
};

export const StatsCard = ({ title, value, subtitle, icon: Icon, trend, variant = "default" }: StatsCardProps) => (
  <div className={`rounded-xl border p-5 animate-slide-in ${variantStyles[variant]}`}>
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {trend && (
          <p className={`text-xs font-medium ${trend.positive ? "text-success" : "text-destructive"}`}>
            {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
          </p>
        )}
      </div>
      <div className={`rounded-lg p-2.5 ${iconVariantStyles[variant]}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);
