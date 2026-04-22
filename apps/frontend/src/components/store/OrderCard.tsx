import React from 'react';
import { Eye, Clock, CheckCircle, XCircle, Package, User } from 'lucide-react';
import { cn } from '../../lib/utils';

interface OrderCardProps {
  id: string;
  orderNumber: string;
  customerName: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  total: number;
  itemsCount: number;
  createdAt: string;
  onView?: () => void;
}

export default function OrderCard({
  id,
  orderNumber,
  customerName,
  status,
  total,
  itemsCount,
  createdAt,
  onView,
}: OrderCardProps) {
  const statusConfig = {
    pending: {
      label: 'Pendente',
      icon: Clock,
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      iconColor: 'text-yellow-500',
    },
    processing: {
      label: 'Processando',
      icon: Package,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      iconColor: 'text-blue-500',
    },
    completed: {
      label: 'Concluído',
      icon: CheckCircle,
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      iconColor: 'text-green-500',
    },
    cancelled: {
      label: 'Cancelado',
      icon: XCircle,
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      iconColor: 'text-red-500',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  // Formatar data
  const formattedDate = new Date(createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">
            #{orderNumber}
          </span>
        </div>
        <span
          className={cn(
            'px-2 py-1 text-xs font-semibold rounded flex items-center gap-1',
            config.bgColor,
            config.textColor
          )}
        >
          <StatusIcon className="w-3 h-3" />
          {config.label}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Customer */}
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900">
            {customerName}
          </span>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Total */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Total</p>
            <p className="text-lg font-bold text-moria-orange">
              R$ {total.toFixed(2)}
            </p>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Itens</p>
            <p className="text-lg font-bold text-gray-900">
              {itemsCount}
            </p>
          </div>
        </div>

        {/* Date */}
        <div className="mb-4">
          <p className="text-xs text-gray-500">Data do pedido</p>
          <p className="text-sm text-gray-700">{formattedDate}</p>
        </div>

        {/* Actions */}
        {onView && (
          <button
            onClick={onView}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-moria-orange text-white rounded-lg hover:bg-moria-orange/90 transition-colors touch-manipulation"
            aria-label="Visualizar pedido"
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">Ver Detalhes</span>
          </button>
        )}
      </div>
    </div>
  );
}
