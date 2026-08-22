import {
  Dumbbell,
  BookOpen,
  Monitor,
  Coffee,
  Moon,
  Sun,
  Briefcase,
  Heart,
  Activity,
  Code,
  PenTool,
  Music,
  Utensils,
  Wallet,
  ShoppingCart,
  Target,
  Plane,
  Users,
  Smartphone,
  ListTodo,
  Brain,
  Zap,
  Droplet,
  Flame,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  SunMedium,
  MoonStar,
  GraduationCap,
  Laptop,
  Building2,
  Flag,
  Folder,
  FileText,
  File,
  Calendar,
  Layers,
  Compass,
  Anchor,
  Camera,
  Gamepad2,
  Gift,
  Hexagon,
  Image as ImageIcon,
  Key,
  Link2,
  Map,
  Mic,
  Paintbrush,
  Palmtree,
  Quote,
  Rocket,
  Search,
  Shield,
  Star,
  Sword,
  Tent,
  Trophy,
  Umbrella,
  Video,
  Watch,
  Wine,
  CheckSquare,
  Lightbulb,
} from "lucide-react";

export const ICONS = {
  // Fitness & Health
  Dumbbell,
  Activity,
  Droplet,
  Heart,

  // Learning & Study
  BookOpen,
  Brain,
  GraduationCap,

  // Work & Productivity
  Code,
  Briefcase,
  Monitor,
  ListTodo,
  Laptop,
  Building2,
  CheckSquare,

  // Daily Routines & Rest
  Coffee,
  Utensils,
  Moon,
  MoonStar,
  Sun,
  SunMedium,

  // Finance & Commerce
  Wallet,
  ShoppingCart,
  Gift,

  // Nature & Travel
  Plane,
  Palmtree,
  Tent,
  Umbrella,
  Compass,
  Map,

  // Arts & Media
  PenTool,
  Music,
  Smartphone,
  Camera,
  Gamepad2,
  ImageIcon,
  Mic,
  Paintbrush,
  Video,

  // Organization & General
  Target,
  Users,
  Zap,
  Flame,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Flag,
  Folder,
  FileText,
  File,
  Calendar,
  Layers,
  Anchor,
  Hexagon,
  Key,
  Link2,
  Quote,
  Rocket,
  Search,
  Shield,
  Star,
  Sword,
  Trophy,
  Watch,
  Wine,
  Lightbulb,
};

export type IconKey = keyof typeof ICONS;

export const ICON_CATEGORIES: Record<string, IconKey[]> = {
  "Productivity & Work": [
    "Code",
    "Briefcase",
    "Monitor",
    "ListTodo",
    "Laptop",
    "Building2",
    "CheckSquare",
  ],
  "Health & Fitness": ["Dumbbell", "Activity", "Droplet", "Heart"],
  "Learning & Mind": ["BookOpen", "Brain", "GraduationCap"],
  "Daily & Rest": [
    "Coffee",
    "Utensils",
    "Moon",
    "MoonStar",
    "Sun",
    "SunMedium",
  ],
  "Arts & Entertainment": [
    "PenTool",
    "Music",
    "Smartphone",
    "Camera",
    "Gamepad2",
    "ImageIcon",
    "Mic",
    "Paintbrush",
    "Video",
  ],
  "General & Status": [
    "Target",
    "Users",
    "Zap",
    "Flame",
    "Sparkles",
    "CheckCircle2",
    "TrendingUp",
    "Star",
    "Trophy",
    "Lightbulb",
  ],
  Organization: ["Flag", "Folder", "FileText", "File", "Calendar", "Layers"],
  "Travel & Nature": [
    "Plane",
    "Palmtree",
    "Tent",
    "Umbrella",
    "Compass",
    "Map",
  ],
  Misc: [
    "Wallet",
    "ShoppingCart",
    "Gift",
    "Anchor",
    "Hexagon",
    "Key",
    "Link2",
    "Quote",
    "Rocket",
    "Search",
    "Shield",
    "Sword",
    "Watch",
    "Wine",
  ],
};

export function resolveIcon(iconKey: string | null | undefined) {
  if (!iconKey) return Target; // default fallback

  // Exact match
  if (iconKey in ICONS) {
    return ICONS[iconKey as IconKey];
  }

  // Case-insensitive match
  const lowerKey = iconKey.toLowerCase();
  const matchedKey = Object.keys(ICONS).find(k => k.toLowerCase() === lowerKey);
  if (matchedKey) {
    return ICONS[matchedKey as IconKey];
  }

  // Fallback map for legacy/hardcoded strings used in Spaces/Pages
  if (iconKey === "landmark") return Building2;
  if (iconKey === "laptop") return Laptop;

  return Target; // global fallback
}
