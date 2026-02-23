# 🚀 Push HawkFi to GitHub

## Quick Push Commands

```bash
# 1. Check git status
git status

# 2. Add all files
git add .

# 3. Commit with message
git commit -m "Complete HawkFi HFL platform with Percolator and MagicBlock integration"

# 4. Push to GitHub
git push origin main
```

## First Time Setup (If Not Done)

### Step 1: Initialize Git Repository

```bash
# Initialize git (if not already done)
git init

# Check current status
git status
```

### Step 2: Create .gitignore

Make sure you have a `.gitignore` file (already created):

```bash
# View .gitignore
cat .gitignore

# Should include:
# node_modules/
# .env
# dist/
# .DS_Store
```

### Step 3: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `hawkfi-hfl-platform`
3. Description: "HawkFi HFL - Precision LP Management with AI"
4. Choose: Public or Private
5. **DO NOT** initialize with README (we already have one)
6. Click "Create repository"

### Step 4: Link to GitHub

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/hawkfi-hfl-platform.git

# Verify remote
git remote -v
```

### Step 5: Initial Commit and Push

```bash
# Add all files
git add .

# Commit
git commit -m "Initial commit: Complete HawkFi HFL platform

- React + Vite + Tailwind frontend
- Express + TypeScript backend
- Supabase Postgres database
- OpenRouter ML ensemble (minimax-m2.5 → deepseek-v3.1)
- 69-bin Precision Curve algorithm
- MCU up-only strategy
- Percolator perpetual futures integration
- MagicBlock Ephemeral Rollups support
- Railway deployment configuration
- Complete documentation (13 guides)"

# Push to GitHub
git push -u origin main
```

## If You Get Errors

### Error: "failed to push some refs"

**Solution**: Pull first, then push
```bash
git pull origin main --rebase
git push origin main
```

### Error: "remote origin already exists"

**Solution**: Update the remote URL
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/hawkfi-hfl-platform.git
git push origin main
```

### Error: "src refspec main does not match any"

**Solution**: You're on a different branch
```bash
# Check current branch
git branch

# If on 'master', push to master
git push origin master

# Or rename to main
git branch -M main
git push -u origin main
```

### Error: Authentication failed

**Solution**: Use Personal Access Token (PAT)

1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `workflow`
4. Copy the token
5. Use token as password when pushing

Or use SSH:
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add to GitHub: https://github.com/settings/keys
cat ~/.ssh/id_ed25519.pub

# Change remote to SSH
git remote set-url origin git@github.com:YOUR_USERNAME/hawkfi-hfl-platform.git
```

## What Gets Pushed

### ✅ Included (48 files)

```
✅ Source code (backend/, src/)
✅ Configuration (package.json, tsconfig.json, etc.)
✅ Documentation (13 .md files)
✅ Database schema (supabase/schema.sql)
✅ Scripts (scripts/)
✅ Railway config (railway.toml)
✅ Environment template (.env.example)
```

### ❌ Excluded (in .gitignore)

```
❌ node_modules/ (dependencies)
❌ .env (secrets)
❌ dist/ (build output)
❌ .DS_Store (macOS files)
❌ logs/ (log files)
```

## Verify Push

After pushing, check:

1. **GitHub Repository**: https://github.com/YOUR_USERNAME/hawkfi-hfl-platform
2. **Files visible**: Should see all 48 files
3. **README displayed**: Should show project overview
4. **No secrets**: Verify .env is NOT pushed

## Connect to Railway

After pushing to GitHub:

```bash
# Login to Railway
railway login

# Link GitHub repo
railway init

# Select: "Deploy from GitHub repo"
# Choose: hawkfi-hfl-platform

# Railway will auto-deploy on every push!
```

## Continuous Deployment

Once connected to Railway:

```bash
# Make changes
# ... edit files ...

# Commit and push
git add .
git commit -m "Update feature"
git push origin main

# Railway automatically deploys! 🚀
```

## Branch Strategy (Optional)

For team development:

```bash
# Create development branch
git checkout -b develop

# Make changes
# ... edit files ...

# Commit
git add .
git commit -m "Add new feature"

# Push to develop branch
git push origin develop

# Create Pull Request on GitHub
# Merge to main when ready
```

## Useful Git Commands

```bash
# Check status
git status

# View changes
git diff

# View commit history
git log --oneline

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all changes
git reset --hard HEAD

# Create new branch
git checkout -b feature-name

# Switch branches
git checkout main

# Pull latest changes
git pull origin main

# View remotes
git remote -v
```

## GitHub Repository Settings

After pushing, configure:

### 1. Repository Description
- Go to repository settings
- Add description: "HawkFi HFL - Precision LP Management with AI-powered rebalancing"
- Add topics: `solana`, `defi`, `lp-management`, `ai`, `typescript`, `react`

### 2. Enable GitHub Actions (Optional)
- Create `.github/workflows/deploy.yml` for CI/CD
- Auto-test on pull requests
- Auto-deploy to Railway

### 3. Add README Badges
Add to top of README.md:

```markdown
[![Deploy to Railway](https://railway.app/button.svg)](https://railway.app/new/template)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

## Security Checklist

Before pushing, verify:

- [ ] `.env` is in `.gitignore`
- [ ] No API keys in code
- [ ] No private keys committed
- [ ] `.env.example` has placeholder values only
- [ ] Secrets are in Railway environment variables

## Quick Reference

```bash
# Daily workflow
git pull origin main          # Get latest
# ... make changes ...
git add .                     # Stage changes
git commit -m "Description"   # Commit
git push origin main          # Push to GitHub

# Railway auto-deploys! 🚀
```

## Next Steps

1. ✅ Push to GitHub
2. → Connect to Railway
3. → Set environment variables in Railway
4. → Deploy automatically on push
5. → Share repository with team

---

**Ready to Push! 🚀**

Run: `git add . && git commit -m "Initial commit" && git push origin main`
