import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BatteryCharging,
  BadgePercent,
  CircleHelp,
  Clock3,
  Cog,
  Disc3,
  Droplets,
  Facebook,
  Filter,
  Fuel,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Settings2,
  ShieldCheck,
  Star,
  Truck,
  Wind,
  Wrench,
  Zap,
} from "lucide-react";

import type {
  BusinessHours,
  LandingColorValue,
  LandingFooterConfig,
  LandingMenuItem,
  PublicSettings,
} from "@/types/storefront";

const iconByName: Record<string, LucideIcon> = {
  battery: BatteryCharging,
  badgepercent: BadgePercent,
  clock: Clock3,
  cog: Cog,
  disc: Disc3,
  droplets: Droplets,
  facebook: Facebook,
  filter: Filter,
  fuel: Fuel,
  instagram: Instagram,
  mail: Mail,
  mappin: MapPin,
  messagecircle: MessageCircle,
  package: Package,
  phone: Phone,
  settings: Settings2,
  shield: ShieldCheck,
  shieldcheck: ShieldCheck,
  star: Star,
  truck: Truck,
  wind: Wind,
  wrench: Wrench,
  zap: Zap,
};

const sectionLinkMap: Record<string, string> = {
  inicio: "#inicio",
  home: "#inicio",
  sobre: "#sobre",
  about: "#sobre",
  empresa: "#sobre",
  servicos: "#servicos",
  services: "#servicos",
  servico: "#servicos",
  servicoes: "#servicos",
  produtos: "#produtos",
  products: "#produtos",
  pecas: "#produtos",
  promocoes: "#promocoes",
  promotions: "#promocoes",
  promocoespeciais: "#promocoes",
  contato: "#contato",
  contact: "#contato",
};

function normalizeKey(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

export function resolveIcon(name?: string, fallback: LucideIcon = CircleHelp): LucideIcon {
  const normalized = normalizeKey(name);
  return iconByName[normalized] ?? fallback;
}

export function resolveServiceIcon(category?: string, name?: string): LucideIcon {
  const source = normalizeKey(`${category ?? ""} ${name ?? ""}`);

  if (source.includes("diesel") || source.includes("caminhao") || source.includes("carga")) {
    return Fuel;
  }
  if (source.includes("oleo") || source.includes("lubr")) {
    return Droplets;
  }
  if (source.includes("escap")) {
    return Wind;
  }
  if (source.includes("freio") || source.includes("suspens") || source.includes("segur")) {
    return ShieldCheck;
  }
  if (source.includes("eletric") || source.includes("bateria")) {
    return Zap;
  }
  if (source.includes("motor")) {
    return Cog;
  }
  if (source.includes("acessorio")) {
    return Settings2;
  }

  return Wrench;
}

export function resolveProductIcon(category?: string, name?: string): LucideIcon {
  const source = normalizeKey(`${category ?? ""} ${name ?? ""}`);

  if (source.includes("oleo") || source.includes("lubr")) {
    return Droplets;
  }
  if (source.includes("escap")) {
    return Wind;
  }
  if (source.includes("filtro")) {
    return Filter;
  }
  if (source.includes("motor")) {
    return Cog;
  }
  if (source.includes("suspens") || source.includes("dire")) {
    return ShieldCheck;
  }
  if (source.includes("diesel") || source.includes("carga")) {
    return Truck;
  }
  if (source.includes("freio")) {
    return Disc3;
  }
  if (source.includes("eletric") || source.includes("bateria")) {
    return Zap;
  }

  return Package;
}

export function resolveSocialIcon(platform?: string): LucideIcon {
  const source = normalizeKey(platform);

  if (source.includes("instagram")) {
    return Instagram;
  }
  if (source.includes("facebook")) {
    return Facebook;
  }
  if (source.includes("whatsapp")) {
    return MessageCircle;
  }
  if (source.includes("mail")) {
    return Mail;
  }

  return CircleHelp;
}

function buildGradient(value: LandingColorValue) {
  const gradient = value.gradient;

  if (!gradient?.colors?.length) {
    return undefined;
  }

  if (gradient.type === "radial") {
    return `radial-gradient(circle, ${gradient.colors.join(", ")})`;
  }

  if (gradient.direction) {
    return `linear-gradient(${gradient.direction}, ${gradient.colors.join(", ")})`;
  }

  return `linear-gradient(${gradient.angle ?? 135}deg, ${gradient.colors.join(", ")})`;
}

function resolveSolidColor(value?: string | LandingColorValue) {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value.type === "solid") {
    return value.solid;
  }

  return value.gradient?.colors?.[value.gradient.colors.length - 1];
}

