import { useEffect, useMemo, useState } from "react";
import { Download, MonitorSmartphone, Share2, Shield, Smartphone, User, Wrench, X } from "lucide-react";

import { useStorefront } from "@/context/StorefrontContext";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { Button } from "@/components/ui/button";

type PwaAppType = "customer" | "admin" | "mechanic";

interface PwaInstallBannerProps {
  appType: PwaAppType;
  className?: string;
}

function upsertLink(rel: string, href: string) {
  let link = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }

  link.href = href;
}

function upsertThemeColor(content: string) {
  let meta = document.head.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;

  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }

  meta.content = content;
}

export function PwaInstallBanner({ appType, className = "" }: PwaInstallBannerProps) {
  const { settings } = useStorefront();
  const { isIos, isAndroid, canPromptInstall, shouldShow, isInstalling, dismiss, promptInstall } =
    usePwaInstallPrompt(appType);

  const profile = useMemo(() => {
    if (appType === "admin") {
      const fallbackName = settings.storeName || "M2 Center Auto";
      return {
        appName: settings.pwaAdminName?.trim() || `${fallbackName} Painel`,
        themeColor: settings.pwaAdminThemeColor || "#0f172a",
        browserIconHref:
          settings.pwaAdminDesktopIconUrl ||
          settings.pwaAdminIcon512Url ||
          settings.pwaAdminIcon192Url ||
          "/favicon.png",
        bannerIconHref:
          settings.pwaAdminDesktopIconUrl ||
          settings.pwaAdminIcon512Url ||
          settings.pwaAdminIcon192Url ||
          settings.pwaAdminAppleTouchIconUrl ||
          settings.pwaAdminMaskableIconUrl ||
          "/favicon.png",
      };
    }

    if (appType === "mechanic") {
      const fallbackName = settings.storeName || "M2 Center Auto";
      return {
        appName: settings.pwaMechanicName?.trim() || `${fallbackName} Mecanico`,
        themeColor: settings.pwaMechanicThemeColor || "#0f172a",
        browserIconHref:
          settings.pwaMechanicDesktopIconUrl ||
          settings.pwaMechanicIcon512Url ||
          settings.pwaMechanicIcon192Url ||
          "/favicon.png",
        bannerIconHref:
          settings.pwaMechanicDesktopIconUrl ||
          settings.pwaMechanicIcon512Url ||
          settings.pwaMechanicIcon192Url ||
          settings.pwaMechanicAppleTouchIconUrl ||
          settings.pwaMechanicMaskableIconUrl ||
          "/favicon.png",
      };
    }

    const fallbackName = settings.storeName || "M2 Center Auto";
    return {
      appName: settings.pwaName?.trim() || `${fallbackName} Cliente`,
      themeColor: settings.pwaThemeColor || "#0f172a",
      browserIconHref:
        settings.pwaDesktopIconUrl ||
        settings.pwaIcon512Url ||
        settings.pwaIcon192Url ||
        "/favicon.png",
      bannerIconHref:
        settings.pwaDesktopIconUrl ||
        settings.pwaIcon512Url ||
        settings.pwaIcon192Url ||
        settings.pwaAppleTouchIconUrl ||
        settings.pwaMaskableIconUrl ||
        "/favicon.png",
    };
  }, [appType, settings]);
  const manifestHref = `/api/settings/pwa-manifest.webmanifest?app=${appType}`;
  const appleTouchIconHref = `/api/settings/pwa-apple-touch-icon.png?app=${appType}`;
  const [iconLoadFailed, setIconLoadFailed] = useState(false);

  useEffect(() => {
    setIconLoadFailed(false);
  }, [profile.bannerIconHref]);

  useEffect(() => {
    upsertLink("manifest", manifestHref);
    upsertLink("icon", profile.browserIconHref);
    upsertLink("apple-touch-icon", appleTouchIconHref);
    upsertThemeColor(profile.themeColor);
  }, [appleTouchIconHref, manifestHref, profile.browserIconHref, profile.themeColor]);

  if (!shouldShow) {
    return null;
  }

  const Icon = appType === "admin" ? Shield : appType === "mechanic" ? Wrench : User;
  const title = appType === "admin" ? "Instale o app do lojista" : appType === "mechanic" ? "Instale o app do mecanico" : "Instale o app do cliente";
  const description =
    appType === "admin"
      ? "Tenha um atalho dedicado para vendas, operacao e gestao da loja."
      : appType === "mechanic"
        ? "Use um app proprio da oficina para revisar checklist, atendimentos e fluxo tecnico."
        : "Abra pedidos, veiculos, revisoes e suporte em um app proprio no celular do cliente.";
  const showPromptCard = canPromptInstall && !isIos;
  const promptLabel = isAndroid ? "Instalacao no Android" : "Instalacao no navegador";
  const PromptIcon = isAndroid ? Smartphone : MonitorSmartphone;
  const promptDescription = isAndroid
    ? "Toque no botao para instalar agora com o atalho correto desta area."
    : "Este navegador ja permite instalar este PWA. Use o botao abaixo para criar o app com o atalho correto desta area.";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500" />
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label="Fechar banner de instalacao"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="pr-8">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 text-white">
            {!iconLoadFailed && profile.bannerIconHref ? (
              <img
                src={profile.bannerIconHref}
                alt={profile.appName}
                className="h-full w-full object-contain"
                onError={() => setIconLoadFailed(true)}
              />
            ) : (
              <Icon className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-600">
                {profile.appName}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {isIos ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <Share2 className="h-4 w-4" />
                Instalacao no iPhone
              </div>
              <p>
                No Safari, toque em <strong>Compartilhar</strong> e depois em{" "}
                <strong>Adicionar a Tela de Inicio</strong> para instalar este app.
              </p>
            </div>
          ) : null}

          {showPromptCard ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-blue-950">
                <div className="mb-1 flex items-center gap-2 font-medium">
                  <PromptIcon className="h-4 w-4" />
                  {promptLabel}
                </div>
                <p>{promptDescription}</p>
              </div>

              <Button
                type="button"
                onClick={() => void promptInstall()}
                disabled={isInstalling}
                className="min-w-[180px] bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4 shrink-0" />
                {isInstalling ? "Instalando..." : "Instalar app"}
              </Button>
            </div>
          ) : null}

          {!isIos && !canPromptInstall ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              Em navegadores compatíveis, procure a opção <strong>Instalar app</strong> ou{" "}
              <strong>Adicionar à área de trabalho</strong> no menu do navegador.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
