# Email Verification Code Implementation Plan

## Overview
Implement a 6-digit email verification code system for patient registration, similar to industry-standard verification flows.

---

## 🎯 Implementation Goals

1. **Security**: Generate secure, time-limited verification codes
2. **User Experience**: Simple 6-digit code entry interface
3. **Reliability**: Robust email delivery with resend functionality
4. **Scalability**: Handle multiple pending verifications efficiently

---

## 📋 Implementation Phases

### Phase 1: Backend - Django Models & Logic

#### Task 1.1: Create Email Verification Model
**Objective**: Store verification codes and their metadata

**Prompt for LLM**:
```
Create a Django model called `EmailVerification` with the following requirements:

REQUIREMENTS:
- Store user email (indexed for fast lookup)
- Store 6-digit verification code (string)
- Track creation timestamp
- Track expiration timestamp (10 minutes from creation)
- Track verification status (pending, verified, expired)
- Track number of attempts (max 3 failed attempts)
- Store user type (patient, staff, dentist, owner)
- Store temporary user data (JSON field for first_name, last_name, etc.)

CONSTRAINTS:
- Code must be exactly 6 digits
- Automatically mark as expired after 10 minutes
- Prevent brute force with attempt limiting
- One active verification per email at a time

METHODS NEEDED:
- generate_code(): Create random 6-digit code
- is_expired(): Check if code expired
- is_valid(): Check if code can be used (not expired, attempts remaining)
- verify_code(code): Validate and mark as verified
- increment_attempts(): Track failed attempts

Place this model in: backend/api/models.py
Use Django best practices for model design.
```

#### Task 1.2: Create Verification Service
**Objective**: Business logic for verification flow

**Prompt for LLM**:
```
Create a Python service class `EmailVerificationService` in backend/api/email_verification_service.py with the following methods:

1. create_verification(email, user_data, user_type):
   - Delete any existing pending verifications for this email
   - Generate new 6-digit code
   - Create EmailVerification record
   - Return the verification object

2. send_verification_email(verification):
   - Use existing email_service.py send_email function
   - Send HTML email with 6-digit code
   - Include expiration time (10 minutes)
   - Make email visually appealing with code prominently displayed
   - Return success/failure status

3. verify_and_register(email, code):
   - Find active verification for email
   - Check if code matches
   - Check if not expired
   - Check if attempts remaining
   - If valid: create user account with stored data, mark verification as verified
   - If invalid: increment attempts, return error
   - Return user object or error message

4. resend_verification(email):
   - Find existing verification
   - Check if can be resent (not too many resends)
   - Generate new code
   - Update verification record
   - Send new email
   - Return success/failure

SECURITY REQUIREMENTS:
- Use secrets module for secure random code generation
- Implement rate limiting (max 3 resend requests per hour)
- Use constant-time comparison for code verification
- Log all verification attempts for security auditing

ERROR HANDLING:
- Return specific error messages for each failure case
- Handle email sending failures gracefully
- Provide user-friendly error messages
```

#### Task 1.3: Update Registration API Endpoint
**Objective**: Split registration into two steps

**Prompt for LLM**:
```
Modify the patient registration flow in backend/api/views.py to support two-step verification:

STEP 1 - INITIATE REGISTRATION:
Endpoint: POST /api/register/initiate/
Input: { email, first_name, last_name, contact_number, address, password, birthday }
Logic:
- Validate input data
- Check if email already registered
- Create verification record with user data
- Send verification email
- Return: { success: true, message: "Verification code sent to email", email: email }

STEP 2 - CONFIRM REGISTRATION:
Endpoint: POST /api/register/confirm/
Input: { email, code }
Logic:
- Verify code using EmailVerificationService
- If valid: create user account, create patient record, login user
- Return: { success: true, token: jwt_token, user: user_data }
- If invalid: Return: { success: false, error: "error_message", attempts_remaining: N }

ENDPOINT 3 - RESEND CODE:
Endpoint: POST /api/register/resend/
Input: { email }
Logic:
- Resend verification code using EmailVerificationService
- Return: { success: true, message: "New code sent" }

Use Django REST Framework best practices.
Include proper error handling and validation.
Return appropriate HTTP status codes (200, 400, 429, etc.).
```

---

### Phase 2: Frontend - Next.js UI Components

#### Task 2.1: Create Registration Flow State Management
**Objective**: Manage multi-step registration state

