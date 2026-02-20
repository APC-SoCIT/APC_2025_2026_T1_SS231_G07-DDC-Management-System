# Analytics Feature — Step-by-Step Implementation Prompts

> **Instructions**: Copy and paste each prompt below into a new chat with your coding agent. Execute them **in order**. Each prompt is self-contained and references the `analytics_implementation_plan.md` for full context.

---

## Prompt 1: Backend Analytics Utility Functions

```
Read the file `dorotheo-dental-clinic-website/analytics_implementation_plan.md` for full context on the Analytics Dashboard feature we are building.

**Task**: Create the file `dorotheo-dental-clinic-website/backend/api/analytics_utils.py` containing all the aggregation query functions needed by the analytics endpoint.

**Requirements**:
1. Create helper functions:
   - `get_date_range(period, start_date=None, end_date=None)` — returns `(start_date, end_date)` tuple based on period (daily/weekly/monthly/annual) or custom dates.
   - `apply_clinic_filter(queryset, clinic_id, clinic_field='clinic')` — optionally filters a queryset by clinic_id.
   - `get_trunc_function(period)` — returns the appropriate `TruncDay`/`TruncWeek`/`TruncMonth` function for the period.

2. Create financial query functions:
   - `get_financial_summary(start_date, end_date, clinic_id=None)` — returns dict with total_revenue, total_invoiced, outstanding_balance, overdue_amount, total_expenses, profit, average_revenue_per_patient.
   - `get_revenue_time_series(start_date, end_date, period, clinic_id=None)` — returns list of {date, revenue, expenses} dicts.
   - `get_revenue_by_service(start_date, end_date, clinic_id=None)` — returns list of {service, category, revenue, count} dicts.
   - `get_revenue_by_dentist(start_date, end_date, clinic_id=None)` — returns list of {dentist_id, dentist_name, revenue, appointment_count} dicts.
   - `get_revenue_by_clinic(start_date, end_date)` — returns list of {clinic_id, clinic_name, revenue} dicts.
   - `get_invoice_status_distribution(start_date, end_date, clinic_id=None)` — returns list of {status, count, total} dicts.
   - `get_payment_method_distribution(start_date, end_date, clinic_id=None)` — returns list of {method, method_display, count, total} dicts.

3. Create operational query functions:
   - `get_operational_summary(start_date, end_date, clinic_id=None)` — returns dict with total_appointments, completed/cancelled/missed counts, cancellation_rate, no_show_rate, new_patients, returning_patients, total_unique_patients.
   - `get_appointment_status_distribution(start_date, end_date, clinic_id=None)` — status breakdown.
   - `get_top_services(start_date, end_date, clinic_id=None)` — top services by appointment count.
   - `get_appointments_by_clinic(start_date, end_date)` — clinic breakdown.
   - `get_appointments_by_dentist(start_date, end_date, clinic_id=None)` — dentist breakdown.
   - `get_busiest_hours(start_date, end_date, clinic_id=None)` — hour of day breakdown.
   - `get_patient_volume_time_series(start_date, end_date, period, clinic_id=None)` — time series of appointment counts and new patients.

4. Create inventory query functions:
   - `get_inventory_summary(clinic_id=None)` — low stock count, total value, low stock items, value by clinic.

**Key rules from the plan**:
- Revenue = `Payment.objects.filter(is_voided=False)` NOT the legacy `Billing` model.
- Expenses = `InvoiceItem.objects.filter(invoice__status__in=['sent','paid','overdue']).aggregate(Sum('total_price'))` — items actually consumed via invoices.
- New patients = patients whose FIRST-EVER completed appointment falls within the date range.
- Returning patients = patients with a completed appointment in the range whose first-ever appointment was BEFORE the range.
- Use Django ORM only (no raw SQL). Use `TruncDay`, `TruncMonth`, `ExtractHour`, `Coalesce`, `F`, `Q`, `Sum`, `Count`, `Avg`, `Min`.
- All Decimal values should be converted to float in the return dicts for JSON serialization.
- Reference Section 5 of the plan for exact query patterns.
```

---

## Prompt 2: Backend Analytics API Endpoint

