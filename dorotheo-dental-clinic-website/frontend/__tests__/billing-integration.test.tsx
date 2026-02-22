/**
 * Integration Tests for Billing Page Data Flow and Regressions
 *
 * Tests cover:
 * - Data splitting between unpaid and paid lists
 * - Payment success refresh behavior
 * - Regression: All tab still shows only unpaid
 * - Regression: Pending tab filters correctly
 * - Regression: Overdue tab filters correctly
 * - Regression: Record Payment modal opens correctly
 * - Cross-tab patient filter persistence
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

jest.mock("lucide-react", () => ({
  DollarSign: (props: any) => <svg data-testid="icon-dollar" {...props} />,
  Search: (props: any) => <svg data-testid="icon-search" {...props} />,
  CreditCard: (props: any) => <svg data-testid="icon-credit" {...props} />,
  FileText: (props: any) => <svg data-testid="icon-file" {...props} />,
  AlertCircle: (props: any) => <svg data-testid="icon-alert" {...props} />,
  History: (props: any) => <svg data-testid="icon-history" {...props} />,
}));

// Track RecordPaymentModal props
let lastModalProps: any = {};
jest.mock("@/components/record-payment-modal", () => ({
  RecordPaymentModal: (props: any) => {
    lastModalProps = props;
    return props.isOpen ? (
      <div data-testid="payment-modal">
        <span data-testid="modal-patient-id">{props.patientId}</span>
        <span data-testid="modal-patient-name">{props.patientName}</span>
        <button data-testid="modal-close" onClick={props.onClose}>
          Close
        </button>
        <button data-testid="modal-success" onClick={props.onSuccess}>
          Submit Payment
        </button>
      </div>
    ) : null;
  },
}));

const mockGetInvoices = jest.fn();
const mockGetPatients = jest.fn();

jest.mock("@/lib/api", () => ({
  getInvoices: (...args: any[]) => mockGetInvoices(...args),
  getPatients: (...args: any[]) => mockGetPatients(...args),
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

function createInvoice(overrides: Record<string, any> = {}) {
  return {
    id: 1,
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
    ...overrides,
  };
}

const MIXED_INVOICES = [
  createInvoice({
    id: 201,
    invoice_number: "INV-201",
    status: "sent",
    balance: "500.00",
    total_due: "500.00",
    patient: 1,
    patient_name: "Alice Smith",
  }),
  createInvoice({
    id: 202,
    invoice_number: "INV-202",
    status: "sent",
    balance: "300.00",
    total_due: "300.00",
    patient: 2,
    patient_name: "Bob Jones",
    patient_email: "b@example.com",
  }),
  createInvoice({
    id: 203,
    invoice_number: "INV-203",
    status: "overdue",
    balance: "1000.00",
    total_due: "1000.00",
    patient: 1,
    patient_name: "Alice Smith",
  }),
  createInvoice({
    id: 204,
    invoice_number: "INV-204",
    status: "paid",
    balance: "0.00",
    total_due: "250.00",
    total_paid: "250.00",
    patient: 1,
    patient_name: "Alice Smith",
    paid_at: "2025-12-05T00:00:00Z",
  }),
  createInvoice({
    id: 205,
    invoice_number: "INV-205",
    status: "paid",
    balance: "0.00",
    total_due: "600.00",
    total_paid: "600.00",
    patient: 2,
    patient_name: "Bob Jones",
    patient_email: "b@example.com",
    paid_at: "2025-11-10T00:00:00Z",
  }),
  createInvoice({
    id: 206,
    invoice_number: "INV-206",
    status: "cancelled",
    balance: "150.00",
    total_due: "150.00",
    patient: 1,
    patient_name: "Alice Smith",
  }),
];

// ---------------------------------------------------------------------------
// Import component after mocks
// ---------------------------------------------------------------------------
import StaffBillingPage from "@/app/staff/billing/page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupMocks(invoices = MIXED_INVOICES) {
  Storage.prototype.getItem = jest.fn((key: string) => {
    if (key === "token") return "fake-token-123";
    return null;
  });
  mockGetInvoices.mockResolvedValue(invoices);
  mockGetPatients.mockResolvedValue(MOCK_PATIENTS);
}

async function renderPage() {
  const result = render(<StaffBillingPage />);
  await waitFor(() => {
    expect(screen.queryByText("Loading payment data...")).not.toBeInTheDocument();
  });
  return result;
}

function getTableRowCount(): number {
  const tbody = document.querySelector("tbody");
  if (!tbody) return 0;
  return tbody.querySelectorAll("tr").length;
}

function getInvoiceNumbersInTable(): string[] {
  const tbody = document.querySelector("tbody");
  if (!tbody) return [];
  const rows = tbody.querySelectorAll("tr");
  return Array.from(rows).map((row) => {
    const firstCell = row.querySelector("td");
    return firstCell?.textContent?.trim() || "";
  });
}

// ---------------------------------------------------------------------------
// Integration Tests
// ---------------------------------------------------------------------------

describe("Integration — Data Splitting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // IT-01: API returns mixed statuses → state split correctly
  test("unpaid list has only unpaid items and paid list has only paid items", async () => {
    await renderPage();

    // All tab (default) → shows unpaid only (3: 2 sent + 1 overdue)
    expect(getTableRowCount()).toBe(3);
    const unpaidInvoices = getInvoiceNumbersInTable();
    expect(unpaidInvoices).toContain("INV-201");
    expect(unpaidInvoices).toContain("INV-202");
    expect(unpaidInvoices).toContain("INV-203");
    expect(unpaidInvoices).not.toContain("INV-204"); // paid
    expect(unpaidInvoices).not.toContain("INV-205"); // paid
    expect(unpaidInvoices).not.toContain("INV-206"); // cancelled

    // Switch to Paid tab → shows paid only (2)
    await userEvent.click(screen.getByRole("button", { name: "Paid" }));
    expect(getTableRowCount()).toBe(2);
    const paidInvoices = getInvoiceNumbersInTable();
    expect(paidInvoices).toContain("INV-204");
    expect(paidInvoices).toContain("INV-205");
    expect(paidInvoices).not.toContain("INV-201");
  });

  // IT-02: API returns no paid invoices
  test("empty paid list shows empty state on Paid tab", async () => {
    setupMocks(MIXED_INVOICES.filter((inv) => inv.status !== "paid"));
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Paid" }));
    expect(getTableRowCount()).toBe(0);
    expect(screen.getByText("No paid invoices found.")).toBeInTheDocument();
  });

  // IT-03: API returns only paid invoices
  test("only paid invoices → All tab empty, Paid tab shows all", async () => {
    const paidOnly = MIXED_INVOICES.filter((inv) => inv.status === "paid");
    setupMocks(paidOnly);
    await renderPage();

    // All (unpaid) tab should be empty
    expect(getTableRowCount()).toBe(0);

    // Paid tab should show 2
    await userEvent.click(screen.getByRole("button", { name: "Paid" }));
    expect(getTableRowCount()).toBe(2);
  });
});

describe("Integration — Payment Success Refresh", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // IT-04: After payment success, data is refreshed and invoice moves to Paid tab
  test("payment success triggers data refresh", async () => {
    await renderPage();

    // Initially, INV-201 is on the All tab (sent, unpaid)
    expect(screen.getByText("INV-201")).toBeInTheDocument();
    expect(getTableRowCount()).toBe(3);

    // Click "Record Payment" for the first invoice
    const recordButtons = screen.getAllByText("Record Payment");
    await userEvent.click(recordButtons[0]);

    // Modal should open
    expect(screen.getByTestId("payment-modal")).toBeInTheDocument();

    // Simulate that after payment, INV-201 is now paid
    const updatedInvoices = MIXED_INVOICES.map((inv) =>
      inv.id === 201
        ? { ...inv, status: "paid" as const, balance: "0.00", total_paid: "500.00", paid_at: "2026-02-21T00:00:00Z" }
        : inv
    );
    mockGetInvoices.mockResolvedValue(updatedInvoices);

    // Trigger onSuccess callback
    await userEvent.click(screen.getByTestId("modal-success"));

    // Wait for data refresh
    await waitFor(() => {
      expect(mockGetInvoices).toHaveBeenCalledTimes(2); // initial + refresh
    });

    // After refresh, INV-201 should be gone from All tab (now only 2 unpaid)
    await waitFor(() => {
      expect(getTableRowCount()).toBe(2);
    });

    // Switch to Paid tab — INV-201 should now be there (3 paid total)
    await userEvent.click(screen.getByRole("button", { name: "Paid" }));
    await waitFor(() => {
      expect(getTableRowCount()).toBe(3);
    });
    expect(screen.getByText("INV-201")).toBeInTheDocument();
  });
});

describe("Integration — Regression: Existing Tabs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // IT-05: "All" tab still shows only unpaid invoices
  test("'All' tab after adding Paid tab still shows only unpaid invoices", async () => {
    await renderPage();

    expect(getTableRowCount()).toBe(3);

    const invoices = getInvoiceNumbersInTable();
    // Should NOT contain paid or cancelled invoices
    expect(invoices).not.toContain("INV-204");
    expect(invoices).not.toContain("INV-205");
    expect(invoices).not.toContain("INV-206");
  });

  // IT-06: "Pending" tab still filters by status === "sent"
  test("'Pending' tab correctly shows only sent invoices", async () => {
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Pending" }));
    expect(getTableRowCount()).toBe(2);

    const invoices = getInvoiceNumbersInTable();
    expect(invoices).toContain("INV-201"); // sent
    expect(invoices).toContain("INV-202"); // sent
    expect(invoices).not.toContain("INV-203"); // overdue
  });

  // IT-07: "Overdue" tab still filters by status === "overdue"
  test("'Overdue' tab correctly shows only overdue invoices", async () => {
    await renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Overdue" }));
    expect(getTableRowCount()).toBe(1);

    const invoices = getInvoiceNumbersInTable();
    expect(invoices).toContain("INV-203"); // overdue
    expect(invoices).not.toContain("INV-201"); // sent
  });

  // IT-08: Record Payment modal opens with correct patient info
  test("clicking 'Record Payment' opens modal with correct patient info", async () => {
    await renderPage();

    // Click first Record Payment button (for Alice — INV-201)
    const recordButtons = screen.getAllByText("Record Payment");
    await userEvent.click(recordButtons[0]);

    expect(screen.getByTestId("payment-modal")).toBeInTheDocument();
    expect(screen.getByTestId("modal-patient-id").textContent).toBe("1");
    expect(screen.getByTestId("modal-patient-name").textContent).toBe("Alice Smith");
  });
});

describe("Integration — Cross-Tab Patient Filter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // IT-09: Patient filter works across all 4 tabs
  test("patient filter persists and shows correct results across all tabs", async () => {
    await renderPage();

    // Select Alice (patient 1)
    const searchInput = screen.getByPlaceholderText("Search by patient name or email...");
    await userEvent.click(searchInput);
    await userEvent.type(searchInput, "Alice");

    const aliceOptions = await screen.findAllByText("Alice Smith");
    const dropdownOption = aliceOptions.find(
      (el) => el.tagName === "DIV" && el.className.includes("font-medium")
    );
    await userEvent.click(dropdownOption!);

    // All tab: Alice has 2 unpaid invoices (INV-201 sent, INV-203 overdue)
    await waitFor(() => {
      expect(getTableRowCount()).toBe(2);
    });

    // Pending tab: Alice has 1 sent invoice
    await userEvent.click(screen.getByRole("button", { name: "Pending" }));
    expect(getTableRowCount()).toBe(1);
    expect(screen.getByText("INV-201")).toBeInTheDocument();

    // Overdue tab: Alice has 1 overdue invoice
    await userEvent.click(screen.getByRole("button", { name: "Overdue" }));
    expect(getTableRowCount()).toBe(1);
    expect(screen.getByText("INV-203")).toBeInTheDocument();

    // Paid tab: Alice has 1 paid invoice
    await userEvent.click(screen.getByRole("button", { name: "Paid" }));
    expect(getTableRowCount()).toBe(1);
    expect(screen.getByText("INV-204")).toBeInTheDocument();
  });

  // Additional: Clear patient filter restores full counts
  test("clearing patient filter restores full counts on all tabs", async () => {
    await renderPage();

    // Select Alice
    const searchInput = screen.getByPlaceholderText("Search by patient name or email...");
    await userEvent.click(searchInput);
    await userEvent.type(searchInput, "Alice");
    const aliceOptions = await screen.findAllByText("Alice Smith");
    const dropdownOption = aliceOptions.find(
      (el) => el.tagName === "DIV" && el.className.includes("font-medium")
    );
    await userEvent.click(dropdownOption!);

    // All tab filtered to Alice: 2 invoices
    await waitFor(() => {
      expect(getTableRowCount()).toBe(2);
    });

    // Clear filter
    await userEvent.click(searchInput);
    const clearOption = await screen.findByText("All Patients (Clear Selection)");
    await userEvent.click(clearOption);

    // All tab should now show 3 again
    await waitFor(() => {
      expect(getTableRowCount()).toBe(3);
    });
  });
});

describe("Integration — Cross-Page Consistency", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // IT-10 / IT-11: Staff page has correct link
  test("staff page has correct payment history link", async () => {
    await renderPage();

    const link = screen.getByText("View Payment History").closest("a");
    expect(link?.getAttribute("href")).toBe("/staff/payments/history");
  });
});
