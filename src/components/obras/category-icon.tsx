import React from 'react';
import {
  Building2,
  Zap,
  Gauge,
  Power,
  Box,
  Cable,
  Cpu,
  Home,
  Plane,
  Folder,
  Tag,
  LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  fachada: Building2,
  padrao_entrada: Zap,
  medidor: Gauge,
  disjuntor_geral: Power,
  qdc: Box,
  ramal_entrada: Cable,
  local_inversor: Cpu,
  telhado: Home,
  drone: Plane,
  geral: Folder,
  outros: Folder,
};

export function getCategoryIcon(id?: string): LucideIcon {
  if (!id) return Tag;
  return CATEGORY_ICON_MAP[id] || Tag;
}

interface CategoryIconProps {
  id?: string;
  className?: string;
}

export function CategoryIcon({ id, className = 'w-4 h-4' }: CategoryIconProps) {
  const IconComponent = getCategoryIcon(id);
  return <IconComponent className={className} />;
}
