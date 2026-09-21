import { Link } from "react-router-dom";
import { Camera, Home, LogOut, User } from "lucide-react";

import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { adminSidebarItems } from "./adminNavigation";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onPlateLookup?: () => void;
}

export function Sidebar({ activeTab, onTabChange, onPlateLookup }: SidebarProps) {
  const { admin, logout } = useAdminAuth();
  const permissions = useAdminPermissions();

  const visibleItems = adminSidebarItems.filter(
    (item) => !item.requiresPermission || (permissions as any)[item.requiresPermission]
  );

  const groupedItems = visibleItems.reduce<Record<string, typeof visibleItems>>((acc, item) => {
    const section = item.section || "Outros";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(item);
    return acc;
  }, {});

  return (
    /* Tres estagios, so com CSS — sem estado em JS, para nao existir duas
       arvores de DOM que possam divergir:
         < 768px        barra inferior
         768 - 1399px   rail de 72px, so icones (`sidebar-rail`)
         >= 1400px      sidebar completa de 288px
       O estagio do meio existe porque a sidebar de 288px entrando de uma vez
       em 768px derrubava a area de conteudo de 768px para 532px. Com o rail
       sobram ~748px.

       O rail so sai em 1400px, e nao em 1180px junto com as grids de 4
       colunas: devolver 216px para a sidebar no mesmo pixel em que o conteudo
       passa a pedir mais colunas reproduzia o bug original mais para a
       direita. [MEDIDO] Medicoes em RESPONSIVE-UX-AUDIT.md secao 3. */
    <div className="sidebar-rail bg-moria-black fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t border-gray-700 text-white md:relative md:h-screen md:w-[72px] md:border-t-0 sidebar-full:w-72">
      <div className="hidden border-b border-gray-700 px-5 py-5 md:block">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
          Gestão da Loja
        </p>
        <h2 className="mt-2 text-lg font-bold leading-tight text-white">Painel do Lojista</h2>
      </div>

      {/* Tres coisas sao obrigatorias juntas para a lista rolar no desktop:
          - `md:min-h-0`: item flex tem min-height:auto e se recusa a encolher
            abaixo do conteudo, entao sozinho o `flex-1` nao limita a altura;
          - `md:h-full`: da ao nav uma altura concreta para o overflow morder;
          - `md:flex-col` no proprio nav: ele nasce `flex-row` para a barra do
            celular, e em linha o filho de menu esticava a altura do nav pelo
            conteudo (align-items: stretch), anulando o scroll.
          Sem isso, em notebook (768px) a lista estourava e os ultimos itens
          do menu ficavam inalcancaveis. */}
      <nav className="sidebar-scrollbar flex overflow-x-auto p-2 md:h-full md:min-h-0 md:flex-1 md:flex-col md:overflow-x-visible md:overflow-y-auto md:px-3 md:py-4">
        {/* `md:shrink-0` impede que o bloco seja comprimido pelo nav em vez de
            gerar rolagem. */}
        {/* `ul/li` para o leitor de tela anunciar o tamanho da lista e a
            posicao do item (A-16). A geometria segue nos mesmos containers:
            os `list-none`/`m-0`/`p-0` neutralizam o estilo padrao da lista. */}
        <ul className="m-0 flex w-full list-none gap-1 p-0 md:flex-col md:gap-3 md:shrink-0">
          {onPlateLookup && (
            <li className="contents">
              <button
                onClick={onPlateLookup}
                aria-label="Consulta por Placa"
                title="Consulta por Placa"
                className="flex min-w-[64px] flex-col items-center justify-center space-y-1 rounded-xl border border-moria-orange/40 bg-moria-orange/10 px-2 py-2 text-center text-moria-orange transition-all duration-200 hover:bg-moria-orange hover:text-white md:min-w-0 md:flex-row md:justify-start md:space-x-3 md:space-y-0 md:px-3 md:py-3 md:text-left"
              >
                <Camera className="h-5 w-5 flex-shrink-0" />
                <span className="text-[10px] font-semibold md:text-sm">Consulta por Placa</span>
              </button>
            </li>
          )}

          {Object.entries(groupedItems).map(([section, items]) => (
            <li
              key={section}
              className="md:rounded-2xl md:border md:border-gray-800 md:bg-gray-900/35 md:p-2"
            >
              <div className="mb-2 hidden px-2 pt-1 md:block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  {section}
                </p>
              </div>

              <ul className="m-0 flex w-full list-none gap-1 p-0 md:flex-col md:gap-1">
                {items.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <li key={item.id} className="contents">
                      <button
                        onClick={() => onTabChange(item.id)}
                        /* No rail (768-1179px) o rotulo fica escondido por CSS,
                           entao o nome acessivel tem que vir daqui — senao o
                           botao chega no leitor de tela sem nome nenhum. O
                           `title` da o tooltip para quem usa mouse. */
                        aria-label={item.label}
                        title={item.label}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex min-w-[64px] flex-col items-center justify-center space-y-1 rounded-xl px-2 py-2 text-center transition-all duration-200 md:min-w-0 md:flex-row md:justify-start md:space-x-3 md:space-y-0 md:px-3 md:py-3 md:text-left",
                          isActive
                            ? "bg-moria-orange text-white shadow-lg shadow-orange-500/15"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                        )}
                      >
                        <IconComponent className="h-5 w-5 flex-shrink-0" />
                        <span className="text-[10px] font-medium md:text-sm">{item.label}</span>
                        {isActive ? (
                          <div className="ml-auto hidden h-2 w-2 rounded-full bg-white md:block" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      <div className="hidden space-y-2 border-t border-gray-700 p-4 md:block">
        {admin ? (
          <button
            type="button"
            onClick={() => onTabChange("account")}
            className="mb-4 w-full rounded-xl border border-gray-700 bg-gray-800/40 p-3 text-left transition-colors hover:border-moria-orange/40 hover:bg-gray-800"
          >
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-moria-orange">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{admin.name}</p>
                <p className="truncate text-xs text-gray-400">{admin.role.replace(/_/g, " ")}</p>
              </div>
            </div>
          </button>
        ) : null}

        <Link to="/">
          <Button variant="ghost" className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white">
            <Home className="h-5 w-5 flex-shrink-0" />
            <span className="ml-3">Voltar ao Site</span>
          </Button>
        </Link>

        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:bg-primary/10 hover:text-primary"
          onClick={logout}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className="ml-3">Sair</span>
        </Button>
      </div>
    </div>
  );
}
