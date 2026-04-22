import React from 'react';
import { Edit, Trash2, Eye, Package } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ProductCardProps {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
  imageUrl?: string;
  isActive?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
}

export default function ProductCard({
  id,
  name,
  description,
  price,
  stock,
  category,
  imageUrl,
  isActive = true,
  onEdit,
  onDelete,
  onView,
}: ProductCardProps) {
  const stockStatus = stock === 0 ? 'out' : stock < 10 ? 'low' : 'ok';

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative h-40 bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-300" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <span
            className={cn(
              'px-2 py-1 text-xs font-semibold rounded',
              isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700'
            )}
          >
            {isActive ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        {/* Stock Badge */}
        {stockStatus !== 'ok' && (
          <div className="absolute top-2 left-2">
            <span
              className={cn(
                'px-2 py-1 text-xs font-semibold rounded',
                stockStatus === 'out'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              )}
            >
              {stockStatus === 'out' ? 'Esgotado' : 'Estoque Baixo'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        {category && (
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            {category}
          </p>
        )}

        {/* Name */}
        <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2">
          {name}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {description}
          </p>
        )}

        {/* Price and Stock */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500">Preço</p>
            <p className="text-lg font-bold text-moria-orange">
              R$ {price.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Estoque</p>
            <p
              className={cn(
                'text-lg font-bold',
                stockStatus === 'out'
                  ? 'text-red-600'
                  : stockStatus === 'low'
                  ? 'text-yellow-600'
                  : 'text-green-600'
              )}
            >
              {stock}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {onView && (
            <button
              onClick={onView}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors touch-manipulation"
              aria-label="Visualizar produto"
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">Ver</span>
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-moria-orange text-white rounded-lg hover:bg-moria-orange/90 transition-colors touch-manipulation"
              aria-label="Editar produto"
            >
              <Edit className="w-4 h-4" />
              <span className="text-sm font-medium">Editar</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors touch-manipulation"
              aria-label="Excluir produto"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
