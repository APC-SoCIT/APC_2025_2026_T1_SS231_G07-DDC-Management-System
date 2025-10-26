"use client"

import { useState } from "react"
import { Download, FileJson, FileText } from "lucide-react"
import { exportPatientRecords } from "@/lib/export"

interface ExportButtonProps {
  patientId: number
  patientName?: string
  variant?: "button" | "icon"
  className?: string
}

export default function ExportButton({
  patientId,
  patientName = "Patient",
  variant = "button",
  className = "",
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const handleExport = async (format: "json" | "text") => {
    setIsExporting(true)
    setShowMenu(false)

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        alert("Authentication required")
        return
      }

      const result = await exportPatientRecords(patientId, token, format)

      if (result.success) {
        alert(result.message)
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error("Export error:", error)
      alert("Failed to export records")
    } finally {
      setIsExporting(false)
    }
  }

  if (variant === "icon") {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          disabled={isExporting}
          className={`p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 ${className}`}
          title="Export Records"
        >
          <Download className="w-5 h-5" />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
              <button
                onClick={() => handleExport("text")}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left rounded-t-lg"
              >
                <FileText className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-900">Export as Text</span>
              </button>
              <button
                onClick={() => handleExport("json")}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left rounded-b-lg border-t border-gray-100"
              >
                <FileJson className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-900">Export as JSON</span>
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 ${className}`}
      >
        <Download className="w-4 h-4" />
        {isExporting ? "Exporting..." : "Export Records"}
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-2">
              <p className="text-xs text-gray-500 px-2 py-1 mb-1">
                Choose export format:
              </p>
              <button
                onClick={() => handleExport("text")}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left rounded-lg"
              >
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Text File</p>
                  <p className="text-xs text-gray-500">Formatted, human-readable</p>
                </div>
              </button>
              <button
                onClick={() => handleExport("json")}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left rounded-lg"
              >
                <FileJson className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">JSON File</p>
                  <p className="text-xs text-gray-500">Structured data format</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
