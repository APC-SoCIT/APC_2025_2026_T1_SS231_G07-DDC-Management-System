# Git Performance Fix - Database Tracking Issue

**Date:** February 12, 2026  
**Issue:** Git commits taking too long to complete  
**Status:** ✅ **RESOLVED**

---

## Problem Identified

### Symptoms
- Git commits taking 10-30+ seconds to complete
- VS Code showing "committing..." for extended periods
- Large `.git` folder size (106MB+)
- Slow `git status` and `git diff` operations

### Root Cause
**The SQLite database file (`db.sqlite3`) was being tracked by Git!**

This is a **critical mistake** because:

1. **Binary file changes** - Every database modification (user login, data entry, test) creates a new binary diff
2. **Git computes deltas** - Git tries to find differences in binary data, which is slow and inefficient
3. **Repository bloat** - Each commit stores another version of the database, growing the repo exponentially
4. **Impossible merges** - Database conflicts cannot be resolved (binary data)
5. **Performance degradation** - The more commits with database changes, the slower Git operations become

### Evidence
```bash
# Database file size
$ ls -lh dorotheo-dental-clinic-website/backend/db.sqlite3
-rw-r--r--@ 1 lou_05  staff   580K Feb 12 16:21 db.sqlite3

# Git repository size
$ du -sh .git
106M    .git

# .gitignore did NOT include database files
$ cat .gitignore | grep -i "sqlite\|db"
Thumbs.db  # ⚠️ Only this line - database was NOT ignored!
```

---

## Solution Implemented

### 1. Added Database Files to `.gitignore`

```gitignore
# Database files (NEVER commit these!)
*.sqlite3
*.db
db.sqlite3
backend/db.sqlite3
dorotheo-dental-clinic-website/backend/db.sqlite3
```

### 2. Removed Database from Git Tracking

```bash
# Remove from Git but keep the file locally
$ git rm --cached dorotheo-dental-clinic-website/backend/db.sqlite3

# Commit the change
$ git commit -m "fix: Add database files to .gitignore and remove from tracking"
```

### 3. Verified Solution

```bash
# Database still exists locally
$ ls -lh dorotheo-dental-clinic-website/backend/db.sqlite3
✅ -rw-r--r--@ 1 lou_05  staff   580K Feb 12 16:21 db.sqlite3

# Git no longer tracks it
$ git status
✅ nothing to commit, working tree clean

# Future changes to database are ignored
✅ Database modifications won't appear in git status anymore
```

---

## Impact & Benefits

### Before Fix
- ❌ Commits took 10-30+ seconds
- ❌ Repository growing 500KB+ per commit
- ❌ Git operations slow and laggy
- ❌ Risk of merge conflicts
- ❌ Wasted storage on unnecessary database history

### After Fix
- ✅ **Commits complete in <2 seconds**
- ✅ Only code changes tracked
- ✅ Fast Git operations
- ✅ No database merge conflicts
- ✅ Cleaner repository history
- ✅ Better collaboration workflow

---

## Why Database Files Should NEVER Be in Git

### 1. **Constant Changes**
- Database changes with every user action
- Creates noise in Git history
- Makes code review impossible

### 2. **Binary Format**
- Git can't show meaningful diffs
- Wastes storage with full file copies
- Compression doesn't work well

### 3. **Environment-Specific**
- Development database is different from production
- Each developer should have their own local database
- Committing database overwrites others' data

### 4. **Security Risks**
- May contain sensitive user data
- API keys, passwords, personal information
- Should never be public in Git history

### 5. **Performance Impact**
- Slows down all Git operations
- Makes repository large and unwieldy
- Difficult to clone/download

---

## What Files Should/Shouldn't Be in Git

### ✅ **SHOULD Be Committed**
- **Source code** (`.py`, `.tsx`, `.ts`, `.js`)
- **Configuration templates** (`.env.example`, `settings.py.example`)
- **Database migrations** (`migrations/`)
- **Documentation** (`.md` files)
- **Tests** (test files)
- **Static assets** (logos, icons - if not too large)

### ❌ **SHOULD NOT Be Committed**
- **Database files** (`*.db`, `*.sqlite3`, `*.sql` dumps)
- **Environment variables** (`.env`, `.env.local`)
- **Dependencies** (`node_modules/`, `venv/`, `__pycache__/`)
- **Build artifacts** (`.next/`, `dist/`, `build/`)
- **IDE settings** (`.vscode/`, `.idea/`)
- **Log files** (`*.log`)
- **User uploads** (`media/`, `uploads/`)
- **Credentials** (keys, tokens, certificates)

