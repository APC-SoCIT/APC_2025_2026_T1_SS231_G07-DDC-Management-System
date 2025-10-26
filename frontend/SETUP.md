# Frontend Setup Notes

## Dependency Resolution

The project has been updated to resolve React 19 compatibility issues:

- **Updated `vaul`**: Changed from `^0.9.9` to `^1.1.1` for React 19 support
- **Added `.npmrc`**: Configured with `legacy-peer-deps=true` to handle peer dependency conflicts

## Installation

You can use either npm or pnpm:

### Using npm (recommended if pnpm not installed)
```bash
npm install
npm run dev
```

### Using pnpm (if installed)
```bash
pnpm install
pnpm dev
```

## Package Manager Note

The project originally had a `pnpm-lock.yaml` file, but if pnpm is not installed on your system, you can safely use npm instead. The `package-lock.json` will be generated automatically.

## Running the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Build for Production

```bash
npm run build
npm start
```

## Common Issues

### Dependency Conflicts
If you encounter dependency conflicts:
1. Delete `node_modules` folder
2. Delete `package-lock.json` (if using npm)
3. Run `npm install` again

### Port Already in Use
If port 3000 is already in use:
```bash
npm run dev -- -p 3001
```
