"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useClinic, type ClinicLocation } from "@/lib/clinic-context";

interface QuickAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    mode: 'specific' | 'recurring';
    dates?: string[];
    daysOfWeek?: number[];
    startTime: string;
    endTime: string;
    applyToAllClinics: boolean;
    clinicId?: number;
  }) => void;
  existingAvailability?: any[];
}

export default function QuickAvailabilityModal({
  isOpen,
  onClose,
  onSave,
  existingAvailability = []
}: QuickAvailabilityModalProps) {
  const { allClinics } = useClinic();
  const [mode, setMode] = useState<'specific' | 'recurring'>('specific');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [setAsRecurring, setSetAsRecurring] = useState(false);
  
  // Clinic selection states
  const [applyToAllClinics, setApplyToAllClinics] = useState(true);
  const [selectedClinicId, setSelectedClinicId] = useState<number | null>(null);
  
  // Initialize selectedClinicId when component mounts or clinics change
  useEffect(() => {
    if (!applyToAllClinics && !selectedClinicId && allClinics.length > 0) {
      setSelectedClinicId(allClinics[0].id);
    }
  }, [applyToAllClinics, allClinics]);
  
  // Drag selection states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDate, setDragStartDate] = useState<string | null>(null);
  const [dragAction, setDragAction] = useState<'select' | 'deselect'>('select');
  
  // Time picker states
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [startPeriod, setStartPeriod] = useState("AM");
  const [endHour, setEndHour] = useState("05");
  const [endMinute, setEndMinute] = useState("00");
  const [endPeriod, setEndPeriod] = useState("PM");

  const daysOfWeek = [
    { label: 'Sun', value: 0 },
    { label: 'Mon', value: 1 },
    { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 4 },
    { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 }
  ];

  const hours = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 1;
    return hour.toString().padStart(2, '0');
  });

  const minutes = ['00', '15', '30', '45'];
  const periods = ['AM', 'PM'];

  const convertTo24Hour = (hour: string, minute: string, period: string) => {
    let hour24 = parseInt(hour);
    if (period === 'PM' && hour24 !== 12) hour24 += 12;
    if (period === 'AM' && hour24 === 12) hour24 = 0;
    return `${hour24.toString().padStart(2, '0')}:${minute}:00`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const toggleDate = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDates(prev =>
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  const handleMouseDown = (day: number, dateStr: string, isPast: boolean) => {
    if (isPast) return;
    
    setIsDragging(true);
    setDragStartDate(dateStr);
    
    // Determine if we're selecting or deselecting based on the first clicked date
    const isCurrentlySelected = selectedDates.includes(dateStr);
    setDragAction(isCurrentlySelected ? 'deselect' : 'select');
    
    // Toggle the first date
    toggleDate(day);
  };

  const handleMouseEnter = (day: number, dateStr: string, isPast: boolean) => {
    if (!isDragging || isPast) return;
    
    const isSelected = selectedDates.includes(dateStr);
    
    // Apply the drag action consistently
    if (dragAction === 'select' && !isSelected) {
      setSelectedDates(prev => [...prev, dateStr]);
    } else if (dragAction === 'deselect' && isSelected) {
      setSelectedDates(prev => prev.filter(d => d !== dateStr));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStartDate(null);
  };

  // Add global mouse up listener to handle mouse up outside the calendar
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => {
        setIsDragging(false);
        setDragStartDate(null);
      };
      
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging]);

  const toggleDayOfWeek = (day: number) => {
    setSelectedDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleSave = () => {
    const startTime = convertTo24Hour(startHour, startMinute, startPeriod);
    const endTime = convertTo24Hour(endHour, endMinute, endPeriod);

    // Validate clinic selection
    if (!applyToAllClinics && !selectedClinicId) {
      alert('Please select a clinic or choose to apply to all clinics');
      return;
    }

    // Additional validation: ensure we have a valid clinic ID when not applying to all
    if (!applyToAllClinics && (selectedClinicId === null || selectedClinicId === undefined)) {
      alert('Please select a specific clinic from the dropdown');
      return;
    }

    if (mode === 'specific') {
      if (selectedDates.length === 0) {
        alert('Please select at least one date');
        return;
      }
      onSave({
        mode: 'specific',
        dates: selectedDates,
        startTime,
        endTime,
        applyToAllClinics,
        clinicId: applyToAllClinics ? undefined : selectedClinicId!
      });
    } else {
      if (selectedDaysOfWeek.length === 0) {
        alert('Please select at least one day of the week');
        return;
      }
      onSave({
        mode: 'recurring',
        daysOfWeek: selectedDaysOfWeek,
        startTime,
        endTime,
        applyToAllClinics,
        clinicId: applyToAllClinics ? undefined : selectedClinicId!
      });
    }
  };

  if (!isOpen) return null;

  const days = getDaysInMonth(currentMonth);
  const monthYear = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Set Availability</h2>
              <p className="text-sm text-gray-500">Choose specific dates or recurring days</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Clinic Selection */}
          <div className="mb-6 p-4 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-200">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-teal-600" />
              <h3 className="font-semibold text-teal-900">Clinic Location</h3>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-teal-200 cursor-pointer hover:bg-teal-50 transition-colors">
                <input
                  type="radio"
                  name="clinicScope"
                  checked={applyToAllClinics}
                  onChange={() => {
                    setApplyToAllClinics(true);
                    setSelectedClinicId(null);
                  }}
                  className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Apply to All Clinics</span>
                  <p className="text-xs text-gray-500">Your availability will be the same across all clinic locations</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-teal-200 cursor-pointer hover:bg-teal-50 transition-colors">
                <input
                  type="radio"
                  name="clinicScope"
                  checked={!applyToAllClinics}
                  onChange={() => setApplyToAllClinics(false)}
                  className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">Specific Clinic Only</span>
                  <p className="text-xs text-gray-500">Set availability for a specific clinic location</p>
                </div>
              </label>
              {!applyToAllClinics && (
                <select
                  value={selectedClinicId || ""}
                  onChange={(e) => setSelectedClinicId(Number(e.target.value))}
                  className="w-full mt-2 px-4 py-2.5 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="">Select a clinic...</option>
                  {allClinics.map((clinic: ClinicLocation) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name} - {clinic.address}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setMode('specific')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                mode === 'specific'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4 inline-block mr-2" />
              Specific Dates
            </button>
            <button
              onClick={() => setMode('recurring')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                mode === 'recurring'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-4 h-4 inline-block mr-2" />
              Days of Week
            </button>
          </div>

          {mode === 'specific' ? (
            /* Specific Dates Calendar */
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="text-base font-semibold">{monthYear}</h3>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-[10px] font-medium text-gray-500 py-1">
                    {day}
                  </div>
                ))}
                {days.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="h-8" />;
                  }
                  const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = selectedDates.includes(dateStr);
                  const isPast = new Date(dateStr) < new Date(new Date().setHours(0, 0, 0, 0));

                  return (
                    <button
                      key={day}
                      onMouseDown={() => handleMouseDown(day, dateStr, isPast)}
                      onMouseEnter={() => handleMouseEnter(day, dateStr, isPast)}
                      onMouseUp={handleMouseUp}
                      disabled={isPast}
                      className={`h-8 flex items-center justify-center rounded text-xs font-medium transition-all select-none ${
                        isPast
                          ? 'text-gray-300 cursor-not-allowed'
                          : isSelected
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm'
                          : 'hover:bg-emerald-50 text-gray-700'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              {selectedDates.length > 0 && (
                <p className="text-xs text-gray-600 mt-2">
                  {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
                </p>
              )}
              
              {/* Recurring Schedule Option */}
              <div className="mt-3 p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setAsRecurring}
                    onChange={(e) => setSetAsRecurring(e.target.checked)}
                    className="mt-0.5 w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-blue-900">Set as recurring schedule</span>
                      <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[9px] font-bold rounded-full">RECOMMENDED</span>
                    </div>
                    <p className="text-[10px] text-blue-700 mt-0.5">
                      Enable this to automatically apply your selected availability to all future months. You can update or change your schedule anytime.
                    </p>
                  </div>
                </label>
                {setAsRecurring && (
                  <div className="mt-1.5 p-1.5 bg-white rounded border border-blue-300 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-[10px] text-blue-800">
                      <strong>Set & Forget!</strong> Your availability will repeat every month automatically.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Days of Week Selector */
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">
                Select the days you're typically available. This schedule will repeat every week.
              </p>
              <div className="grid grid-cols-7 gap-2">
                {daysOfWeek.map(({ label, value }) => {
                  const isSelected = selectedDaysOfWeek.includes(value);
                  return (
                    <button
                      key={value}
                      onClick={() => toggleDayOfWeek(value)}
                      className={`py-4 rounded-lg font-medium transition-all ${
                        isSelected
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {selectedDaysOfWeek.length > 0 && (
                <p className="text-sm text-blue-600 mt-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse block" />
                  Recurring schedule: Every {selectedDaysOfWeek.map(d => daysOfWeek[d].label).join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Time Selection */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Working Hours</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <div className="flex gap-2">
                  <select
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {hours.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <select
                    value={startMinute}
                    onChange={(e) => setStartMinute(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {minutes.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={startPeriod}
                    onChange={(e) => setStartPeriod(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {periods.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                <div className="flex gap-2">
                  <select
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {hours.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <select
                    value={endMinute}
                    onChange={(e) => setEndMinute(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {minutes.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={endPeriod}
                    onChange={(e) => setEndPeriod(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {periods.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Duration: {(() => {
                const start = convertTo24Hour(startHour, startMinute, startPeriod);
                const end = convertTo24Hour(endHour, endMinute, endPeriod);
                const [startH, startM] = start.split(':').map(Number);
                const [endH, endM] = end.split(':').map(Number);
                const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                const hours = Math.floor(totalMinutes / 60);
                const mins = totalMinutes % 60;
                return `${hours}h ${mins}m`;
              })()}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/30"
            >
              Save Availability
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
