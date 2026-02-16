"use client";

import React from 'react';
import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ClinicBadgeProps {
  clinic: {
    id: number;
    name: string;
    address: string;
  };
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

// Extract short name from clinic name (e.g., "Dorotheo Dental Clinic - Bacoor (Main)" -> "Bacoor")
const getShortClinicName = (clinicName: string): string => {
  if (!clinicName) return 'Unknown';
  
  // Remove "Dorotheo Dental Clinic - " prefix
  let shortName = clinicName.replace(/Dorotheo Dental Clinic\s*-\s*/i, '');
  
  // Remove "(Main)" suffix but keep the location name
  shortName = shortName.replace(/\s*\(Main\)\s*$/i, '');
  
  return shortName.trim() || clinicName;
};

// Color mapping for different clinics
const getClinicColor = (clinicName: string): string => {
  if (!clinicName) return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700';
  
  const lowerName = clinicName.toLowerCase();
  
  if (lowerName.includes('bacoor') || lowerName.includes('main')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700';
  } else if (lowerName.includes('alabang')) {
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700';
  } else if (lowerName.includes('poblacion') || lowerName.includes('makati')) {
    return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-700';
  } else if (lowerName.includes('branch')) {
    return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-700';
  }
  
  // Default color
  return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700';
};

export function ClinicBadge({ 
  clinic, 
  variant = 'outline', 
  size = 'sm',
  className,
  showIcon = true 
}: ClinicBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs py-0.5 px-2',
    md: 'text-sm py-1 px-3',
    lg: 'text-base py-1.5 px-4',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  const clinicColor = variant === 'outline' ? getClinicColor(clinic.name) : '';
  const displayName = getShortClinicName(clinic.name);

  return (
    <Badge 
      variant={variant}
      className={cn(
        sizeClasses[size],
        variant === 'outline' && clinicColor,
        'inline-flex items-center gap-1 font-medium border',
        className
      )}
      title={clinic.name} // Show full name on hover
    >
      {showIcon && <Building2 className={iconSizes[size]} />}
      <span>{displayName}</span>
    </Badge>
  );
}