**Prompt for LLM**:
```
Create a custom React hook `useRegistrationFlow` in frontend/hooks/use-registration-flow.ts with the following functionality:

STATE MANAGEMENT:
- step: 'form' | 'verification' | 'success'
- email: string
- userData: { first_name, last_name, etc. }
- isLoading: boolean
- error: string | null
- attemptsRemaining: number
- canResend: boolean
- resendCountdown: number (seconds)

METHODS:
1. submitRegistration(userData):
   - Call POST /api/register/initiate/
   - On success: move to verification step, store email
   - On error: show error message

2. verifyCode(code):
   - Call POST /api/register/confirm/
   - On success: save token, redirect to dashboard
   - On error: show error, update attempts remaining

3. resendCode():
   - Call POST /api/register/resend/
   - Start 60-second countdown before allowing resend again
   - Show success message

4. resetFlow():
   - Clear all state
   - Return to form step

Use TypeScript for type safety.
Implement proper loading states.
Handle all error cases with user-friendly messages.
```

#### Task 2.2: Update Registration Modal
**Objective**: Modify existing registration form

**Prompt for LLM**:
```
Update the registration modal in frontend/components/register-modal.tsx to work with the new verification flow:

CHANGES NEEDED:
1. Import and use useRegistrationFlow hook
2. Keep existing form UI (first name, last name, birthday, email, contact, address, password)
3. On form submit:
   - Prevent default
   - Call submitRegistration from hook
   - Show loading state
4. Don't close modal after form submission
5. Show success message: "Verification code sent to your email"
6. Provide option to change email or proceed to verification

CONDITIONAL RENDERING:
- If step === 'form': Show registration form
- If step === 'verification': Show verification code input component
- If step === 'success': Show success message and redirect

Use existing UI components from components/ui/ folder.
Maintain consistent styling with current design.
Add proper form validation before submission.
```

#### Task 2.3: Create Verification Code Input Component
**Objective**: Build 6-digit code input interface

**Prompt for LLM**:
```
Create a new component frontend/components/verification-code-input.tsx with the following specifications:

UI REQUIREMENTS:
- Display "Verification Code" heading
- Show message: "Please enter the 6-digit code that was sent to {email}"
- 6 individual input boxes for each digit (similar to OTP input)
- Each box should:
  * Accept only numbers (0-9)
  * Auto-focus next box when digit entered
  * Auto-focus previous box on backspace
  * Show visual focus state
  * Be large and easy to tap (mobile-friendly)
- Display expiration countdown: "Code expires in 09:45"
- Show "Resend Code" button (disabled during countdown)
- Show error message if code is incorrect
- Display attempts remaining: "2 attempts remaining"
- Show loading spinner when verifying

INTERACTIONS:
1. On entering 6th digit: automatically submit verification
2. On paste: parse and fill all 6 digits if valid
3. On resend click: request new code, reset countdown
4. On error: shake animation, clear inputs

PROPS:
- email: string
- onVerify: (code: string) => Promise<void>
- onResend: () => Promise<void>
- onChangeEmail: () => void
- error: string | null
- attemptsRemaining: number
- isLoading: boolean

Use Tailwind CSS for styling.
Use components from components/ui/ (Button, Input, etc.).
Make it fully accessible (keyboard navigation, ARIA labels).
Implement smooth animations for state changes.
```

---

### Phase 3: Email Template Design

#### Task 3.1: Create Verification Email Template
**Objective**: Professional, branded verification email

**Prompt for LLM**:
```
Create an HTML email template for the verification code in backend/api/templates/verification_email.html:

DESIGN REQUIREMENTS:
- Professional, clean design
- Dorotheo Dental Clinic branding (use green accent color: #166534)
- Mobile-responsive layout (works on all email clients)
- Clear call-to-action

CONTENT STRUCTURE:
1. Header with clinic logo/name
2. Personalized greeting: "Hello {first_name},"
3. Main message: "Thank you for registering with Dorotheo Dental Clinic"
4. Large, prominent 6-digit code in a styled box
5. Expiration notice: "This code will expire in 10 minutes"
6. Alternative action: Link to resend code (if possible)
7. Security notice: "If you didn't request this, please ignore this email"
8. Footer with clinic contact info

TECHNICAL REQUIREMENTS:
- Use inline CSS (for email client compatibility)
- Test with major email clients (Gmail, Outlook, Apple Mail)
- Include plain text alternative
- Make code copyable
- Use Django template variables: {{ code }}, {{ first_name }}, {{ expiration_time }}

Reference: Check existing email templates in email_service.py for consistency.
```

---

### Phase 4: Database Migrations

#### Task 4.1: Create Migration Files
**Objective**: Apply database schema changes

