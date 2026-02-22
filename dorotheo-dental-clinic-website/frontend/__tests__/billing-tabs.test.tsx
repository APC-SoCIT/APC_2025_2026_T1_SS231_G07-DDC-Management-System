/**
 * Unit Tests for Billing Page Tab Rendering and Filtering Logic
 *
 * Tests cover:
 * - Tab rendering (4 tabs: All, Pending, Overdue, Paid)
 * - Default state (All tab active)
 * - Tab switching
 * - Filtering per tab (All, Pending, Overdue, Paid)
 * - Patient filter on Paid tab
 * - Empty state for Paid tab
 * - Cancelled invoice exclusion
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// ---------------------------------------------------------------------------
// Mock dependencies BEFORE importing the component
// ---------------------------------------------------------------------------

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
});

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  DollarSign: (props: any) => <svg data-testid="icon-dollar" {...props} />,
  Search: (props: any) => <svg data-testid="icon-search" {...props} />,
  CreditCard: (props: any) => <svg data-testid="icon-credit" {...props} />,
  FileText: (props: any) => <svg data-testid="icon-file" {...props} />,
  AlertCircle: (props: any) => <svg data-testid="icon-alert" {...props} />,
  History: (props: any) => <svg data-testid="icon-history" {...props} />,
}));

// Mock RecordPaymentModal
jest.mock("@/components/record-payment-modal", () => ({
  RecordPaymentModal: ({ isOpen }: any) =>
    isOpen ? <div data-testid="payment-modal">Payment Modal</div> : null,
}));

// Prepare API mocks
const mockGetInvoices = jest.fn();
const mockGetPatients = jest.fn();

jest.mock("@/lib/api", () => ({
  getInvoices: (...args: any[]) => mockGetInvoices(...args),
  getPatients: (...args: any[]) => mockGetPatients(...args),
}));

// Mock clinic context to avoid provider dependency in tests
jest.mock("@/lib/clinic-context", () => ({
  useClinic: () => ({
    selectedClinic: { id: 1, name: "Test Clinic" },
  }),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const MOCK_PATIENTS = [
  {
    id: 1,
    username: "patientA",
    email: "a@example.com",
    first_name: "Alice",
    last_name: "Smith",
  },
  {
    id: 2,
    username: "patientB",
    email: "b@example.com",
    first_name: "Bob",
    last_name: "Jones",
  },
];

/** 3 unpaid (2 sent + 1 overdue) + 2 paid + 1 cancelled = 6 total */
const MOCK_INVOICES = [
  {
    id: 101,
    invoice_number: "INV-001",
    reference_number: "REF-001",
    appointment: 1,
    patient: 1,
    clinic: 1,
    created_by: 1,
    service_charge: "500.00",
    items_subtotal: "200.00",
    subtotal: "700.00",
    interest_rate: "0.00",
    interest_amount: "0.00",
    total_due: "700.00",
    total_paid: "0.00",
    balance: "700.00",
    status: "sent" as const,
    invoice_date: "2026-01-10",
    due_date: "2026-02-10",
    created_at: "2026-01-10T00:00:00Z",
    updated_at: "2026-01-10T00:00:00Z",
    notes: "",
    payment_instructions: "",
    bank_account: "",
    items: [],
    patient_name: "Alice Smith",
    patient_email: "a@example.com",
    service_name: "Cleaning",
  },
  {
    id: 102,
    invoice_number: "INV-002",
    reference_number: "REF-002",
    appointment: 2,
    patient: 2,
    clinic: 1,
    created_by: 1,
    service_charge: "300.00",
    items_subtotal: "100.00",
    subtotal: "400.00",
    interest_rate: "0.00",
    interest_amount: "0.00",
    total_due: "400.00",
    total_paid: "0.00",
    balance: "400.00",
    status: "sent" as const,
    invoice_date: "2026-01-12",
    due_date: "2026-02-12",
    created_at: "2026-01-12T00:00:00Z",
    updated_at: "2026-01-12T00:00:00Z",
    notes: "",
    payment_instructions: "",
    bank_account: "",
    items: [],
    patient_name: "Bob Jones",
    patient_email: "b@example.com",
    service_name: "Filling",
  },
  {
    id: 103,
    invoice_number: "INV-003",
    reference_number: "REF-003",
    appointment: 3,
    patient: 1,
    clinic: 1,
    created_by: 1,
    service_charge: "1000.00",
    items_subtotal: "0.00",
    subtotal: "1000.00",
    interest_rate: "0.00",
    interest_amount: "0.00",
    total_due: "1000.00",
    total_paid: "0.00",
    balance: "1000.00",
    status: "overdue" as const,
    invoice_date: "2025-12-01",
    due_date: "2025-12-31",
    created_at: "2025-12-01T00:00:00Z",
    updated_at: "2025-12-01T00:00:00Z",
    notes: "",
    payment_instructions: "",
    bank_account: "",
    items: [],
    patient_name: "Alice Smith",
    patient_email: "a@example.com",
    service_name: "Root Canal",
  },
  {
    id: 104,
    invoice_number: "INV-004",
    reference_number: "REF-004",
    appointment: 4,
    patient: 1,
    clinic: 1,
    created_by: 1,
    service_charge: "250.00",
    items_subtotal: "0.00",
    subtotal: "250.00",
    interest_rate: "0.00",
    interest_amount: "0.00",
    total_due: "250.00",
    total_paid: "250.00",
    balance: "0.00",
    status: "paid" as const,
    invoice_date: "2025-11-01",
    due_date: "2025-11-30",
    created_at: "2025-11-01T00:00:00Z",
    updated_at: "2025-12-05T00:00:00Z",
    paid_at: "2025-12-05T00:00:00Z",
    notes: "",
    payment_instructions: "",
    bank_account: "",
    items: [],
    patient_name: "Alice Smith",
    patient_email: "a@example.com",
    service_name: "Check-up",
  },
  {
    id: 105,
    invoice_number: "INV-005",
    reference_number: "REF-005",
    appointment: 5,
    patient: 2,
    clinic: 1,
    created_by: 1,
    service_charge: "600.00",
    items_subtotal: "0.00",
    subtotal: "600.00",
    interest_rate: "0.00",
    interest_amount: "0.00",
    total_due: "600.00",
    total_paid: "600.00",
    balance: "0.00",
    status: "paid" as const,
    invoice_date: "2025-10-15",
    due_date: "2025-11-15",
    created_at: "2025-10-15T00:00:00Z",
    updated_at: "2025-11-10T00:00:00Z",
    paid_at: "2025-11-10T00:00:00Z",
    notes: "",
    payment_instructions: "",
    bank_account: "",
    items: [],
    patient_name: "Bob Jones",
    patient_email: "b@example.com",
    service_name: "Extraction",
  },
  {
    id: 106,
    invoice_number: "INV-006",
    reference_number: "REF-006",
    appointment: 6,
    patient: 1,
    clinic: 1,
    created_by: 1,
    service_charge: "150.00",
    items_subtotal: "0.00",
    subtotal: "150.00",
    interest_rate: "0.00",
    interest_amount: "0.00",
    total_due: "150.00",
    total_paid: "0.00",
    balance: "150.00",
    status: "cancelled" as const,
    invoice_date: "2025-09-01",
    due_date: "2025-09-30",
    created_at: "2025-09-01T00:00:00Z",
    updated_at: "2025-09-15T00:00:00Z",
    notes: "",
    payment_instructions: "",
    bank_account: "",
    items: [],
    patient_name: "Alice Smith",
    patient_email: "a@example.com",
    service_name: "X-Ray",
  },
];

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------
import StaffBillingPage from "@/app/staff/billing/page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupMocks() {
  // Mock localStorage
  Storage.prototype.getItem = jest.fn((key: string) => {
    if (key === "token") return "fake-token-123";
    return null;
  });

  mockGetInvoices.mockResolvedValue(MOCK_INVOICES);
  mockGetPatients.mockResolvedValue(MOCK_PATIENTS);
}

