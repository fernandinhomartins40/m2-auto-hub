import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ScrollArea } from "../ui/scroll-area";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
  Package,
  Wrench,
  User,
  Phone,
  Calendar,
  DollarSign,
  ShoppingBag,
  MessageCircle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Gift,
  TrendingUp,
  ShoppingCart,
  Users,
  Image,
  Tag,
  Truck,
  Box,
  Download,
  BarChart3,
  FileText
} from "lucide-react";
import { RevisionsContent } from "./RevisionsContent";
import { RevisionsListContent } from "./RevisionsListContent";
import { RevisionAppointmentsContent } from "./RevisionAppointmentsContent";
import { ProductModal } from "./ProductModal";
import { OrderDetailsModal } from "./OrderDetailsModal";
import { QuoteModal } from "./QuoteModal";
import { CustomerOrdersModal } from "./CustomerOrdersModal";
import { NotificationCenter } from "./NotificationCenter";
import { AdminPageHeader } from "./AdminPageHeader";
import { CreateOrderModal } from "./CreateOrderModal";
import { CreateQuoteModal } from "./CreateQuoteModal";
import { CreateCustomerModal } from "./CreateCustomerModal";
import AdminUsersSection from "./AdminUsersSection";
import { PromotionsManagement } from "./PromotionsManagement";
import { PwaSettingsContent } from "./PwaSettingsContent";
import { SettingsContent } from "./SettingsContent";
import { CustomerRelationshipContent } from "./CustomerRelationshipContent";
import { AdminSupportContent } from "./AdminSupportContent";
import LoyaltyManagement from "./LoyaltyManagement";
import { AdminProductsSection } from "./AdminProductsSection";
import { AdminServicesSection } from "./AdminServicesSection";
import { AdminCouponsSection } from "./AdminCouponsSection";
import { LandingPageContent } from "./LandingPageContent";
import adminService, {
  type ProvisionalUser as AdminCustomer,
  type Quote as AdminQuote,
} from "@/api/adminService";
import { reportsService, type CompleteReportData } from "@/api/reportsService";
import type { Product as ApiProduct } from "@/api/productService";
import { exportToCSV, exportToExcel, formatCurrencyForExport, formatDateForExport } from "@/utils/exportUtils";
import { buildOrderListPdfHtml, buildOrderPdfHtml, getOrderListPdfFilename, getOrderPdfFilename } from "@/utils/orderPdf";
import { buildOrderStatusWhatsAppUrl, getOrderStatusLabel } from "@/utils/orderWhatsApp";
import { buildQuotePdfHtml, getQuotePdfFilename } from "@/utils/quotePdf";
import {
  buildCustomerListPdfHtml,
  buildCustomerPdfHtml,
  getCustomerListPdfFilename,
  getCustomerPdfFilename,
} from "@/utils/customerPdf";
import {
  buildReportExportData,
  buildReportPdfHtml,
  buildReportSectionPdfHtml,
  getReportPdfFilename,
  getReportSectionFilename,
  getReportSectionTitle,
  type ReportExportSection,
} from "@/utils/reportPdf";
import { useToast } from "@/hooks/use-toast";

interface StoreOrder {
  id: string;
  userId: string;
  customerName: string;
  customerWhatsApp: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    type?: string;
  }>;
  total: number;
  hasProducts: boolean;
  hasServices: boolean;
  status: string;
  createdAt: string;
  source: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedTime: string;
  basePrice?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed' | 'free_shipping';
  discountValue: number;
  minValue?: number;
  maxDiscount?: number;
  expiresAt: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Usar o tipo do productService
type Product = ApiProduct;

type CustomerListItem = AdminCustomer;
type Quote = AdminQuote;

interface AdminContentProps {
  activeTab: string;
  onTabChange?: (tab: string) => void;
}

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  totalCustomers: number;
  activeProducts: number;
  lowStockProducts: number;
  activeCoupons: number;
  recentOrders: StoreOrder[];
}

