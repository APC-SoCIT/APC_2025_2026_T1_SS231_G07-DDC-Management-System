# Implementation Plan: "Paid" Tab for Billing Dashboard

## 1. Executive Summary

The billing dashboard (`staff/billing/page.tsx` and `owner/billing/page.tsx`) currently filters and displays **only unpaid invoices** (`balance > 0 && status !== 'cancelled'`). Three tabs — **All**, **Pending** (`sent`), and **Overdue** — perform client-side filtering on this unpaid subset.

This plan adds a fourth **"Paid"** tab so users can browse historical, fully-settled invoices without leaving the billing page.

---

## 2. Current Architecture (As-Is)

### 2.1 Data Flow

```
getInvoices(token)          →  GET /api/invoices/   (returns ALL invoices)
        ↓
Frontend pre-filter          →  invoicesData.filter(balance > 0 && status !== 'cancelled')
        ↓
State: invoices[]            →  Only unpaid invoices stored
        ↓
Client-side tab filter       →  statusFilter === "all" | "sent" | "overdue"
        ↓
Render: filteredInvoices[]
```

### 2.2 Key Files

| File | Role |
|------|------|
| `frontend/app/staff/billing/page.tsx` | Staff billing page (419 LOC) |
| `frontend/app/owner/billing/page.tsx` | Owner billing page (419 LOC, near-identical) |
| `frontend/lib/api.ts` (L1123) | `getInvoices()` — fetches `GET /api/invoices/` |
| `frontend/lib/types.ts` (L24) | `Invoice` interface — `status: 'draft' \| 'sent' \| 'partially_paid' \| 'paid' \| 'overdue' \| 'cancelled'` |
| `backend/api/models.py` (L784) | `Invoice.STATUS_CHOICES` — includes `('paid', 'Paid')` |
| `backend/api/views.py` (L2807) | `InvoiceViewSet` — supports `?status=paid` query param |

### 2.3 Current Tab Definitions (L296–L300 of both pages)

```tsx
const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "overdue">("all")

// Tab config
{ id: "all",     label: "All" }       // Shows all unpaid
{ id: "sent",    label: "Pending" }   // status === "sent"
{ id: "overdue", label: "Overdue" }   // status === "overdue"
```

### 2.4 Critical Observation

Because `fetchData()` pre-filters to `balance > 0`, **paid invoices (`balance === 0`, `status === 'paid'`) are stripped out before they ever reach state**. The "Paid" tab therefore requires a change to the data-fetching/storage strategy.

---

## 3. Proposed Architecture (To-Be)

### 3.1 Strategy: Dual-List Approach (Recommended)

Store **two separate lists** in state — one for unpaid invoices (existing behavior) and one for paid invoices — to keep rendering logic clean and avoid performance issues from loading large datasets unnecessarily.

```
getInvoices(token)
        ↓
ALL invoicesData returned
        ↓
┌─────────────────────────────────┐
│  unpaidInvoices                 │ → balance > 0 && status !== 'cancelled'
│  paidInvoices                   │ → status === 'paid'
└─────────────────────────────────┘
        ↓
statusFilter selects active list:
  "all"     → unpaidInvoices
  "sent"    → unpaidInvoices.filter(status === "sent")
  "overdue" → unpaidInvoices.filter(status === "overdue")
  "paid"    → paidInvoices
```

### 3.2 Alternative Considered: Lazy-Fetch Paid Tab

Fetch paid invoices on-demand via `GET /api/invoices/?status=paid` only when the tab is activated. This is better for very large invoice histories but adds latency on tab-switch and complicates state. **Deferred for v2** — the current `getInvoices()` already returns all invoices, so splitting client-side is the simplest path.

---

## 4. Frontend UI/UX Updates

### 4.1 State Changes

#### 4.1.1 Widen the `statusFilter` Union Type

```tsx
// BEFORE
const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "overdue">("all")

// AFTER
const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "overdue" | "paid">("all")
```

#### 4.1.2 Add `paidInvoices` State

```tsx
const [invoices, setInvoices] = useState<InvoiceWithPatient[]>([])      // unpaid (existing)
const [paidInvoices, setPaidInvoices] = useState<InvoiceWithPatient[]>([]) // NEW
```

### 4.2 Data Fetching Changes (`fetchData`)