/** Render and wait for loading to finish */
async function renderPage() {
  const result = render(<StaffBillingPage />);
  // Wait for the loading spinner to disappear and content to appear
  await waitFor(() => {
    expect(screen.queryByText("Loading payment data...")).not.toBeInTheDocument();
  });
  return result;
}

/** Get the number of data rows in the table (exclude header) */
function getTableRowCount(): number {
  const tbody = document.querySelector("tbody");
  if (!tbody) return 0;
  return tbody.querySelectorAll("tr").length;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Billing Page — Tab Rendering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // UT-01: Verify all 4 tabs render
  test("renders all four tabs: All, Pending, Overdue, Paid", async () => {
    await renderPage();

    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pending" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Overdue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paid" })).toBeInTheDocument();
  });

  // UT-02: Default tab is "All"
  test("'All' tab is active by default", async () => {
    await renderPage();

    const allTab = screen.getByRole("button", { name: "All" });
    expect(allTab.className).toContain("text-blue-600");
    expect(allTab.className).toContain("border-blue-600");
  });

  // UT-03: Tab switching
  test("clicking 'Paid' tab activates it and deactivates 'All'", async () => {
    await renderPage();

    const paidTab = screen.getByRole("button", { name: "Paid" });
    const allTab = screen.getByRole("button", { name: "All" });

    await userEvent.click(paidTab);

    expect(paidTab.className).toContain("text-blue-600");
    expect(allTab.className).not.toContain("border-blue-600");
  });

  // UT-04: Only one tab active at a time
  test("only one tab is active at any time when clicking sequentially", async () => {
    await renderPage();

    const tabs = ["All", "Pending", "Overdue", "Paid"];

    for (const tabName of tabs) {
      const tab = screen.getByRole("button", { name: tabName });
      await userEvent.click(tab);

      // The clicked tab should be active
      expect(tab.className).toContain("border-blue-600");

      // All other tabs should be inactive
      for (const otherName of tabs) {
        if (otherName !== tabName) {
          const other = screen.getByRole("button", { name: otherName });
          expect(other.className).not.toContain("border-blue-600");
        }
      }
    }
  });
});

