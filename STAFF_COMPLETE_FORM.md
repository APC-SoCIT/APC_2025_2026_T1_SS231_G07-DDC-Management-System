# Staff Account Creation - Complete Form System ✅

## Overview

Staff creation form now includes ALL required fields:
- ✅ First Name
- ✅ Last Name
- ✅ Email (separate field)
- ✅ Username (with automatic @dorotheo.com)
- ✅ Password (8 characters minimum with placeholder)
- ✅ Birthdate
- ✅ Contact Number
- ✅ Address
- ✅ Role (Dentist/Receptionist)

**Login:** Staff uses `username@dorotheo.com` to log in

---

## Form Fields

### Add Staff Member Form

```
┌─────────────────────────────────────────────────────┐
│ Add Staff Member                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│ First Name *          Last Name *                  │
│ [John              ]  [Doe                ]         │
│                                                     │
│ Email *                                             │
│ [john.doe@personal.com                    ]         │
│                                                     │
│ Username * (for login)                              │
│ [john.doe          ] @dorotheo.com                  │
│ This will be used for login                         │
│                                                     │
│ Password *                                          │
│ [8 characters minimum                     ]         │
│                                                     │
│ Birthdate *                                         │
│ [MM/DD/YYYY        ]                                │
│                                                     │
│ Contact Number *                                    │
│ [+1234567890                              ]         │
│                                                     │
│ Address *                                           │
│ [                                         ]         │
│ [                                         ]         │
│ [                                         ]         │
│                                                     │
│ Role *                                              │
│ [Select a role...  ▼]                               │
│                                                     │
│ [Cancel]                    [Add Staff]             │
└─────────────────────────────────────────────────────┘
```

---

## Field Details

### 1. First Name & Last Name
- **Type:** Text input
- **Required:** Yes
- **Layout:** Side by side (2 columns)

### 2. Email
- **Type:** Email input
- **Required:** Yes
- **Purpose:** Personal/contact email
- **Example:** `john.doe@personal.com`, `jane@gmail.com`
- **Note:** This is separate from login username

### 3. Username (Login Credential)
- **Type:** Text input with fixed suffix
- **Required:** Yes
- **Format:** `[username]` + `@dorotheo.com` (automatic)
- **Purpose:** Used for logging into staff account
- **Example:** Enter `john.doe` → Login becomes `john.doe@dorotheo.com`
- **Helper text:** "This will be used for login"

### 4. Password
- **Type:** Password input
- **Required:** Yes
- **Minimum:** 8 characters
- **Placeholder:** "8 characters minimum" (grayed out text)
- **Validation:** `minLength={8}`

### 5. Birthdate
- **Type:** Date picker
- **Required:** Yes
- **Format:** MM/DD/YYYY

### 6. Contact Number
- **Type:** Tel input
- **Required:** Yes
- **Example:** `+1234567890`, `555-0123`

### 7. Address
- **Type:** Textarea (3 rows)
- **Required:** Yes
- **Example:** `123 Main Street, Suite 100, City, State 12345`

### 8. Role
- **Type:** Select dropdown
- **Required:** Yes
- **Options:**
  - `Select a role...` (default)
  - `Receptionist`
  - `Dentist`

---

## Data Flow

```
Owner Fills Form
    ↓
First Name: John
Last Name: Doe
Email: john.doe@personal.com
Username: john.doe → john.doe@dorotheo.com
Password: SecurePass123
Birthdate: 01/15/1990
Phone: 555-0123
Address: 123 Main St
Role: Dentist
    ↓
Submit Form
    ↓
Backend Receives:
{
  username: "john.doe@dorotheo.com",  ← For login
  email: "john.doe@personal.com",     ← Contact email
  first_name: "John",
  last_name: "Doe",
  password: "SecurePass123",
  phone: "555-0123",
  address: "123 Main St",
  user_type: "staff",
  role: "dentist"
}
    ↓
Success Message:
"Login credentials:
Username: john.doe@dorotheo.com
Password: SecurePass123"
    ↓
Staff Can Login With:
Username: john.doe@dorotheo.com
Password: SecurePass123
```

---

## Success Message

After successful creation:

```
┌─────────────────────────────────────────┐
│ Staff member added successfully!        │
│                                         │
│ Login credentials:                      │
│ Username: john.doe@dorotheo.com        │
│ Password: SecurePass123                 │
│                                         │
│ They can now log in using their        │
│ username.                               │
│                                         │
│ [OK]                                    │
└─────────────────────────────────────────┘
```

