import React from 'react';
import { Bell, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StoreHeaderProps {
  title: string;
  variant?: 'admin' | 'mechanic';
  notificationCount?: number;
  onNotificationClick?: () => void;
  onSettingsClick?: () => void;
}

export default function StoreHeader({
  title,
  variant = 'admin',
  notificationCount = 0,
  onNotificationClick,
  onSettingsClick,
}: StoreHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 safe-area-top">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Title */}
        <h1 className="text-lg font-bold text-gray-900 truncate">
          {title}
        </h1>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          {onNotificationClick && (
            <button
              onClick={onNotificationClick}
              className={cn(
                'relative p-2 rounded-lg transition-colors touch-manipulation',
                'hover:bg-gray-100 active:bg-gray-200',
                'min-h-[44px] min-w-[44px] flex items-center justify-center'
              )}
              aria-label={`Notificações${notificationCount > 0 ? ` (${notificationCount})` : ''}`}
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
          )}

          {/* Settings */}
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className={cn(
                'p-2 rounded-lg transition-colors touch-manipulation',
                'hover:bg-gray-100 active:bg-gray-200',
                'min-h-[44px] min-w-[44px] flex items-center justify-center'
              )}
              aria-label="Configurações"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