describe("Billing Page — Filtering Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // UT-05: "All" tab shows only unpaid invoices (3)
  test("'All' tab shows exactly 3 unpaid invoice rows", async () => {
    await renderPage();

    // All tab is default — should show 3 unpaid (2 sent + 1 overdue)
    expect(getTableRowCount()).toBe(3);
  });

  // UT-06: "Pending" tab shows only sent invoices (2)
  test("'Pending' tab shows exactly 2 rows (status 'sent')", async () => {
    await renderPage();

    const pendingTab = screen.getByRole("button", { name: "Pending" });
    await userEvent.click(pendingTab);

    expect(getTableRowCount()).toBe(2);
  });

  // UT-07: "Overdue" tab shows only overdue invoices (1)
  test("'Overdue' tab shows exactly 1 row", async () => {
    await renderPage();

    const overdueTab = screen.getByRole("button", { name: "Overdue" });
    await userEvent.click(overdueTab);

    expect(getTableRowCount()).toBe(1);
  });

  // UT-08: "Paid" tab shows only paid invoices (2)
  test("'Paid' tab shows exactly 2 rows", async () => {
    await renderPage();

    const paidTab = screen.getByRole("button", { name: "Paid" });
    await userEvent.click(paidTab);

    expect(getTableRowCount()).toBe(2);
  });

  // UT-09: "Paid" tab + patient filter
  test("'Paid' tab with patient filter shows only matching patient's paid invoices", async () => {
    await renderPage();

    // Switch to Paid tab
    const paidTab = screen.getByRole("button", { name: "Paid" });
    await userEvent.click(paidTab);

    // Before applying patient filter — 2 paid invoices
    expect(getTableRowCount()).toBe(2);

    // Open patient search and select patient A (Alice, id=1)
    const searchInput = screen.getByPlaceholderText("Search by patient name or email...");
    await userEvent.click(searchInput);
    await userEvent.type(searchInput, "Alice");

    // Click on Alice's entry in the dropdown (the one in the dropdown div, not in the table)
    const aliceOptions = await screen.findAllByText("Alice Smith");
    // The dropdown option is the one inside a div with class containing "font-medium text-gray-900" without being a <p>
    const dropdownOption = aliceOptions.find(
      (el: HTMLElement) => el.tagName === "DIV" && el.className.includes("font-medium")
    );
    await userEvent.click(dropdownOption!);

    // Now only Alice's paid invoice should show (1 row)
    expect(getTableRowCount()).toBe(1);
    expect(screen.getByText("INV-004")).toBeInTheDocument();
  });

  // UT-10: "Paid" tab empty state
  test("'Paid' tab with 0 paid invoices shows empty message", async () => {
    // Return invoices with no paid ones
    mockGetInvoices.mockResolvedValue(
      MOCK_INVOICES.filter((inv) => inv.status !== "paid")
    );

    await renderPage();

    const paidTab = screen.getByRole("button", { name: "Paid" });
    await userEvent.click(paidTab);

    expect(screen.getByText("No paid invoices found.")).toBeInTheDocument();
    expect(getTableRowCount()).toBe(0);
  });

  // UT-11: Cancelled invoices excluded from all tabs
  test("cancelled invoices do not appear in any tab", async () => {
    await renderPage();

    const tabs = ["All", "Pending", "Overdue", "Paid"];

    for (const tabName of tabs) {
      const tab = screen.getByRole("button", { name: tabName });
      await userEvent.click(tab);

      // INV-006 is cancelled — should never appear
      expect(screen.queryByText("INV-006")).not.toBeInTheDocument();
    }
  });
});

