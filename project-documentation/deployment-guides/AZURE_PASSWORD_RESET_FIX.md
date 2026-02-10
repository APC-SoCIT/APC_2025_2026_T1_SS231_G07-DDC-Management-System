# Azure Backend Password Reset Fix

## Problem
Password reset links are pointing to an incorrect Vercel URL, resulting in a 404 DEPLOYMENT_NOT_FOUND error.

## Root Cause
The `FRONTEND_URL` environment variable in your Azure Web App backend is set to an incorrect or non-existent Vercel deployment URL.

## Solution

### Step 1: Get Your Correct Vercel Frontend URL

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project (dorotheo-dental-clinic)
3. Click on the **Domains** tab
4. Copy the **production domain** (e.g., `https://your-app-name.vercel.app`)

### Step 2: Update Azure Environment Variable

1. Go to Azure Portal: https://portal.azure.com
2. Navigate to your **App Service** (backend)
3. In the left sidebar, click **Configuration** (under Settings)
4. Under **Application settings**, find or add `FRONTEND_URL`
5. Set the value to your correct Vercel URL (e.g., `https://apc-2025-2026-t1-ss231-g07-ddc-management-system.vercel.app`)
6. Click **Save** at the top
7. Click **Continue** to confirm restart

### Step 3: Verify the Fix

1. Wait 1-2 minutes for Azure to apply changes
2. Go to your frontend login page
3. Click "Forgot Password?"
4. Enter your email
5. Check your email for the reset link
6. The link should now point to your correct Vercel URL

## Quick Fix Command (Alternative)

If you have Azure CLI installed:

```bash
az webapp config appsettings set --name YOUR_AZURE_APP_NAME --resource-group YOUR_RESOURCE_GROUP --settings FRONTEND_URL="https://your-correct-vercel-url.vercel.app"
```

## Common Vercel URL Patterns

Your Vercel URL should look like one of these:
- `https://project-name.vercel.app` (production)
- `https://project-name-git-main-username.vercel.app` (branch deployment)
- Custom domain if you've set one up

## Verification Checklist

- [ ] Copied correct Vercel production URL from Vercel dashboard
- [ ] Updated `FRONTEND_URL` in Azure App Service Configuration
- [ ] Saved and restarted Azure backend
- [ ] Tested password reset flow end-to-end
- [ ] Confirmed email contains correct Vercel URL
- [ ] Verified reset link loads your login page correctly

## Notes

- The backend code at [api/views.py](dorotheo-dental-clinic-website/backend/api/views.py#L223) constructs the reset link as: `{FRONTEND_URL}/login?reset_token={token}`
- The frontend at [app/login/page.tsx](dorotheo-dental-clinic-website/frontend/app/login/page.tsx#L31) correctly handles the `reset_token` query parameter
- The issue is purely with the environment variable configuration in Azure

## Need More Help?

If you're still having issues:
1. Check Azure App Service logs for the actual `FRONTEND_URL` being used
2. Verify your Vercel deployment is actually live (visit the URL directly)
3. Check that your Vercel project hasn't been renamed or deleted
