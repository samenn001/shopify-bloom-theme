# Deployment Instructions

Since GitHub Actions requires a paid account, here's how to deploy manually:

## Manual Deployment Workflow

### Option 1: Direct Push (Current Setup)
```bash
# 1. Make your changes locally
# 2. Push to Shopify
shopify theme push --theme 184655905105 --allow-live

# 3. Push to GitHub for backup
git add .
git commit -m "Your changes"
git push
```

### Option 2: Using Branches
- `master` branch: Your backup/development
- `shopify-ready` branch: Clean version ready for Shopify

To deploy from GitHub:
```bash
# Pull latest from GitHub
git pull origin shopify-ready

# Push to Shopify
shopify theme push --theme 184655905105 --allow-live
```

### Option 3: Free Automation Alternative
Use **Netlify** or **Vercel** (both have free tiers) to trigger deployments, or use a local scheduled task.

## Theme IDs
- Live Theme: `184655905105` (Bloom Theme)
- Store: `qc2qux-ry.myshopify.com`

## Important Files
- `config/settings_data.json` - Contains all theme customizations (MUST be included)
- `templates/index.json` - Homepage template
- `layout/theme.liquid` - Main theme layout

## Quick Commands
```bash
# Push everything to live theme
shopify theme push --allow-live

# Push specific file
shopify theme push --only assets/base.css --allow-live

# Pull latest from Shopify
shopify theme pull

# Start development mode
shopify theme dev
```