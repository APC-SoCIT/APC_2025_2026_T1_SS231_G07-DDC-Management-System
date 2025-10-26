"use client"

import { useState } from "react"

interface ToothData {
  number: number
  status: "healthy" | "cavity" | "filled" | "missing" | "root-canal" | "crown"
  notes?: string
}

const defaultTeeth: ToothData[] = Array.from({ length: 32 }, (_, i) => ({
  number: i + 1,
  status: "healthy",
}))

const statusLabels = {
  healthy: "Healthy",
  cavity: "Cavity",
  filled: "Filled",
  missing: "Missing",
  "root-canal": "Root Canal",
  crown: "Crown",
}

// Tooth names according to dental chart
const toothNames: Record<number, string> = {
  1: "3rd Molar (wisdom tooth)",
  2: "2nd Molar (12-yr molar)",
  3: "1st Molar (6-yr molar)",
  4: "2nd Bicuspid (2nd premolar)",
  5: "1st Bicuspid (1st premolar)",
  6: "Cuspid (canine/eye tooth)",
  7: "Lateral incisor",
  8: "Central incisor",
  9: "Central incisor",
  10: "Lateral incisor",
  11: "Cuspid (canine/eye tooth)",
  12: "1st Bicuspid (1st premolar)",
  13: "2nd Bicuspid (2nd premolar)",
  14: "1st Molar (6-yr molar)",
  15: "2nd Molar (12-yr molar)",
  16: "3rd Molar (wisdom tooth)",
  17: "3rd Molar (wisdom tooth)",
  18: "2nd Molar (12-yr molar)",
  19: "1st Molar (6-yr molar)",
  20: "2nd Bicuspid (2nd premolar)",
  21: "1st Bicuspid (1st premolar)",
  22: "Cuspid (canine/eye tooth)",
  23: "Lateral incisor",
  24: "Central incisor",
  25: "Central incisor",
  26: "Lateral incisor",
  27: "Cuspid (canine/eye tooth)",
  28: "1st Bicuspid (1st premolar)",
  29: "2nd Bicuspid (2nd premolar)",
  30: "1st Molar (6-yr molar)",
  31: "2nd Molar (12-yr molar)",
  32: "3rd Molar (wisdom tooth)",
}

