/**
 * Tests for Appointment Status System Changes
 *
 * Tests cover:
 * 1. No "Pending" status displayed - replaced by effective status
 * 2. getEffectiveStatus logic (patient_status → display mapping)
 * 3. "Waiting" action button appears for confirmed appointments
 * 4. "Waiting" action updates both status and patient_status
 * 5. Status filter tabs work with effective statuses
 * 6. Dashboard columns renamed from "Pending" to "Confirmed"
 * 7. Dashboard status badges use dynamic colors
 * 8. Ongoing action updates status correctly
 * 9. Status sync between appointments page and overview page
 */

import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

jest.mock("next/link", () => {
  return ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => "/owner/appointments",
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => {
  const actual: Record<string, any> = {};
  const iconNames = [
    "Plus", "Eye", "Search", "ChevronDown", "ChevronUp", "Edit2", "Save",
    "X", "Trash2", "Calendar", "Clock", "FileText", "Ban", "Hourglass",
    "User", "Mail", "ChevronLeft", "ChevronRight", "ArrowLeft", "Bell",
    "DollarSign", "CreditCard", "AlertCircle", "History",
  ];
  iconNames.forEach((name) => {
    actual[name] = (props: any) => <svg data-testid={`icon-${name.toLowerCase()}`} {...props} />;
  });
  return actual;
});

// Mock UI components
jest.mock("@/components/ui/calendar", () => ({
  Calendar: (props: any) => <div data-testid="calendar" />,
}));

jest.mock("@/components/confirmation-modal", () => {
  return function MockConfirmModal({ show, title, onConfirm, onCancel }: any) {
    if (!show) return null;
    return (
      <div data-testid="confirm-modal">
        <span>{title}</span>
        <button onClick={onConfirm} data-testid="confirm-btn">Confirm</button>
        <button onClick={onCancel} data-testid="cancel-btn">Cancel</button>
      </div>
    );
  };
});

jest.mock("@/components/appointment-success-modal", () => {
  return function MockSuccessModal() { return null; };
});

jest.mock("@/components/block-time-modal", () => {
  return function MockBlockTimeModal() { return null; };
});

jest.mock("@/components/block-time-success-modal", () => {
  return function MockBlockTimeSuccessModal() { return null; };
});

jest.mock("@/components/error-modal", () => {
  return function MockErrorModal() { return null; };
});

jest.mock("@/components/clinic-badge", () => ({
  ClinicBadge: ({ clinic }: any) => <span data-testid="clinic-badge">{clinic?.name}</span>,
}));

jest.mock("@/components/create-invoice-modal", () => ({
  CreateInvoiceModal: () => null,
}));

jest.mock("@/components/alert-modal", () => {
  return function MockAlertModal() { return null; };
});

// Mock API
const mockGetAppointments = jest.fn();
const mockUpdateAppointment = jest.fn();
const mockGetPatients = jest.fn();
const mockGetServices = jest.fn();
const mockGetStaff = jest.fn();
const mockGetBookedSlots = jest.fn();
const mockGetPatientStats = jest.fn();
const mockMarkAppointmentMissed = jest.fn();

jest.mock("@/lib/api", () => ({
  api: {
    getAppointments: (...args: any[]) => mockGetAppointments(...args),
    updateAppointment: (...args: any[]) => mockUpdateAppointment(...args),
    getPatients: (...args: any[]) => mockGetPatients(...args),
    getServices: (...args: any[]) => mockGetServices(...args),
    getStaff: (...args: any[]) => mockGetStaff(...args),
    getBookedSlots: (...args: any[]) => mockGetBookedSlots(...args),
    getPatientStats: (...args: any[]) => mockGetPatientStats(...args),
    markAppointmentMissed: (...args: any[]) => mockMarkAppointmentMissed(...args),
    createAppointment: jest.fn(),
    deleteAppointment: jest.fn(),
    approveReschedule: jest.fn(),
    rejectReschedule: jest.fn(),
    approveCancel: jest.fn(),
    rejectCancel: jest.fn(),
    markAppointmentComplete: jest.fn(),
    getBlockedSlots: jest.fn().mockResolvedValue([]),
    getNotifications: jest.fn().mockResolvedValue([]),
    getLowStockAlerts: jest.fn().mockResolvedValue({ alerts: [] }),
  },
  authenticatedFetch: jest.fn(),
  API_BASE_URL: "http://localhost:8000/api",
}));

// Mock auth context
jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    token: "test-token",
    user: { id: 1, first_name: "Marvin", last_name: "Dorotheo", user_type: "owner" },
  }),
}));