```
Read the file `dorotheo-dental-clinic-website/analytics_implementation_plan.md` for full context.

**Task**: Rewrite the `analytics()` view function in `dorotheo-dental-clinic-website/backend/api/views.py` (currently at line ~2011) to use the utility functions from `backend/api/analytics_utils.py` (created in the previous step).

**Requirements**:
1. Keep it as an `@api_view(['GET'])` function-based view.
2. Add permission check: only `owner` or `staff` users can access.
3. Accept query parameters: `period` (default 'monthly'), `clinic_id` (optional), `start_date` (optional), `end_date` (optional).
4. Call the utility functions from `analytics_utils.py` to build the response.
5. Return the full structured JSON response matching the shape in Section 3.1 of the plan, with three top-level sections: `financial`, `operational`, `inventory`.
6. Include the `period`, `start_date`, `end_date`, `clinic_id`, and `clinic_name` metadata fields in the response.
7. Add proper error handling with try/except and appropriate HTTP status codes.
8. Add logging for errors.
9. Do NOT change the URL pattern — it should still be accessible at `/api/analytics/`.
10. Remove the old implementation that uses the legacy `Billing` model.

**Important**: The `analytics` function is imported in `backend/api/urls.py` so do NOT change its name or import path — just replace its implementation.
```

---

## Prompt 3: Frontend TypeScript Types & API Client Update

```
Read the file `dorotheo-dental-clinic-website/analytics_implementation_plan.md` for full context.

**Task**: Create TypeScript types and update the API client for the new analytics endpoint.

**Step A — Create `dorotheo-dental-clinic-website/frontend/lib/types/analytics.ts`**:
Define all TypeScript interfaces matching the backend response shape from Section 3.1 and 3.5 of the plan. Include:
- `AnalyticsResponse` (top-level)
- `FinancialAnalytics` with all sub-types: `TimeSeriesPoint`, `ServiceRevenue`, `DentistRevenue`, `ClinicRevenue`, `StatusDistribution`, `PaymentMethodDistribution`
- `OperationalAnalytics` with all sub-types: `TopService`, `ClinicCount`, `DentistCount`, `HourCount`, `PatientVolumePoint`
- `InventoryAnalytics` with sub-types: `LowStockItem`, `ClinicValue`

**Step B — Update `dorotheo-dental-clinic-website/frontend/lib/api.ts`**:
Modify the existing `getAnalytics` function (currently at line ~507) to:
1. Accept optional params: `period`, `clinic_id`, `start_date`, `end_date`.
2. Build query string from params.
3. Add proper error handling (throw on non-ok response).
4. Return typed `AnalyticsResponse`.

Keep all other API functions unchanged. The function signature should be:
```typescript
getAnalytics: async (token: string, params?: {
    period?: 'daily' | 'weekly' | 'monthly' | 'annual'
    clinic_id?: number | null
    start_date?: string
    end_date?: string
}): Promise<AnalyticsResponse> => { ... }
```
```

---

## Prompt 4: Frontend Summary Cards & Loading State

```
Read the file `dorotheo-dental-clinic-website/analytics_implementation_plan.md` for full context.

**Task**: Create the summary cards component and loading skeleton for the analytics dashboard.

**Step A — Create `dorotheo-dental-clinic-website/frontend/components/analytics/analytics-summary-cards.tsx`**:
- Accept props: `financial` (FinancialAnalytics type from `lib/types/analytics.ts`).
- Render 4 cards in a responsive grid (1 col mobile, 2 col sm, 4 col lg) matching the EXISTING card design from the current `page.tsx`:
  1. **Revenue** (green gradient) — shows `total_revenue` formatted as PHP currency.
  2. **Expenses** (red gradient) — shows `total_expenses`.
  3. **Profit** (blue gradient) — shows `profit` (revenue - expenses). Show red text if negative.
  4. **Outstanding** (amber gradient) — shows `outstanding_balance`.
- Format all numbers with `₱` prefix and comma separators (e.g., `₱125,000.00`).
- Use the same Lucide icons as the current page (TrendingUp, ShoppingCart, DollarSign).
- Use "use client" directive.

**Step B — Create `dorotheo-dental-clinic-website/frontend/components/analytics/analytics-loading.tsx`**:
- A skeleton loading component that mimics the layout of the analytics page.
- Use pulsing gray rectangles for cards and chart areas.
- Use "use client" directive.

**Design rules**: Match the existing CSS variable-based styling from the current analytics page. Keep the same gradient colors (green-50/emerald-100 for revenue, red-50/rose-100 for expenses, blue-50/cyan-100 for profit, amber-50/yellow-100 for outstanding).
```

---

## Prompt 5: Revenue & Patient Volume Charts