```tsx
const fetchData = async (authToken: string) => {
  // ... existing try/catch ...
  const [invoicesData, patientsData] = await Promise.all([
    getInvoices(authToken),
    getPatients(authToken),
  ])

  // Unpaid invoices (existing behavior — unchanged)
  const unpaidInvoices = invoicesData.filter(
    (inv: InvoiceWithPatient) => parseFloat(inv.balance) > 0 && inv.status !== "cancelled"
  )

  // NEW: Paid invoices
  const paid = invoicesData.filter(
    (inv: InvoiceWithPatient) => inv.status === "paid"
  )

  setInvoices(unpaidInvoices)
  setPaidInvoices(paid)        // NEW
  // ... rest unchanged ...
}
```

### 4.3 Filtering Logic Changes

```tsx
// Determine the base list based on active tab
const baseList = statusFilter === "paid" ? paidInvoices : invoices

const filteredInvoices = baseList.filter((invoice) => {
  // Status filter (skip for "all" and "paid" — both show entire list)
  if (statusFilter !== "all" && statusFilter !== "paid" && invoice.status !== statusFilter) {
    return false
  }
  // Patient filter (works across all tabs)
  if (selectedPatientFilter && invoice.patient !== selectedPatientFilter) {
    return false
  }
  return true
})
```

### 4.4 Tab UI Changes

#### 4.4.1 Add Tab Entry

```tsx
{[
  { id: "all",     label: "All" },
  { id: "sent",    label: "Pending" },
  { id: "overdue", label: "Overdue" },
  { id: "paid",    label: "Paid" },       // NEW
].map((tab) => ( /* existing rendering */ ))}
```

#### 4.4.2 Optional: Badge Counts on Tabs

For added clarity, show the count per tab:

```tsx
{ id: "all",     label: `All (${invoices.length})` },
{ id: "sent",    label: `Pending (${invoices.filter(i => i.status === "sent").length})` },
{ id: "overdue", label: `Overdue (${invoices.filter(i => i.status === "overdue").length})` },
{ id: "paid",    label: `Paid (${paidInvoices.length})` },
```

### 4.5 Summary Cards — Context-Aware (Optional Enhancement)

When the "Paid" tab is active, the summary cards should adapt:

| Card | Unpaid Tabs (All/Pending/Overdue) | Paid Tab |
|------|-----------------------------------|----------|
| Card 1 | Total Pending: ₱X | Total Settled: ₱X |
| Card 2 | Unpaid Invoices: N | Paid Invoices: N |
| Card 3 | Overdue: N | _(hidden or "Last Payment Date")_ |

This is an optional enhancement — at minimum, the numbers should be correct even if labels don't change.

### 4.6 Table Column Adjustments for Paid Tab

When `statusFilter === "paid"`:
- The **Balance** column will always be `₱0.00` — consider hiding it or replacing with **Date Paid** (`invoice.paid_at`).
- The **Actions** column currently shows "Record Payment" — for paid invoices, show a **"View Details"** button instead (or hide the action entirely).
- The balance text color should be green (`text-green-600`) instead of red.

### 4.7 Empty State

```tsx
// When statusFilter === "paid" and list is empty:
<p className="text-gray-600">No paid invoices found.</p>
```

---

## 5. Backend Changes

### 5.1 No Changes Required

The backend **already supports** everything needed:
- `Invoice.STATUS_CHOICES` includes `('paid', 'Paid')`.
- `InvoiceViewSet.get_queryset()` supports `?status=paid` query param filtering.
- The `getInvoices()` API call already returns paid invoices — they're just filtered out by the frontend.

### 5.2 Future Optimization (Out of Scope)

For large datasets, consider:
- Server-side pagination: `GET /api/invoices/?status=paid&page=1&page_size=20`
- A dedicated endpoint: `GET /api/invoices/paid/`

---

## 6. Affected Files — Change Checklist

| # | File | Change Type | Description |
|---|------|-------------|-------------|
| 1 | `frontend/app/staff/billing/page.tsx` | Modify | Add `paid` to state union, add `paidInvoices` state, update `fetchData`, update filter logic, add tab, adjust table rendering |
| 2 | `frontend/app/owner/billing/page.tsx` | Modify | Identical changes (mirror of staff page) |
| 3 | `frontend/lib/types.ts` | None | `Invoice.status` already includes `'paid'` |
| 4 | `frontend/lib/api.ts` | None | `getInvoices()` already returns paid invoices |
| 5 | `backend/api/models.py` | None | `STATUS_CHOICES` already includes `'paid'` |
| 6 | `backend/api/views.py` | None | `?status=paid` already supported |

---

## 7. Comprehensive Testing Strategy

### 7.1 Unit Tests — Frontend Tab Component & Filtering Logic