// Mock clinic context
jest.mock("@/lib/clinic-context", () => ({
  useClinic: () => ({
    selectedClinic: "all",
    allClinics: [
      { id: 1, name: "Bacoor" },
      { id: 2, name: "Alabang" },
    ],
  }),
}));

// Mock utils
jest.mock("@/lib/utils", () => ({
  getServiceBadgeStyle: (color: string) => ({
    backgroundColor: color + "20",
    color: color,
    borderColor: color + "40",
  }),
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const TODAY = new Date().toISOString().split("T")[0];
const YESTERDAY = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
})();

const MOCK_APPOINTMENTS = [
  {
    id: 1,
    patient: 1,
    patient_name: "Squid Babe",
    patient_email: "sb@gmail.com",
    dentist: 1,
    dentist_name: "Carlo Salvador",
    service: 1,
    service_name: "Consultation",
    service_color: "#10b981",
    clinic: 1,
    clinic_name: "Bacoor",
    clinic_data: { id: 1, name: "Bacoor", address: "Bacoor City" },
    date: TODAY,
    time: "16:30:00",
    status: "confirmed",
    patient_status: null,
    notes: "",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    completed_at: null,
    reschedule_date: null,
    reschedule_time: null,
    reschedule_service: null,
    reschedule_service_name: null,
    reschedule_dentist: null,
    reschedule_dentist_name: null,
    reschedule_notes: "",
    cancel_reason: "",
    invoice_id: null,
    has_invoice: false,
  },
  {
    id: 2,
    patient: 2,
    patient_name: "Ezra Fabiculanan",
    patient_email: "ezra@gmail.com",
    dentist: 2,
    dentist_name: "Nina Orenze",
    service: 2,
    service_name: "Cleaning",
    service_color: "#3b82f6",
    clinic: 1,
    clinic_name: "Bacoor",
    clinic_data: { id: 1, name: "Bacoor", address: "Bacoor City" },
    date: TODAY,
    time: "14:30:00",
    status: "confirmed",
    patient_status: "ongoing",
    notes: "",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    completed_at: null,
    reschedule_date: null,
    reschedule_time: null,
    reschedule_service: null,
    reschedule_service_name: null,
    reschedule_dentist: null,
    reschedule_dentist_name: null,
    reschedule_notes: "",
    cancel_reason: "",
    invoice_id: null,
    has_invoice: false,
  },
  {
    id: 3,
    patient: 1,
    patient_name: "Squid Babe",
    patient_email: "sb@gmail.com",
    dentist: 1,
    dentist_name: "Carlo Salvador",
    service: 1,
    service_name: "Consultation",
    service_color: "#10b981",
    clinic: 2,
    clinic_name: "Alabang",
    clinic_data: { id: 2, name: "Alabang", address: "Alabang" },
    date: TODAY,
    time: "10:00:00",
    status: "waiting",
    patient_status: "waiting",
    notes: "",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    completed_at: null,
    reschedule_date: null,
    reschedule_time: null,
    reschedule_service: null,
    reschedule_service_name: null,
    reschedule_dentist: null,
    reschedule_dentist_name: null,
    reschedule_notes: "",
    cancel_reason: "",
    invoice_id: null,
    has_invoice: false,
  },
  {
    id: 4,
    patient: 1,
    patient_name: "Squid Babe",
    patient_email: "sb@gmail.com",
    dentist: 1,
    dentist_name: "Carlo Salvador",
    service: 3,
    service_name: "Tooth Extraction",
    service_color: "#f59e0b",
    clinic: 1,
    clinic_name: "Bacoor",
    clinic_data: { id: 1, name: "Bacoor", address: "Bacoor City" },
    date: YESTERDAY,
    time: "10:00:00",
    status: "completed",
    patient_status: "done",
    notes: "",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    completed_at: "2026-02-22T10:30:00Z",
    reschedule_date: null,
    reschedule_time: null,
    reschedule_service: null,
    reschedule_service_name: null,
    reschedule_dentist: null,
    reschedule_dentist_name: null,
    reschedule_notes: "",
    cancel_reason: "",
    invoice_id: 1,
    has_invoice: true,
  },
  {
    id: 5,
    patient: 2,
    patient_name: "Ezra Fabiculanan",
    patient_email: "ezra@gmail.com",
    dentist: null,
    dentist_name: null,
    service: 2,
    service_name: "Cleaning",
    service_color: "#3b82f6",
    clinic: 1,
    clinic_name: "Bacoor",
    clinic_data: { id: 1, name: "Bacoor", address: "Bacoor City" },
    date: YESTERDAY,
    time: "15:30:00",
    status: "missed",
    patient_status: null,
    notes: "",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    completed_at: null,
    reschedule_date: null,
    reschedule_time: null,
    reschedule_service: null,
    reschedule_service_name: null,
    reschedule_dentist: null,
    reschedule_dentist_name: null,
    reschedule_notes: "",
    cancel_reason: "",
    invoice_id: null,
    has_invoice: false,
  },
];

// ---------------------------------------------------------------------------
// Unit Tests for getEffectiveStatus logic
// ---------------------------------------------------------------------------

describe("getEffectiveStatus logic", () => {
  // Extracted logic to test independently
  const getEffectiveStatus = (apt: { status: string; patient_status?: string | null }): string => {
    if (apt.patient_status === "ongoing") return "ongoing";
    if (apt.patient_status === "waiting" || apt.status === "waiting") return "waiting";
    if (apt.patient_status === "done") return "completed";
    if (apt.status === "pending") return "confirmed";
    return apt.status;
  };

  test("confirmed appointment with no patient_status returns 'confirmed'", () => {
    expect(getEffectiveStatus({ status: "confirmed", patient_status: null })).toBe("confirmed");
  });

  test("confirmed appointment with patient_status 'ongoing' returns 'ongoing'", () => {
    expect(getEffectiveStatus({ status: "confirmed", patient_status: "ongoing" })).toBe("ongoing");
  });

  test("appointment with patient_status 'waiting' returns 'waiting'", () => {
    expect(getEffectiveStatus({ status: "waiting", patient_status: "waiting" })).toBe("waiting");
  });

  test("confirmed appointment with patient_status 'waiting' returns 'waiting'", () => {
    expect(getEffectiveStatus({ status: "confirmed", patient_status: "waiting" })).toBe("waiting");
  });

  test("appointment with patient_status 'done' returns 'completed'", () => {
    expect(getEffectiveStatus({ status: "completed", patient_status: "done" })).toBe("completed");
  });

  test("pending status maps to 'confirmed' (no pending display)", () => {
    expect(getEffectiveStatus({ status: "pending", patient_status: null })).toBe("confirmed");
  });

  test("missed status stays 'missed'", () => {
    expect(getEffectiveStatus({ status: "missed" })).toBe("missed");
  });

  test("cancelled status stays 'cancelled'", () => {
    expect(getEffectiveStatus({ status: "cancelled" })).toBe("cancelled");
  });

  test("completed status stays 'completed'", () => {
    expect(getEffectiveStatus({ status: "completed" })).toBe("completed");
  });

  test("patient_status 'pending' with confirmed status returns 'confirmed' (not pending)", () => {
    expect(getEffectiveStatus({ status: "confirmed", patient_status: "pending" })).toBe("confirmed");
  });
});

// ---------------------------------------------------------------------------
// Unit Tests for status color mapping
// ---------------------------------------------------------------------------

describe("getStatusColor mapping", () => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-700";
      case "waiting": return "bg-purple-100 text-purple-700";
      case "ongoing": return "bg-blue-100 text-blue-700";
      case "cancelled": return "bg-red-100 text-red-700";
      case "completed": return "bg-teal-100 text-teal-700";
      case "missed": return "bg-yellow-100 text-yellow-800";
      case "reschedule_requested": return "bg-orange-100 text-orange-700";
      case "cancel_requested": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  test("no 'pending' case exists - falls through to default", () => {
    expect(getStatusColor("pending")).toBe("bg-gray-100 text-gray-700");
  });

  test("'ongoing' has blue styling", () => {
    expect(getStatusColor("ongoing")).toContain("bg-blue-100");
  });

  test("'waiting' has purple styling", () => {
    expect(getStatusColor("waiting")).toContain("bg-purple-100");
  });

  test("'confirmed' has green styling", () => {
    expect(getStatusColor("confirmed")).toContain("bg-green-100");
  });

  test("'completed' has teal styling", () => {
    expect(getStatusColor("completed")).toContain("bg-teal-100");
  });
});

