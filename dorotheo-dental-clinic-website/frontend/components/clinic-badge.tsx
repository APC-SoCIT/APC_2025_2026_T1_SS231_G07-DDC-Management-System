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

// Color mapping for different clinics - returns style object with darker bg and light text
const getClinicColorStyle = (clinicName: string): { backgroundColor: string; color: string; borderColor: string } => {
  if (!clinicName) return {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
    color: '#374151',
    borderColor: 'rgba(107, 114, 128, 0.3)'
  };
  
  const lowerName = clinicName.toLowerCase();
  
  if (lowerName.includes('bacoor') || lowerName.includes('main')) {
    return {
      backgroundColor: 'rgba(20, 184, 166, 0.20)', // teal-500 at 20%
      color: '#0f766e', // teal-700
      borderColor: 'rgba(20, 184, 166, 0.4)' // teal-500 at 40%
    };
  } else if (lowerName.includes('alabang')) {
    return {
      backgroundColor: 'rgba(59, 130, 246, 0.20)', // blue-500 at 20%
      color: '#1d4ed8', // blue-700
      borderColor: 'rgba(59, 130, 246, 0.4)' // blue-500 at 40%
    };
  } else if (lowerName.includes('poblacion') || lowerName.includes('makati')) {
    return {
      backgroundColor: 'rgba(168, 85, 247, 0.20)', // purple-500 at 20%
      color: '#7e22ce', // purple-700
      borderColor: 'rgba(168, 85, 247, 0.4)' // purple-500 at 40%
    };
  } else if (lowerName.includes('branch')) {
    return {
      backgroundColor: 'rgba(249, 115, 22, 0.20)', // orange-500 at 20%
      color: '#c2410c', // orange-700
      borderColor: 'rgba(249, 115, 22, 0.4)' // orange-500 at 40%
    };
  }
  
  // Default color
  return {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
    color: '#374151',
    borderColor: 'rgba(107, 114, 128, 0.3)'
  };
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

  const clinicStyle = variant === 'outline' ? getClinicColorStyle(clinic.name) : undefined;
  const displayName = getShortClinicName(clinic.name);

  return (
    <Badge 
      variant={variant}
      className={cn(
        sizeClasses[size],
        'inline-flex items-center gap-1 font-medium border',
        className
      )}
      style={clinicStyle}
      title={clinic.name} // Show full name on hover
    >
      {showIcon && <Building2 className={iconSizes[size]} />}
      <span>{displayName}</span>
    </Badge>
  );
}