export function toCssBackgroundStyle(value?: string | LandingColorValue): CSSProperties {
  if (!value) {
    return {};
  }

  if (typeof value === "string") {
    return { background: value };
  }

  if (value.type === "gradient") {
    const background = buildGradient(value);
    return background ? { background } : {};
  }

  return value.solid ? { background: value.solid } : {};
}

export function toCssTextStyle(value?: string | LandingColorValue): CSSProperties {
  const color = resolveSolidColor(value);
  return color ? { color } : {};
}

export function buildWhatsAppHref(number?: string, message?: string) {
  const digits = (number ?? "").replace(/\D/g, "");

  if (!digits) {
    return "#contato";
  }

  if (!message) {
    return `https://wa.me/${digits}`;
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function toAssetUrl(path?: string | null) {
  if (!path) {
    return undefined;
  }

  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) {
    return path;
  }

  const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (!rawBaseUrl || rawBaseUrl === "/api") {
    return path;
  }

  try {
    return new URL(path, rawBaseUrl).toString();
  } catch {
    return path;
  }
}

export function normalizeLink(label?: string, href?: string) {
  if (!href) {
    return "#inicio";
  }

  if (/^(https?:|mailto:|tel:)/i.test(href)) {
    return href;
  }

  if (href.startsWith("#")) {
    return sectionLinkMap[normalizeKey(href)] ?? href;
  }

  return sectionLinkMap[normalizeKey(label)] ?? sectionLinkMap[normalizeKey(href)] ?? "#inicio";
}

export function normalizeMenuItems(items?: LandingMenuItem[]) {
  if (!items?.length) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    href: normalizeLink(item.label, item.href),
  }));
}

export function getBrandShortName(storeName?: string) {
  if (!storeName) {
    return "m2";
  }

  if (/m2/i.test(storeName)) {
    return "m2";
  }

  const tokens = storeName.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return "m2";
  }

  if (tokens[0].length <= 4) {
    return tokens[0].toLowerCase();
  }

  return tokens
    .slice(0, 2)
    .map((token) => token[0]?.toLowerCase() ?? "")
    .join("");
}

export function formatCurrency(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatPhoneNumber(value?: string) {
  const digits = (value ?? "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  const localDigits = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;

  if (localDigits.length === 11) {
    return `(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 7)}-${localDigits.slice(7)}`;
  }

  if (localDigits.length === 10) {
    return `(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 6)}-${localDigits.slice(6)}`;
  }

  return value ?? "";
}

export function buildAddressLines(settings: PublicSettings, footer?: LandingFooterConfig) {
  const lines = [
    settings.address || footer?.contactInfo?.address?.street,
    [settings.city, settings.state].filter(Boolean).join(" - ") || footer?.contactInfo?.address?.city,
    settings.zipCode ? `CEP: ${settings.zipCode}` : footer?.contactInfo?.address?.zipCode,
  ].filter(Boolean);

  return lines as string[];
}

export function buildMapEmbedUrl(addressLines: string[]) {
  const query = addressLines.join(", ");

  if (!query) {
    return "https://www.google.com/maps?q=Palmital%20PR&z=15&output=embed";
  }

  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
}

const dayLabels: Record<string, string> = {
  monday: "Seg",
  tuesday: "Ter",
  wednesday: "Qua",
  thursday: "Qui",
  friday: "Sex",
  saturday: "Sab",
  sunday: "Dom",
};

export function formatBusinessHoursLines(hours?: BusinessHours) {
  if (!hours) {
    return [];
  }

  return Object.entries(hours)
    .filter(([, value]) => Boolean(value))
    .map(([day, value]) => `${dayLabels[day] ?? day}: ${value}`);
}

export function formatBusinessHoursSummary(hours?: BusinessHours) {
  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"]
    .map((day) => hours?.[day])
    .filter(Boolean);
  const saturday = hours?.saturday;

  if (!weekdays.length && !saturday) {
    return "";
  }

  const weekdayRange =
    weekdays.length > 0 && weekdays.every((value) => value === weekdays[0])
      ? `Seg a Sex: ${weekdays[0]}`
      : weekdays.length > 0
        ? `Seg a Sex`
        : "";

  if (weekdayRange && saturday) {
    return `${weekdayRange} | Sab: ${saturday}`;
  }

  return weekdayRange || (saturday ? `Sab: ${saturday}` : "");
}
