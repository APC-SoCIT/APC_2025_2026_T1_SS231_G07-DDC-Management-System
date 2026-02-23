/**
 * Tests for Calendar Date Click → QuickAvailabilityModal Integration
 *
 * Tests cover:
 * 1. QuickAvailabilityModal opens with pre-selected date when calendar date is clicked
 * 2. QuickAvailabilityModal opens with "All Clinics" when no specific clinic is selected
 * 3. QuickAvailabilityModal opens with specific clinic pre-selected when clinic selector is set
 * 4. "+ Set Availability" button opens modal without pre-selections (fresh state)
 * 5. DentistCalendarAvailability calls onDateClick callback when provided
 * 6. DentistCalendarAvailability falls back to old modal when onDateClick is not provided
 * 7. QuickAvailabilityModal resets state properly when closed and re-opened
 * 8. Past dates are not clickable
 */

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// ---------------------------------------------------------------------------
// Mock dependencies BEFORE importing components
// ---------------------------------------------------------------------------

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/owner/profile",
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  ChevronLeft: (props: any) => <svg data-testid="icon-chevron-left" {...props} />,
  ChevronRight: (props: any) => <svg data-testid="icon-chevron-right" {...props} />,
  Clock: (props: any) => <svg data-testid="icon-clock" {...props} />,
  Save: (props: any) => <svg data-testid="icon-save" {...props} />,
  MapPin: (props: any) => <svg data-testid="icon-map-pin" {...props} />,
  Calendar: (props: any) => <svg data-testid="icon-calendar" {...props} />,
  X: (props: any) => <svg data-testid="icon-x" {...props} />,
  Camera: (props: any) => <svg data-testid="icon-camera" {...props} />,
}));

// Mock auth
const mockToken = "test-token-12345";
const mockUser = { id: 1, first_name: "Marvin", last_name: "Dorotheo", email: "owner@test.com", role: "owner", user_type: "owner", phone: "", birthday: "", username: "owner" };
jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: mockUser,
    token: mockToken,
    setUser: jest.fn(),
  }),
}));

// Mock clinic data
const mockClinics = [
  { id: 1, name: "Alabang", address: "Ground Floor, Festival Mall, Filinvest City, Alabang, Muntinlupa City 1781", phone: "09171234567" },
  { id: 2, name: "Bacoor", address: "2nd floor, SM City Bacoor", phone: "09171234568" },
  { id: 3, name: "Poblacion", address: "3rd Floor, Building A", phone: "09171234569" },
];

let mockSelectedClinic: any = "all";
const mockSetSelectedClinic = jest.fn();

jest.mock("@/lib/clinic-context", () => ({
  useClinic: () => ({
    selectedClinic: mockSelectedClinic,
    allClinics: mockClinics,
    setSelectedClinic: mockSetSelectedClinic,
    isLoading: false,
    refreshClinics: jest.fn(),
  }),
}));

