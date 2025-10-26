# 📥 Export Feature - Integration Guide

## Overview
The Export feature allows staff and owners to download comprehensive patient records in multiple formats (Text or JSON).

---

## ✅ What's Already Complete

### Backend
- ✅ API endpoint: `GET /api/users/{id}/export_records/`
- ✅ Returns comprehensive patient data including:
  - Patient information
  - Appointments
  - Dental records
  - Clinical notes
  - Treatment assignments
  - Billing history
  - Intake form

### Frontend
- ✅ Export utility: `frontend/lib/export.ts`
- ✅ Export component: `frontend/components/ExportButton.tsx`
- ✅ Two export formats:
  - **Text (.txt)**: Human-readable, formatted report
  - **JSON (.json)**: Structured data for integration

---

## 🎯 How to Add Export to Patient Pages

The ExportButton component is ready to use! You can add it to any patient detail page.

### Example 1: Add to Staff Patient Detail Header

If you have a patient detail page at `frontend/app/staff/patients/[id]/page.tsx`:

```tsx
import ExportButton from "@/components/ExportButton"

export default function StaffPatientDetailPage() {
  const params = useParams()
  const patientId = parseInt(params.id as string)
  const [patient, setPatient] = useState<any>(null)

  // ... existing code ...

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Export Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {patient?.first_name} {patient?.last_name}
            </h1>
            <p className="text-gray-600">{patient?.email}</p>
          </div>
          
          {/* Add Export Button */}
          <ExportButton 
            patientId={patientId}
            patientName={`${patient?.first_name} ${patient?.last_name}`}
            variant="button"
          />
        </div>

        {/* Rest of patient details... */}
      </div>
    </div>
  )
}
```

### Example 2: Add to Patient List (Icon Variant)

For the patients list page with action buttons:

```tsx
import ExportButton from "@/components/ExportButton"

// In the patient card/row rendering:
<div className="flex items-center gap-2">
  <button onClick={() => handleView(patient.id)}>
    <Eye className="w-5 h-5" />
  </button>
  
  {/* Export as icon button */}
  <ExportButton 
    patientId={patient.id}
    patientName={`${patient.first_name} ${patient.last_name}`}
    variant="icon"
  />
  
  <button onClick={() => handleEdit(patient.id)}>
    <Edit className="w-5 h-5" />
  </button>
</div>
```

### Example 3: Add to Navigation/Action Bar

```tsx
import ExportButton from "@/components/ExportButton"

<div className="bg-white rounded-lg shadow-sm p-4 mb-6">
  <div className="flex items-center justify-between">
    <div className="flex gap-2">
      <Link href={`/staff/patients/${patientId}/notes`}>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          Clinical Notes
        </button>
      </Link>
      <Link href={`/staff/patients/${patientId}/files`}>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          Files
        </button>
      </Link>
      <Link href={`/staff/patients/${patientId}/treatments`}>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          Treatments
        </button>
      </Link>
    </div>
    
    {/* Export Button */}
    <ExportButton 
      patientId={patientId}
      patientName={`${patient.first_name} ${patient.last_name}`}
    />
  </div>
</div>
```

---

## 🎨 Component Props

### ExportButton Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `patientId` | `number` | ✅ Yes | - | Patient ID to export |
| `patientName` | `string` | ❌ No | `"Patient"` | Patient name for filename |
| `variant` | `"button" \| "icon"` | ❌ No | `"button"` | Display style |
| `className` | `string` | ❌ No | `""` | Additional CSS classes |

---

## 📊 Export Formats

### Text Format (.txt)
```
========================================
       PATIENT RECORDS EXPORT
========================================

Export Date: October 22, 2025

PATIENT INFORMATION
-------------------
Name: John Doe
Email: john.doe@example.com
Phone: (555) 123-4567
Date of Birth: January 15, 1990
Address: 123 Main St, City, State 12345
Date Registered: January 1, 2025

APPOINTMENTS
------------
1. General Checkup
   Date: March 15, 2025 at 10:00 AM
   Dentist: Dr. Jane Smith
   Status: completed
   Notes: Regular checkup, no issues found

... (continues with all sections)
```

### JSON Format (.json)
```json
{
  "patient": {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone_number": "(555) 123-4567",
    "date_of_birth": "1990-01-15",
    "address": "123 Main St, City, State 12345",
    "date_joined": "2025-01-01T00:00:00Z"
  },
  "appointments": [...],
  "dental_records": [...],
  "clinical_notes": [...],
  "treatment_assignments": [...],
  "billing": [...],
  "intake_form": {...}
}
```

---

## 🔧 Customization

### Custom Export Formats