export default function InteractiveToothChart() {
  const [teeth, setTeeth] = useState<ToothData[]>(defaultTeeth)
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null)

  const updateToothStatus = (number: number, status: ToothData["status"]) => {
    setTeeth((prev) =>
      prev.map((tooth) => (tooth.number === number ? { ...tooth, status } : tooth))
    )
  }

  const getToothByNumber = (number: number) => teeth.find((t) => t.number === number)

  // Simple rounded tooth component
  const SimpleTooth = ({ 
    number, 
    status, 
    onClick 
  }: { 
    number: number; 
    status: ToothData["status"]; 
    onClick: (n: number) => void 
  }) => {
    const bgColor = status === "healthy" ? "#ffffff" : 
                   status === "cavity" ? "#fee" :
                   status === "filled" ? "#eff6ff" :
                   status === "missing" ? "#f3f4f6" :
                   status === "root-canal" ? "#fef9e7" : "#f3e5f5"
    
    const borderColor = status === "healthy" ? "#d1d5db" :
                       status === "cavity" ? "#f87171" :
                       status === "filled" ? "#60a5fa" :
                       status === "missing" ? "#9ca3af" :
                       status === "root-canal" ? "#fbbf24" : "#c084fc"

    return (
      <div
        className="cursor-pointer hover:scale-110 transition-transform flex items-center justify-center rounded-full shadow-sm"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: bgColor,
          border: `3px solid ${borderColor}`,
        }}
        onClick={() => onClick(number)}
      >
        <span className="text-sm font-bold text-gray-700">{number}</span>
      </div>
    )
  }

  // Position teeth in an arch formation
  const getToothPosition = (number: number) => {
    // Upper arch (teeth 1-16) - right to left
    const upperPositions: Record<number, { x: number; y: number }> = {
      1: { x: 260, y: 95 },
      2: { x: 235, y: 75 },
      3: { x: 210, y: 60 },
      4: { x: 183, y: 48 },
      5: { x: 155, y: 40 },
      6: { x: 127, y: 35 },
      7: { x: 100, y: 32 },
      8: { x: 73, y: 30 },
      9: { x: 46, y: 30 },
      10: { x: 19, y: 32 },
      11: { x: -8, y: 35 },
      12: { x: -36, y: 40 },
      13: { x: -64, y: 48 },
      14: { x: -91, y: 60 },
      15: { x: -116, y: 75 },
      16: { x: -141, y: 95 },
    }

    // Lower arch (teeth 17-32) - left to right
    const lowerPositions: Record<number, { x: number; y: number }> = {
      17: { x: -141, y: 185 },
      18: { x: -116, y: 205 },
      19: { x: -91, y: 220 },
      20: { x: -64, y: 232 },
      21: { x: -36, y: 240 },
      22: { x: -8, y: 245 },
      23: { x: 19, y: 248 },
      24: { x: 46, y: 250 },
      25: { x: 73, y: 250 },
      26: { x: 100, y: 248 },
      27: { x: 127, y: 245 },
      28: { x: 155, y: 240 },
      29: { x: 183, y: 232 },
      30: { x: 210, y: 220 },
      31: { x: 235, y: 205 },
      32: { x: 260, y: 185 },
    }

    return number <= 16 ? upperPositions[number] : lowerPositions[number]
  }

  const selectedToothData = selectedTooth ? getToothByNumber(selectedTooth) : null

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 shadow-lg">
      <h2 className="text-3xl font-bold text-center text-gray-700 mb-8">
        TOOTH CHART
      </h2>

      {/* Main Chart Container */}
      <div className="bg-blue-200 rounded-xl p-8 relative">
        <div className="flex gap-8">
          {/* Left Legend */}
          <div className="flex-shrink-0 w-64 text-sm space-y-1">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
              <div key={num} className="text-gray-700">
                <span className="font-semibold">{num}.</span> {toothNames[num]}
              </div>
            ))}
            <div className="h-8"></div>
            {[25, 26, 27, 28, 29, 30, 31, 32].map((num) => (
              <div key={num} className="text-gray-700">
                <span className="font-semibold">{num}.</span> {toothNames[num]}
              </div>
            ))}
          </div>

          {/* Center - Tooth Chart */}
          <div className="flex-1 relative" style={{ height: '400px' }}>
            {/* Upper arch background */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-96 h-32 bg-pink-200 rounded-t-full"></div>
            
            {/* Lower arch background */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-80 h-32 bg-pink-200 rounded-b-full"></div>

            {/* All teeth positioned */}
            {teeth.map((tooth) => {
              const pos = getToothPosition(tooth.number)
              return (
                <div
                  key={tooth.number}
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '0',
                    transform: `translate(calc(-50% + ${pos.x}px), ${pos.y}px)`,
                    width: '45px',
                    height: '45px',
                  }}
                >
                  <SimpleTooth
                    number={tooth.number}
                    status={tooth.status}
                    onClick={setSelectedTooth}
                  />
                </div>
              )
            })}
          </div>

          {/* Right Legend */}
          <div className="flex-shrink-0 w-64 text-sm space-y-1">
            {[9, 10, 11, 12, 13, 14, 15, 16].map((num) => (
              <div key={num} className="text-gray-700">
                <span className="font-semibold">{num}.</span> {toothNames[num]}
              </div>
            ))}
            <div className="h-8"></div>
            {[17, 18, 19, 20, 21, 22, 23, 24].map((num) => (
              <div key={num} className="text-gray-700">
                <span className="font-semibold">{num}.</span> {toothNames[num]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        {Object.entries(statusLabels).map(([status, label]) => (
          <div key={status} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full border-2" style={{
              backgroundColor: status === "healthy" ? "#fff" : 
                            status === "cavity" ? "#fee" :
                            status === "filled" ? "#eff6ff" :
                            status === "missing" ? "#f3f4f6" :
                            status === "root-canal" ? "#fef9e7" : "#f3e5f5",
              borderColor: status === "healthy" ? "#d1d5db" :
                          status === "cavity" ? "#f87171" :
                          status === "filled" ? "#60a5fa" :
                          status === "missing" ? "#9ca3af" :
                          status === "root-canal" ? "#fbbf24" : "#c084fc"
            }} />
            <span className="text-sm text-gray-700">{label}</span>
          </div>
        ))}
      </div>

      {/* Tooth Details Panel */}
      {selectedToothData && (
        <div className="mt-6 p-4 bg-white rounded-xl border-2 border-[var(--color-primary)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-primary)]">
                Tooth #{selectedToothData.number}
              </h3>
              <p className="text-sm text-gray-600">{toothNames[selectedToothData.number]}</p>
            </div>
            <button
              onClick={() => setSelectedTooth(null)}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Status: <span className="text-[var(--color-primary)]">{statusLabels[selectedToothData.status]}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(statusLabels) as Array<keyof typeof statusLabels>).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateToothStatus(selectedToothData.number, status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedToothData.status === status
                        ? "bg-[var(--color-primary)] text-white shadow-md"
                        : "bg-white text-gray-700 border border-gray-300 hover:border-[var(--color-primary)]"
                    }`}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!selectedTooth && (
        <div className="mt-6 p-4 bg-white rounded-xl border-2 border-blue-300">
          <p className="text-sm text-gray-700 text-center">
            💡 <strong>Click on any tooth</strong> to view details and update its status
          </p>
        </div>
      )}
    </div>
  )
}