export function AdminContent({ activeTab, onTabChange }: AdminContentProps) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quotesTotalCount, setQuotesTotalCount] = useState(0);
  const [services, setServices] = useState<Service[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<CustomerListItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [filteredOrders, setFilteredOrders] = useState<StoreOrder[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [revisionView, setRevisionView] = useState<'appointments' | 'list' | 'create'>('appointments');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [isCreateQuoteModalOpen, setIsCreateQuoteModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null);
  const [isCustomerOrdersModalOpen, setIsCustomerOrdersModalOpen] = useState(false);
  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] = useState(false);
  const [exportingOrderId, setExportingOrderId] = useState<string | null>(null);
  const [isExportingOrdersPdf, setIsExportingOrdersPdf] = useState(false);
  const [exportingCustomerId, setExportingCustomerId] = useState<string | null>(null);
  const [isExportingCustomersPdf, setIsExportingCustomersPdf] = useState(false);
  const [exportingQuoteId, setExportingQuoteId] = useState<string | null>(null);
  const [exportingReportPdfKey, setExportingReportPdfKey] = useState<string | null>(null);

  // Reports states
  const [reportData, setReportData] = useState<CompleteReportData | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReportData();
    }
  }, [activeTab]);

  useEffect(() => {
    filterOrders();
    filterQuotes();
    filterServices();
    filterCoupons();
    filterProducts();
  }, [orders, quotes, services, coupons, products, searchTerm, statusFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load data from backend APIs
      const [dashboardStatsRes, ordersRes, quotesRes, servicesRes, couponsRes, productsRes, customersRes] = await Promise.all([
        adminService.getDashboardStats().catch(() => null),
        adminService.getOrders({ page: 1, limit: 100 }).catch(() => ({ orders: [], totalCount: 0 })),
        adminService.getQuotes({ page: 1, limit: 100 }).catch(() => ({ quotes: [], totalCount: 0 })),
        adminService.getServices({ page: 1, limit: 100 }).catch(() => ({ services: [], totalCount: 0 })),
        adminService.getCoupons({ page: 1, limit: 100 }).catch(() => ({ coupons: [], totalCount: 0 })),
        adminService.getProducts({ page: 1, limit: 100 }).catch(() => ({ products: [], totalCount: 0 })),
        adminService.getCustomers({ page: 1, limit: 100 }).catch(() => ({ customers: [], totalCount: 0 }))
      ]);

      setDashboardStats(dashboardStatsRes);
      setOrders(ordersRes.orders || []);
      setQuotes(quotesRes.quotes || []);
      setQuotesTotalCount(quotesRes.totalCount || 0);
      setServices(servicesRes.services || []);
      setCoupons(couponsRes.coupons || []);
      setProducts(productsRes.products || []);
      setUsers(customersRes.customers || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReportData = async () => {
    setIsLoadingReport(true);
    try {
      const report = await reportsService.getCompleteReport();
      setReportData(report);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleExportReportSpreadsheet = (
    format: "csv" | "excel",
    section: ReportExportSection = "complete"
  ) => {
    if (!reportData) {
      toast({
        title: "Relatório indisponível",
        description: "Carregue os dados do relatório antes de exportar.",
        variant: "destructive",
      });
      return;
    }

    const reportYear =
      reportData.salesByMonth.find((month) => month.year)?.year || new Date().getFullYear();
    const exportData = buildReportExportData(section, reportData, stats, reportYear);

    if (format === "csv") {
      exportToCSV(exportData);
    } else {
      exportToExcel(exportData);
    }

    toast({
      title: `${getReportSectionTitle(section)} exportado`,
      description: `O arquivo ${format === "csv" ? "CSV" : "Excel"} foi gerado com sucesso.`,
    });
  };

  const handleExportReportPdf = async (section: ReportExportSection = "complete") => {
    if (!reportData) {
      toast({
        title: "Relatório indisponível",
        description: "Carregue os dados do relatório antes de exportar o PDF.",
        variant: "destructive",
      });
      return;
    }

    const reportYear =
      reportData.salesByMonth.find((month) => month.year)?.year || new Date().getFullYear();

    setExportingReportPdfKey(section);
    try {
      const html =
        section === "complete"
          ? buildReportPdfHtml(reportData, stats, reportYear)
          : buildReportSectionPdfHtml(section, reportData, stats, reportYear);
      const filename =
        section === "complete"
          ? getReportPdfFilename(reportYear)
          : `${getReportSectionFilename(section, reportYear)}.pdf`;
      await reportsService.exportToPDF({ html, filename, year: reportYear });

      toast({
        title: `${getReportSectionTitle(section)} exportado`,
        description: "O PDF foi gerado com sucesso.",
      });
    } catch (error) {
      console.error("Error exporting report PDF:", error);
      toast({
        title: "Erro ao exportar PDF",
        description: "Não foi possível gerar o relatório em PDF.",
        variant: "destructive",
      });
    } finally {
      setExportingReportPdfKey(null);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerWhatsApp.includes(searchTerm)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setFilteredOrders(filtered);
  };

  const filterQuotes = () => {
    let filtered = quotes;

    if (searchTerm) {
      filtered = filtered.filter(quote =>
        quote.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customerWhatsApp.includes(searchTerm)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(quote =>
        quote.status.toUpperCase() === statusFilter.toUpperCase()
      );
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setFilteredQuotes(filtered);
  };

  const filterServices = () => {
    let filtered = services;

    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter === "active") {
      filtered = filtered.filter(service => service.isActive);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter(service => !service.isActive);
    }

    filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setFilteredServices(filtered);
  };

  const filterCoupons = () => {
    let filtered = coupons;

    if (searchTerm) {
      filtered = filtered.filter(coupon =>
        coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coupon.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter === "active") {
      filtered = filtered.filter(coupon => coupon.isActive);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter(coupon => !coupon.isActive);
    } else if (statusFilter === "expired") {
      filtered = filtered.filter(coupon => new Date(coupon.expiresAt) < new Date());
    }

    filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setFilteredCoupons(filtered);
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.supplier.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter === "active") {
      filtered = filtered.filter(product => product.status === 'ACTIVE');
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter(product => product.status === 'DISCONTINUED');
    } else if (statusFilter === "low_stock") {
      filtered = filtered.filter(product => product.stock <= product.minStock && product.stock > 0);
    } else if (statusFilter === "out_of_stock") {
      filtered = filtered.filter(product => product.stock === 0 || product.status === 'OUT_OF_STOCK');
    }

    filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setFilteredProducts(filtered);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getStatusInfo = (status: string) => {
    const statusMap = {
      PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      CONFIRMED: { label: 'Confirmado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      IN_PRODUCTION: { label: 'Em Produção', color: 'bg-indigo-100 text-indigo-800', icon: Wrench },
      PREPARING: { label: 'Preparando', color: 'bg-blue-100 text-blue-800', icon: Package },
      SHIPPED: { label: 'Enviado', color: 'bg-purple-100 text-purple-800', icon: Truck },
      DELIVERED: { label: 'Entregue', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: AlertCircle },
      // Fallback para status antigos em lowercase
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      quote_requested: { label: 'Orçamento Solicitado', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      confirmed: { label: 'Confirmado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.PENDING;
  };

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleCloseProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = async (productData: Partial<Product>) => {
    try {
      setIsSavingProduct(true);

      // O ProductModal já faz o save via fetch (com FormData para upload de imagens)
      // Aqui apenas recarregamos os dados após o modal fechar
      await loadData();
      handleCloseProductModal();
    } catch (error) {
      console.error('Erro ao recarregar produtos:', error);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleWhatsAppContact = (order: StoreOrder) => {
    const message = `Olá ${order.customerName}! Vi seu pedido #${order.id} aqui no nosso painel. Como posso te ajudar?`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${order.customerWhatsApp.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleOrderStatusWhatsApp = (order: StoreOrder) => {
    const whatsappUrl = buildOrderStatusWhatsAppUrl(order);
    window.open(whatsappUrl, "_blank");

    toast({
      title: "WhatsApp aberto",
      description: `Mensagem de status "${getOrderStatusLabel(order.status)}" pronta para envio.`,
    });
  };

  const handleCustomerCreated = (customer: CustomerListItem) => {
    setUsers(prev => [customer, ...prev.filter(existing => existing.id !== customer.id)]);
    setIsCreateCustomerModalOpen(false);
    void loadData();
  };

  const getCustomerStatusBadge = (status: CustomerListItem["status"]) => {
    const statusMap = {
      ACTIVE: { label: "Ativo", color: "bg-green-100 text-green-800" },
      INACTIVE: { label: "Inativo", color: "bg-gray-100 text-gray-700" },
      BLOCKED: { label: "Bloqueado", color: "bg-red-100 text-red-800" },
    } as const;

    return statusMap[status] || statusMap.ACTIVE;
  };

  const getCustomerLevelBadge = (level: CustomerListItem["level"]) => {
    const levelMap = {
      BRONZE: { label: "Bronze", color: "bg-amber-100 text-amber-800" },
      SILVER: { label: "Prata", color: "bg-slate-100 text-slate-800" },
      GOLD: { label: "Ouro", color: "bg-yellow-100 text-yellow-800" },
      PLATINUM: { label: "Platinum", color: "bg-cyan-100 text-cyan-800" },
    } as const;

    return levelMap[level] || levelMap.BRONZE;
  };

  const handleCustomerContact = (customer: CustomerListItem) => {
    const message = `Ola ${customer.name}! Aqui e da equipe M2 Center Auto. Vi seu cadastro em nossa base e estou entrando em contato para ajudar no que precisar.`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${customer.whatsapp.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const isPendingOrderStatus = (status: string) => ['PENDING', 'pending'].includes(status);
  const isPendingQuoteStatus = (status: string) => ['PENDING', 'ANALYZING', 'pending', 'analyzing'].includes(status);
  const mapNotificationToTab = (actionUrl?: string, notificationType?: string) => {
    if (actionUrl?.includes('/orders')) return 'orders';
    if (actionUrl?.includes('/quotes')) return 'quotes';
    if (actionUrl?.includes('/products')) return 'products';
    if (actionUrl?.includes('/revisions')) return 'revisions';
    if (actionUrl?.includes('/loyalty')) return 'loyalty';
    if (actionUrl?.includes('/relationship')) return 'relationship';
    if (actionUrl?.includes('/customers')) return 'customers';
    if (actionUrl?.includes('/promotions')) return 'promotions';
    if (actionUrl?.includes('/coupons')) return 'coupons';
    if (notificationType === 'order') return 'orders';
    if (notificationType === 'quote') return 'quotes';
    if (notificationType === 'stock') return 'products';
    if (notificationType === 'revision') return 'revisions';
    if (notificationType === 'loyalty') return 'loyalty';
    if (notificationType === 'customer') return 'relationship';
    if (notificationType === 'promotion') return 'promotions';
    if (notificationType === 'coupon') return 'coupons';
    return null;
  };

  // Use backend stats if available, otherwise calculate from local data
  const stats = dashboardStats ? {
    totalOrders: dashboardStats.totalOrders,
    totalQuotes: quotesTotalCount,
    totalServices: services.length,
    totalCoupons: coupons.length,
    totalProducts: products.length,
    pendingOrders: dashboardStats.pendingOrders,
    pendingQuotes: quotes.filter(q => isPendingQuoteStatus(q.status)).length,
    activeServices: services.filter(s => s.isActive).length,
    activeCoupons: dashboardStats.activeCoupons,
    activeProducts: dashboardStats.activeProducts,
    lowStockProducts: dashboardStats.lowStockProducts,
    outOfStockProducts: products.filter(p => p.stock === 0).length,
    totalInventoryValue: products.reduce((sum, product) => sum + (product.stock * product.costPrice), 0),
    totalRevenue: dashboardStats.totalRevenue,
    totalCustomers: dashboardStats.totalCustomers,
    averageTicket: dashboardStats.totalOrders > 0 ? dashboardStats.totalRevenue / dashboardStats.totalOrders : 0,
    conversionRate: quotes.length > 0 ? (dashboardStats.totalOrders / (dashboardStats.totalOrders + quotes.length)) * 100 : 0,
  } : {
    totalOrders: orders.length,
    totalQuotes: quotesTotalCount || quotes.length,
    totalServices: services.length,
    totalCoupons: coupons.length,
    totalProducts: products.length,
    pendingOrders: orders.filter(o => isPendingOrderStatus(o.status)).length,
    pendingQuotes: quotes.filter(q => isPendingQuoteStatus(q.status)).length,
    activeServices: services.filter(s => s.isActive).length,
    activeCoupons: coupons.filter(c => c.isActive && new Date(c.expiresAt) > new Date()).length,
    activeProducts: products.filter(p => p.isActive).length,
    lowStockProducts: products.filter(p => p.stock <= p.minStock).length,
    outOfStockProducts: products.filter(p => p.stock === 0).length,
    totalInventoryValue: products.reduce((sum, product) => sum + (product.stock * product.costPrice), 0),
    totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
    totalCustomers: users.length,
    averageTicket: orders.length > 0 ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length : 0,
    conversionRate: quotes.length > 0 ? (orders.length / (orders.length + quotes.length)) * 100 : 0,
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <AdminPageHeader
        icon={BarChart3}
        title="Dashboard"
        description="Acompanhe os principais indicadores, alertas e atividades recentes da loja."
      />
      {/* Primeira linha - Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <ShoppingBag className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Pedidos</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
                <p className="text-xs text-gray-500">{stats.pendingOrders} pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Receita Total</p>
                <p className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</p>
                <p className="text-xs text-gray-500">Ticket médio: {formatPrice(stats.averageTicket)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Wrench className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Orçamentos</p>
                <p className="text-2xl font-bold">{stats.totalQuotes}</p>
                <p className="text-xs text-gray-500">{stats.pendingQuotes} pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Clientes</p>
                <p className="text-2xl font-bold">{stats.totalCustomers}</p>
                <p className="text-xs text-gray-500">Cadastrados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segunda linha - Métricas secundárias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Serviços</p>
                <p className="text-2xl font-bold">{stats.totalServices}</p>
                <p className="text-xs text-gray-500">{stats.activeServices} ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Gift className="h-8 w-8 text-pink-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cupons</p>
                <p className="text-2xl font-bold">{stats.totalCoupons}</p>
                <p className="text-xs text-gray-500">{stats.activeCoupons} válidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-emerald-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Taxa Conversão</p>
                <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">Orçamentos → Pedidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Alertas</p>
                <p className="text-2xl font-bold">
                  {stats.pendingOrders + stats.pendingQuotes + stats.lowStockProducts}
                </p>
                <p className="text-xs text-gray-500">
                  {stats.lowStockProducts} estoque baixo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Terceira linha - Resumos e atividades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pedidos Recentes</CardTitle>
            <CardDescription>Últimos 5 pedidos recebidos</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const recentOrders = dashboardStats?.recentOrders || orders.slice(0, 5);
              return recentOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2">Nenhum pedido recebido ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => {
                  const statusInfo = getStatusInfo(order.status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <StatusIcon className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium">#{order.id}</p>
                            <p className="text-sm text-gray-500">{order.customerName}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={statusInfo.color} variant="secondary">
                            {statusInfo.label}
                          </Badge>
                          <p className="text-sm font-medium mt-1">
                            {order.hasProducts ? formatPrice(order.total) : 'Orçamento'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
            <CardDescription>Últimas ações realizadas no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Atividades simuladas baseadas nos dados existentes */}
              {[
                ...services.slice(0, 2).map(service => ({
                  type: 'service',
                  icon: Wrench,
                  color: 'text-orange-600',
                  title: `Serviço "${service.name}" ${service.isActive ? 'ativado' : 'criado'}`,
                  time: service.updatedAt
                })),
                ...coupons.slice(0, 2).map(coupon => ({
                  type: 'coupon',
                  icon: Gift,
                  color: 'text-green-600',
                  title: `Cupom "${coupon.code}" ${coupon.isActive ? 'ativado' : 'criado'}`,
                  time: coupon.updatedAt
                })),
                ...orders.slice(0, 2).map(order => ({
                  type: 'order',
                  icon: ShoppingBag,
                  color: 'text-blue-600',
                  title: `Novo pedido #${order.id} recebido`,
                  time: order.createdAt
                }))
              ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5).map((activity, index) => {
                const ActivityIcon = activity.icon;
                return (
                  <div key={index} className="flex items-start space-x-3">
                    <ActivityIcon className={`h-5 w-5 mt-1 ${activity.color}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.time).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quarta linha - Central de Notificações */}
      <NotificationCenter
        pendingOrders={stats.pendingOrders}
        pendingQuotes={stats.pendingQuotes}
        lowStockProducts={stats.lowStockProducts}
        useRealNotifications={true}
        onActionClick={(notification) => {
          const nextTab =
            notification.actionTab || mapNotificationToTab(notification.actionUrl, notification.type);
          if (nextTab) {
            onTabChange?.(nextTab);
          }
        }}
      />
    </div>
  );

  const getQuoteStatusBadge = (status: string) => {
    if (status === 'QUOTED' || status === 'quoted' || status === 'responded') {
      return { label: 'Enviado ao cliente', color: 'bg-blue-100 text-blue-800' };
    }

    if (status === 'APPROVED' || status === 'approved' || status === 'accepted') {
      return { label: 'Aprovado pelo cliente', color: 'bg-green-100 text-green-800' };
    }

    if (status === 'REJECTED' || status === 'rejected') {
      return { label: 'Rejeitado pelo cliente', color: 'bg-red-100 text-red-800' };
    }

    const statusMap: Record<string, { label: string; color: string }> = {
      PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      ANALYZING: { label: 'Em Análise', color: 'bg-purple-100 text-purple-800' },
      QUOTED: { label: 'Orçado', color: 'bg-blue-100 text-blue-800' },
      APPROVED: { label: 'Aprovado', color: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'Rejeitado', color: 'bg-red-100 text-red-800' },
      // Mapeamento antigo para compatibilidade
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      analyzing: { label: 'Em Análise', color: 'bg-purple-100 text-purple-800' },
      quoted: { label: 'Orçado', color: 'bg-blue-100 text-blue-800' },
      responded: { label: 'Orçado', color: 'bg-blue-100 text-blue-800' },
      approved: { label: 'Aprovado', color: 'bg-green-100 text-green-800' },
      accepted: { label: 'Aprovado', color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-800' },
    };
    return statusMap[status] || statusMap.PENDING;
  };

  const openOrderFromQuote = async (quote: Quote) => {
    try {
      const linkedOrder = orders.find((order) => order.id === quote.id)
        || await adminService.getOrderById(quote.id);

      setSelectedOrder(linkedOrder);
      setIsOrderModalOpen(true);
      onTabChange?.('orders');
    } catch (error: any) {
      toast({
        title: "Pedido ainda não disponível",
        description: error.response?.data?.error || "Não foi possível abrir o pedido convertido a partir deste orçamento.",
        variant: "destructive",
      });
    }
  };

  const handleExportQuotePdf = async (quote: Quote) => {
    setExportingQuoteId(quote.id);

    try {
      await adminService.exportQuotePdf(quote.id, {
        html: buildQuotePdfHtml(quote),
        filename: getQuotePdfFilename(quote),
      });

      toast({
        title: "PDF gerado",
        description: `O orçamento #${quote.id.slice(0, 8)} foi exportado com sucesso.`,
      });
    } catch (error: any) {
      console.error('Error exporting quote PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: error.response?.data?.error || error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setExportingQuoteId(null);
    }
  };

  const handleShareQuoteApprovalLink = (quote: Quote) => {
    if (!quote.publicApprovalToken) {
      toast({
        title: "Link indisponível",
        description: "Abra o orçamento, salve os valores e envie o link pelo modal.",
        variant: "destructive",
      });
      return;
    }

    const approvalUrl = `${window.location.origin}/quote-approval/${quote.publicApprovalToken}`;
    const message = `Olá ${quote.customerName}! Seu orçamento #${quote.id.slice(0, 8).toUpperCase()} já está disponível. Para aprovar sem login, acesse: ${approvalUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${quote.customerWhatsApp.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const renderQuotes = () => (
    <Card>
      <CardHeader>
        <AdminPageHeader
          icon={FileText}
          title="Todos os Orçamentos"
          description="Gerencie solicitações, aprovação e conversão de orçamentos."
          actions={
            <Button
              size="sm"
              onClick={() => setIsCreateQuoteModalOpen(true)}
              className="bg-moria-orange hover:bg-moria-orange/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Orçamento
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por orçamento, cliente ou telefone..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="analyzing">Em Análise</SelectItem>
              <SelectItem value="quoted">Orçado</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredQuotes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Wrench className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2">Nenhum orçamento encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuotes.map((quote) => (
                <div key={quote.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Wrench className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="font-bold">Orçamento #{quote.id}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(quote.createdAt).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(quote.createdAt).toLocaleTimeString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <Badge className={getQuoteStatusBadge(quote.status).color} variant="secondary">
                      {getQuoteStatusBadge(quote.status).label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{quote.customerName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{quote.customerWhatsApp}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center">
                        <Wrench className="h-4 w-4 mr-1 text-orange-600" />
                        Serviços ({quote.items.length})
                      </span>
                      {['QUOTED', 'quoted', 'APPROVED', 'approved'].includes(quote.status) ? (
                        <span className="font-semibold text-green-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.total || 0)}
                        </span>
                      ) : ['ANALYZING', 'analyzing'].includes(quote.status) ? (
                        <span className="text-purple-600">Em Análise</span>
                      ) : (
                        <span className="text-orange-600">Aguardando Orçamento</span>
                      )}
                    </div>
                    <div className="ml-5 text-sm text-gray-600">
                      {quote.items.map((item, index: number) => (
                        <div key={index} className="mb-1">
                          • {item.name} (Qtd: {item.quantity})
                          {item.description && (
                            <p className="text-xs text-gray-500 ml-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {['APPROVED', 'approved'].includes(quote.status) && quote.orderStatus && (
                    <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                      Este orçamento já foi convertido em pedido. Status atual: {getStatusInfo(quote.orderStatus).label}.
                    </div>
                  )}

                  {quote.hasLinkedOrder && (
                    <div className="mb-4 p-2 bg-blue-50 rounded text-sm text-blue-700">
                      🔗 Este cliente também possui um pedido vinculado: #{quote.sessionId?.replace('O', 'P')}
                    </div>
                  )}

                  <Separator className="mb-4" />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        if (['APPROVED', 'approved'].includes(quote.status)) {
                          void openOrderFromQuote(quote);
                          return;
                        }

                        setSelectedQuote(quote);
                        setIsQuoteModalOpen(true);
                      }}
                      className={
                        ['APPROVED', 'approved'].includes(quote.status)
                          ? 'bg-green-600 hover:bg-green-700'
                          : ['QUOTED', 'quoted'].includes(quote.status)
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : ['ANALYZING', 'analyzing'].includes(quote.status)
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : 'bg-moria-orange hover:bg-moria-orange/90'
                      }
                    >
                      {['APPROVED', 'approved'].includes(quote.status) ? (
                        <>
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Abrir Pedido
                        </>
                      ) : ['QUOTED', 'quoted'].includes(quote.status) ? (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          Gerenciar
                        </>
                      ) : ['ANALYZING', 'analyzing'].includes(quote.status) ? (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          Continuar Análise
                        </>
                      ) : (
                        <>
                          <DollarSign className="h-4 w-4 mr-1" />
                          Precificar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportQuotePdf(quote)}
                      disabled={exportingQuoteId === quote.id}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      {exportingQuoteId === quote.id ? 'Gerando PDF...' : 'PDF'}
                    </Button>
                    {['QUOTED', 'quoted'].includes(quote.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShareQuoteApprovalLink(quote)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Enviar link
                      </Button>
                    )}
                    {['APPROVED', 'approved'].includes(quote.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedQuote(quote);
                          setIsQuoteModalOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Orçamento
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const message = `Olá ${quote.customerName}! Vi sua solicitação de orçamento #${quote.id}. Vou preparar um orçamento personalizado para você. Em breve entro em contato!`;
                        const whatsappUrl = `https://api.whatsapp.com/send?phone=${quote.customerWhatsApp.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`;
                        window.open(whatsappUrl, '_blank');
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Contatar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </CardContent>
    </Card>
  );

  const renderServices = () => {
    const toggleServiceStatus = (serviceId: string) => {
      const updatedServices = services.map(service =>
        service.id === serviceId
          ? { ...service, isActive: !service.isActive, updatedAt: new Date().toISOString() }
          : service
      );
      setServices(updatedServices);
      localStorage.setItem('store_services', JSON.stringify(updatedServices));
    };

    const addNewService = () => {
      const newService: Service = {
        id: `srv-${Date.now()}`,
        name: 'Novo Serviço',
        description: 'Descrição do novo serviço',
        category: 'Geral',
        estimatedTime: '1 hora',
        basePrice: 0,
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const updatedServices = [newService, ...services];
      setServices(updatedServices);
      localStorage.setItem('store_services', JSON.stringify(updatedServices));
    };

    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Gerenciar Serviços</CardTitle>
              <CardDescription>Cadastre e gerencie os serviços oferecidos</CardDescription>
            </div>
            <Button onClick={addNewService} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Serviço
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, descrição ou categoria..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredServices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Wrench className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2">Nenhum serviço encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredServices.map((service) => (
                  <div key={service.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Wrench className="h-5 w-5 text-orange-500" />
                        <div>
                          <p className="font-bold">{service.name}</p>
                          <p className="text-sm text-gray-500">{service.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={service.isActive 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                          } 
                          variant="secondary"
                        >
                          {service.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleServiceStatus(service.id)}
                        >
                          {service.isActive ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{service.description}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">Tempo: {service.estimatedTime}</span>
                      </div>
                      {service.basePrice && service.basePrice > 0 ? (
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Preço: {formatPrice(service.basePrice)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-orange-600">Sob orçamento</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          Criado: {new Date(service.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <Separator className="mb-4" />

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          const updatedServices = services.filter(s => s.id !== service.id);
                          setServices(updatedServices);
                          localStorage.setItem('store_services', JSON.stringify(updatedServices));
                        }}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    );
  };

  const renderCoupons = () => {
    return (
      <AdminCouponsSection
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />
    );
  };

  const handleExportOrders = (format: 'csv' | 'excel') => {
    const data = {
      headers: ['ID', 'Cliente', 'WhatsApp', 'Total', 'Status', 'Data'],
      rows: filteredOrders.map(order => [
        order.id,
        order.customerName,
        order.customerWhatsApp,
        formatCurrencyForExport(order.total),
        order.status,
        formatDateForExport(order.createdAt)
      ]),
      filename: `pedidos_${new Date().toISOString().split('T')[0]}`
    };

    if (format === 'csv') {
      exportToCSV(data);
    } else {
      exportToExcel(data);
    }
  };

  const handleExportOrdersPdf = async () => {
    if (!filteredOrders.length) {
      toast({
        title: "Nenhum pedido para exportar",
        description: "Aplique outro filtro ou aguarde pedidos na listagem.",
        variant: "destructive",
      });
      return;
    }

    setIsExportingOrdersPdf(true);
    try {
      await adminService.exportOrdersPdf({
        html: buildOrderListPdfHtml(filteredOrders),
        filename: getOrderListPdfFilename(),
      });

      toast({
        title: "PDF gerado",
        description: "A listagem de pedidos foi exportada com sucesso.",
      });
    } catch (error: any) {
      console.error("Error exporting orders PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: error.response?.data?.error || error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsExportingOrdersPdf(false);
    }
  };

  const handleExportCustomers = (format: 'csv' | 'excel') => {
    const data = {
      headers: ['ID', 'Cliente', 'E-mail', 'WhatsApp', 'CPF', 'Nível', 'Status', 'Cadastro'],
      rows: users.map((user) => [
        user.id,
        user.name,
        user.email,
        user.whatsapp,
        user.cpf || 'Não informado',
        getCustomerLevelBadge(user.level).label,
        getCustomerStatusBadge(user.status).label,
        formatDateForExport(user.createdAt),
      ]),
      filename: `clientes_${new Date().toISOString().split('T')[0]}`,
    };

    if (format === 'csv') {
      exportToCSV(data);
    } else {
      exportToExcel(data);
    }
  };

  const handleExportCustomersPdf = async () => {
    if (!users.length) {
      toast({
        title: "Nenhum cliente para exportar",
        description: "Cadastre clientes ou ajuste os filtros antes de gerar o PDF.",
        variant: "destructive",
      });
      return;
    }

    setIsExportingCustomersPdf(true);
    try {
      await adminService.exportCustomersPdf({
        html: buildCustomerListPdfHtml(users),
        filename: getCustomerListPdfFilename(),
      });

      toast({
        title: "PDF gerado",
        description: "A listagem de clientes foi exportada com sucesso.",
      });
    } catch (error) {
      console.error("Error exporting customers PDF:", error);
      toast({
        title: "Erro ao exportar PDF",
        description: "Não foi possível gerar a listagem de clientes em PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExportingCustomersPdf(false);
    }
  };

  const handleExportCustomerPdf = async (customer: CustomerListItem) => {
    setExportingCustomerId(customer.id);
    try {
      await adminService.exportCustomerPdf(customer.id, {
        html: buildCustomerPdfHtml(customer),
        filename: getCustomerPdfFilename(customer),
      });

      toast({
        title: "Ficha exportada",
        description: `A ficha cadastral de ${customer.name} foi gerada com sucesso.`,
      });
    } catch (error) {
      console.error("Error exporting customer PDF:", error);
      toast({
        title: "Erro ao exportar PDF",
        description: "Não foi possível gerar a ficha cadastral do cliente.",
        variant: "destructive",
      });
    } finally {
      setExportingCustomerId(null);
    }
  };

  const handleExportOrderPdf = async (order: StoreOrder) => {
    setExportingOrderId(order.id);

    try {
      await adminService.exportOrderPdf(order.id, {
        html: buildOrderPdfHtml(order),
        filename: getOrderPdfFilename(order),
      });

      toast({
        title: "PDF gerado",
        description: `O pedido #${order.id.slice(0, 8)} foi exportado com sucesso.`,
      });
    } catch (error: any) {
      console.error("Error exporting order PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: error.response?.data?.error || error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setExportingOrderId(null);
    }
  };

  const renderOrders = () => (
    <Card>
      <CardHeader>
        <AdminPageHeader
          icon={ShoppingBag}
          title="Todos os Pedidos"
          description="Gerencie pedidos, exportações e comunicação operacional com os clientes."
          actions={
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsCreateOrderModalOpen(true)}
                className="bg-moria-orange hover:bg-moria-orange/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Pedido
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportOrdersPdf}
                disabled={isExportingOrdersPdf}
              >
                <FileText className="h-4 w-4 mr-2" />
                {isExportingOrdersPdf ? 'Gerando PDF...' : 'PDF'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportOrders('csv')}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportOrders('excel')}
              >
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </>
          }
        />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por pedido, cliente ou telefone..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="CONFIRMED">Confirmado</SelectItem>
              <SelectItem value="IN_PRODUCTION">Em Produção</SelectItem>
              <SelectItem value="PREPARING">Preparando</SelectItem>
              <SelectItem value="SHIPPED">Enviado</SelectItem>
              <SelectItem value="DELIVERED">Entregue</SelectItem>
              <SelectItem value="CANCELLED">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
                const statusInfo = getStatusInfo(order.status);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <StatusIcon className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-bold">Pedido #{order.id}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(order.createdAt).toLocaleTimeString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <Badge className={statusInfo.color} variant="secondary">
                        {statusInfo.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{order.customerName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{order.customerWhatsApp}</span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {order.hasProducts && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center">
                            <Package className="h-4 w-4 mr-1 text-blue-600" />
                            Produtos ({order.items.filter(i => i.type !== 'service').length})
                          </span>
                          <span className="font-medium">{formatPrice(order.total)}</span>
                        </div>
                      )}
                      {order.hasServices && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center">
                            <Wrench className="h-4 w-4 mr-1 text-orange-600" />
                            Serviços ({order.items.filter(i => i.type === 'service').length})
                          </span>
                          <span className="text-orange-600">Orçamento</span>
                        </div>
                      )}
                    </div>

                    <Separator className="mb-4" />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportOrderPdf(order)}
                        disabled={exportingOrderId === order.id}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        {exportingOrderId === order.id ? 'Gerando PDF...' : 'PDF'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsOrderModalOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOrderStatusWhatsApp(order)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Notificar: {statusInfo.label}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWhatsAppContact(order)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Contatar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </CardContent>
    </Card>
  );

  const renderCustomers = () => (
    <Card>
      <CardHeader>
        <AdminPageHeader
          icon={Users}
          title="Clientes Cadastrados"
          description="Cadastre clientes manualmente e acompanhe a base ativa da aplicação."
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCustomersPdf}
                disabled={isExportingCustomersPdf || users.length === 0}
                className="gap-2"
              >
                {isExportingCustomersPdf ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportCustomers('excel')}
                disabled={users.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Excel
              </Button>
              <Button
                size="sm"
                onClick={() => setIsCreateCustomerModalOpen(true)}
                className="gap-2 bg-moria-orange hover:bg-moria-orange/90"
              >
                <Plus className="h-4 w-4" />
                Novo Cliente
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </>
          }
        />
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <User className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2">Nenhum cliente cadastrado ainda</p>
            <Button
              onClick={() => setIsCreateCustomerModalOpen(true)}
              className="mt-4 bg-moria-orange hover:bg-moria-orange/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar primeiro cliente
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="border rounded-lg p-4">
                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start space-x-3">
                    <div className="bg-moria-orange text-white rounded-full p-2">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium break-words">{user.name}</p>
                      <p className="text-sm text-gray-500 break-all">{user.email}</p>
                      <p className="text-sm text-gray-500">{user.whatsapp}</p>
                      {user.cpf ? (
                        <p className="text-sm text-gray-500">CPF: {user.cpf}</p>
                      ) : null}
                      <p className="text-xs text-gray-400">
                        Cadastrado: {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className={getCustomerStatusBadge(user.status).color}>
                      {getCustomerStatusBadge(user.status).label}
                    </Badge>
                    <Badge variant="secondary" className={getCustomerLevelBadge(user.level).color}>
                      Nível {getCustomerLevelBadge(user.level).label}
                    </Badge>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Contato</p>
                    <p className="mt-1 text-sm break-all">{user.email}</p>
                    <p className="text-sm">{user.whatsapp}</p>
                    <p className="text-sm">{user.cpf ? `CPF: ${user.cpf}` : 'CPF não informado'}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Cadastro</p>
                    <p className="mt-1 text-sm">Status: {getCustomerStatusBadge(user.status).label}</p>
                    <p className="text-sm">Nível: {getCustomerLevelBadge(user.level).label}</p>
                    <p className="text-sm">
                      Atualizado: {new Date(user.updatedAt || user.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <Separator className="mb-4" />

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => handleExportCustomerPdf(user)}
                    disabled={exportingCustomerId === user.id}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    {exportingCustomerId === user.id ? 'Gerando PDF...' : 'Ficha PDF'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => handleCustomerContact(user)}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Contatar Cliente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setSelectedCustomer(user);
                      setIsCustomerOrdersModalOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Pedidos
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // FUNÇÃO ANTIGA renderProducts() REMOVIDA - Agora usa o componente AdminProductsSection

  const renderReports = () => {
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
  };

  const renderPromotions = () => {
    // Dados simulados de promoções baseados no conceito de campanhas de marketing
    const promotions = [
      {
        id: 'promo-001',
        name: 'Black Friday Automotiva',
        description: 'Descontos especiais em peças selecionadas',
        type: 'discount',
        value: 25,
        isActive: true,
        startDate: '2024-11-20',
        endDate: '2024-11-30',
        targetProducts: ['Filtros', 'Pastilhas de Freio'],
        minValue: 100,
        usageCount: 45,
        maxUsage: 100,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'promo-002', 
        name: 'Combo Revisão Completa',
        description: 'Kit completo para revisão com desconto progressivo',
        type: 'bundle',
        value: 15,
        isActive: true,
        startDate: '2024-11-01',
        endDate: '2024-12-31',
        targetProducts: ['Filtros', 'Óleo Motor', 'Velas'],
        minValue: 200,
        usageCount: 12,
        maxUsage: 50,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'promo-003',
        name: 'Frete Grátis Dezembro',
        description: 'Frete gratuito para pedidos acima de R$ 150',
        type: 'shipping',
        value: 0,
        isActive: false,
        startDate: '2024-12-01',
        endDate: '2024-12-31',
        targetProducts: [],
        minValue: 150,
        usageCount: 0,
        maxUsage: 200,
        createdAt: new Date().toISOString(),
      }
    ];

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Gerenciar Promoções</CardTitle>
                <CardDescription>Configure campanhas de marketing e ofertas especiais</CardDescription>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadData}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                <Button 
                  size="sm" 
                  className="bg-moria-orange hover:bg-moria-orange/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Promoção
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar promoções..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="inactive">Inativas</SelectItem>
                  <SelectItem value="expired">Expiradas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              {promotions.map((promotion) => {
                const isExpired = new Date(promotion.endDate) < new Date();
                const isUpcoming = new Date(promotion.startDate) > new Date();
                const usage = (promotion.usageCount / promotion.maxUsage) * 100;
                
                const getPromotionTypeIcon = () => {
                  switch (promotion.type) {
                    case 'discount': return <TrendingUp className="h-6 w-6" />;
                    case 'bundle': return <Package className="h-6 w-6" />;
                    case 'shipping': return <Truck className="h-6 w-6" />;
                    default: return <Gift className="h-6 w-6" />;
                  }
                };

                const getPromotionTypeLabel = () => {
                  switch (promotion.type) {
                    case 'discount': return 'Desconto';
                    case 'bundle': return 'Combo';
                    case 'shipping': return 'Frete';
                    default: return 'Promoção';
                  }
                };

                return (
                  <div key={promotion.id} className="border rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="bg-moria-orange text-white rounded-lg p-3">
                          {getPromotionTypeIcon()}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{promotion.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{promotion.description}</p>
                          <div className="flex items-center gap-4">
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                              {getPromotionTypeLabel()}
                            </Badge>
                            {isExpired ? (
                              <Badge variant="secondary" className="bg-red-100 text-red-800">
                                Expirada
                              </Badge>
                            ) : isUpcoming ? (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                Programada
                              </Badge>
                            ) : promotion.isActive ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Ativa
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                                Inativa
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {promotion.type === 'discount' && (
                          <p className="text-2xl font-bold text-green-600">{promotion.value}%</p>
                        )}
                        {promotion.type === 'shipping' && (
                          <p className="text-lg font-bold text-blue-600">Frete Grátis</p>
                        )}
                        <p className="text-sm text-gray-600">Min: {formatPrice(promotion.minValue)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">Período</span>
                        </div>
                        <div className="text-sm">
                          <p>Início: {new Date(promotion.startDate).toLocaleDateString('pt-BR')}</p>
                          <p>Fim: {new Date(promotion.endDate).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">Uso</span>
                        </div>
                        <div className="text-sm">
                          <p>{promotion.usageCount} / {promotion.maxUsage}</p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-moria-orange h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(usage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Tag className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">Produtos</span>
                        </div>
                        <div className="text-sm">
                          {promotion.targetProducts.length > 0 ? (
                            <p className="text-gray-600">{promotion.targetProducts.join(', ')}</p>
                          ) : (
                            <p className="text-gray-500">Todos os produtos</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <BarChart3 className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">Performance</span>
                        </div>
                        <div className="text-sm">
                          <p className="text-green-600 font-medium">{usage.toFixed(1)}% usado</p>
                          <p className="text-gray-500">{promotion.maxUsage - promotion.usageCount} restantes</p>
                        </div>
                      </div>
                    </div>

                    <Separator className="mb-4" />

                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        <p>Criado: {new Date(promotion.createdAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={promotion.isActive ? "secondary" : "outline"}
                          size="sm"
                          disabled={isExpired}
                        >
                          {promotion.isActive ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Ativa
                            </>
                          ) : (
                            <>
                              <Clock className="h-4 w-4 mr-1" />
                              Inativa
                            </>
                          )}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            const link = `${window.location.origin}/customer`;
                            const message = `🎯 Promoção especial: ${promotion.name}! ${promotion.description}. Acesse: ${link}`;
                            navigator.clipboard.writeText(message);
                          }}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Compartilhar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configurações do Sistema</CardTitle>
            <CardDescription>Configure e gerencie as definições da loja</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Informações da Loja */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Informações da Loja</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome da Loja</label>
                  <Input defaultValue="M2 Center Auto" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">CNPJ</label>
                  <Input defaultValue="12.345.678/0001-90" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Telefone</label>
                  <Input defaultValue="(11) 99999-9999" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">E-mail</label>
                  <Input defaultValue="contato@m2centerauto.com.br" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Endereço</label>
                  <Input defaultValue="Av. das Oficinas, 123 - Centro - São Paulo, SP" />
                </div>
              </div>
            </div>

            {/* Configurações de Vendas */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Configurações de Vendas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Margem de Lucro Padrão (%)</label>
                  <Input type="number" defaultValue="35" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor Mínimo para Frete Grátis</label>
                  <Input type="number" defaultValue="150" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Taxa de Entrega (R$)</label>
                  <Input type="number" defaultValue="15.90" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tempo de Entrega (dias)</label>
                  <Input type="number" defaultValue="3" />
                </div>
              </div>
            </div>

            {/* Notificações */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Notificações</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Novos Pedidos</p>
                    <p className="text-sm text-gray-600">Receber notificação quando houver novos pedidos</p>
                  </div>
                  <Button variant="outline" size="sm" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Ativo
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Estoque Baixo</p>
                    <p className="text-sm text-gray-600">Alerta quando produtos estão com estoque baixo</p>
                  </div>
                  <Button variant="outline" size="sm" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Ativo
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Relatórios Semanais</p>
                    <p className="text-sm text-gray-600">Receber relatório semanal de vendas por e-mail</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Clock className="h-4 w-4 mr-1" />
                    Inativo
                  </Button>
                </div>
              </div>
            </div>

            {/* Integrações */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Integrações</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <MessageCircle className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="font-medium">WhatsApp Business</p>
                          <p className="text-sm text-gray-600">Integração ativa</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Conectado</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">Configurar</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Truck className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="font-medium">Correios API</p>
                          <p className="text-sm text-gray-600">Cálculo de frete</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Disponível</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">Conectar</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <DollarSign className="h-8 w-8 text-purple-600" />
                        <div>
                          <p className="font-medium">Gateway Pagamento</p>
                          <p className="text-sm text-gray-600">PIX, Cartão, Boleto</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Disponível</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">Conectar</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <BarChart3 className="h-8 w-8 text-orange-600" />
                        <div>
                          <p className="font-medium">Google Analytics</p>
                          <p className="text-sm text-gray-600">Análise de tráfego</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Disponível</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">Conectar</Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Backup e Dados */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Backup e Dados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Backup Automático</h4>
                      <p className="text-sm text-gray-600">Último backup: Hoje às 03:00</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Fazer Backup
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Baixar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Exportar Dados</h4>
                      <p className="text-sm text-gray-600">Exporte dados para análise externa</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <FileText className="h-4 w-4 mr-2" />
                          Excel
                        </Button>
                        <Button size="sm" variant="outline">
                          <FileText className="h-4 w-4 mr-2" />
                          CSV
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator />

            {/* Botões de Ação */}
            <div className="flex justify-between">
              <Button variant="outline" className="text-red-600 hover:text-red-700">
                <AlertCircle className="h-4 w-4 mr-2" />
                Limpar Dados de Teste
              </Button>
              <Button className="bg-moria-orange hover:bg-moria-orange/90">
                <CheckCircle className="h-4 w-4 mr-2" />
                Salvar Configurações
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPlaceholder = (title: string, description: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-gray-500">
          <Package className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <p className="text-lg font-medium mb-2">Em Desenvolvimento</p>
          <p>Esta seção será implementada em breve.</p>
        </div>
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'orders':
        return renderOrders();
      case 'quotes':
        return renderQuotes();
      case 'customers':
        return renderCustomers();
      case 'relationship':
        return <CustomerRelationshipContent />;
      case 'support':
        return <AdminSupportContent />;
      case 'loyalty':
        return <LoyaltyManagement />;
      case 'products':
        return (
          <AdminProductsSection
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        );
      case 'services':
        return (
          <AdminServicesSection
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        );
      case 'revisions':
        return (
          <div className="space-y-4 sm:space-y-6">
            <AdminPageHeader
              icon={Wrench}
              title={
                revisionView === 'appointments'
                  ? 'Agendamentos de Revisão'
                  : revisionView === 'list'
                    ? 'Revisões'
                    : 'Nova Revisão'
              }
              description="Gerencie agenda, execução e abertura de revisões veiculares."
              actions={
                <>
                  <Button
                    variant={revisionView === 'appointments' ? 'default' : 'outline'}
                    onClick={() => setRevisionView('appointments')}
                    className="flex-1 sm:flex-none h-9 text-sm"
                  >
                    Agendamentos
                  </Button>
                  <Button
                    variant={revisionView === 'list' ? 'default' : 'outline'}
                    onClick={() => setRevisionView('list')}
                    className="flex-1 sm:flex-none h-9 text-sm"
                  >
                    Listar Revisões
                  </Button>
                  <Button
                    variant={revisionView === 'create' ? 'default' : 'outline'}
                    onClick={() => setRevisionView('create')}
                    className="flex-1 sm:flex-none h-9 text-sm"
                  >
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Nova Revisão</span>
                    <span className="sm:hidden">Nova</span>
                  </Button>
                </>
              }
            />
            {revisionView === 'appointments' ? (
              <RevisionAppointmentsContent />
            ) : revisionView === 'list' ? (
              <RevisionsListContent />
            ) : (
              <RevisionsContent />
            )}
          </div>
        );
      case 'coupons':
        return renderCoupons();
      case 'promotions':
        return <PromotionsManagement />;
      case 'reports':
        return renderReports();
      case 'users':
        return <AdminUsersSection />;
      case 'landing-page':
        return <LandingPageContent />;
      case 'pwa-settings':
        return <PwaSettingsContent />;
      case 'settings':
        return <SettingsContent />;
      default:
        return renderDashboard();
    }
  };

  return (
    <>
      <div className="min-w-0 w-full max-w-full overflow-x-hidden">
        {renderContent()}
      </div>
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={handleCloseProductModal}
        onSave={handleSaveProduct}
        product={editingProduct}
        loading={isSavingProduct}
      />
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setSelectedOrder(null);
        }}
        onUpdate={loadData}
        onExportPdf={handleExportOrderPdf}
        isExportingPdf={selectedOrder ? exportingOrderId === selectedOrder.id : false}
      />
      <QuoteModal
        quote={selectedQuote}
        isOpen={isQuoteModalOpen}
        onClose={() => {
          setIsQuoteModalOpen(false);
          setSelectedQuote(null);
        }}
        onUpdate={loadData}
        onOpenOrder={(quote) => {
          void openOrderFromQuote(quote);
        }}
      />
      <CreateOrderModal
        isOpen={isCreateOrderModalOpen}
        onClose={() => setIsCreateOrderModalOpen(false)}
        onSuccess={() => {
          loadData();
          setIsCreateOrderModalOpen(false);
        }}
      />

      <CreateQuoteModal
        isOpen={isCreateQuoteModalOpen}
        onClose={() => setIsCreateQuoteModalOpen(false)}
        onSuccess={() => {
          loadData();
          setIsCreateQuoteModalOpen(false);
        }}
      />

      <CreateCustomerModal
        isOpen={isCreateCustomerModalOpen}
        onClose={() => setIsCreateCustomerModalOpen(false)}
        onSuccess={handleCustomerCreated}
      />

      <CustomerOrdersModal
        customer={selectedCustomer}
        isOpen={isCustomerOrdersModalOpen}
        onClose={() => {
          setIsCustomerOrdersModalOpen(false);
          setSelectedCustomer(null);
        }}
      />
    </>
  );
}
