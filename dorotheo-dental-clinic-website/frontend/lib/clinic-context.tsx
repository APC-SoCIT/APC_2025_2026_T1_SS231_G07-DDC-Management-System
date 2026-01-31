"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ClinicLocation {
  id: number;
  name: string;
  address: string;
  phone: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface ClinicContextType {
  selectedClinic: ClinicLocation | "all" | null;
  allClinics: ClinicLocation[];
  setSelectedClinic: (clinic: ClinicLocation | "all") => void;
  isLoading: boolean;
  refreshClinics: () => Promise<void>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [selectedClinic, setSelectedClinicState] = useState<ClinicLocation | "all" | null>(null);
  const [allClinics, setAllClinics] = useState<ClinicLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load clinics from API
  const loadClinics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clinics/`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAllClinics(data);
        
        // Load selected clinic from localStorage
        const savedClinicId = localStorage.getItem('selectedClinicId');
        if (savedClinicId === 'all') {
          setSelectedClinicState('all');
        } else if (savedClinicId) {
          const clinic = data.find((c: ClinicLocation) => c.id === parseInt(savedClinicId));
          if (clinic) {
            setSelectedClinicState(clinic);
          } else if (data.length > 0) {
            // If saved clinic not found, default to first clinic
            setSelectedClinicState(data[0]);
          }
        } else if (data.length > 0) {
          // No saved selection, default to first clinic
          setSelectedClinicState(data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading clinics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClinics();
  }, []);

  const setSelectedClinic = (clinic: ClinicLocation | "all") => {
    setSelectedClinicState(clinic);
    
    // Save to localStorage
    if (clinic === "all") {
      localStorage.setItem('selectedClinicId', 'all');
    } else {
      localStorage.setItem('selectedClinicId', clinic.id.toString());
    }
  };

  const refreshClinics = async () => {
    await loadClinics();
  };

  return (
    <ClinicContext.Provider
      value={{
        selectedClinic,
        allClinics,
        setSelectedClinic,
        isLoading,
        refreshClinics,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (context === undefined) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
}
