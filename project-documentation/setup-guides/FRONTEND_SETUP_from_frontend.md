# Frontend Setup Guide (frontend/SETUP.md)

## Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- Backend server running (see backend setup)

## Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the `frontend` directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set your configuration:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

**Environment Variables:**
- `NEXT_PUBLIC_API_URL`: The URL of your backend API
  - Local development: `http://127.0.0.1:8000`
  - Production: Your deployed backend URL (e.g., `https://your-backend.railway.app`)

### 3. Start Development Server

```bash
npm run dev
# or
./node_modules/.bin/next dev
```

The frontend will be available at: **http://localhost:3000**

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
frontend/
├── app/                    # Next.js app directory (routes)
│   ├── owner/             # Owner dashboard pages
│   ├── staff/             # Staff dashboard pages
│   ├── patient/           # Patient portal pages
│   └── login/             # Authentication pages
├── components/            # Reusable React components
│   └── ui/               # UI components (buttons, modals, etc.)
├── lib/                   # Utility functions
│   ├── api.ts            # API client functions
│   ├── auth.tsx          # Authentication context
│   └── utils.ts          # Helper functions
├── public/               # Static assets
└── styles/              # Global styles
```

## Tech Stack

- **Framework**: Next.js 15.5.12
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Form Validation**: React Hook Form + Zod
- **HTTP Client**: Fetch API

## Common Issues

### Module Not Found Errors

If you see "Cannot find module 'react'" or similar errors:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use

If port 3000 is already in use:

```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or run on a different port
PORT=3001 npm run dev
```

## Development Workflow

1. Make changes to your code
2. Next.js will automatically hot-reload
3. Check for errors in the browser console
4. Test your changes
5. Commit and push

## Building for Production

```bash
npm run build
npm run start
```

## Deployment

See deployment guides:
- Vercel: [Backend Vercel Deployment Guide](../backend/VERCEL_DEPLOYMENT_GUIDE.md)
- Railway: [Backend Railway Deployment Guide](../backend/RAILWAY_DEPLOYMENT_GUIDE.md)

## Need Help?

- Check the [main README](../README.md)
- Review [backend setup](../backend/README.md)
- See [project documentation](../../project-documentation/)