describe("Billing Page — Summary Cards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // UT-12: "All" tab total calculation
  test("'All' tab shows correct total pending amount", async () => {
    await renderPage();

    // Total balance of unpaid: 700 + 400 + 1000 = 2100
    expect(screen.getByText("Total Pending")).toBeInTheDocument();
    expect(screen.getByText("₱2,100.00")).toBeInTheDocument();
  });

  // UT-13: "Paid" tab total calculation
  test("'Paid' tab shows total settled amount", async () => {
    await renderPage();

    const paidTab = screen.getByRole("button", { name: "Paid" });
    await userEvent.click(paidTab);

    // Total due of paid: 250 + 600 = 850
    expect(screen.getByText("Total Settled")).toBeInTheDocument();
    expect(screen.getByText("₱850.00")).toBeInTheDocument();
  });
});

describe("Billing Page — Table Rendering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // UT-14: Paid tab hides "Record Payment" button
  test("'Paid' tab does not show 'Record Payment' buttons", async () => {
    await renderPage();

    const paidTab = screen.getByRole("button", { name: "Paid" });
    await userEvent.click(paidTab);

    expect(screen.queryByText("Record Payment")).not.toBeInTheDocument();
  });

  // UT-15: Paid invoice status badge is green
  test("paid invoice status badge has green styling", async () => {
    await renderPage();

    const paidTab = screen.getByRole("button", { name: "Paid" });
    await userEvent.click(paidTab);

    const badges = screen.getAllByText("Paid", { selector: "span" });
    // Filter to only the status badges (not the tab button)
    const statusBadges = badges.filter((el: HTMLElement) =>
      el.className.includes("rounded-full")
    );
    expect(statusBadges.length).toBeGreaterThan(0);
    statusBadges.forEach((badge: HTMLElement) => {
      expect(badge.className).toContain("text-green-700");
    });
  });

  // UT-16: Paid invoice balance displays green text
  test("paid invoices show balance in green text", async () => {
    await renderPage();

    const paidTab = screen.getByRole("button", { name: "Paid" });
    await userEvent.click(paidTab);

    // Balance cells should have green text
    const balanceCells = screen.getAllByText(/₱0\.00/);
    balanceCells.forEach((cell: HTMLElement) => {
      if (cell.className.includes("font-bold")) {
        expect(cell.className).toContain("text-green-600");
      }
    });
  });

  // Verify unpaid tabs still show Record Payment
  test("unpaid tabs show 'Record Payment' buttons", async () => {
    await renderPage();

    // On All tab, Record Payment should be visible
    const recordPaymentButtons = screen.getAllByText("Record Payment");
    expect(recordPaymentButtons.length).toBe(3); // 3 unpaid invoices
  });
});