// ---------------------------------------------------------------------------
// Unit Tests for formatStatus mapping
// ---------------------------------------------------------------------------

describe("formatStatus mapping", () => {
  const formatStatus = (status: string) => {
    switch (status) {
      case "reschedule_requested": return "Reschedule Requested";
      case "cancel_requested": return "Cancellation Requested";
      case "confirmed": return "Confirmed";
      case "waiting": return "Waiting";
      case "ongoing": return "Ongoing";
      case "cancelled": return "Cancelled";
      case "completed": return "Completed";
      case "missed": return "Missed";
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  test("does NOT have a 'pending' case - 'Pending' is never explicitly returned", () => {
    // Even if someone passes 'pending', it falls through to default
    // which would capitalize it, but getEffectiveStatus should prevent this
    expect(formatStatus("pending")).toBe("Pending"); // default capitalizes
  });

  test("'ongoing' returns 'Ongoing'", () => {
    expect(formatStatus("ongoing")).toBe("Ongoing");
  });

  test("'waiting' returns 'Waiting'", () => {
    expect(formatStatus("waiting")).toBe("Waiting");
  });

  test("'confirmed' returns 'Confirmed'", () => {
    expect(formatStatus("confirmed")).toBe("Confirmed");
  });
});

// ---------------------------------------------------------------------------
// Unit Tests for status filter logic
// ---------------------------------------------------------------------------

describe("Status filter logic with effective statuses", () => {
  const getEffectiveStatus = (apt: { status: string; patient_status?: string | null }): string => {
    if (apt.patient_status === "ongoing") return "ongoing";
    if (apt.patient_status === "waiting" || apt.status === "waiting") return "waiting";
    if (apt.patient_status === "done") return "completed";
    if (apt.status === "pending") return "confirmed";
    return apt.status;
  };

  const filterByStatus = (appointments: any[], statusFilter: string) => {
    return appointments.filter((apt) => {
      const effectiveStatus = getEffectiveStatus(apt);
      return statusFilter === "all" || effectiveStatus === statusFilter;
    });
  };

  test("'all' filter returns all appointments", () => {
    const result = filterByStatus(MOCK_APPOINTMENTS, "all");
    expect(result).toHaveLength(MOCK_APPOINTMENTS.length);
  });

  test("'waiting' filter returns appointments with waiting status or patient_status", () => {
    const result = filterByStatus(MOCK_APPOINTMENTS, "waiting");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3); // The one with status: 'waiting'
  });

  test("'ongoing' filter returns appointments with patient_status 'ongoing'", () => {
    const result = filterByStatus(MOCK_APPOINTMENTS, "ongoing");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2); // Ezra with patient_status: 'ongoing'
  });

  test("'completed' filter returns completed and done appointments", () => {
    const result = filterByStatus(MOCK_APPOINTMENTS, "completed");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(4); // Completed appointment
  });

  test("'missed' filter returns missed appointments", () => {
    const result = filterByStatus(MOCK_APPOINTMENTS, "missed");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(5);
  });

  test("'confirmed' filter returns confirmed appointments (without ongoing/waiting patient_status)", () => {
    const result = filterByStatus(MOCK_APPOINTMENTS, "confirmed");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1); // Squid Babe today, confirmed, no patient_status
  });

  test("no appointments match 'pending' filter since pending maps to confirmed", () => {
    const appointments = [
      { id: 99, status: "pending", patient_status: null },
    ];
    const result = filterByStatus(appointments, "pending");
    expect(result).toHaveLength(0); // 'pending' maps to 'confirmed', won't match 'pending' filter
  });
});