// Mock API
jest.mock("@/lib/api", () => ({
  api: {},
  API_BASE_URL: "http://localhost:8000/api",
  getAuthHeaderUtil: (token: string) => `Token ${token}`,
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import components AFTER mocks
import QuickAvailabilityModal from "@/components/quick-availability-modal";
import DentistCalendarAvailability from "@/components/dentist-calendar-availability";

// ---------------------------------------------------------------------------
// Helper to get a future date string in YYYY-MM-DD format
// ---------------------------------------------------------------------------
function getFutureDateStr(daysFromNow: number = 5): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getFutureDay(daysFromNow: number = 5): number {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.getDate();
}

// ---------------------------------------------------------------------------
// Tests for QuickAvailabilityModal with initial props
// ---------------------------------------------------------------------------
describe("QuickAvailabilityModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSave: jest.fn(),
    existingAvailability: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedClinic = "all";
  });

  test("renders with no initial selections when no initial props provided", () => {
    render(<QuickAvailabilityModal {...defaultProps} />);

    expect(screen.getByText("Set Availability")).toBeInTheDocument();
    // "Apply to All Clinics" radio should be checked by default
    const allClinicsRadio = screen.getAllByRole("radio")[0]; // first radio = "Apply to All Clinics"
    expect(allClinicsRadio).toBeChecked();
    // The modal should show 0 dates selected (or no "date selected" text)
    expect(screen.queryByText(/date.*selected/i)).not.toBeInTheDocument();
  });

  test("opens with pre-selected date when initialDates is provided", () => {
    const dateStr = getFutureDateStr(5);
    render(
      <QuickAvailabilityModal
        {...defaultProps}
        initialDates={[dateStr]}
      />
    );

    expect(screen.getByText("Set Availability")).toBeInTheDocument();
    // Should show "1 date selected"
    expect(screen.getByText(/1 date selected/i)).toBeInTheDocument();
  });

  test("opens with 'All Clinics' selected when initialApplyToAllClinics is true", () => {
    const dateStr = getFutureDateStr(5);
    render(
      <QuickAvailabilityModal
        {...defaultProps}
        initialDates={[dateStr]}
        initialApplyToAllClinics={true}
        initialClinicId={null}
      />
    );

    // The "Apply to All Clinics" radio should be checked
    const allClinicsRadio = screen.getAllByRole("radio")[0]; // first radio
    expect(allClinicsRadio).toBeChecked();
    // The specific clinic dropdown should NOT be visible
    expect(screen.queryByText("Select a clinic...")).not.toBeInTheDocument();
  });

  test("opens with specific clinic selected when initialApplyToAllClinics is false and initialClinicId is set", () => {
    const dateStr = getFutureDateStr(5);
    render(
      <QuickAvailabilityModal
        {...defaultProps}
        initialDates={[dateStr]}
        initialApplyToAllClinics={false}
        initialClinicId={1}
      />
    );

    // The "Specific Clinic Only" radio should be checked
    const specificClinicRadio = screen.getAllByRole("radio")[1]; // second radio
    expect(specificClinicRadio).toBeChecked();
    // The clinic dropdown should be visible with Alabang selected
    // Find the select that contains the clinic options (not the time pickers)
    const allSelects = screen.getAllByRole("combobox");
    const clinicDropdown = allSelects.find(el => el.querySelector('option[value=""]')?.textContent?.includes('Select a clinic'));
    expect(clinicDropdown).toBeDefined();
    expect(clinicDropdown).toHaveValue("1");
  });

  test("pre-selects correct clinic (Bacoor) when initialClinicId is 2", () => {
    const dateStr = getFutureDateStr(5);
    render(
      <QuickAvailabilityModal
        {...defaultProps}
        initialDates={[dateStr]}
        initialApplyToAllClinics={false}
        initialClinicId={2}
      />
    );

    const specificClinicRadio = screen.getAllByRole("radio")[1];
    expect(specificClinicRadio).toBeChecked();
    const allSelects = screen.getAllByRole("combobox");
    const clinicDropdown = allSelects.find(el => el.querySelector('option[value=""]')?.textContent?.includes('Select a clinic'));
    expect(clinicDropdown).toBeDefined();
    expect(clinicDropdown).toHaveValue("2");
  });

  test("does not render when isOpen is false", () => {
    render(
      <QuickAvailabilityModal
        {...defaultProps}
        isOpen={false}
      />
    );

    expect(screen.queryByText("Set Availability")).not.toBeInTheDocument();
  });

  test("resets state when closed and re-opened without initial props", () => {
    const { rerender } = render(
      <QuickAvailabilityModal
        {...defaultProps}
        isOpen={true}
        initialDates={[getFutureDateStr(5)]}
        initialApplyToAllClinics={false}
        initialClinicId={1}
      />
    );

    // Initially should have 1 date selected and specific clinic
    expect(screen.getByText(/1 date selected/i)).toBeInTheDocument();

    // Close modal
    rerender(
      <QuickAvailabilityModal
        {...defaultProps}
        isOpen={false}
        initialDates={[getFutureDateStr(5)]}
        initialApplyToAllClinics={false}
        initialClinicId={1}
      />
    );

    // Re-open without initial props (like clicking "+ Set Availability" button)
    rerender(
      <QuickAvailabilityModal
        {...defaultProps}
        isOpen={true}
        initialDates={undefined}
        initialApplyToAllClinics={undefined}
        initialClinicId={undefined}
      />
    );

    // Should have no dates selected
    expect(screen.queryByText(/date.*selected/i)).not.toBeInTheDocument();
    // Should default to "All Clinics"
    const allClinicsRadio = screen.getAllByRole("radio")[0];
    expect(allClinicsRadio).toBeChecked();
  });

  test("calls onSave with correct data including clinic selection", async () => {
    const dateStr = getFutureDateStr(5);
    const onSaveMock = jest.fn();

    render(
      <QuickAvailabilityModal
        {...defaultProps}
        onSave={onSaveMock}
        initialDates={[dateStr]}
        initialApplyToAllClinics={false}
        initialClinicId={1}
      />
    );

    // Click "Save Availability" button
    const saveButton = screen.getByText("Save Availability");
    fireEvent.click(saveButton);

    expect(onSaveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'specific',
        dates: [dateStr],
        applyToAllClinics: false,
        clinicId: 1,
      })
    );
  });

  test("calls onSave with applyToAllClinics when initial is all clinics", async () => {
    const dateStr = getFutureDateStr(5);
    const onSaveMock = jest.fn();

    render(
      <QuickAvailabilityModal
        {...defaultProps}
        onSave={onSaveMock}
        initialDates={[dateStr]}
        initialApplyToAllClinics={true}
        initialClinicId={null}
      />
    );

    const saveButton = screen.getByText("Save Availability");
    fireEvent.click(saveButton);

    expect(onSaveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'specific',
        dates: [dateStr],
        applyToAllClinics: true,
      })
    );
  });

  test("navigates calendar to the month of initial date", () => {
    // Use a date 2 months from now
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 2);
    futureDate.setDate(15);
    const dateStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-15`;
    const expectedMonthYear = futureDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    render(
      <QuickAvailabilityModal
        {...defaultProps}
        initialDates={[dateStr]}
      />
    );

    // The calendar should navigate to the month of the initial date
    expect(screen.getByText(expectedMonthYear)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests for DentistCalendarAvailability onDateClick callback
// ---------------------------------------------------------------------------
describe("DentistCalendarAvailability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fetch to return empty availability
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([]),
    });
  });

  test("calls onDateClick when a future date is clicked and callback is provided", async () => {
    const onDateClickMock = jest.fn();
    const futureDay = getFutureDay(5);
    const futureDateStr = getFutureDateStr(5);

    render(
      <DentistCalendarAvailability
        dentistId={1}
        selectedClinicId={null}
        onDateClick={onDateClickMock}
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading availability...")).not.toBeInTheDocument();
    });

    // Click a future date
    const dateButton = screen.getByText(String(futureDay));
    fireEvent.click(dateButton);

    expect(onDateClickMock).toHaveBeenCalledWith(futureDateStr);
  });

  test("does NOT call onDateClick when a past date is clicked", async () => {
    const onDateClickMock = jest.fn();

    render(
      <DentistCalendarAvailability
        dentistId={1}
        selectedClinicId={null}
        onDateClick={onDateClickMock}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText("Loading availability...")).not.toBeInTheDocument();
    });

    // Try to find and click a past date (day 1 of current month if today > 1)
    const today = new Date();
    if (today.getDate() > 1) {
      const pastDayButton = screen.getByText("1");
      fireEvent.click(pastDayButton);
      expect(onDateClickMock).not.toHaveBeenCalled();
    }
  });

  test("does NOT show old 'Set Working Hours' modal when onDateClick is provided", async () => {
    const onDateClickMock = jest.fn();
    const futureDay = getFutureDay(5);

    render(
      <DentistCalendarAvailability
        dentistId={1}
        selectedClinicId={null}
        onDateClick={onDateClickMock}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText("Loading availability...")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(String(futureDay)));

    // The old "Set Working Hours" modal should NOT appear
    expect(screen.queryByText("Set Working Hours")).not.toBeInTheDocument();
  });

  test("shows old 'Set Working Hours' modal when onDateClick is NOT provided (backward compat)", async () => {
    const futureDay = getFutureDay(5);

    render(
      <DentistCalendarAvailability
        dentistId={1}
        selectedClinicId={null}
        // No onDateClick provided
      />
    );

    await waitFor(() => {
      expect(screen.queryByText("Loading availability...")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(String(futureDay)));

    // The old "Set Working Hours" modal SHOULD appear
    expect(screen.getByText("Set Working Hours")).toBeInTheDocument();
  });

  test("renders calendar with correct month", async () => {
    render(
      <DentistCalendarAvailability
        dentistId={1}
        selectedClinicId={null}
      />
    );

    const now = new Date();
    const expectedMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    expect(screen.getByText(expectedMonth)).toBeInTheDocument();
  });

  test("passes correct date string format (YYYY-MM-DD) to onDateClick", async () => {
    const onDateClickMock = jest.fn();
    const futureDay = getFutureDay(5);

    render(
      <DentistCalendarAvailability
        dentistId={1}
        selectedClinicId={null}
        onDateClick={onDateClickMock}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText("Loading availability...")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(String(futureDay)));

    const calledWith = onDateClickMock.mock.calls[0][0];
    // Verify YYYY-MM-DD format
    expect(calledWith).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// Integration-style tests: Calendar click → Modal with correct state
// ---------------------------------------------------------------------------
describe("Calendar Date Click → Modal Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([]),
    });
  });

  test("clicking calendar date opens modal with that date selected", async () => {
    const futureDay = getFutureDay(5);
    const futureDateStr = getFutureDateStr(5);
    let capturedDate: string | undefined;

    // Simulate the parent component pattern
    const TestWrapper = () => {
      const [showModal, setShowModal] = React.useState(false);
      const [initialDates, setInitialDates] = React.useState<string[] | undefined>();
      const [initialAllClinics, setInitialAllClinics] = React.useState<boolean | undefined>();
      const [initialClinicId, setInitialClinicId] = React.useState<number | null | undefined>();

      return (
        <>
          <DentistCalendarAvailability
            dentistId={1}
            selectedClinicId={null}
            onDateClick={(dateStr) => {
              capturedDate = dateStr;
              setInitialDates([dateStr]);
              setInitialAllClinics(true);
              setInitialClinicId(null);
              setShowModal(true);
            }}
          />
          <QuickAvailabilityModal
            isOpen={showModal}
            onClose={() => {
              setShowModal(false);
              setInitialDates(undefined);
              setInitialAllClinics(undefined);
              setInitialClinicId(undefined);
            }}
            onSave={jest.fn()}
            initialDates={initialDates}
            initialApplyToAllClinics={initialAllClinics}
            initialClinicId={initialClinicId}
          />
        </>
      );
    };

    // Need React in scope for the wrapper
    const React = require("react");
    render(<TestWrapper />);

    await waitFor(() => {
      expect(screen.queryByText("Loading availability...")).not.toBeInTheDocument();
    });

    // Click a future date
    fireEvent.click(screen.getByText(String(futureDay)));

    // QuickAvailabilityModal should appear
    await waitFor(() => {
      expect(screen.getByText("Set Availability")).toBeInTheDocument();
    });

    // The clicked date should be selected
    expect(screen.getByText(/1 date selected/i)).toBeInTheDocument();
    expect(capturedDate).toBe(futureDateStr);
  });

  test("clicking calendar date with specific clinic selector passes clinic info to modal", async () => {
    const futureDay = getFutureDay(5);
    const React = require("react");

    const TestWrapper = () => {
      const [showModal, setShowModal] = React.useState(false);
      const [initialDates, setInitialDates] = React.useState<string[] | undefined>();
      const [initialAllClinics, setInitialAllClinics] = React.useState<boolean | undefined>();
      const [initialClinicId, setInitialClinicId] = React.useState<number | null | undefined>();

      return (
        <>
          <DentistCalendarAvailability
            dentistId={1}
            selectedClinicId={1} // Alabang is selected
            onDateClick={(dateStr) => {
              setInitialDates([dateStr]);
              setInitialAllClinics(false); // Specific clinic
              setInitialClinicId(1); // Alabang
              setShowModal(true);
            }}
          />
          <QuickAvailabilityModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onSave={jest.fn()}
            initialDates={initialDates}
            initialApplyToAllClinics={initialAllClinics}
            initialClinicId={initialClinicId}
          />
        </>
      );
    };

    render(<TestWrapper />);

    await waitFor(() => {
      expect(screen.queryByText("Loading availability...")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(String(futureDay)));

    await waitFor(() => {
      expect(screen.getByText("Set Availability")).toBeInTheDocument();
    });

    // "Specific Clinic Only" should be selected
    const specificClinicRadio = screen.getAllByRole("radio")[1];
    expect(specificClinicRadio).toBeChecked();

    // Alabang should be selected in the clinic dropdown
    const allSelects = screen.getAllByRole("combobox");
    const clinicDropdown = allSelects.find(el => el.querySelector('option[value=""]')?.textContent?.includes('Select a clinic'));
    expect(clinicDropdown).toBeDefined();
    expect(clinicDropdown).toHaveValue("1");
  });

  test("+ Set Availability button opens modal fresh without pre-selections", async () => {
    const React = require("react");

    const TestWrapper = () => {
      const [showModal, setShowModal] = React.useState(false);
      const [initialDates, setInitialDates] = React.useState<string[] | undefined>();
      const [initialAllClinics, setInitialAllClinics] = React.useState<boolean | undefined>();
      const [initialClinicId, setInitialClinicId] = React.useState<number | null | undefined>();

      return (
        <>
          <button
            data-testid="set-availability-btn"
            onClick={() => {
              // Clear initial values (same as owner profile page logic)
              setInitialDates(undefined);
              setInitialAllClinics(undefined);
              setInitialClinicId(undefined);
              setShowModal(true);
            }}
          >
            + Set Availability
          </button>
          <QuickAvailabilityModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onSave={jest.fn()}
            initialDates={initialDates}
            initialApplyToAllClinics={initialAllClinics}
            initialClinicId={initialClinicId}
          />
        </>
      );
    };

    render(<TestWrapper />);

    // Click the "+ Set Availability" button
    fireEvent.click(screen.getByTestId("set-availability-btn"));

    await waitFor(() => {
      expect(screen.getByText("Set Availability")).toBeInTheDocument();
    });

    // Should have no dates selected
    expect(screen.queryByText(/date.*selected/i)).not.toBeInTheDocument();
    // Should default to "All Clinics"
    const allClinicsRadio = screen.getAllByRole("radio")[0];
    expect(allClinicsRadio).toBeChecked();
  });
});
