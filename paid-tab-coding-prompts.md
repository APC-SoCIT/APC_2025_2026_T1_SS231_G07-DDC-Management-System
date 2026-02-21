# Step-by-Step Coding Prompts: "Paid" Tab Implementation

> Feed these prompts sequentially. Each builds on the previous one's output.

---

## Prompt 1: Update State Types and Add `paidInvoices` State

**Scope:** `frontend/app/staff/billing/page.tsx` — state declarations only  
**Goal:** Prepare the state layer to hold paid invoices and the new tab value.

```
In `frontend/app/staff/billing/page.tsx`, make these two changes to the state declarations (around lines 19–29):

1. Widen the `statusFilter` state type from `"all" | "sent" | "overdue"` to `"all" | "sent" | "overdue" | "paid"`.

2. Add a new state variable `paidInvoices` of type `InvoiceWithPatient[]`, initialized as an empty array, right after the existing `invoices` state declaration.

Do not change any other code in this file. Do not touch the owner page yet.
```

---

## Prompt 2: Update `fetchData` to Populate `paidInvoices`

**Scope:** `frontend/app/staff/billing/page.tsx` — `fetchData` function only  
**Goal:** After fetching all invoices, split them into unpaid (existing) and paid (new).

```
In `frontend/app/staff/billing/page.tsx`, update the `fetchData` function (around lines 56–75):

After the existing `unpaidInvoices` filter that keeps invoices with `balance > 0 && status !== 'cancelled'`, add a second filter that extracts paid invoices:

  const paid = invoicesData.filter(
    (inv: InvoiceWithPatient) => inv.status === "paid"
  )

Then call `setPaidInvoices(paid)` alongside `setInvoices(unpaidInvoices)`.

All existing logic must remain unchanged — the `unpaidInvoices` filter, the `setPatients` call, and the error handling.
```

---

## Prompt 3: Update Filtering Logic to Support the "Paid" Tab

**Scope:** `frontend/app/staff/billing/page.tsx` — `filteredInvoices` derivation only  
**Goal:** When the "Paid" tab is active, filter from `paidInvoices` instead of `invoices`.

```
In `frontend/app/staff/billing/page.tsx`, update the `filteredInvoices` filter block (around lines 95–103):

1. Determine the base list: if `statusFilter === "paid"`, use `paidInvoices`; otherwise use `invoices`.

2. In the status filter condition, skip the status comparison when `statusFilter` is `"all"` OR `"paid"` (both should show their entire base list without further status matching).

3. The patient filter (`selectedPatientFilter`) must continue to work on all tabs, including "Paid".

The resulting logic should look like:

  const baseList = statusFilter === "paid" ? paidInvoices : invoices
  const filteredInvoices = baseList.filter((invoice) => {
    if (statusFilter !== "all" && statusFilter !== "paid" && invoice.status !== statusFilter) return false
    if (selectedPatientFilter && invoice.patient !== selectedPatientFilter) return false
    return true
  })

Do not change the summary card calculations or any rendering code.
```

---

## Prompt 4: Add "Paid" Tab Button to the UI

**Scope:** `frontend/app/staff/billing/page.tsx` — tab rendering section only  
**Goal:** Add the fourth tab button.

```
In `frontend/app/staff/billing/page.tsx`, locate the Status Tabs section (around lines 296–310) where the tab definitions array is:

  { id: "all", label: "All" },
  { id: "sent", label: "Pending" },
  { id: "overdue", label: "Overdue" },

Add a fourth entry at the end:

  { id: "paid", label: "Paid" },

No other changes needed — the existing `.map()` rendering and active-state styling already handle dynamic tabs.
```

---

## Prompt 5: Adjust Table Rendering for the Paid Tab

**Scope:** `frontend/app/staff/billing/page.tsx` — table body rendering  
**Goal:** Conditionally modify the Actions column and balance display for paid invoices.

```
In `frontend/app/staff/billing/page.tsx`, make these changes to the invoice table (around lines 350–400):

1. **Balance column:** When `statusFilter === "paid"`, display the balance in green text (`text-green-600`) instead of red (`text-red-600`), or show the `paid_at` date instead.

2. **Actions column:** When `statusFilter === "paid"`, hide the "Record Payment" button entirely (paid invoices don't need payment). Optionally show a "View Details" link or leave the cell empty.

3. **Empty state message:** Update the empty state text to be tab-aware:
   - For "paid" tab: "No paid invoices found."
   - For other tabs: Keep the existing message.

Ensure all existing rendering for unpaid tabs is unaffected.
```

---

## Prompt 6: (Optional) Adapt Summary Cards for the Paid Tab

**Scope:** `frontend/app/staff/billing/page.tsx` — summary cards section  
**Goal:** Show contextually relevant summary numbers when the Paid tab is active.

```
In `frontend/app/staff/billing/page.tsx`, update the summary cards section (around lines 175–210):

When `statusFilter === "paid"`:
- Card 1: Show "Total Settled" with the sum of `total_due` from `filteredInvoices` (paid invoices)
- Card 2: Show "Paid Invoices" with `filteredInvoices.length`
- Card 3: Show "Last Paid" with the most recent `paid_at` date, or hide the card

When any other tab is active:
- Keep the existing behavior (Total Pending, Unpaid Invoices, Overdue count)

Add the necessary computed values:

  const totalSettled = statusFilter === "paid"
    ? filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_due), 0)
    : 0

  const lastPaidDate = statusFilter === "paid" && filteredInvoices.length > 0
    ? new Date(Math.max(...filteredInvoices.map(i => new Date(i.paid_at || i.updated_at).getTime()))).toLocaleDateString()
    : null
```