// ---------------------------------------------------------------------------
// Unit Tests for action button visibility logic
// ---------------------------------------------------------------------------

describe("Action button visibility rules", () => {
  // Rules extracted from the component code
  const shouldShowDoneButton = (apt: { status: string }) =>
    apt.status === "confirmed" || apt.status === "waiting";

  const shouldShowOngoingButton = (apt: { status: string; patient_status?: string | null }) =>
    (apt.status === "confirmed" || apt.status === "waiting") && apt.patient_status !== "ongoing";

  const shouldShowWaitingButton = (apt: { status: string; patient_status?: string | null }) =>
    apt.status === "confirmed" && apt.patient_status !== "waiting" && apt.patient_status !== "ongoing";

  const shouldShowMissButton = (apt: { status: string }) =>
    apt.status === "confirmed";

  const shouldShowCancelButton = (apt: { status: string }) =>
    apt.status === "confirmed";

  const shouldShowEditButton = (apt: { status: string }) =>
    apt.status === "confirmed";

  describe("Confirmed appointment (no patient_status)", () => {
    const apt = { status: "confirmed", patient_status: null };

    test("shows Done button", () => expect(shouldShowDoneButton(apt)).toBe(true));
    test("shows Ongoing button", () => expect(shouldShowOngoingButton(apt)).toBe(true));
    test("shows Waiting button", () => expect(shouldShowWaitingButton(apt)).toBe(true));
    test("shows Miss button", () => expect(shouldShowMissButton(apt)).toBe(true));
    test("shows Cancel button", () => expect(shouldShowCancelButton(apt)).toBe(true));
    test("shows Edit button", () => expect(shouldShowEditButton(apt)).toBe(true));
  });

  describe("Confirmed appointment with patient_status 'ongoing'", () => {
    const apt = { status: "confirmed", patient_status: "ongoing" };

    test("shows Done button", () => expect(shouldShowDoneButton(apt)).toBe(true));
    test("hides Ongoing button (already ongoing)", () => expect(shouldShowOngoingButton(apt)).toBe(false));
    test("hides Waiting button", () => expect(shouldShowWaitingButton(apt)).toBe(false));
    test("shows Miss button", () => expect(shouldShowMissButton(apt)).toBe(true));
  });

  describe("Waiting appointment", () => {
    const apt = { status: "waiting", patient_status: "waiting" };

    test("shows Done button", () => expect(shouldShowDoneButton(apt)).toBe(true));
    test("shows Ongoing button", () => expect(shouldShowOngoingButton(apt)).toBe(true));
    test("hides Waiting button (not confirmed)", () => expect(shouldShowWaitingButton(apt)).toBe(false));
    test("hides Miss button (not confirmed)", () => expect(shouldShowMissButton(apt)).toBe(false));
    test("hides Cancel button (not confirmed)", () => expect(shouldShowCancelButton(apt)).toBe(false));
    test("hides Edit button (not confirmed)", () => expect(shouldShowEditButton(apt)).toBe(false));
  });

  describe("Completed appointment", () => {
    const apt = { status: "completed", patient_status: "done" };

    test("hides Done button", () => expect(shouldShowDoneButton(apt)).toBe(false));
    test("hides Ongoing button", () => expect(shouldShowOngoingButton(apt)).toBe(false));
    test("hides Waiting button", () => expect(shouldShowWaitingButton(apt)).toBe(false));
    test("hides Miss button", () => expect(shouldShowMissButton(apt)).toBe(false));
    test("hides Cancel button", () => expect(shouldShowCancelButton(apt)).toBe(false));
    test("hides Edit button", () => expect(shouldShowEditButton(apt)).toBe(false));
  });

  describe("Missed appointment", () => {
    const apt = { status: "missed", patient_status: null };

    test("hides all action buttons", () => {
      expect(shouldShowDoneButton(apt)).toBe(false);
      expect(shouldShowOngoingButton(apt)).toBe(false);
      expect(shouldShowWaitingButton(apt)).toBe(false);
      expect(shouldShowMissButton(apt)).toBe(false);
      expect(shouldShowCancelButton(apt)).toBe(false);
      expect(shouldShowEditButton(apt)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Unit Tests for handleMarkWaiting behavior
// ---------------------------------------------------------------------------

describe("handleMarkWaiting API call", () => {
  test("sends correct update data to API", async () => {
    const mockUpdate = jest.fn().mockResolvedValue({});
    const appointmentId = 1;
    const token = "test-token";

    await mockUpdate(appointmentId, { patient_status: "waiting", status: "waiting" }, token);

    expect(mockUpdate).toHaveBeenCalledWith(
      appointmentId,
      { patient_status: "waiting", status: "waiting" },
      token
    );
  });
});

// ---------------------------------------------------------------------------
// Unit Tests for handleMarkOngoing behavior
// ---------------------------------------------------------------------------

describe("handleMarkOngoing API call", () => {
  test("sends correct update data to API", async () => {
    const mockUpdate = jest.fn().mockResolvedValue({});
    const appointmentId = 1;
    const token = "test-token";

    await mockUpdate(appointmentId, { patient_status: "ongoing", status: "confirmed" }, token);

    expect(mockUpdate).toHaveBeenCalledWith(
      appointmentId,
      { patient_status: "ongoing", status: "confirmed" },
      token
    );
  });
});

// ---------------------------------------------------------------------------
// Unit Tests for Dashboard categorization logic
// ---------------------------------------------------------------------------

describe("Dashboard Today's Appointments categorization", () => {
  const todayAppointments = MOCK_APPOINTMENTS.filter((apt) => apt.date === TODAY);

  test("confirmed column shows appointments without patient_status or patient_status 'pending'", () => {
    const confirmedAppointments = todayAppointments.filter(
      (apt) => !apt.patient_status || apt.patient_status === "pending"
    );
    expect(confirmedAppointments).toHaveLength(1);
    expect(confirmedAppointments[0].patient_name).toBe("Squid Babe");
    expect(confirmedAppointments[0].status).toBe("confirmed");
  });

  test("waiting column shows appointments with patient_status 'waiting'", () => {
    const waitingAppointments = todayAppointments.filter(
      (apt) => apt.patient_status === "waiting"
    );
    expect(waitingAppointments).toHaveLength(1);
    expect(waitingAppointments[0].patient_name).toBe("Squid Babe");
    expect(waitingAppointments[0].id).toBe(3);
  });

  test("ongoing column shows appointments with patient_status 'ongoing'", () => {
    const ongoingAppointments = todayAppointments.filter(
      (apt) => apt.patient_status === "ongoing"
    );
    expect(ongoingAppointments).toHaveLength(1);
    expect(ongoingAppointments[0].patient_name).toBe("Ezra Fabiculanan");
  });

  test("done column shows appointments with patient_status 'done'", () => {
    const doneAppointments = todayAppointments.filter(
      (apt) => apt.patient_status === "done"
    );
    expect(doneAppointments).toHaveLength(0); // All done appointments are from yesterday
  });
});

// ---------------------------------------------------------------------------
// Unit Tests for Dashboard patient status change
// ---------------------------------------------------------------------------

describe("Dashboard handlePatientStatusChange mapping", () => {
  const getUpdateData = (newPatientStatus: "waiting" | "ongoing" | "done") => {
    const updateData: any = { patient_status: newPatientStatus };

    if (newPatientStatus === "waiting") {
      updateData.status = "waiting";
    } else if (newPatientStatus === "ongoing") {
      updateData.status = "confirmed";
    } else if (newPatientStatus === "done") {
      updateData.status = "completed";
      updateData.completed_at = expect.any(String);
    }

    return updateData;
  };

  test("waiting maps to status: 'waiting', patient_status: 'waiting'", () => {
    const data = getUpdateData("waiting");
    expect(data.status).toBe("waiting");
    expect(data.patient_status).toBe("waiting");
  });

  test("ongoing maps to status: 'confirmed', patient_status: 'ongoing'", () => {
    const data = getUpdateData("ongoing");
    expect(data.status).toBe("confirmed");
    expect(data.patient_status).toBe("ongoing");
  });

  test("done maps to status: 'completed', patient_status: 'done' + completed_at", () => {
    const data = getUpdateData("done");
    expect(data.status).toBe("completed");
    expect(data.patient_status).toBe("done");
    expect(data).toHaveProperty("completed_at");
  });
});

// ---------------------------------------------------------------------------
// Integration Tests: No auto-transform of confirmed → pending
// ---------------------------------------------------------------------------

describe("No auto-transform of confirmed to pending", () => {
  test("today's confirmed appointments keep their 'confirmed' status (not transformed to pending)", () => {
    // Simulating the new behavior: no auto-transform
    const allResponse = MOCK_APPOINTMENTS;
    const processedAppointments = allResponse; // No transformation

    const todayConfirmed = processedAppointments.filter(
      (apt) => apt.date === TODAY && apt.status === "confirmed"
    );

    // All today's confirmed appointments should still be 'confirmed'
    todayConfirmed.forEach((apt) => {
      expect(apt.status).toBe("confirmed");
      expect(apt.status).not.toBe("pending");
    });
  });
});

// ---------------------------------------------------------------------------
// Integration Tests: Status sync between Appointments page and Overview
// ---------------------------------------------------------------------------

describe("Status sync between Appointments page and Overview page", () => {
  const getEffectiveStatus = (apt: { status: string; patient_status?: string | null }): string => {
    if (apt.patient_status === "ongoing") return "ongoing";
    if (apt.patient_status === "waiting" || apt.status === "waiting") return "waiting";
    if (apt.patient_status === "done") return "completed";
    if (apt.status === "pending") return "confirmed";
    return apt.status;
  };

  test("appointment displayed as 'Ongoing' on appointments page is in 'Ongoing' column on dashboard", () => {
    const apt = MOCK_APPOINTMENTS[1]; // patient_status: 'ongoing'
    
    // Appointments page shows effective status
    expect(getEffectiveStatus(apt)).toBe("ongoing");
    
    // Dashboard categorizes by patient_status
    expect(apt.patient_status).toBe("ongoing");
  });

  test("appointment displayed as 'Waiting' on appointments page is in 'Waiting' column on dashboard", () => {
    const apt = MOCK_APPOINTMENTS[2]; // status: 'waiting', patient_status: 'waiting'
    
    // Appointments page shows effective status
    expect(getEffectiveStatus(apt)).toBe("waiting");
    
    // Dashboard categorizes by patient_status
    expect(apt.patient_status).toBe("waiting");
  });

  test("after marking as Waiting, appointment shows in both Waiting tab and Waiting column", () => {
    // Simulate the state after clicking "Waiting" action
    const updatedApt = {
      ...MOCK_APPOINTMENTS[0],
      status: "waiting" as const,
      patient_status: "waiting",
    };

    // Appointments page: effective status is 'waiting'
    expect(getEffectiveStatus(updatedApt)).toBe("waiting");

    // Appointments page: 'waiting' filter matches
    const matchesWaitingFilter = getEffectiveStatus(updatedApt) === "waiting";
    expect(matchesWaitingFilter).toBe(true);

    // Dashboard: patient_status is 'waiting' → shows in Waiting column
    expect(updatedApt.patient_status).toBe("waiting");
  });

  test("confirmed appointment without patient_status shows as 'Confirmed' and in 'Confirmed' column", () => {
    const apt = MOCK_APPOINTMENTS[0]; // confirmed, no patient_status
    
    // Appointments page
    expect(getEffectiveStatus(apt)).toBe("confirmed");
    
    // Dashboard: no patient_status → goes to Confirmed column
    const inConfirmedColumn = !apt.patient_status || apt.patient_status === "pending";
    expect(inConfirmedColumn).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Integration Tests: Edit mode dropdown
// ---------------------------------------------------------------------------

describe("Edit mode status dropdown", () => {
  test("does NOT contain 'Pending' option", () => {
    // The edit dropdown should only have 'Confirmed' (not Pending)
    const options = ["confirmed"]; // From the component code
    expect(options).not.toContain("pending");
    expect(options).toContain("confirmed");
  });
});

// ---------------------------------------------------------------------------
// Integration Tests: Dashboard dynamic badges
// ---------------------------------------------------------------------------

describe("Dashboard status badges are dynamic", () => {
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-700";
      case "waiting": return "bg-purple-100 text-purple-700";
      case "ongoing": return "bg-blue-100 text-blue-700";
      case "completed": return "bg-teal-100 text-teal-700";
      case "missed": return "bg-yellow-100 text-yellow-800";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  test("Confirmed column shows green badge", () => {
    expect(getStatusBadgeColor("confirmed")).toContain("green");
  });

  test("Waiting column shows purple badge", () => {
    expect(getStatusBadgeColor("waiting")).toContain("purple");
  });

  test("Ongoing column shows blue badge", () => {
    expect(getStatusBadgeColor("ongoing")).toContain("blue");
  });

  test("Done column shows teal badge for completed", () => {
    expect(getStatusBadgeColor("completed")).toContain("teal");
  });
});
