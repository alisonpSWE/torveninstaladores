import React from 'react';
import { Badge } from '@/components/ui/badge';

export function getStatusBadgeVariant(statusStr: string) {
  const s = statusStr.toLowerCase();
  if (s.includes('liberad') || s.includes('conclu') || s.includes('finaliz')) return 'success';
  if (s.includes('andamento') || s.includes('execuç')) return 'warning';
  if (s.includes('bloquead') || s.includes('cancel')) return 'danger';
  return 'default';
}

interface ObraStatusBadgeProps {
  status: string;
  className?: string;
}

export function ObraStatusBadge({ status, className }: ObraStatusBadgeProps) {
  return (
    <Badge variant={getStatusBadgeVariant(status)} className={className}>
      {status}
    </Badge>
  );
}
