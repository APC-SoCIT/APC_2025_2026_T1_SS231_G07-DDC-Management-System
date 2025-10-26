# 🤝 Collaborator Guide - Dental Clinic System

Welcome to the Dental Clinic Management System project!

## 🚀 Getting Started

### Step 1: Accept Invitation
1. Check your email for GitHub invitation from **apcedgalauran**
2. Click "View invitation" and accept it
3. You now have access to the repository!

### Step 2: Clone the Repository
```bash
git clone https://github.com/apcedgalauran/dental-clinic-system.git
cd dental-clinic-system
```

### Step 3: Set Up Your Local Environment

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on: `http://localhost:3000`

#### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
Backend runs on: `http://127.0.0.1:8000`

---

## 💻 Development Workflow

### 1. Before Starting Work
Always pull the latest changes:
```bash
git pull origin main
```

### 2. Create a Feature Branch (Recommended)
```bash
git checkout -b feature/your-feature-name
# Example: git checkout -b feature/add-payment-system
```

### 3. Make Your Changes
- Edit files
- Test your changes locally
- Make sure both frontend and backend work

### 4. Commit Your Changes
```bash
# Check what files changed
git status

# Add files
git add .

# Or add specific files
git add frontend/components/new-component.tsx

# Commit with descriptive message
git commit -m "Add payment system with Stripe integration"
```

### 5. Push to GitHub
```bash
# If working on main branch
git push origin main

# If working on feature branch
git push origin feature/your-feature-name
```

### 6. Create Pull Request (If using branches)
1. Go to https://github.com/apcedgalauran/dental-clinic-system
2. Click "Pull requests" → "New pull request"
3. Select your branch
4. Add description of changes
5. Click "Create pull request"
6. Wait for review and merge

---

## ✅ Best Practices

### Commit Messages
Write clear, descriptive commit messages:
```bash
# Good ✅
git commit -m "Add patient search functionality to dashboard"
git commit -m "Fix appointment booking timezone issue"
git commit -m "Update tooth chart component with new design"

# Bad ❌
git commit -m "update"
git commit -m "fix bug"
git commit -m "changes"
```

### Before Pushing
1. **Test your code** - Make sure it works!
2. **Pull latest changes** - Avoid conflicts
   ```bash
   git pull origin main
   ```
3. **Resolve conflicts** - If any arise
4. **Push** - Send your changes

### Branch Naming Convention
```bash
feature/description    # New features
fix/description        # Bug fixes
update/description     # Updates to existing features
docs/description       # Documentation changes

# Examples:
feature/payment-integration
fix/login-redirect-bug
update/patient-dashboard
docs/api-documentation
```

---

## 🔄 Common Git Commands

### Check Status
```bash
git status                    # See what's changed
git log --oneline            # See commit history
git diff                     # See uncommitted changes
```

### Undo Changes
```bash
git checkout -- filename     # Discard changes in file
git reset HEAD filename      # Unstage file
git reset --hard HEAD        # Discard ALL local changes (careful!)
```

### Branch Management
```bash
git branch                   # List branches
git branch -a               # List all branches (including remote)
git checkout main           # Switch to main branch
git checkout -b new-branch  # Create and switch to new branch
git branch -d branch-name   # Delete local branch
```

### Sync with Remote
```bash
git pull origin main        # Get latest changes
git fetch origin            # Fetch changes without merging
git push origin main        # Push your changes
```

---

## 🐛 Troubleshooting

### Problem: "Permission denied"
**Solution:** Make sure you've accepted the collaborator invitation

### Problem: "Merge conflicts"
**Solution:**
1. Pull latest changes: `git pull origin main`
2. Open conflicted files
3. Resolve conflicts (look for `<<<<<<<`, `=======`, `>>>>>>>`)
4. Stage resolved files: `git add .`
5. Commit: `git commit -m "Resolve merge conflicts"`
6. Push: `git push origin main`

### Problem: "Your branch is behind"
**Solution:**
```bash
git pull origin main
# Resolve any conflicts
git push origin main
```

### Problem: "Failed to push"
**Solution:**
```bash
git pull origin main --rebase
git push origin main
```

---

## 📁 Project Structure

```
dental-clinic-system/
├── frontend/          # Next.js React app
│   ├── app/          # Pages and routes
│   ├── components/   # React components
│   └── lib/          # Utilities
├── backend/          # Django REST API
│   ├── api/          # API endpoints
│   └── dental_clinic/ # Django settings
└── docs/             # Documentation
```

---

## 🎯 Key Areas to Work On

### Frontend Tasks
- Patient dashboard improvements
- Appointment booking UI
- Tooth chart enhancements
- Mobile responsiveness
- New feature components

### Backend Tasks
- API endpoints
- Database models
- Authentication/authorization
- Business logic
- Data validation

### Full-Stack Tasks
- Payment integration
- Notifications system
- Reporting and analytics
- Email functionality
- File uploads

---

## 💬 Communication

### Questions?
- Open an **Issue** on GitHub
- Message the team on [your communication platform]
- Check existing documentation in `docs/`

### Found a Bug?
1. Check if issue already exists
2. Create new issue with:
   - Clear title
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if relevant

---

## 📚 Resources

- **Project README**: [README.md](README.md)
- **API Documentation**: [docs/](docs/)
- **Git Cheat Sheet**: https://education.github.com/git-cheat-sheet-education.pdf
- **Next.js Docs**: https://nextjs.org/docs
- **Django Docs**: https://docs.djangoproject.com/

---

## 🎉 Welcome to the Team!

Thank you for contributing to the Dental Clinic Management System!

**Repository**: https://github.com/apcedgalauran/dental-clinic-system
**Owner**: @apcedgalauran

Happy coding! 💻✨