---

## Login Process

### Staff Login

```
┌─────────────────────────────────────────┐
│ Welcome Back                            │
│ Sign in to access your account          │
├─────────────────────────────────────────┤
│                                         │
│ Email                                   │
│ [john.doe@dorotheo.com              ]   │
│ ↑ Enter username@dorotheo.com          │
│                                         │
│ Password                                │
│ [••••••••••]                           │
│                                         │
│ [Sign In]                               │
└─────────────────────────────────────────┘
```

**Login Credentials:**
- **Username:** `john.doe@dorotheo.com` (from username field + @dorotheo.com)
- **Password:** The password set during creation

---

## Code Implementation

### State Management
```typescript
const [newStaff, setNewStaff] = useState({
  firstName: "",
  lastName: "",
  email: "",           // Personal/contact email
  username: "",        // For login (will add @dorotheo.com)
  password: "",
  birthdate: "",       // NEW
  phone: "",
  address: "",
  role: "",
})
```

### Submit Handler
```typescript
const handleAddStaff = async (e: React.FormEvent) => {
  e.preventDefault()
  
  // Create login username from username + @dorotheo.com
  const loginUsername = `${newStaff.username}@dorotheo.com`
  
  const staffData = {
    username: loginUsername,    // john.doe@dorotheo.com (for login)
    email: newStaff.email,      // john.doe@personal.com (contact)
    password: newStaff.password,
    first_name: newStaff.firstName,
    last_name: newStaff.lastName,
    phone: newStaff.phone,
    address: newStaff.address,
    user_type: 'staff',
    role: newStaff.role,
  }
  
  await api.createStaff(staffData, token)
  
  alert(`Staff member added successfully!

Login credentials:
Username: ${loginUsername}
Password: ${newStaff.password}

They can now log in using their username.`)
}
```

### Form Fields JSX

#### First Name & Last Name (Side by Side)
```tsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <label>First Name <span className="text-red-500">*</span></label>
    <input
      type="text"
      required
      value={newStaff.firstName}
      onChange={(e) => setNewStaff({ ...newStaff, firstName: e.target.value })}
    />
  </div>
  <div>
    <label>Last Name <span className="text-red-500">*</span></label>
    <input
      type="text"
      required
      value={newStaff.lastName}
      onChange={(e) => setNewStaff({ ...newStaff, lastName: e.target.value })}
    />
  </div>
</div>
```

#### Email (Separate Contact Field)
```tsx
<div>
  <label>Email <span className="text-red-500">*</span></label>
  <input
    type="email"
    required
    value={newStaff.email}
    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
    placeholder="john.doe@example.com"
  />
</div>
```

#### Username (Login - with @dorotheo.com)
```tsx
<div>
  <label>Username <span className="text-red-500">*</span></label>
  <div className="flex items-center gap-2">
    <input
      type="text"
      required
      value={newStaff.username}
      onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
      placeholder="john.doe"
      className="flex-1"
    />
    <span className="text-gray-600 font-medium">@dorotheo.com</span>
  </div>
  <p className="text-xs text-gray-500 mt-1">
    This will be used for login
  </p>
</div>
```

#### Password (8 characters minimum)
```tsx
<div>
  <label>Password <span className="text-red-500">*</span></label>
  <input
    type="password"
    required
    minLength={8}
    value={newStaff.password}
    onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
    placeholder="8 characters minimum"
  />
</div>
```

#### Birthdate (Date Picker)
```tsx
<div>
  <label>Birthdate <span className="text-red-500">*</span></label>
  <input
    type="date"
    required
    value={newStaff.birthdate}
    onChange={(e) => setNewStaff({ ...newStaff, birthdate: e.target.value })}
  />
</div>
```

#### Contact Number
```tsx
<div>
  <label>Contact Number <span className="text-red-500">*</span></label>
  <input
    type="tel"
    required
    value={newStaff.phone}
    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
  />
</div>
```

#### Address (Textarea)
```tsx
<div>
  <label>Address <span className="text-red-500">*</span></label>
  <textarea
    required
    rows={3}
    value={newStaff.address}
    onChange={(e) => setNewStaff({ ...newStaff, address: e.target.value })}
  />
</div>
```