To add a new export format (e.g., CSV, PDF), edit `frontend/lib/export.ts`:

```typescript
// Add to export.ts
export const exportPatientRecordsCSV = async (patientId: number, token: string) => {
  try {
    const data = await api.exportPatientRecords(patientId, token)
    
    // Convert to CSV format
    const csv = convertToCSV(data)
    
    const filename = `patient_records_${data.patient.last_name}_${new Date().toISOString().split("T")[0]}.csv`
    
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    return { success: true, message: "Records exported successfully!" }
  } catch (error) {
    console.error("Error exporting records:", error)
    return { success: false, message: "Failed to export records" }
  }
}
```

Then update `ExportButton.tsx` to include the new format:

```tsx
// In the menu
<button
  onClick={() => handleExport("csv")}
  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left rounded-lg"
>
  <FileSpreadsheet className="w-5 h-5 text-green-600" />
  <div>
    <p className="text-sm font-medium text-gray-900">CSV File</p>
    <p className="text-xs text-gray-500">Spreadsheet format</p>
  </div>
</button>
```

### Custom Styling

You can override the default styling:

```tsx
<ExportButton 
  patientId={patientId}
  className="bg-purple-600 hover:bg-purple-700"
/>
```

---

## 🧪 Testing the Export Feature

### Test Checklist

1. **Export as Staff**:
   - [ ] Login as staff
   - [ ] Navigate to a patient with data
   - [ ] Click "Export Records"
   - [ ] Select "Text File"
   - [ ] Verify file downloads
   - [ ] Open file and check formatting
   - [ ] Repeat with "JSON File"

2. **Export as Owner**:
   - [ ] Login as owner
   - [ ] Repeat above steps

3. **Verify Data Completeness**:
   - [ ] Check patient information section
   - [ ] Check appointments section
   - [ ] Check dental records section
   - [ ] Check clinical notes section
   - [ ] Check treatment assignments section
   - [ ] Check billing history section
   - [ ] Check intake form section

4. **Edge Cases**:
   - [ ] Export patient with no appointments
   - [ ] Export patient with no notes
   - [ ] Export patient with no treatments
   - [ ] Export newly registered patient
   - [ ] Verify "N/A" displays for missing data

5. **Filename Verification**:
   - [ ] Check filename format: `patient_records_LastName_FirstName_YYYY-MM-DD.txt`
   - [ ] Verify date is current

---

## 📝 Usage Examples in Your App

### Where to Add Export Buttons

**Recommended Locations**:

1. ✅ **Patient Detail Page Header** (Top right, next to other actions)
2. ✅ **Patient List Page** (Icon button in action column)
3. ✅ **Patient Navigation Bar** (With Notes, Files, Treatments buttons)
4. ❌ **NOT on Patient Dashboard** (Patients can't export their own records)

### Quick Integration Steps

1. **Import the component**:
   ```tsx
   import ExportButton from "@/components/ExportButton"
   ```

2. **Get patient ID**:
   ```tsx
   const params = useParams()
   const patientId = parseInt(params.id as string)
   ```

3. **Add the button**:
   ```tsx
   <ExportButton 
     patientId={patientId}
     patientName={patient.name}
   />
   ```

That's it! The component handles all the export logic internally.

---

## 🎯 Benefits

### For Staff/Owners:
- ✅ Quick access to complete patient history
- ✅ Easy sharing with other healthcare providers
- ✅ Offline record keeping
- ✅ Data backup capability
- ✅ Multiple format options

### For Patients:
- ✅ Can receive their records via staff
- ✅ Portable health information
- ✅ Easy to share with other dentists

### For Developers:
- ✅ Reusable component
- ✅ Clean API design
- ✅ Easy to extend with new formats
- ✅ Well-documented code

---

## 🚀 Future Enhancements

Potential improvements you could add:

1. **PDF Export**: Generate formatted PDF using jsPDF or react-pdf
2. **Email Export**: Send records directly to email
3. **Selective Export**: Choose which sections to include
4. **Date Range Filter**: Export records from specific date range
5. **Encrypted Export**: Password-protected files for sensitive data
6. **Cloud Upload**: Export directly to cloud storage
7. **Print Preview**: Preview before downloading
8. **Schedule Exports**: Automated periodic exports

---

## ✅ Summary

The export feature is **100% ready to use**! You just need to:

1. Import `ExportButton` component
2. Pass `patientId` prop
3. Place it where you want (header, navigation, action bar)

The component handles everything else:
- API calls
- Data formatting
- File generation
- Download triggers
- Error handling
- User feedback

**It's plug-and-play!** 🎉

---

**Created**: October 22, 2025  
**Status**: Ready for Production ✅