#### 7.1.1 Tab Rendering Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| UT-01 | Render billing page | Four tabs visible: "All", "Pending", "Overdue", "Paid" |
| UT-02 | Default tab is "All" | "All" tab has active styling; others inactive |
| UT-03 | Click "Paid" tab | "Paid" tab becomes active; others become inactive |
| UT-04 | Click each tab sequentially | Only one tab active at any time |

#### 7.1.2 Filtering Logic Tests

| Test ID | Test Case | Input Data | Expected Result |
|---------|-----------|------------|-----------------|
| UT-05 | "All" tab shows only unpaid | 3 unpaid + 2 paid invoices | 3 invoices displayed |
| UT-06 | "Pending" tab filters correctly | 2 `sent` + 1 `overdue` unpaid | 2 invoices displayed |
| UT-07 | "Overdue" tab filters correctly | 2 `sent` + 1 `overdue` unpaid | 1 invoice displayed |
| UT-08 | **"Paid" tab shows settled invoices** | 3 unpaid + 2 paid invoices | 2 invoices displayed |
| UT-09 | "Paid" tab with patient filter | 2 paid (patient A) + 1 paid (patient B), filter=A | 1 invoice displayed |
| UT-10 | "Paid" tab empty state | 0 paid invoices | "No paid invoices found" message |
| UT-11 | Cancelled invoices excluded from all tabs | 1 cancelled invoice | Not visible in any tab |

#### 7.1.3 Summary Card Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| UT-12 | "All" tab total calculation | Sum of `balance` for unpaid invoices |
| UT-13 | "Paid" tab total calculation | Sum of `total_due` for paid invoices |

#### 7.1.4 Table Rendering Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| UT-14 | Paid tab hides/changes "Record Payment" button | "View Details" shown instead (or button hidden) |
| UT-15 | Paid invoice status badge | Green badge with "Paid" text |
| UT-16 | Paid invoice balance display | Shows ₱0.00 or "Date Paid" column |

### 7.2 Integration Tests

#### 7.2.1 Data Fetching Integration

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| IT-01 | API returns mixed statuses | `invoices` state has only unpaid; `paidInvoices` state has only paid |
| IT-02 | API returns no paid invoices | `paidInvoices` is empty array; "Paid" tab shows empty state |
| IT-03 | API returns only paid invoices | `invoices` is empty; "All" tab shows empty; "Paid" tab shows all |
| IT-04 | Payment recorded on last unpaid → invoice moves to "Paid" | After `handlePaymentSuccess`, invoice disappears from "All" and appears in "Paid" |

#### 7.2.2 Regression Tests — Existing Tabs

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| IT-05 | "All" tab after adding Paid tab | Still shows only unpaid invoices (no behavior change) |
| IT-06 | "Pending" tab after adding Paid tab | Still filters by `status === "sent"` correctly |
| IT-07 | "Overdue" tab after adding Paid tab | Still filters by `status === "overdue"` correctly |
| IT-08 | Patient filter works across all 4 tabs | Filtering by patient correctly narrows each tab |
| IT-09 | Record Payment flow still works | Modal opens, payment recorded, data refreshes |

#### 7.2.3 Cross-Page Consistency Tests

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| IT-10 | Staff billing page has Paid tab | Identical behavior to owner page |
| IT-11 | Owner billing page has Paid tab | Identical behavior to staff page |

### 7.3 Manual / Exploratory Testing

| Test ID | Scenario |
|---------|----------|
| MT-01 | Load page with 100+ paid invoices — verify no performance lag |
| MT-02 | Switch rapidly between tabs — verify no flicker or stale data |
| MT-03 | Resize browser to mobile — verify Paid tab is visible and responsive |
| MT-04 | Verify Paid tab appears correctly in both staff and owner dashboards |

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Large paid invoice dataset causes slow rendering | Medium | Medium | Implement pagination or virtual scrolling in v2 |
| Tab order confusion for existing users | Low | Low | Append "Paid" as last tab (right of "Overdue") |
| Dual-list state inconsistency after payment | Low | Medium | `fetchData()` refresh rebuilds both lists from the same API response |
| Regression in existing tabs | Low | High | Comprehensive integration tests (IT-05 through IT-09) |

---

## 9. Implementation Order

1. **State & type updates** — widen union, add `paidInvoices` state
2. **Data fetching** — split invoices into paid/unpaid in `fetchData`
3. **Filtering logic** — update `filteredInvoices` derivation
4. **Tab UI** — add "Paid" tab button
5. **Table rendering** — conditional column/action rendering for paid tab
6. **Mirror to owner page** — apply identical changes
7. **Testing** — unit + integration tests
8. **Code review & QA** — manual verification
