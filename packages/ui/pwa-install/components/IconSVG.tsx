import React from 'react';

interface IconSVGProps {
  variant: 'admin' | 'customer';
  size?: number;
}

export function AdminIconSVG({ size = 192 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="adminGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#2563eb', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      <rect width="192" height="192" rx="42" fill="url(#adminGrad)" />
      <text
        x="96"
        y="104"
        fontFamily="Arial, sans-serif"
        fontSize="72"
        fontWeight="bold"
        fill="white"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        A
      </text>
    </svg>
  );
}

export function CustomerIconSVG({ size = 192 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="customerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#059669', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      <rect width="192" height="192" rx="42" fill="url(#customerGrad)" />
      <text
        x="96"
        y="104"
        fontFamily="Arial, sans-serif"
        fontSize="72"
        fontWeight="bold"
        fill="white"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        C
      </text>
    </svg>
  );
}

export function IconSVG({ variant, size = 192 }: IconSVGProps) {
  if (variant === 'admin') {
    return <AdminIconSVG size={size} />;
  }

  return <CustomerIconSVG size={size} />;
}

export function getIconDataURL(variant: 'admin' | 'customer', size: number = 192): string {
  const color = variant === 'admin' ? '#2563eb' : '#10b981';
  const letter = variant === 'admin' ? 'A' : 'C';
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${color}"/>
      <text x="50%" y="50%" font-family="Arial" font-size="${size * 0.5}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${letter}</text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
