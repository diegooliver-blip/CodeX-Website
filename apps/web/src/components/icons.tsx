import {
  Compass, GraduationCap, LayoutDashboard, Mail, MessageCircle, Monitor, Network,
  ShoppingBag, Smartphone, TrendingUp, Workflow, Zap, type LucideProps,
} from "lucide-react";

const map = {
  "message-circle": MessageCircle,
  monitor: Monitor,
  "shopping-bag": ShoppingBag,
  smartphone: Smartphone,
  "trending-up": TrendingUp,
  workflow: Workflow,
  mail: Mail,
  "layout-dashboard": LayoutDashboard,
  zap: Zap,
  network: Network,
  "graduation-cap": GraduationCap,
  compass: Compass,
} as const;

export function ServiceIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = map[name as keyof typeof map] ?? Compass;
  return <Icon strokeWidth={1.4} aria-hidden {...props} />;
}