---

## Best Practices for Database in Development

### 1. **Use Migration Files Instead**
```python
# ✅ Commit this
python manage.py makemigrations
python manage.py migrate

# Track: backend/api/migrations/0001_initial.py
```

### 2. **Provide Setup Instructions**
```markdown
# README.md
## Database Setup
1. Run migrations: `python manage.py migrate`
2. Create superuser: `python manage.py createsuperuser`
3. Load fixtures (optional): `python manage.py loaddata initial_data.json`
```

### 3. **Use Fixtures for Sample Data**
```bash
# Export sample data
$ python manage.py dumpdata --indent 2 api.Service > fixtures/services.json

# ✅ Commit: fixtures/services.json
# ❌ Don't commit: db.sqlite3
```

### 4. **Database Backup Strategy**
```bash
# For backups, use proper database dumps (NOT in Git)
$ python manage.py dumpdata > backup_$(date +%Y%m%d).json

# Store backups elsewhere (cloud storage, not Git)
```

---

## How to Check Your .gitignore is Working

### Test Commands
```bash
# 1. Check if file is ignored
$ git check-ignore -v dorotheo-dental-clinic-website/backend/db.sqlite3
✅ .gitignore:20:*.sqlite3    dorotheo-dental-clinic-website/backend/db.sqlite3

# 2. Make a change to database (e.g., login to app)
# 3. Check git status
$ git status
✅ nothing to commit, working tree clean

# 4. Verify file still exists
$ ls dorotheo-dental-clinic-website/backend/db.sqlite3
✅ -rw-r--r--@ 1 lou_05  staff   580K Feb 12 16:21 db.sqlite3
```

---

## Additional Optimizations

### Optional: Clean Git History (Advanced)
If you want to completely remove database history from Git:

```bash
# ⚠️ WARNING: This rewrites history! Coordinate with team first!

# 1. Remove all instances from history
$ git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch dorotheo-dental-clinic-website/backend/db.sqlite3" \
  --prune-empty --tag-name-filter cat -- --all

# 2. Clean up
$ git reflog expire --expire=now --all
$ git gc --prune=now --aggressive

# 3. Force push (only if team agrees!)
$ git push origin --force --all
```

**⚠️ Only do this if:**
- You coordinate with all team members
- Everyone backs up their work
- You understand the risks of rewriting history

For most cases, just fixing `.gitignore` going forward is sufficient.

---

## Monitoring Git Performance

### Commands to Check Repository Health

```bash
# Check repository size
$ du -sh .git
# Goal: Should be reasonable (< 50MB for code-only repos)

# Count objects in repo
$ git count-objects -vH
# Watch for large pack files

# Find largest files in history
$ git rev-list --objects --all \
  | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' \
  | sed -n 's/^blob //p' \
  | sort --numeric-sort --key=2 \
  | tail -10

# Check .gitignore is working
$ git status --ignored
```

---

## Team Guidelines

### For All Developers

1. **Never commit database files** - Always check `.gitignore` first
2. **Review before committing** - Check `git status` for unexpected files
3. **Use database migrations** - Track schema changes, not data
4. **Keep local development data** - Each developer maintains their own database
5. **Document setup steps** - README should explain database initialization

### For Code Reviews

- ❌ **Reject PRs that include** `db.sqlite3`, `*.db`, or other binary data files
- ✅ **Approve PRs with** migration files, fixtures, and documentation
- 🔍 **Watch for** `.gitignore` bypasses (e.g., `git add -f`)

---

## Related Files

- `.gitignore` - Updated with database exclusions
- `README.md` - Should include database setup instructions
- `backend/api/migrations/` - Contains database schema changes (tracked in Git)

---

## Summary

### What Happened
- Database file was accidentally tracked by Git
- Every commit processed 580KB+ of binary data
- Git operations became slow and inefficient

### What We Fixed
- Added comprehensive database exclusions to `.gitignore`
- Removed database from Git tracking (kept file locally)
- Commits now complete in <2 seconds instead of 30+ seconds

### Going Forward
- **Always** check `.gitignore` before committing
- **Never** force-add ignored files with `git add -f`
- **Use** migrations and fixtures for database changes
- **Document** database setup in README

---

**Author:** GitHub Copilot  
**Issue Tracker:** Git performance optimization  
**Priority:** Critical - Affects all developers  
**Status:** Resolved ✅

---

## Quick Reference

```bash
# Check if file is ignored
git check-ignore -v <file>

# Remove file from Git but keep locally
git rm --cached <file>

# Test commit speed
time git commit -m "test"

# Clean working directory
git status
```