**Prompt for LLM**:
```
Generate Django migration commands for the new EmailVerification model:

1. Create initial migration:
   - Command: python manage.py makemigrations
   - Review generated migration file
   - Ensure indexes on email field

2. Apply migration:
   - Command: python manage.py migrate
   - Verify table created successfully

3. Create admin interface:
   - Register EmailVerification in backend/api/admin.py
   - Add list display: email, code, status, created_at, attempts
   - Add filters: status, created_at
   - Add search: email
   - Make fields readonly for security

Provide exact commands and expected output.
```

---

### Phase 5: Security Enhancements

#### Task 5.1: Implement Rate Limiting
**Objective**: Prevent abuse

**Prompt for LLM**:
```
Add rate limiting to verification endpoints using Django middleware or decorators:

RATE LIMITS:
- /api/register/initiate/: 3 requests per email per hour
- /api/register/confirm/: 10 requests per IP per minute
- /api/register/resend/: 3 requests per email per hour

IMPLEMENTATION OPTIONS:
1. Use django-ratelimit package
2. Create custom rate limiting decorator
3. Use Redis for tracking (if available)

REQUIREMENTS:
- Return 429 Too Many Requests when limit exceeded
- Include Retry-After header
- Provide clear error messages
- Log rate limit violations

Choose the best approach for the current tech stack.
Provide installation commands if new packages needed.
```

#### Task 5.2: Add Security Logging
**Objective**: Audit trail for security events

**Prompt for LLM**:
```
Implement comprehensive logging for verification flow in backend/api/email_verification_service.py:

LOG EVENTS:
1. Verification code generated (email, timestamp)
2. Verification email sent (success/failure)
3. Code verification attempted (email, success/failure, IP address)
4. Multiple failed attempts (email, count, IP address)
5. Code expired used attempt (email)
6. Account created after verification (email, user_id)

LOGGING REQUIREMENTS:
- Use Python logging module
- Create separate logger: 'email_verification'
- Include: timestamp, email, IP address, user agent
- Store in separate log file: logs/verification.log
- Include in Django admin for review
- Alert on suspicious patterns (many failures from same IP)

Use Django's logging configuration.
Follow security logging best practices.
Don't log the actual verification codes.
```

---

### Phase 6: Testing Strategy

#### Task 6.1: Backend Unit Tests
**Objective**: Test verification logic

**Prompt for LLM**:
```
Create comprehensive unit tests in backend/api/tests/test_email_verification.py:

TEST CASES:
1. Verification code generation:
   - Generates exactly 6 digits
   - Codes are unique
   - Codes are random

2. Code expiration:
   - Codes expire after 10 minutes
   - Expired codes cannot be used
   - is_expired() method works correctly

3. Attempt limiting:
   - Max 3 attempts allowed
   - Attempts increment on failure
   - Verification locked after 3 failures

4. Registration flow:
   - initiate_registration creates verification
   - Email sent successfully
   - confirm_registration creates user account
   - Invalid code returns error
   - Expired code returns error

5. Resend functionality:
   - New code generated
   - Old code invalidated
   - Rate limiting enforced

6. Edge cases:
   - Duplicate email registrations
   - Concurrent verification attempts
   - Special characters in user data

Use Django TestCase or pytest.
Mock email sending.
Use factories for test data.
Aim for >90% code coverage.
```

#### Task 6.2: Frontend Integration Tests
**Objective**: Test UI flow

**Prompt for LLM**:
```
Create integration tests for the verification UI flow using Jest and React Testing Library:

TEST SCENARIOS:
1. Registration form submission:
   - Fill form with valid data
   - Submit form
   - Verify API called correctly
   - Verify moves to verification step

2. Code input:
   - Type 6-digit code
   - Verify auto-submission
   - Handle paste event
   - Test backspace behavior

3. Verification success:
   - Enter correct code
   - Verify API called
   - Verify redirect to dashboard
   - Verify token saved

4. Verification failure:
   - Enter wrong code
   - Verify error shown
   - Verify attempts decremented
   - Verify can retry

5. Resend functionality:
   - Click resend button
   - Verify countdown starts
   - Verify button disabled
   - Verify new code sent

6. Accessibility:
   - Keyboard navigation works
   - Screen reader announcements
   - Focus management

Place tests in: frontend/__tests__/verification-flow.test.tsx
Use MSW for API mocking.
```

---

### Phase 7: Documentation

#### Task 7.1: Update API Documentation
**Objective**: Document new endpoints

