# Contributing to Dorotheo Dental Clinic Management System

Thank you for considering contributing to this project! This document provides guidelines for contributing.

## Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR-USERNAME/APC_2025_2026_T1_SS231_G07-DDC-Management-System.git
   cd APC_2025_2026_T1_SS231_G07-DDC-Management-System
   ```

3. **Set up the development environment**
   - Follow [Backend Setup](dorotheo-dental-clinic-website/backend/README.md)
   - Follow [Frontend Setup](dorotheo-dental-clinic-website/frontend/SETUP.md)

## Development Workflow

### 1. Create a Branch

Create a feature branch from `main`:

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

**Branch Naming Conventions:**
- `feature/` - New features (e.g., `feature/appointment-reminders`)
- `fix/` - Bug fixes (e.g., `fix/login-error`)
- `docs/` - Documentation updates (e.g., `docs/api-endpoints`)
- `refactor/` - Code refactoring (e.g., `refactor/auth-logic`)
- `test/` - Adding tests (e.g., `test/appointment-validation`)

### 2. Make Your Changes

- Write clean, readable code
- Follow existing code style and conventions
- Add comments for complex logic
- Update documentation as needed

### 3. Test Your Changes

**Backend:**
```bash
cd dorotheo-dental-clinic-website/backend
python manage.py test
```

**Frontend:**
```bash
cd dorotheo-dental-clinic-website/frontend
npm run lint
```

**Manual Testing:**
- Start both backend and frontend servers
- Test the feature thoroughly in the browser
- Check for console errors
- Verify mobile responsiveness

### 4. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add appointment reminder feature"
```

**Commit Message Format:**
```
<type>: <subject>

<body> (optional)
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Examples:**
```
feat: add email notifications for appointments
fix: resolve login redirect issue
docs: update API documentation
refactor: simplify appointment booking logic
```

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear title describing the change
- Description of what was changed and why
- Screenshots/GIFs if UI changes
- Link to related issues

## Code Style Guidelines

### TypeScript/JavaScript

- Use TypeScript types/interfaces
- Prefer `const` over `let`
- Use arrow functions for anonymous functions
- Use async/await over promises
- Avoid `any` type when possible

**Good:**
```typescript
const fetchPatients = async (): Promise<Patient[]> => {
  const response = await api.getPatients(token)
  return response.results
}
```

**Avoid:**
```typescript
function fetchPatients() {
  return api.getPatients(token).then(response => {
    return response.results
  })
}
```

### Python/Django

- Follow PEP 8 style guide
- Use type hints where applicable
- Write docstrings for functions and classes
- Use Django best practices

**Good:**
```python
def create_appointment(user: User, data: dict) -> Appointment:
    """
    Create a new appointment for the given user.
    
    Args:
        user: The user creating the appointment
        data: Appointment data dictionary
        
    Returns:
        The created Appointment instance
    """
    appointment = Appointment.objects.create(
        patient=user,
        **data
    )
    return appointment
```

### React Components

- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use proper prop types

**Good:**
```typescript
interface AppointmentCardProps {
  appointment: Appointment
  onCancel: (id: number) => void
}

export function AppointmentCard({ appointment, onCancel }: AppointmentCardProps) {
  return (
    <div className="appointment-card">
      {/* component content */}
    </div>
  )
}
```

## Testing Guidelines

- Write tests for new features
- Update tests when modifying existing code
- Ensure all tests pass before submitting PR
- Aim for good code coverage

## Documentation

- Update README files when adding features
- Document API changes in API_DOCUMENTATION.md
- Add inline comments for complex logic
- Update setup guides if dependencies change

## Code Review Process

1. Submit pull request
2. Wait for automated checks to pass
3. Address reviewer feedback
4. Make requested changes
5. Get approval from maintainers
6. Merge when approved

## Issues and Bug Reports

When reporting bugs, include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser/OS information
- Error messages from console

**Template:**
```markdown
**Description:**
Login button does not respond to clicks

**Steps to Reproduce:**
1. Go to login page
2. Enter valid credentials
3. Click login button
4. Nothing happens

**Expected Behavior:**
Should redirect to dashboard

**Actual Behavior:**
Button does nothing, no errors in console

**Environment:**
- Browser: Chrome 120
- OS: macOS 14.0
- Frontend version: main branch
```

## Questions?

- Check existing documentation
- Search closed issues
- Ask in pull request comments
- Contact the maintainers

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

Thank you for contributing! 🎉
