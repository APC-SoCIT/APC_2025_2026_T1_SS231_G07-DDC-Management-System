"use client"

import { useState, useEffect } from "react"
import { Camera } from "lucide-react"
import DentistCalendarAvailability from "@/components/dentist-calendar-availability"
import QuickAvailabilityModal from "@/components/quick-availability-modal"
import QuickAvailabilitySuccessModal from "@/components/quick-availability-success-modal"
import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import { useClinic } from "@/lib/clinic-context"

export default function OwnerProfile() {
  const { user, token, setUser } = useAuth()
  const { allClinics, selectedClinic } = useClinic()
  const [isEditing, setIsEditing] = useState(false)
  const [showQuickAvailability, setShowQuickAvailability] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successData, setSuccessData] = useState<{
    mode: 'specific' | 'recurring';
    dateCount?: number;
    daysOfWeek?: string[];
    monthYear?: string;
    startTime?: string;
    endTime?: string;
    clinicName?: string;
    dates?: string[];
  }>({ mode: 'specific' })
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthday: "",
    username: "",
  })

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        email: user.email || "",
        phone: user.phone || "",
        birthday: user.birthday || "",
        username: user.username || "",
      })
    }
  }, [user])

  const handleSave = async () => {
    if (!token || !user) return

    try {
      const updateData = {
        first_name: profile.firstName,
        last_name: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        birthday: profile.birthday,
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/users/${user.id}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) throw new Error("Failed to update profile")
      
      const updatedUser = await response.json()
      
      // Update the user in auth context with all fields
      setUser({
        ...user,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        birthday: updatedUser.birthday,
      })
      
      setIsEditing(false)
      alert("Profile updated successfully!")
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Failed to update profile.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-[var(--color-primary)]">My Profile</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
        <div className="flex items-center gap-6 mb-8">
          <div className="relative">
            <div className="w-24 h-24 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            {isEditing && (
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-[var(--color-accent)] rounded-full flex items-center justify-center text-white hover:bg-[var(--color-accent-dark)] transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-[var(--color-text)]">
              {user?.first_name} {user?.last_name}
            </h2>
            <p className="text-[var(--color-text-muted)]">Owner</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">First Name</label>
            <input
              type="text"
              value={profile.firstName}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Last Name</label>
            <input
              type="text"
              value={profile.lastName}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Username</label>
            <input
              type="text"
              value={profile.username}
              disabled={true}
              className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Phone</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Birthday</label>
            <input
              type="date"
              value={profile.birthday}
              onChange={(e) => setProfile({ ...profile, birthday: e.target.value })}
              disabled={!isEditing}
              className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50"
            />
          </div>
        </div>

        {isEditing && (
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsEditing(false)}
              className="px-6 py-2.5 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Calendar-Based Availability Schedule (Owner is also a dentist) */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-[var(--color-text)]">My Schedule</h2>
          <button
            onClick={() => setShowQuickAvailability(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Set Availability
          </button>
        </div>
        <DentistCalendarAvailability 
          dentistId={user?.id} 
          selectedClinicId={selectedClinic?.id || null}
        />
      </div>

      {/* Quick Availability Modal */}
      <QuickAvailabilityModal
        isOpen={showQuickAvailability}
        onClose={() => setShowQuickAvailability(false)}
        onSave={async (data) => {
          if (!token || !user) return;

          // Get clinic name for display
          const clinicName = data.applyToAllClinics 
            ? 'All Clinics' 
            : allClinics.find(c => c.id === data.clinicId)?.name || 'Selected Clinic';

          // Helper to format time for display
          const formatTimeDisplay = (time: string) => {
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${minutes} ${ampm}`;
          };

          try {
            if (data.mode === 'specific') {
              // Save specific dates
              const promises = data.dates!.map(date =>
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/dentist-availability/`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    dentist: user.id,
                    date,
                    start_time: data.startTime,
                    end_time: data.endTime,
                    apply_to_all_clinics: data.applyToAllClinics,
                    clinic_id: data.applyToAllClinics ? null : data.clinicId,
                  }),
                })
              );
              const responses = await Promise.all(promises);
              
              // Check if any requests failed
              const failedResponses = responses.filter(r => !r.ok);
              if (failedResponses.length > 0) {
                const errorDetails = await Promise.all(
                  failedResponses.map(async r => {
                    try {
                      return await r.json();
                    } catch {
                      return { error: r.statusText };
                    }
                  })
                );
                console.error('Failed to save some availability slots:', errorDetails);
                throw new Error(`Failed to save ${failedResponses.length} availability slot(s)`);
              }
              
              // Get month and year from first date
              const firstDate = new Date(data.dates![0]);
              const monthYear = firstDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              
              // Show success modal with more details
              setSuccessData({
                mode: 'specific',
                dateCount: data.dates!.length,
                monthYear,
                startTime: formatTimeDisplay(data.startTime),
                endTime: formatTimeDisplay(data.endTime),
                clinicName,
                dates: data.dates!.slice(0, 5) // Show first 5 dates
              });
              setShowQuickAvailability(false);
              setShowSuccessModal(true);
            } else {
              // Save recurring schedule (days of week)
              // Generate dates for the next 3 months based on selected days
              const dates: string[] = [];
              const today = new Date();
              const threeMonthsLater = new Date();
              threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

              let currentDate = new Date(today);
              while (currentDate <= threeMonthsLater) {
                if (data.daysOfWeek!.includes(currentDate.getDay())) {
                  dates.push(currentDate.toISOString().split('T')[0]);
                }
                currentDate.setDate(currentDate.getDate() + 1);
              }

              const promises = dates.map(date =>
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/dentist-availability/`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    dentist: user.id,
                    date,
                    start_time: data.startTime,
                    end_time: data.endTime,
                    apply_to_all_clinics: data.applyToAllClinics,
                    clinic_id: data.applyToAllClinics ? null : data.clinicId,
                  }),
                })
              );
              const responses = await Promise.all(promises);
              
              // Check if any requests failed
              const failedResponses = responses.filter(r => !r.ok);
              if (failedResponses.length > 0) {
                console.error(`Failed to save ${failedResponses.length} availability slots`);
                throw new Error(`Failed to save ${failedResponses.length} availability slot(s)`);
              }
              
              const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const selectedDayNames = data.daysOfWeek!.map(d => dayNames[d]);
              
              // Show success modal with more details
              setSuccessData({
                mode: 'recurring',
                dateCount: dates.length,
                daysOfWeek: selectedDayNames,
                startTime: formatTimeDisplay(data.startTime),
                endTime: formatTimeDisplay(data.endTime),
                clinicName
              });
              setShowQuickAvailability(false);
              setShowSuccessModal(true);
            }
            // NOTE: Do NOT reload here - let the success modal display first
            // The reload happens when user closes the success modal
          } catch (error) {
            console.error('Error saving availability:', error);
            alert('Failed to save availability. Please try again.');
          }
        }}
      />
      
      {/* Success Modal */}
      <QuickAvailabilitySuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          window.location.reload();
        }}
        mode={successData.mode}
        dateCount={successData.dateCount}
        daysOfWeek={successData.daysOfWeek}
        monthYear={successData.monthYear}
        startTime={successData.startTime}
        endTime={successData.endTime}
        clinicName={successData.clinicName}
        dates={successData.dates}
      />
    </div>
  )
}
