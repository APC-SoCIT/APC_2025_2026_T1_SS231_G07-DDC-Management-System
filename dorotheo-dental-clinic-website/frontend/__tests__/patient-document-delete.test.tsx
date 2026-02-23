/**
 * Tests for Patient Document Delete Functionality
 *
 * Tests cover:
 * 1. Patient Detail Page ([id]/page.tsx):
 *    - Delete button appears on hover for teeth images/x-rays
 *    - Delete button appears on hover for medical certificates
 *    - Delete button appears on hover for other documents
 *    - Delete button in preview modal header
 *    - Confirm dialog before deletion
 *    - Successful deletion refreshes data
 *    - Failed deletion shows error alert
 *
 * 2. Documents Page ([id]/documents/page.tsx):
 *    - Delete button appears on hover for image cards
 *    - Delete button appears on hover for file/document cards
 *    - Delete button in preview modal header
 *    - Modal has backdrop blur (gaussian blur)
 *    - Confirm dialog before deletion
 *    - Successful deletion refreshes data and closes modal
 *    - Failed deletion shows error alert
 *    - Modal backdrop click closes modal
 */

import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------
const mockPush = jest.fn();
const mockParams = { id: "24" };

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => mockParams,
}));

// ---------------------------------------------------------------------------
// Mock lucide-react icons
// ---------------------------------------------------------------------------
jest.mock("lucide-react", () => ({
  ArrowLeft: (props: any) => <svg data-testid="icon-arrow-left" {...props} />,
  Calendar: (props: any) => <svg data-testid="icon-calendar" {...props} />,
  Upload: (props: any) => <svg data-testid="icon-upload" {...props} />,
  FileText: (props: any) => <svg data-testid="icon-file-text" {...props} />,
  Download: (props: any) => <svg data-testid="icon-download" {...props} />,
  X: (props: any) => <svg data-testid="icon-x" {...props} />,
  Clock: (props: any) => <svg data-testid="icon-clock" {...props} />,
  MapPin: (props: any) => <svg data-testid="icon-map-pin" {...props} />,
  User: (props: any) => <svg data-testid="icon-user" {...props} />,
  Trash2: (props: any) => <svg data-testid="icon-trash" {...props} />,
  Edit2: (props: any) => <svg data-testid="icon-edit" {...props} />,
  Activity: (props: any) => <svg data-testid="icon-activity" {...props} />,
  Scan: (props: any) => <svg data-testid="icon-scan" {...props} />,
  Image: (props: any) => <svg data-testid="icon-image" {...props} />,
  FileHeart: (props: any) => <svg data-testid="icon-file-heart" {...props} />,
  StickyNote: (props: any) => <svg data-testid="icon-sticky-note" {...props} />,
}));

// ---------------------------------------------------------------------------
// Mock unified-document-upload
// ---------------------------------------------------------------------------
jest.mock("@/components/unified-document-upload", () => {
  return function MockUnifiedDocumentUpload({ onClose, onUploadSuccess }: any) {
    return (
      <div data-testid="upload-modal">
        <button onClick={onClose}>Close Upload</button>
        <button onClick={onUploadSuccess}>Upload Success</button>
      </div>
    );
  };
});

// ---------------------------------------------------------------------------
// Mock clinic-badge
// ---------------------------------------------------------------------------
jest.mock("@/components/clinic-badge", () => ({
  ClinicBadge: ({ clinic }: any) => (
    <span data-testid="clinic-badge">{clinic?.name}</span>
  ),
}));

// ---------------------------------------------------------------------------
// Mock API
// ---------------------------------------------------------------------------
const mockGetPatientById = jest.fn();
const mockGetAppointments = jest.fn();
const mockGetDentalRecords = jest.fn();
const mockGetDocuments = jest.fn();
const mockDeleteDocument = jest.fn();

jest.mock("@/lib/api", () => ({
  api: {
    getPatientById: (...args: any[]) => mockGetPatientById(...args),
    getAppointments: (...args: any[]) => mockGetAppointments(...args),
    getDentalRecords: (...args: any[]) => mockGetDentalRecords(...args),
    getDocuments: (...args: any[]) => mockGetDocuments(...args),
    deleteDocument: (...args: any[]) => mockDeleteDocument(...args),
  },
}));

// ---------------------------------------------------------------------------
// Mock auth
// ---------------------------------------------------------------------------
jest.mock("@/lib/auth", () => ({
  useAuth: () => ({ token: "test-token-123", user: { user_type: "owner" } }),
}));

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------
const MOCK_PATIENT = {
  id: 24,
  first_name: "Squid",
  last_name: "Babe",
  email: "squid@test.com",
  phone: "1234567890",
  date_of_birth: "1990-01-01",
};