#### Role (Dropdown)
```tsx
<div>
  <label>Role <span className="text-red-500">*</span></label>
  <select
    required
    value={newStaff.role}
    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
  >
    <option value="">Select a role...</option>
    <option value="receptionist">Receptionist</option>
    <option value="dentist">Dentist</option>
  </select>
</div>
```

---

## Example Workflow

### Owner Creates Staff

**Step 1:** Opens Add Staff modal

**Step 2:** Fills in complete form
- First Name: `Sarah`
- Last Name: `Johnson`
- Email: `sarah.j@gmail.com` (personal email)
- Username: `sarah.johnson` (will become `sarah.johnson@dorotheo.com`)
- Password: `SecurePass2024` (8+ characters)
- Birthdate: `03/15/1995`
- Contact Number: `555-1234`
- Address: `456 Oak Avenue, Springfield, IL 62701`
- Role: `Dentist`

**Step 3:** Clicks "Add Staff"

**Step 4:** Success message appears:
```
Staff member added successfully!

Login credentials:
Username: sarah.johnson@dorotheo.com
Password: SecurePass2024

They can now log in using their username.
```

### Staff Logs In

**Step 1:** Go to login page

**Step 2:** Enter credentials
- Email: `sarah.johnson@dorotheo.com`
- Password: `SecurePass2024`

**Step 3:** Click "Sign In"

**Step 4:** Redirected to Staff Dashboard ✅

---

## Key Points

### ✅ Two Email Fields
1. **Email field** → Personal/contact email (any domain)
2. **Username field** → Login credential (always @dorotheo.com)

### ✅ Username for Login
- Owner enters: `john.doe`
- System creates: `john.doe@dorotheo.com`
- Staff logs in with: `john.doe@dorotheo.com`

### ✅ Password Requirements
- Minimum 8 characters
- Placeholder shows: "8 characters minimum"
- Validated with `minLength={8}`

### ✅ All Fields Required
- All fields marked with red asterisk (*)
- Form won't submit until all filled
- HTML5 validation for email, date, tel types

### ✅ Clear Visual Feedback
- `@dorotheo.com` appears next to username field
- Helper text: "This will be used for login"
- Password placeholder: "8 characters minimum"

---

## Testing Checklist

### ✅ Create Staff with All Fields
- [ ] Open Add Staff modal
- [ ] Fill First Name: `Test`
- [ ] Fill Last Name: `Staff`
- [ ] Fill Email: `test.staff@personal.com`
- [ ] Fill Username: `test.staff` (see @dorotheo.com next to it)
- [ ] Fill Password: `TestPass123` (8+ characters)
- [ ] Select Birthdate: `01/01/1990`
- [ ] Fill Contact Number: `555-9999`
- [ ] Fill Address: `123 Test St`
- [ ] Select Role: `Receptionist`
- [ ] Click "Add Staff"
- [ ] Verify success message shows: `test.staff@dorotheo.com`

### ✅ Login with New Staff
- [ ] Logout (or use incognito)
- [ ] Go to login page
- [ ] Enter Email: `test.staff@dorotheo.com`
- [ ] Enter Password: `TestPass123`
- [ ] Click Sign In
- [ ] Verify redirect to Staff Dashboard
- [ ] Verify all staff features accessible

### ✅ Password Validation
- [ ] Try password with <8 characters → Should show error
- [ ] Try password with 8+ characters → Should accept

### ✅ Required Fields
- [ ] Try submitting with empty fields → Should prevent
- [ ] Fill all required fields → Should submit successfully

### ✅ Email Format
- [ ] Try invalid email in Email field → Should show error
- [ ] Try valid email → Should accept

---

## Summary

**Form Fields (in order):**
1. ✅ First Name, Last Name (side by side)
2. ✅ Email (personal/contact)
3. ✅ Username (login credential + @dorotheo.com)
4. ✅ Password (8 characters minimum)
5. ✅ Birthdate (date picker)
6. ✅ Contact Number (phone)
7. ✅ Address (textarea)
8. ✅ Role (dropdown: Dentist/Receptionist)

**Login Process:**
- Staff uses: `username@dorotheo.com` + password
- Example: `john.doe@dorotheo.com` + `SecurePass123`

**Data Separation:**
- `email` field → Contact email (any domain)
- `username` field → Login username (@dorotheo.com domain)

**Status:** ✅ **COMPLETE**
**Date:** October 17, 2025
**Files Modified:** `frontend/app/owner/staff/page.tsx`
