import { Link } from "react-router-dom";
import { ArrowRight, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PwaInstallBanner } from "@/components/pwa/PwaInstallBanner";

/**
 * Página dedicada à instalação do PWA do painel (lojista/admin).
 *
 * Fica em /pwa-admin e serve o manifest admin (ver index.html, que trata
 * /pwa-admin como área de admin). O PwaInstallBanner já contém a lógica de
 * instalação para Android, iOS (instruções) e desktop.
 */
export default function PwaAdminInstallPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-10">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Instalar o App do Painel</h1>
          <p className="mt-2 text-gray-600">
            Tenha um atalho dedicado do painel administrativo no seu celular ou
            computador. Ele abre direto na área de gestão, separado do app do cliente.
          </p>
        </div>

        {/* Banner com o fluxo de instalação (Android / iOS / desktop). */}
        <PwaInstallBanner appType="admin" />

        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-slate-900">Como instalar</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Android:</strong> toque em <em>Instalar app</em> no banner acima
              (ou no menu do navegador, em <em>Instalar aplicativo</em>).
            </li>
            <li>
              <strong>iPhone/iPad (Safari):</strong> toque em <em>Compartilhar</em> e
              depois em <em>Adicionar à Tela de Início</em>.
            </li>
            <li>
              <strong>Computador (Chrome/Edge):</strong> use o ícone de instalar na
              barra de endereço ou o botão acima.
            </li>
          </ul>
        </div>

        <div className="text-center">
          <Link to="/admin-login/?redirect=%2Fstore-panel">
            <Button variant="outline" className="gap-2">
              Ir para o login do painel
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