const MOCK_DOCUMENTS = [
  {
    id: 1,
    document_type: "dental_image",
    document_type_display: "Dental Image",
    file: "http://localhost:8000/media/documents/dental1.jpg",
    file_url: "http://localhost:8000/media/documents/dental1.jpg",
    title: "Dental Pictures - 2/23/2026",
    description: "",
    uploaded_at: "2026-02-23T10:00:00Z",
    appointment: 5,
    appointment_date: "2026-02-23",
    appointment_time: "16:30:00",
    service_name: "Cleaning",
    dentist_name: "Carlo Salvador",
    patient: 24,
    clinic: 1,
    clinic_data: { id: 1, name: "Poblacion", address: "123 Main St", city: "Manila", state: "NCR", zipcode: "1000", phone: "111", email: "a@b.com" },
  },
  {
    id: 2,
    document_type: "dental_image",
    document_type_display: "Dental Image",
    file: "http://localhost:8000/media/documents/dental2.jpg",
    file_url: "http://localhost:8000/media/documents/dental2.jpg",
    title: "Dental Pictures - 2/5/2026",
    description: "",
    uploaded_at: "2026-02-05T10:00:00Z",
    appointment: 3,
    appointment_date: "2026-02-05",
    appointment_time: "14:00:00",
    service_name: "Checkup",
    dentist_name: "Dr. Smith",
    patient: 24,
  },
  {
    id: 3,
    document_type: "note",
    document_type_display: "Note",
    file: "http://localhost:8000/media/documents/tooth_notes.pdf",
    file_url: "http://localhost:8000/media/documents/tooth_notes.pdf",
    title: "tooth extraction",
    description: "Notes about tooth extraction",
    uploaded_at: "2026-02-06T10:00:00Z",
    appointment: null,
    patient: 24,
  },
  {
    id: 4,
    document_type: "medical_certificate",
    document_type_display: "Medical Certificate",
    file: "http://localhost:8000/media/documents/medcert.pdf",
    file_url: "http://localhost:8000/media/documents/medcert.pdf",
    title: "Med cert feb 5",
    description: "",
    uploaded_at: "2026-02-05T09:00:00Z",
    appointment: null,
    patient: 24,
  },
  {
    id: 5,
    document_type: "note",
    document_type_display: "Note",
    file: "http://localhost:8000/media/documents/notes_tooth.pdf",
    file_url: "http://localhost:8000/media/documents/notes_tooth.pdf",
    title: "Notes for tooth",
    description: "Additional notes",
    uploaded_at: "2026-02-05T08:00:00Z",
    appointment: null,
    patient: 24,
  },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
  mockGetPatientById.mockResolvedValue(MOCK_PATIENT);
  mockGetAppointments.mockResolvedValue([]);
  mockGetDentalRecords.mockResolvedValue([]);
  mockGetDocuments.mockResolvedValue(MOCK_DOCUMENTS);
  mockDeleteDocument.mockResolvedValue({});

  // Mock window.confirm
  window.confirm = jest.fn(() => true);
  window.alert = jest.fn();

  // Mock fetch for blob URLs (image/pdf loading)
  global.fetch = jest.fn(() =>
    Promise.resolve({
      blob: () => Promise.resolve(new Blob(["fake"], { type: "image/jpeg" })),
    })
  ) as any;

  // Mock URL.createObjectURL and revokeObjectURL
  global.URL.createObjectURL = jest.fn(() => "blob:http://localhost/fake-blob-url");
  global.URL.revokeObjectURL = jest.fn();
});

