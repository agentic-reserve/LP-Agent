# GitHub Personal Access Token (PAT) Setup

## Step 1: Generate Personal Access Token

### 1.1 Go to GitHub Settings
1. Visit: https://github.com/settings/tokens
2. Or navigate: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)

### 1.2 Generate New Token
1. Click **"Generate new token"** → **"Generate new token (classic)"**
2. Note: Give it a descriptive name like "HawkFi Development"
3. Expiration: Choose duration (recommend: 90 days or No expiration)
4. Select scopes:
   - ✅ **repo** (Full control of private repositories)
     - ✅ repo:status
     - ✅ repo_deployment
     - ✅ public_repo
     - ✅ repo:invite
     - ✅ security_events
   - ✅ **workflow** (Update GitHub Action workflows)
   - ✅ **write:packages** (Upload packages to GitHub Package Registry)
   - ✅ **delete:packages** (Delete packages from GitHub Package Registry)

5. Click **"Generate token"** at the bottom

### 1.3 Copy Token
⚠️ **IMPORTANT**: Copy the token NOW! You won't be able to see it again.

Example token format:
```
ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 2: Configure Git to Use Token

### Option A: Store Token in Git Credential Manager (Recommended)

```bash
# Configure git to use credential manager
git config --global credential.helper store

# Now when you push, enter:
# Username: your_github_username
# Password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (your PAT)

# Git will remember it for future pushes
```

### Option B: Use Token in Remote URL

```bash
# Update remote URL to include token
git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/hawkfi-hfl-platform.git

# Replace:
# YOUR_TOKEN = your personal access token (ghp_xxx...)
# YOUR_USERNAME = your GitHub username
```

### Option C: Use Environment Variable

```bash
# Set token as environment variable
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Use in git commands
git push https://$GITHUB_TOKEN@github.com/YOUR_USERNAME/hawkfi-hfl-platform.git main
```

## Step 3: Push to GitHub

### First Time Push

```bash
# 1. Add all files
git add .

# 2. Commit
git commit -m "Complete HawkFi HFL platform with all integrations"

# 3. Push (will prompt for credentials)
git push origin main

# When prompted:
# Username: your_github_username
# Password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (paste your PAT)
```

### Subsequent Pushes

If you used Option A (credential manager), git will remember your token:

```bash
git add .
git commit -m "Your commit message"
git push origin main
# No password prompt! 🎉
```

## Step 4: Verify Push

After pushing:

1. Go to: https://github.com/YOUR_USERNAME/hawkfi-hfl-platform
2. Verify all files are there
3. Check that README.md is displayed

## Complete Example

```bash
# 1. Generate token at https://github.com/settings/tokens
# Copy token: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 2. Configure git credential manager
git config --global credential.helper store

# 3. Add and commit changes
git add .
git commit -m "Complete HawkFi platform"

# 4. Push (enter credentials when prompted)
git push origin main

# Username: your_github_username
# Password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 5. Token is now saved! Future pushes won't ask for password
```

## Troubleshooting

### Issue: "remote: Support for password authentication was removed"

**Solution**: You're using your GitHub password instead of PAT
- Use the PAT (starts with `ghp_`) as the password, not your GitHub account password

### Issue: "Authentication failed"

**Solution**: Check token permissions
1. Go to https://github.com/settings/tokens
2. Click on your token
3. Verify **repo** scope is checked
4. Regenerate token if needed

### Issue: "fatal: Authentication failed for..."

**Solution**: Clear stored credentials and try again
```bash
# Remove stored credentials
git config --global --unset credential.helper

# Or on Windows
git credential-manager-core erase

# Try pushing again
git push origin main
```

### Issue: Token expired

**Solution**: Generate new token
1. Go to https://github.com/settings/tokens
2. Delete old token
3. Generate new token with same scopes
4. Update stored credentials

## Security Best Practices

### ✅ DO:
- Store token securely (use credential manager)
- Set expiration date (90 days recommended)
- Use minimal required scopes
- Regenerate token if compromised
- Delete unused tokens

### ❌ DON'T:
- Commit token to git repository
- Share token with others
- Use token in public code
- Store token in plain text files
- Use same token for multiple projects

## Store Token Securely

### Linux/macOS

```bash
# Store in credential manager
git config --global credential.helper store

# Or use keychain (macOS)
git config --global credential.helper osxkeychain

# Or use libsecret (Linux)
git config --global credential.helper libsecret
```

### Windows

```bash
# Use Windows Credential Manager
git config --global credential.helper manager-core

# Or use wincred
git config --global credential.helper wincred
```

## Alternative: SSH Keys (More Secure)

If you prefer SSH over HTTPS:

```bash
# 1. Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# 2. Add to ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# 3. Copy public key
cat ~/.ssh/id_ed25519.pub

# 4. Add to GitHub: https://github.com/settings/keys

# 5. Change remote to SSH
git remote set-url origin git@github.com:YOUR_USERNAME/hawkfi-hfl-platform.git

# 6. Push without password
git push origin main
```

## Quick Reference

```bash
# Generate token
https://github.com/settings/tokens

# Configure credential manager
git config --global credential.helper store

# Push with token
git push origin main
# Username: your_github_username
# Password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Update remote URL with token
git remote set-url origin https://TOKEN@github.com/USER/REPO.git

# View current remote
git remote -v

# Test authentication
git ls-remote origin
```

## Next Steps After Pushing

1. ✅ Code pushed to GitHub
2. → Connect to Railway: `railway init`
3. → Select GitHub repository
4. → Set environment variables in Railway
5. → Deploy automatically on every push

---

**Ready to Push with PAT! 🚀**

Generate token at: https://github.com/settings/tokens
