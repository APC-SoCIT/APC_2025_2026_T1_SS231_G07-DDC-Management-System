# Windows PDF Generation Setup

## Issue
Invoice emails are being sent successfully, but PDFs cannot be generated on Windows because WeasyPrint requires GTK libraries (specifically `gobject-2.0-0`).

## Current Behavior
- ✅ Invoices are created in the database
- ✅ Emails are sent to patients and staff
- ❌ PDF attachments are not included in emails
- ⚠️ Error message: "cannot load library 'gobject-2.0-0'"

## Solution: Install GTK for Windows

### Option 1: Using MSYS2 (Recommended)

1. **Download and install MSYS2** from https://www.msys2.org/

2. **Open MSYS2 terminal** and run:
   ```bash
   pacman -S mingw-w64-x86_64-gtk3 mingw-w64-x86_64-python-gobject
   ```

3. **Add GTK to your system PATH**:
   - Open System Environment Variables
   - Add to PATH: `C:\msys64\mingw64\bin`
   - Restart your terminal/IDE

4. **Restart your Django server**

### Option 2: Using GTK for Windows Installer

1. Download GTK+ for Windows from: https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer

2. Install GTK+ (ensure "Add to PATH" is checked during installation)

3. Restart your system

4. Restart your Django server

## Verification

After installation, verify WeasyPrint works:

```bash
cd backend
python -c "from weasyprint import HTML; print('WeasyPrint is working!')"
```

If successful, you'll see: `WeasyPrint is working!`

## Alternative: Deploy to Linux

If you don't need local PDF generation, deploy to a Linux server (Railway, Render, etc.) where GTK libraries are available by default. The production environment will handle PDF generation automatically.

## Current Workaround

The system is configured to gracefully handle missing WeasyPrint:
- Invoices are still created and saved
- Emails are still sent
- PDFs are simply omitted from emails
- No functionality is lost except PDF attachments

This allows development to continue on Windows without blocking other features.