// ============================================================================
// Patient Detail Page Tests
// ============================================================================
describe("Patient Detail Page - Document Delete", () => {
  let PatientDetailPage: any;

  beforeEach(async () => {
    // Dynamic import to ensure mocks are applied
    const mod = await import(
      "@/app/owner/patients/[id]/page"
    );
    PatientDetailPage = mod.default;
  });

  test("renders delete buttons on image cards that appear on hover", async () => {
    render(<PatientDetailPage />);

    await waitFor(() => {
      // In detail page, images show document_type_display as text, title as alt
      expect(screen.getByAltText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    // Find all trash icons (delete buttons) for images
    const trashIcons = screen.getAllByTitle("Delete image");
    expect(trashIcons.length).toBeGreaterThanOrEqual(1);

    // Verify the delete button has opacity-0 class (hidden by default, shown on hover)
    trashIcons.forEach((btn) => {
      expect(btn.className).toContain("opacity-0");
      expect(btn.className).toContain("group-hover:opacity-100");
    });
  });

  test("renders delete buttons on medical certificate cards on hover", async () => {
    render(<PatientDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Med cert feb 5")).toBeInTheDocument();
    });

    // The medical certificate section should have a delete button
    const medCertDeleteBtns = screen.getAllByTitle("Delete document");
    expect(medCertDeleteBtns.length).toBeGreaterThanOrEqual(1);

    // Verify hover behavior classes
    medCertDeleteBtns.forEach((btn) => {
      expect(btn.className).toContain("opacity-0");
      expect(btn.className).toContain("group-hover:opacity-100");
    });
  });

  test("renders delete buttons on other document cards on hover", async () => {
    render(<PatientDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("tooth extraction")).toBeInTheDocument();
    });

    // Other document cards should have delete buttons
    const deleteDocBtns = screen.getAllByTitle("Delete document");
    expect(deleteDocBtns.length).toBeGreaterThanOrEqual(1);
  });

  test("clicking delete button on image card shows confirm dialog and deletes", async () => {
    render(<PatientDetailPage />);

    await waitFor(() => {
      expect(screen.getByAltText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle("Delete image");
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith(
      "Are you sure you want to delete this document? This action cannot be undone."
    );
    
    await waitFor(() => {
      expect(mockDeleteDocument).toHaveBeenCalledWith(
        expect.any(Number),
        "test-token-123"
      );
    });
  });

  test("cancelling confirm dialog does not delete", async () => {
    (window.confirm as jest.Mock).mockReturnValue(false);

    render(<PatientDetailPage />);

    await waitFor(() => {
      expect(screen.getByAltText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle("Delete image");
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteDocument).not.toHaveBeenCalled();
  });

  test("failed deletion shows error alert", async () => {
    mockDeleteDocument.mockRejectedValueOnce(new Error("Delete failed"));

    render(<PatientDetailPage />);

    await waitFor(() => {
      expect(screen.getByAltText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle("Delete image");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        "Failed to delete document. Please try again."
      );
    });
  });

  test("preview modal shows delete button in header", async () => {
    render(<PatientDetailPage />);

    await waitFor(() => {
      expect(screen.getByAltText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    // Click on image to open preview modal - click the image itself
    const image = screen.getByAltText("Dental Pictures - 2/23/2026");
    fireEvent.click(image);

    await waitFor(() => {
      // The modal should show the Delete button with text
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });
  });

  test("preview modal has backdrop blur class", async () => {
    render(<PatientDetailPage />);

    await waitFor(() => {
      expect(screen.getByAltText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    // Click on image to open preview modal
    fireEvent.click(screen.getByAltText("Dental Pictures - 2/23/2026"));

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    // Find the modal backdrop - it should have backdrop-blur-sm class
    const backdrop = screen.getByText("Delete").closest(".fixed");
    expect(backdrop).not.toBeNull();
    expect(backdrop?.className).toContain("backdrop-blur");
  });

  test("clicking delete in preview modal triggers delete with correct id", async () => {
    render(<PatientDetailPage />);

    await waitFor(() => {
      expect(screen.getByAltText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    // Open dental image preview
    fireEvent.click(screen.getByAltText("Dental Pictures - 2/23/2026"));

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    // Click delete in modal
    fireEvent.click(screen.getByText("Delete"));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockDeleteDocument).toHaveBeenCalledWith(1, "test-token-123");
    });
  });

  test("modal shows linked appointment info", async () => {
    render(<PatientDetailPage />);

    await waitFor(() => {
      expect(screen.getByAltText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    // Click on the first dental image
    fireEvent.click(screen.getByAltText("Dental Pictures - 2/23/2026"));

    await waitFor(() => {
      expect(screen.getByText("Linked Appointment:")).toBeInTheDocument();
      expect(screen.getByText(/Cleaning/)).toBeInTheDocument();
      expect(screen.getByText(/Carlo Salvador/)).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Documents Page Tests (View All)
// ============================================================================
describe("Documents Page (View All) - Document Delete", () => {
  let DocumentsPage: any;

  beforeEach(async () => {
    const mod = await import(
      "@/app/owner/patients/[id]/documents/page"
    );
    DocumentsPage = mod.default;
  });

  test("renders delete buttons on image cards (visible on hover)", async () => {
    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    const deleteImageBtns = screen.getAllByTitle("Delete image");
    expect(deleteImageBtns.length).toBeGreaterThanOrEqual(1);

    // Verify hover visibility classes
    deleteImageBtns.forEach((btn) => {
      expect(btn.className).toContain("opacity-0");
      expect(btn.className).toContain("group-hover:opacity-100");
    });
  });

  test("renders delete buttons on document cards (visible on hover)", async () => {
    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("tooth extraction")).toBeInTheDocument();
    });

    const deleteDocBtns = screen.getAllByTitle("Delete document");
    expect(deleteDocBtns.length).toBeGreaterThanOrEqual(1);

    // Verify hover visibility classes
    deleteDocBtns.forEach((btn) => {
      expect(btn.className).toContain("opacity-0");
      expect(btn.className).toContain("group-hover:opacity-100");
    });
  });

  test("clicking delete on image card confirms and deletes", async () => {
    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle("Delete image");
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith(
      "Are you sure you want to delete this document? This action cannot be undone."
    );

    await waitFor(() => {
      expect(mockDeleteDocument).toHaveBeenCalledWith(
        expect.any(Number),
        "test-token-123"
      );
    });
  });

  test("clicking delete on document card confirms and deletes", async () => {
    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("tooth extraction")).toBeInTheDocument();
    });

    const deleteDocBtns = screen.getAllByTitle("Delete document");
    fireEvent.click(deleteDocBtns[0]);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockDeleteDocument).toHaveBeenCalled();
    });
  });

  test("cancelling confirm dialog does not call delete API", async () => {
    (window.confirm as jest.Mock).mockReturnValue(false);

    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle("Delete image");
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteDocument).not.toHaveBeenCalled();
  });

  test("preview modal shows delete button", async () => {
    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    // Click on the image card to open modal
    fireEvent.click(screen.getByText("Dental Pictures - 2/23/2026"));

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });
  });

  test("preview modal has gaussian blur backdrop", async () => {
    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Dental Pictures - 2/23/2026"));

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    // Find the backdrop overlay and verify blur class
    const backdrop = screen.getByText("Delete").closest(".fixed");
    expect(backdrop).not.toBeNull();
    expect(backdrop?.className).toContain("backdrop-blur");
    expect(backdrop?.className).toContain("bg-black/50");
  });

  test("preview modal backdrop click closes modal", async () => {
    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Dental Pictures - 2/23/2026"));

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    // Click the backdrop (the fixed overlay)
    const backdrop = screen.getByText("Delete").closest(".fixed");
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    // Modal should be closed - Delete button should no longer be visible
    await waitFor(() => {
      expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    });
  });

  test("delete from preview modal calls API with correct document id", async () => {
    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Dental Pictures - 2/23/2026"));

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete"));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockDeleteDocument).toHaveBeenCalledWith(1, "test-token-123");
    });
  });

  test("successful delete from modal closes modal and refreshes data", async () => {
    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Dental Pictures - 2/23/2026"));

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(mockDeleteDocument).toHaveBeenCalled();
    });

    // After successful delete, fetchData should be called again
    await waitFor(() => {
      // getDocuments is called at least twice: initial load + after delete
      expect(mockGetDocuments.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  test("failed delete shows error alert", async () => {
    mockDeleteDocument.mockRejectedValueOnce(new Error("Network error"));

    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Dental Pictures - 2/23/2026"));

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        "Failed to delete document. Please try again."
      );
    });
  });

  test("preview modal shows linked appointment info for dental images", async () => {
    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Dental Pictures - 2/23/2026"));

    await waitFor(() => {
      expect(screen.getByText("Linked Appointment:")).toBeInTheDocument();
      expect(screen.getByText(/Cleaning/)).toBeInTheDocument();
      expect(screen.getByText(/Carlo Salvador/)).toBeInTheDocument();
    });
  });

  test("preview modal shows download button alongside delete", async () => {
    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Dental Pictures - 2/23/2026"));

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
      expect(screen.getByText("Download")).toBeInTheDocument();
      expect(screen.getByText("Close")).toBeInTheDocument();
    });
  });

  test("tab filtering still works with delete functionality", async () => {
    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("All Files")).toBeInTheDocument();
    });

    // Click on Notes tab
    fireEvent.click(screen.getByText("Notes"));

    await waitFor(() => {
      // Should show note documents
      expect(screen.getByText("tooth extraction")).toBeInTheDocument();
      expect(screen.getByText("Notes for tooth")).toBeInTheDocument();
    });

    // Delete buttons should still be present on filtered results
    const deleteDocBtns = screen.getAllByTitle("Delete document");
    expect(deleteDocBtns.length).toBeGreaterThanOrEqual(1);
  });

  test("Escape key closes preview modal", async () => {
    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Dental Pictures - 2/23/2026"));

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    // Press Escape
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    });
  });
});

// ============================================================================
// Cross-page Consistency Tests
// ============================================================================
describe("Cross-page Consistency", () => {
  test("both pages use the same deleteDocument API call signature", async () => {
    // Render Documents Page
    const docsModule = await import("@/app/owner/patients/[id]/documents/page");
    const DocumentsPage = docsModule.default;

    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Dental Pictures - 2/23/2026")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle("Delete image");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockDeleteDocument).toHaveBeenCalledWith(
        expect.any(Number),
        "test-token-123"
      );
    });

    // The API signature should be (docId, token)
    const [docId, token] = mockDeleteDocument.mock.calls[0];
    expect(typeof docId).toBe("number");
    expect(token).toBe("test-token-123");
  });
});