---

## Prompt 7: Mirror All Changes to the Owner Billing Page

**Scope:** `frontend/app/owner/billing/page.tsx`  
**Goal:** Apply the exact same changes so the owner dashboard matches.

```
Apply all changes from Prompts 1–6 to `frontend/app/owner/billing/page.tsx`.

This file is structurally identical to the staff billing page. The only difference is:
- The component is named `OwnerBillingPage` (vs `StaffBillingPage`)
- The "View Payment History" link points to `/owner/payments/history` (vs `/staff/payments/history`)

Copy the same state additions, fetchData changes, filtering logic, tab definition, table rendering, and summary card updates. Verify no staff-specific paths are accidentally introduced.
```

---

## Prompt 8: Write Unit Tests for Tab Rendering and Filtering Logic

**Scope:** New test file (e.g., `frontend/__tests__/billing-tabs.test.tsx` or co-located)  
**Goal:** Verify tab behavior and filtering correctness.

```
Create unit tests for the billing page tab functionality. Use the project's existing testing framework (React Testing Library + Jest or Vitest).

Write tests for:

1. **Tab rendering** — Verify all 4 tabs ("All", "Pending", "Overdue", "Paid") render on the page.

2. **Default state** — The "All" tab is active by default.

3. **Tab switching** — Clicking "Paid" activates it; clicking "All" returns to default.

4. **Filtering — "All" tab** — Given a mock dataset with 3 unpaid (2 sent, 1 overdue) and 2 paid invoices, the "All" tab shows exactly 3 rows.

5. **Filtering — "Pending" tab** — Same dataset → 2 rows (status "sent" only).

6. **Filtering — "Overdue" tab** — Same dataset → 1 row.

7. **Filtering — "Paid" tab** — Same dataset → 2 rows.

8. **Filtering — "Paid" + patient filter** — Paid tab with patient filter → only matching patient's paid invoices.

9. **Empty state** — "Paid" tab with 0 paid invoices → "No paid invoices found" message.

10. **Cancelled exclusion** — Cancelled invoices don't appear in any tab.

Mock `getInvoices` and `getPatients` to return controlled test data. Mock `localStorage.getItem` to return a fake token.
```

---

## Prompt 9: Write Integration Tests for Data Flow and Regressions

**Scope:** New or extended test file  
**Goal:** Validate end-to-end data flow and confirm no regressions.

```
Write integration tests that validate:

1. **Data splitting** — After fetchData completes with a mixed-status API response, `invoices` state contains only unpaid items and `paidInvoices` state contains only paid items.

2. **Payment success refresh** — After `handlePaymentSuccess` is called, both `invoices` and `paidInvoices` are refreshed from the API. If a previously unpaid invoice is now paid, it moves from the unpaid list to the paid list.

3. **Regression: Existing "All" tab** — With the Paid tab implemented, the "All" tab still shows only unpaid invoices (not paid).

4. **Regression: "Pending" tab** — Still correctly shows `status === "sent"` invoices only.

5. **Regression: "Overdue" tab** — Still correctly shows `status === "overdue"` invoices only.

6. **Regression: Record Payment modal** — Clicking "Record Payment" on an unpaid invoice still opens the modal with correct patient info.

7. **Cross-tab patient filter** — Setting a patient filter and switching between tabs maintains the filter and shows correct results per tab.

Use MSW (Mock Service Worker) or direct fetch mocking to simulate API responses.
```

---

## Prompt 10: Final Review and Cleanup

**Scope:** All modified files  
**Goal:** Polish, verify consistency, and remove debug artifacts.

```
Review all changes across both billing pages and test files:

1. Verify the staff and owner pages are functionally identical (same state, same logic, same UI).
2. Remove any `console.log` debug statements added during development.
3. Verify TypeScript has no type errors — run `npx tsc --noEmit`.
4. Verify the ESLint/Prettier formatting is consistent — run `npx next lint`.
5. Run all tests and confirm they pass.
6. Manually test in the browser:
   - Start with some paid and unpaid invoices in the database.
   - Verify each tab shows the correct data.
   - Record a payment that fully settles an invoice → confirm it moves to the Paid tab after refresh.
   - Check mobile responsiveness of the 4-tab layout.
```

---

## Summary: Prompt Sequence

| # | Prompt | Files | Type |
|---|--------|-------|------|
| 1 | Update state types | `staff/billing/page.tsx` | State |
| 2 | Update `fetchData` | `staff/billing/page.tsx` | Data |
| 3 | Update filtering logic | `staff/billing/page.tsx` | Logic |
| 4 | Add tab button | `staff/billing/page.tsx` | UI |
| 5 | Adjust table rendering | `staff/billing/page.tsx` | UI |
| 6 | Adapt summary cards (optional) | `staff/billing/page.tsx` | UI |
| 7 | Mirror to owner page | `owner/billing/page.tsx` | Mirror |
| 8 | Unit tests | New test file | Test |
| 9 | Integration tests | New test file | Test |
| 10 | Final review | All files | QA |
