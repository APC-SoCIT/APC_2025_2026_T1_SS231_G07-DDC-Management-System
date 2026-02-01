"use client";

import React from "react";
import { CheckCircle, Calendar, Clock, X, Sparkles, MapPin } from "lucide-react";

interface QuickAvailabilitySuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'specific' | 'recurring';
  dateCount?: number;
  daysOfWeek?: string[];
  monthYear?: string;
  startTime?: string;
  endTime?: string;
  clinicName?: string;
  dates?: string[];
}

export default function QuickAvailabilitySuccessModal({
  isOpen,
  onClose,
  mode,
  dateCount = 0,
  daysOfWeek = [],
  monthYear = '',
  startTime = '',
  endTime = '',
  clinicName = '',
  dates = []
}: QuickAvailabilitySuccessModalProps) {
  if (!isOpen) return null;

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden">
        {/* Sparkle decorations */}
        <div className="absolute top-4 right-12 text-emerald-200 animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="absolute bottom-4 left-4 text-teal-200 animate-pulse delay-75">
          <Sparkles className="w-5 h-5" />
        </div>
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mb-6 shadow-lg animate-bounce">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>

          {/* Success Message */}
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Success! 🎉
          </h2>
          
          <p className="text-lg text-gray-700 mb-4">
            Your availability has been set for
          </p>

          {mode === 'specific' ? (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm mb-3">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-gray-900">
                  {dateCount} {dateCount === 1 ? 'date' : 'dates'} in {monthYear}
                </span>
              </div>

              {/* Show selected dates */}
              {dates.length > 0 && (
                <div className="mt-3 mb-4">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {dates.map((date, index) => (
                      <span key={index} className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-medium">
                        {formatDate(date)}
                      </span>
                    ))}
                    {dateCount > 5 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                        +{dateCount - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm mb-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-900">
                  Every {daysOfWeek.join(', ')}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Applied to the next 3 months ({dateCount} dates total)
              </p>
            </>
          )}

          {/* Time and Clinic Info */}
          <div className="mt-4 p-4 bg-white/80 rounded-lg space-y-3">
            {/* Working Hours */}
            {startTime && endTime && (
              <div className="flex items-center justify-center gap-2 text-gray-700">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">Working Hours:</span>
                <span>{startTime} - {endTime}</span>
              </div>
            )}

            {/* Clinic Location */}
            {clinicName && (
              <div className="flex items-center justify-center gap-2 text-gray-700">
                <MapPin className="w-4 h-4 text-teal-600" />
                <span className="font-medium">Clinic:</span>
                <span>{clinicName}</span>
              </div>
            )}

            <p className="text-sm text-gray-600 pt-2 border-t border-gray-200">
              Patients can now book appointments during your available hours!
            </p>
          </div>

          {/* OK Button */}
          <button
            onClick={onClose}
            className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
