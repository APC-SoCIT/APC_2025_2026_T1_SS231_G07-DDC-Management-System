"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react"

interface InventoryAnalyticsContextType {
  /** Increments every time an inventory mutation (create/update/delete) succeeds. */
  inventoryVersion: number
  /** Call this after any successful inventory mutation to trigger analytics refetch. */
  notifyInventoryChanged: () => void
}

const InventoryAnalyticsContext = createContext<InventoryAnalyticsContextType | undefined>(undefined)

export function InventoryAnalyticsProvider({ children }: { children: ReactNode }) {
  const [inventoryVersion, setInventoryVersion] = useState(0)

  const notifyInventoryChanged = useCallback(() => {
    setInventoryVersion((v) => v + 1)
  }, [])

  return (
    <InventoryAnalyticsContext.Provider value={{ inventoryVersion, notifyInventoryChanged }}>
      {children}
    </InventoryAnalyticsContext.Provider>
  )
}

export function useInventoryAnalytics(): InventoryAnalyticsContextType {
  const ctx = useContext(InventoryAnalyticsContext)
  if (!ctx) {
    throw new Error("useInventoryAnalytics must be used within an InventoryAnalyticsProvider")
  }
  return ctx
}
