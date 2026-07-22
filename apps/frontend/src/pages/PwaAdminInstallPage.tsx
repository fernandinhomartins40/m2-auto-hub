import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  MonitorSmartphone,
  Share,
  Shield,
  Smartphone,
  SquarePlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";

/**
 * Página dedicada à instalação do PWA do painel (lojista/admin), em /pwa-admin.
 *
 * Serve o manifest admin (index.html trata /pwa-admin como área de admin) e
 * garante isso reforçando o <link rel="manifest"> abaixo. A experiência é
 * adaptada por plataforma:
 *  - Android/desktop: botão nativo "Instalar app" quando o navegador permite;
 *    senão, instruções do menu do navegador (o botão nunca fica inerte).
 *  - iOS: passo a passo visual de "Compartilhar → Adicionar à Tela de Início".
 */
function upsertLink(rel: string, href: string) {
  let link = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
}

export default function PwaAdminInstallPage() {
  const { isIos, isAndroid, isInstalled, isInstalling, canPromptInstall, promptInstall } =
    usePwaInstallPrompt("admin");

  // Reforça o manifest/ícone admin nesta página (instalabilidade correta).
  useEffect(() => {
    upsertLink("manifest", "/api/settings/pwa-manifest.webmanifest?app=admin");
    upsertLink("apple-touch-icon", "/api/settings/pwa-apple-touch-icon.png?app=admin");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-10">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Instalar o App do Painel</h1>
          <p className="mt-2 text-gray-600">
            Tenha um atalho dedicado do painel administrativo no seu celular. Ele
            abre direto na área de gestão, separado do app do cliente.
          </p>
        </div>

        {isInstalled ? (
          <InstalledCard />
        ) : isIos ? (
          <IosInstructions />
        ) : (
          <AndroidDesktopInstall
            isAndroid={isAndroid}
            canPromptInstall={canPromptInstall}
            isInstalling={isInstalling}
            onInstall={() => void promptInstall()}
          />
        )}

        <div className="text-center">
          <Link to="/admin-login/?redirect=%2Fstore-panel">
            <Button variant="ghost" className="gap-2 text-slate-600">
              Ir para o login do painel
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function InstalledCard() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-sm">
      <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
      <div>
        <p className="font-semibold">App do painel já instalado</p>
        <p className="text-sm text-emerald-800/80">
          Procure o ícone do painel na tela inicial do seu dispositivo.
        </p>
      </div>
    </div>
  );
}

/** Android e desktop: botão nativo quando disponível; senão, instruções do menu. */
function AndroidDesktopInstall({
  isAndroid,
  canPromptInstall,
  isInstalling,
  onInstall,
}: {
  isAndroid: boolean;
  canPromptInstall: boolean;
  isInstalling: boolean;
  onInstall: () => void;
}) {
  const Icon = isAndroid ? Smartphone : MonitorSmartphone;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-slate-900">
        <Icon className="h-5 w-5 text-blue-600" />
        <span className="font-semibold">
          {isAndroid ? "Instalar no Android" : "Instalar no computador"}
        </span>
      </div>

      {canPromptInstall ? (
        <>
          <Button
            type="button"
            size="lg"
            onClick={onInstall}
            disabled={isInstalling}
            className="h-14 w-full gap-2 bg-blue-600 text-base hover:bg-blue-700"
          >
            <Download className="h-5 w-5" />
            {isInstalling ? "Instalando..." : "Baixar e instalar o app"}
          </Button>
          <p className="mt-3 text-center text-sm text-slate-500">
            Toque no botão e confirme a instalação. O app aparecerá na tela inicial.
          </p>
        </>
      ) : (
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Para instalar, abra o menu do navegador
            {isAndroid ? " (⋮ no canto superior)" : " (⋮ ou o ícone de instalar na barra de endereço)"} e
            toque em:
          </p>
          <ol className="space-y-2">
            <Step n={1}>
              <strong>Instalar aplicativo</strong> (ou <strong>Adicionar à tela inicial</strong>).
            </Step>
            <Step n={2}>Confirme em <strong>Instalar</strong>.</Step>
          </ol>
          <p className="rounded-xl bg-slate-50 p-3 text-slate-500">
            Dica: se não aparecer a opção, use o Google Chrome e recarregue esta página.
          </p>
        </div>
      )}
    </div>
  );
}

/** iOS: passo a passo visual (Safari não expõe botão de instalação). */
function IosInstructions() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-slate-900">
        <Smartphone className="h-5 w-5 text-blue-600" />
        <span className="font-semibold">Instalar no iPhone / iPad</span>
      </div>

      <p className="mb-4 text-sm text-slate-600">
        No <strong>Safari</strong>, siga os 3 passos abaixo (o iPhone não tem botão
        automático de instalação):
      </p>

      <ol className="space-y-4">
        <IosStep
          n={1}
          icon={<Share className="h-5 w-5 text-blue-600" />}
          title="Toque em Compartilhar"
          desc="É o ícone de um quadrado com uma seta para cima, na barra inferior do Safari."
        />
        <IosStep
          n={2}
          icon={<SquarePlus className="h-5 w-5 text-blue-600" />}
          title="Adicionar à Tela de Início"
          desc="Role a lista de opções e toque em 'Adicionar à Tela de Início'."
        />
        <IosStep
          n={3}
          icon={<CheckCircle2 className="h-5 w-5 text-blue-600" />}
          title="Confirme em Adicionar"
          desc="O ícone do painel aparecerá na tela inicial, como um app."
        />
      </ol>

      <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
        Importante: no iPhone, a instalação só funciona pelo <strong>Safari</strong>
        (não pelo Chrome ou outro navegador).
      </p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function IosStep({
  n,
  icon,
  title,
  desc,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
        {n}
      </span>
      <div>
        <div className="flex items-center gap-2 font-medium text-slate-900">
          {icon}
          {title}
        </div>
        <p className="mt-0.5 text-sm text-slate-600">{desc}</p>
      </div>
    </li>
  );
}