```
Read the file `dorotheo-dental-clinic-website/analytics_implementation_plan.md` for full context.

**Task**: Create the two main time-series chart components using `recharts` (already installed in frontend/package.json).

**Step A — Create `dorotheo-dental-clinic-website/frontend/components/analytics/revenue-chart.tsx`**:
- Accept props: `data` (array of `TimeSeriesPoint` from analytics types), `period` string.
- Render a `ResponsiveContainer` with an `AreaChart` (or `ComposedChart`) showing:
  - Revenue as a green area/line.
  - Expenses as a red area/line.
- X-axis: formatted dates (e.g., "Jan 21" for monthly, "Mon" for weekly, "Jan" for annual).
- Y-axis: formatted as PHP currency (abbreviated, e.g., "₱50K").
- Include `Tooltip` with custom formatter showing full PHP amounts.
- Include `Legend`.
- Show "No data available" message if array is empty.
- Use "use client" directive.

**Step B — Create `dorotheo-dental-clinic-website/frontend/components/analytics/patient-volume-chart.tsx`**:
- Accept props: `data` (array of `PatientVolumePoint`), `period` string.
- Render a `BarChart` showing:
  - Total appointments as primary bars (green).
  - New patients as secondary bars (blue).
- X-axis: formatted dates matching the revenue chart.
- Y-axis: integer counts.
- Include `Tooltip` and `Legend`.
- Show "No data available" if empty.
- Use "use client" directive.

**Chart styling**: Wrap each chart in a white card with border matching `border-[var(--color-border)]`, with a title header. Use `ResponsiveContainer` with `width="100%"` and `height={300}`.
```

---

## Prompt 6: Service, Dentist, Invoice & Payment Charts

```
Read the file `dorotheo-dental-clinic-website/analytics_implementation_plan.md` for full context.

**Task**: Create the breakdown/distribution chart components.

**Create these 4 files in `dorotheo-dental-clinic-website/frontend/components/analytics/`**:

1. **`revenue-by-service.tsx`**:
   - Props: `data` (array of `ServiceRevenue`).
   - Horizontal `BarChart` showing revenue by service name, colored by category.
   - Show top 10 services max. Include count of appointments in tooltip.

2. **`revenue-by-dentist.tsx`**:
   - Props: `data` (array of `DentistRevenue`).
   - Horizontal `BarChart` showing revenue by dentist name.
   - Include appointment count in tooltip.

3. **`invoice-status-chart.tsx`**:
   - Props: `data` (array of `StatusDistribution`).
   - `PieChart` (donut style with inner radius) showing invoice counts by status.
   - Colors: paid=green, sent=blue, overdue=red, draft=gray, cancelled=slate.
   - Show total count in center of donut.
   - Custom tooltip showing count and total PHP amount.

4. **`payment-method-chart.tsx`**:
   - Props: `data` (array of `PaymentMethodDistribution`).
   - `PieChart` showing payment methods.
   - Use distinct colors for each method.
   - Tooltip shows count and total amount.

**All components**: "use client", `ResponsiveContainer`, white card wrapper with title, handle empty data gracefully.
```

---

## Prompt 7: Operational Charts & Tables

```
Read the file `dorotheo-dental-clinic-website/analytics_implementation_plan.md` for full context.

**Task**: Create the remaining operational analytics components.

**Create these 4 files in `dorotheo-dental-clinic-website/frontend/components/analytics/`**:

1. **`appointment-status-chart.tsx`**:
   - Props: `data` (array of `StatusDistribution`).
   - Donut `PieChart` showing appointment counts by status.
   - Colors: completed=green, confirmed=blue, pending=yellow, cancelled=red, missed=orange, waiting=cyan.

2. **`top-services-table.tsx`**:
   - Props: `data` (array of `TopService`).
   - Styled table matching the existing Revenue/Expenses Breakdown tables in the current analytics page.
   - Columns: Rank (#), Service Name, Category (badge), Appointments (count).
   - Show top 10. Category badge colored by category type.

3. **`busiest-hours-chart.tsx`**:
   - Props: `data` (array of `HourCount`).
   - Vertical `BarChart` with hours on x-axis (formatted as "9 AM", "10 AM", etc.).
   - Y-axis: appointment count.
   - Highlight the busiest hour with a different color.

4. **`low-stock-alerts.tsx`**:
   - Props: `data` (array of `LowStockItem`), `totalValue` (number).
   - Card listing low stock items with name, current quantity, minimum stock, and clinic.
   - Use warning/alert-style colors (amber/red for critically low items).
   - Show "All items well stocked" if array is empty.

**All components**: "use client", handle empty data, match existing design system.
```

---

## Prompt 8: Assemble the Analytics Page