**Prompt for LLM**:
```
Create API documentation for verification endpoints in project-documentation/API_ENDPOINTS.md:

FORMAT: OpenAPI/Swagger style

ENDPOINTS TO DOCUMENT:
1. POST /api/register/initiate/
2. POST /api/register/confirm/
3. POST /api/register/resend/

FOR EACH ENDPOINT INCLUDE:
- Description
- Request body schema
- Response schema (success and error cases)
- Status codes
- Example requests (curl, JavaScript fetch)
- Example responses
- Rate limits
- Error codes and meanings

Use clear, professional language.
Include authentication requirements (if any).
Add example code snippets in multiple languages.
```

#### Task 7.2: Update User Guide
**Objective**: Help users understand verification

**Prompt for LLM**:
```
Add a "Patient Registration with Email Verification" section to docs/USER_GUIDE.md:

CONTENT TO INCLUDE:
1. Overview of verification process
2. Step-by-step registration instructions:
   - Fill registration form
   - Check email for code
   - Enter 6-digit code
   - What to do if code doesn't arrive
   - How to resend code
3. Troubleshooting:
   - Code expired
   - Too many failed attempts
   - Email not received
   - Spam folder check
4. Security information:
   - Why verification is required
   - Code expiration (10 minutes)
   - What to do if suspicious activity
5. Screenshots (placeholders for now)

Use clear, non-technical language.
Format with Markdown.
Include FAQ section.
```

---

## 🔄 Implementation Order

**Week 1: Backend Foundation**
1. Create EmailVerification model
2. Write and run migrations
3. Create EmailVerificationService
4. Create email template

**Week 2: Backend API**
1. Update registration endpoints
2. Implement rate limiting
3. Add security logging
4. Write backend tests

**Week 3: Frontend UI**
1. Create useRegistrationFlow hook
2. Update register modal
3. Create verification code input component
4. Style and polish UI

**Week 4: Testing & Polish**
1. Integration testing
2. Security audit
3. Documentation
4. User acceptance testing

---

## 📊 Success Metrics

- ✅ 100% of new registrations go through verification
- ✅ <1% verification email delivery failures
- ✅ <5% verification abandonment rate
- ✅ 0 security incidents related to verification
- ✅ Average verification time <2 minutes

---

## 🔒 Security Checklist

- [ ] Verification codes are cryptographically secure random
- [ ] Codes expire after 10 minutes
- [ ] Rate limiting prevents brute force
- [ ] Attempt limiting (max 3 tries)
- [ ] Constant-time code comparison prevents timing attacks
- [ ] Sensitive operations logged
- [ ] Email delivery failures handled gracefully
- [ ] No verification codes in logs
- [ ] HTTPS enforced for all verification endpoints
- [ ] CSRF protection enabled

---

## 🚀 Deployment Steps

1. **Pre-Deployment**:
   - Run all tests
   - Update environment variables
   - Configure email service credentials
   - Set up monitoring

2. **Database Migration**:
   - Backup database
   - Run migrations on staging
   - Verify migration success
   - Run migrations on production

3. **Code Deployment**:
   - Deploy backend changes
   - Deploy frontend changes
   - Verify email sending works
   - Test full registration flow

4. **Post-Deployment**:
   - Monitor error logs
   - Monitor email delivery rates
   - Monitor registration completion rates
   - Collect user feedback

---

## 📞 Support & Maintenance

**Monitoring**:
- Email delivery success rate
- Verification completion rate
- Failed attempt patterns
- Rate limit triggers

**Common Issues**:
- Email in spam folder → Add SPF/DKIM records
- High abandonment → Reduce expiration time to 15 minutes
- Many resends → Improve email delivery

**Regular Tasks**:
- Clean up expired verifications (daily cron job)
- Review security logs (weekly)
- Update email templates (as needed)

---

## 📚 References

- Django Email Best Practices: https://docs.djangoproject.com/en/4.2/topics/email/
- OTP Input Patterns: https://www.w3.org/WAI/WCAG21/Understanding/input-purposes.html
- Email Verification Security: https://cheatsheetseries.owasp.org/cheatsheets/Email_Security_Cheat_Sheet.html
- Rate Limiting Strategies: https://www.django-rest-framework.org/api-guide/throttling/

---

## ✅ Definition of Done

- [ ] All backend endpoints implemented and tested
- [ ] All frontend components implemented and tested
- [ ] Email template created and tested across email clients
- [ ] Database migrations applied successfully
- [ ] Rate limiting and security measures in place
- [ ] Unit tests written and passing (>90% coverage)
- [ ] Integration tests written and passing
- [ ] Documentation updated
- [ ] Code reviewed and approved
- [ ] Deployed to staging and tested
- [ ] Deployed to production
- [ ] Monitoring in place
- [ ] Team trained on new flow
