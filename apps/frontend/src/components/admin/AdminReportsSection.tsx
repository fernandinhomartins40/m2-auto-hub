import { BarChart3, Download, FileText, RefreshCw, ShoppingCart, Tag, TrendingUp, Users } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { AdminPageHeader } from "./AdminPageHeader";
import type { CompleteReportData } from "@/api/reportService";
import type { ReportExportSection } from "@/utils/reportPdf";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

interface AdminReportsSectionProps {
  reportData: CompleteReportData | null;
  isLoadingReport: boolean;
  exportingReportPdfKey: ReportExportSection | null;
  orders: Array<{ status: string }>;
  services: unknown[];
  /** Metricas basicas, usadas como fallback enquanto o relatorio nao carrega. */
  stats: { totalRevenue: number; totalOrders: number; averageTicket: number };
  onExportPdf: (section: ReportExportSection) => void;
  onExportSpreadsheet: (section: ReportExportSection) => void;
}

/**
 * Aba de Relatorios. Extraida do AdminContent, que concentrava 26 telas em um
 * unico arquivo de quase 3 mil linhas.
 */
export function AdminReportsSection({
  reportData,
  isLoadingReport,
  exportingReportPdfKey,
  orders,
  services,
  stats,
  onExportPdf: handleExportReportPdf,
  onExportSpreadsheet: handleExportReportSpreadsheet,
}: AdminReportsSectionProps) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const reportYear =
    reportData?.salesByMonth.find((month) => month.year)?.year || currentYear;
  const isReportReady = !!reportData && !isLoadingReport;

  const renderReportActions = (section: ReportExportSection) => (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExportReportPdf(section)}
        disabled={!isReportReady || exportingReportPdfKey !== null}
      >
        {exportingReportPdfKey === section ? (
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileText className="h-4 w-4 mr-2" />
        )}
        PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExportReportSpreadsheet("excel", section)}
        disabled={!isReportReady}
      >
        <Download className="h-4 w-4 mr-2" />
        Excel
      </Button>
    </div>
  );

  // If report data is not loaded yet, show loading or use basic stats
  if (isLoadingReport) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-moria-orange" />
        <span className="ml-2 text-lg">Carregando relatórios...</span>
      </div>
    );
  }

  // Use real data from reports API or fallback to basic stats
  const salesByMonth = reportData?.salesByMonth || [];
  const topCategories = reportData?.topCategories || [];
  const growth = reportData?.growthComparison;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <AdminPageHeader
            icon={BarChart3}
            title="Relatório Completo"
            description="Exporte a consolidação geral da aba de relatórios em PDF, Excel ou CSV."
            actions={
              <>
                <Button
                  variant="outline"
                  onClick={() => handleExportReportPdf("complete")}
                  disabled={!isReportReady || exportingReportPdfKey !== null}
                >
                  {exportingReportPdfKey === "complete" ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Exportar PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExportReportSpreadsheet("excel", "complete")}
                  disabled={!isReportReady}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExportReportSpreadsheet("csv", "complete")}
                  disabled={!isReportReady}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </>
            }
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Resumo Executivo</p>
            <p className="text-sm text-gray-500">Exportação dedicada dos principais indicadores do período.</p>
          </div>
          {renderReportActions("overview")}
        </CardContent>
      </Card>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Receita do Mês</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPrice(growth?.current.revenue || stats.totalRevenue)}
                </p>
                {growth && (
                  <p className={`text-xs ${growth.growth.revenuePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {growth.growth.revenuePercentage >= 0 ? '+' : ''}{growth.growth.revenuePercentage.toFixed(1)}% vs mês anterior
                  </p>
                )}
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pedidos do Mês</p>
                <p className="text-2xl font-bold text-blue-600">
                  {growth?.current.orders || stats.totalOrders}
                </p>
                {growth && (
                  <p className={`text-xs ${growth.growth.ordersPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {growth.growth.ordersPercentage >= 0 ? '+' : ''}{growth.growth.ordersPercentage.toFixed(1)}% vs mês anterior
                  </p>
                )}
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatPrice(growth?.current.averageTicket || stats.averageTicket)}
                </p>
                {growth && (
                  <p className={`text-xs ${growth.growth.averageTicketPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {growth.growth.averageTicketPercentage >= 0 ? '+' : ''}{growth.growth.averageTicketPercentage.toFixed(1)}% vs mês anterior
                  </p>
                )}
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa Conversão</p>
                <p className="text-2xl font-bold text-orange-600">{stats.conversionRate.toFixed(1)}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Vendas por Mês */}
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Vendas por Mês - {reportYear}</CardTitle>
              <CardDescription>Receita e número de pedidos mensais</CardDescription>
            </div>
            {renderReportActions("sales")}
          </CardHeader>
          <CardContent>
            {salesByMonth.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2">Nenhum dado de vendas disponível</p>
              </div>
            ) : (
              <div className="space-y-4">
                {salesByMonth.map((data) => (
                  <div key={data.month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${data.monthNumber - 1 === currentMonth ? 'bg-moria-orange' : 'bg-gray-300'}`} />
                      <span className="font-medium">{data.month}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(data.revenue)}</p>
                      <p className="text-sm text-gray-500">{data.orders} pedidos</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Categorias */}
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Top Categorias</CardTitle>
              <CardDescription>Categorias mais vendidas por receita</CardDescription>
            </div>
            {renderReportActions("categories")}
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Tag className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2">Nenhuma categoria vendida ainda</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topCategories.map((category, index) => (
                  <div key={category.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-600">#{index + 1}</span>
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">{formatPrice(category.revenue)}</span>
                        <span className="text-sm text-gray-500 ml-2">({category.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-moria-orange h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(category.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Relatórios Detalhados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Estoque</CardTitle>
              <CardDescription>Status do inventário</CardDescription>
            </div>
            {renderReportActions("inventory")}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total de Produtos</span>
                <Badge variant="secondary">{stats.totalProducts}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Produtos Ativos</span>
                <Badge className="bg-green-100 text-green-800">{stats.activeProducts}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Estoque Baixo</span>
                <Badge className="bg-yellow-100 text-yellow-800">{stats.lowStockProducts}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Sem Estoque</span>
                <Badge className="bg-red-100 text-red-800">{stats.outOfStockProducts}</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between font-semibold">
                <span className="text-sm">Valor do Inventário</span>
                <span className="text-moria-orange">{formatPrice(stats.totalInventoryValue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Serviços</CardTitle>
              <CardDescription>Performance dos serviços</CardDescription>
            </div>
            {renderReportActions("services")}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total de Serviços</span>
                <Badge variant="secondary">{stats.totalServices}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Serviços Ativos</span>
                <Badge className="bg-green-100 text-green-800">{stats.activeServices}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Orçamentos Pendentes</span>
                <Badge className="bg-yellow-100 text-yellow-800">{stats.pendingQuotes}</Badge>
              </div>
              <Separator />
              <div className="text-center py-4">
                <p className="text-2xl font-bold text-moria-orange">{stats.conversionRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">Taxa de conversão orçamento → pedido</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Marketing</CardTitle>
              <CardDescription>Campanhas e cupons</CardDescription>
            </div>
            {renderReportActions("marketing")}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total de Cupons</span>
                <Badge variant="secondary">{stats.totalCoupons}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Cupons Válidos</span>
                <Badge className="bg-green-100 text-green-800">{stats.activeCoupons}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total de Clientes</span>
                <Badge className="bg-blue-100 text-blue-800">{stats.totalCustomers}</Badge>
              </div>
              <Separator />
              <div className="rounded-lg border border-dashed border-gray-200 px-4 py-3 text-xs text-gray-500">
                Use os botões do cabeçalho para exportar este bloco individualmente.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