```
Read the file `dorotheo-dental-clinic-website/analytics_implementation_plan.md` for full context.

**Task**: Rewrite `dorotheo-dental-clinic-website/frontend/app/owner/analytics/page.tsx` to be the fully functional analytics dashboard that fetches real data and composes all the chart components.

**Requirements**:
1. Keep the existing page title ("Analytics Dashboard") and time-filter buttons (Daily/Weekly/Monthly/Annual) with the same styling.
2. Add a tabbed section switcher: **Financial** | **Operational** | **Inventory** (default to Financial tab).
3. Fetch data from the API using `getAnalytics` from `lib/api.ts` whenever `period` or clinic changes.
4. Read the auth token from the existing `useAuth()` hook (from `@/lib/auth`).
5. Read selected clinic from URL params or ClinicSelector context if available (check how other owner pages do it — likely via a cookie or query param).
6. Show the `AnalyticsLoading` skeleton while data is loading.
7. Show error state if API call fails.

**Layout for Financial tab**:
- Row 1: `AnalyticsSummaryCards` (4 cards)
- Row 2: `RevenueChart` (full width)
- Row 3: `RevenueByService` (left half) + `RevenueByDentist` (right half)
- Row 4: `InvoiceStatusChart` (left half) + `PaymentMethodChart` (right half)

**Layout for Operational tab**:
- Row 1: Stats cards: Total Appointments, Completed, New Patients, Returning Patients, Cancellation Rate, No-Show Rate
- Row 2: `PatientVolumeChart` (full width)
- Row 3: `AppointmentStatusChart` (left half) + `TopServicesTable` (right half)
- Row 4: `BusiestHoursChart` (full width)

**Layout for Inventory tab**:
- Row 1: Inventory value card + Low stock count card
- Row 2: `LowStockAlerts` (full width)

8. Import all components from `@/components/analytics/...`.
9. Import types from `@/lib/types/analytics`.
10. Use "use client" directive.
11. Handle the "Showing data for: Last 30 Days" label dynamically based on the API response dates.
```

---

## Prompt 9: Testing & Polish

```
Read the file `dorotheo-dental-clinic-website/analytics_implementation_plan.md` for full context.

**Task**: Verify the analytics feature end-to-end and fix any issues.

1. **Backend verification**: Run the Django development server and test the analytics endpoint manually:
   - `GET /api/analytics/` (default monthly)
   - `GET /api/analytics/?period=weekly`
   - `GET /api/analytics/?period=daily`
   - `GET /api/analytics/?period=annual`
   - `GET /api/analytics/?clinic_id=1`
   - Verify the response JSON matches the expected shape from the plan.
   - Check for any query errors or missing imports.

2. **Frontend verification**: Start the Next.js dev server and navigate to `/owner/analytics`:
   - Verify data loads and displays on the Financial tab.
   - Switch between Daily/Weekly/Monthly/Annual and verify data updates.
   - Switch between Financial/Operational/Inventory tabs.
   - Test with the clinic selector.
   - Check for any TypeScript errors or console warnings.
   - Verify charts render correctly with `recharts`.

3. **Fix any issues found** — missing imports, type mismatches, empty data handling, etc.

4. **Polish**:
   - Ensure proper PHP currency formatting (₱ symbol with commas).
   - Ensure all charts have proper tooltips.
   - Verify responsive layout on mobile viewport.
   - Add proper empty states for all components when no data exists.
```

---

## Quick Reference: File Dependencies

```
Prompt 1 → backend/api/analytics_utils.py (NEW)
Prompt 2 → backend/api/views.py (MODIFY) — depends on Prompt 1
Prompt 3 → frontend/lib/types/analytics.ts (NEW) + frontend/lib/api.ts (MODIFY)
Prompt 4 → frontend/components/analytics/analytics-summary-cards.tsx (NEW) + analytics-loading.tsx (NEW)
Prompt 5 → frontend/components/analytics/revenue-chart.tsx (NEW) + patient-volume-chart.tsx (NEW)
Prompt 6 → frontend/components/analytics/revenue-by-service.tsx + revenue-by-dentist.tsx + invoice-status-chart.tsx + payment-method-chart.tsx (ALL NEW)
Prompt 7 → frontend/components/analytics/appointment-status-chart.tsx + top-services-table.tsx + busiest-hours-chart.tsx + low-stock-alerts.tsx (ALL NEW)
Prompt 8 → frontend/app/owner/analytics/page.tsx (REWRITE) — depends on Prompts 3-7
Prompt 9 → Testing & fixes — depends on all above
```

Prompts 3-7 are independent of each other and could be reordered, but they all must come before Prompt 8.
