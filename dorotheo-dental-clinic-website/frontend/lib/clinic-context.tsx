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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const url = `${apiUrl}/api/locations/`;
      console.log('[ClinicContext] Fetching clinics from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      console.log('[ClinicContext] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[ClinicContext] Loaded clinics:', data);
        // Handle both paginated response {results: [...]} and direct array
        const clinics = Array.isArray(data) ? data : (data.results || []);
        setAllClinics(clinics);
        
        // Load selected clinic from localStorage
        const savedClinicId = localStorage.getItem('selectedClinicId');
        if (savedClinicId === 'all') {
          setSelectedClinicState('all');
        } else if (savedClinicId) {
          const clinic = clinics.find((c: ClinicLocation) => c.id === parseInt(savedClinicId));
          if (clinic) {
            setSelectedClinicState(clinic);
          } else if (clinics.length > 0) {
            // If saved clinic not found, default to "all"
            setSelectedClinicState('all');
          }
        } else if (clinics.length > 0) {
          // No saved selection, default to "all"
          setSelectedClinicState('all');
        }
      } else {
        console.error('[ClinicContext] Failed to load clinics, status:', response.status);
        const text = await response.text();
        console.error('[ClinicContext] Response:', text);
      }
    } catch (error) {
      console.error('[ClinicContext] Error loading clinics:', error);
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
