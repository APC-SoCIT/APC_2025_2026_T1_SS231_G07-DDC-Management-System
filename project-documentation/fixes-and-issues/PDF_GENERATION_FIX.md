# PDF Generation Fix for Windows

## Issue
WeasyPrint requires GTK+ libraries to generate PDFs on Windows. Without these libraries, you'll see this error:
```
cannot load library 'gobject-2.0-0': error 0x7e
```

## Current Solution
✅ **Emails are now sent without PDF attachments** if PDF generation fails.
- Patients and staff will receive invoice details via email
- The invoice can be viewed on the billing page
- This is a temporary workaround until PDF generation is fixed

## To Fix PDF Generation (Optional)

### Option 1: Install GTK+ for Windows (Recommended for Production)

1. **Download GTK+ for Windows:**
   - Visit: https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases
   - Download the latest installer (e.g., `gtk3-runtime-3.24.31-2022-01-04-ts-win64.exe`)

2. **Install GTK+:**
   - Run the installer
   - Use default installation path: `C:\Program Files\GTK3-Runtime Win64`
   - Complete the installation

3. **Add GTK+ to System PATH:**
   - Open System Environment Variables
   - Add to PATH: `C:\Program Files\GTK3-Runtime Win64\bin`
   - Restart your Python server

4. **Test PDF Generation:**
   ```bash
   cd backend
   python -c "from weasyprint import HTML; HTML(string='<h1>Test</h1>').write_pdf('test.pdf'); print('PDF generation works!')"
   ```

### Option 2: Use Alternative PDF Library (Future Enhancement)

Consider replacing WeasyPrint with a Windows-friendly alternative:
- **ReportLab** - Pure Python, no external dependencies
- **xhtml2pdf** - Another HTML to PDF converter
- **wkhtmltopdf** - Binary-based, includes all dependencies

## Deployment Notes

### For Development (Windows)
- Emails will work without PDFs
- Install GTK+ if you need PDF generation for testing

### For Production (Linux/Render)
- GTK+ libraries are typically pre-installed on Linux servers
- PDF generation should work automatically
- No changes needed for deployment

## Current Behavior

✅ **Working:**
- Invoice creation
- Email sending to patients and staff
- Invoice viewing in billing page
- All invoice calculations and data

⚠️ **Not Working on Windows (without GTK+):**
- PDF attachment in emails
- PDF download from billing page

## Testing

After creating an invoice, check:
1. ✅ Invoice appears in patient billing page
2. ✅ Email received by patient (without PDF)
3. ✅ Email received by staff (without PDF)
4. ✅ Invoice details are correct

Backend logs will show:
```
WARNING: Could not generate PDF for invoice INV-2026-02-XXXX: [error]. Email will be sent without PDF.
INFO: Invoice email sent to patient [email] for invoice [INV-XXXX]
```
