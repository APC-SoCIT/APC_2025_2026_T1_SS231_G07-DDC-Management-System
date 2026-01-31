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

// Color mapping for different clinics
const getClinicColor = (clinicName: string): string => {
  if (!clinicName) return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700';
  
  const lowerName = clinicName.toLowerCase();
  
  if (lowerName.includes('main')) {
    return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700';
  } else if (lowerName.includes('branch a')) {
    return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700';
  } else if (lowerName.includes('branch b')) {
    return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-700';
  } else if (lowerName.includes('branch c')) {
    return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-700';
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

  return (
    <Badge 
      variant={variant}
      className={cn(
        sizeClasses[size],
        variant === 'outline' && clinicColor,
        'inline-flex items-center gap-1 font-medium border',
        className
      )}
    >
      {showIcon && <Building2 className={iconSizes[size]} />}
      <span className="truncate max-w-[150px]">{clinic.name}</span>
    </Badge>
  );
}
