"use client";

import React from 'react';
import { useClinic, ClinicLocation } from '@/lib/clinic-context';
import { Building2, Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ClinicSelectorProps {
  showAllOption?: boolean;
  className?: string;
}

export function ClinicSelector({ showAllOption = false, className }: ClinicSelectorProps) {
  const { selectedClinic, allClinics, setSelectedClinic, isLoading } = useClinic();

  if (isLoading) {
    return (
      <Button variant="outline" disabled className={className}>
        <Building2 className="mr-2 h-4 w-4" />
        Loading...
      </Button>
    );
  }

  const displayText = selectedClinic === "all" 
    ? "All Clinics" 
    : selectedClinic?.name || "Select Clinic";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn("justify-between min-w-[200px]", className)}>
          <div className="flex items-center">
            <Building2 className="mr-2 h-4 w-4" />
            <span className="truncate">{displayText}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {showAllOption && (
          <DropdownMenuItem
            onClick={() => setSelectedClinic("all")}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span>All Clinics</span>
              {selectedClinic === "all" && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        )}
        {allClinics.map((clinic) => (
          <DropdownMenuItem
            key={clinic.id}
            onClick={() => setSelectedClinic(clinic)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span className="truncate">{clinic.name}</span>
              {selectedClinic !== "all" && selectedClinic?.id === clinic.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
