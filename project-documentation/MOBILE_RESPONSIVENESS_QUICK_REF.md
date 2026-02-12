# Mobile Responsiveness Quick Reference

## Quick Tailwind Breakpoints
```
Default (Mobile): < 640px
sm: ≥ 640px
md: ≥ 768px  
lg: ≥ 1024px
xl: ≥ 1280px
2xl: ≥ 1536px
```

## Common Patterns

### 📱 Spacing & Padding
```tsx
// Good pattern - less spacing on mobile
p-2 sm:p-4 md:p-6
gap-2 sm:gap-4
space-y-3 sm:space-y-4
```

### 📝 Text Sizing
```tsx
// Headings
text-lg sm:text-xl md:text-2xl lg:text-3xl

// Body text  
text-xs sm:text-sm md:text-base

// Small text
text-[10px] sm:text-xs
```

### 🎨 Layout
```tsx
// Stack on mobile, row on desktop
flex flex-col sm:flex-row

// Single column on mobile, multi-column on larger screens
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3

// Full width on mobile
w-full sm:w-auto
max-w-full sm:max-w-lg
```

### 🖼️ Modals & Overlays
```tsx
// Full screen on mobile, positioned on desktop
<div className="fixed inset-2 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[480px]">

// Responsive modal
<div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
  <div className="bg-white rounded-lg sm:rounded-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
```

### 👆 Touch Targets
```tsx
// Minimum 44x44px for tap targets
<button className="p-3 sm:p-2.5">  // More padding on mobile
<button className="w-10 h-10 sm:w-8 sm:h-8">  // Larger on mobile
```

### 🙈 Show/Hide Elements
```tsx
hidden sm:block   // Hide on mobile, show on desktop
block sm:hidden   // Show on mobile, hide on desktop
md:hidden         // Hide on tablet and up
```

### 🎯 Icon Sizing
```tsx
w-4 h-4 sm:w-5 sm:h-5   // Small icons
w-5 h-5 sm:w-6 sm:h-6   // Medium icons
w-8 h-8 sm:w-10 sm:h-10 // Large icons (avatars)
```

### 📊 Container Sizing
```tsx
// Max container
max-w-7xl mx-auto px-4 sm:px-6 lg:px-8

// Responsive heights
h-screen sm:h-auto
max-h-[95vh] sm:max-h-[90vh]
```

## Component Checklist

### ✅ Every Modal Should Have:
- [ ] `p-2 sm:p-4` responsive padding
- [ ] `max-h-[95vh] overflow-y-auto` for scrolling
- [ ] `rounded-lg sm:rounded-2xl` responsive corners
- [ ] `text-lg sm:text-2xl` responsive heading
- [ ] Proper z-index (modals: `z-50`, overlays: `z-40`)

### ✅ Every Form Should Have:
- [ ] `grid-cols-1 md:grid-cols-2` for field layout
- [ ] `space-y-3 sm:space-y-4` between fields
- [ ] `text-xs sm:text-sm` for labels
- [ ] `px-3 py-2 sm:px-4 sm:py-2.5` for inputs
- [ ] Error states visible on mobile

### ✅ Every Card Should Have:
- [ ] `p-4 sm:p-6` responsive padding
- [ ] `rounded-lg sm:rounded-xl` responsive corners
- [ ] `text-sm sm:text-base` responsive text
- [ ] Proper touch targets for interactive elements

### ✅ Every Navigation Should Have:
- [ ] Mobile menu at `md:hidden`
- [ ] Desktop menu at `hidden md:flex`
- [ ] Hamburger menu button
- [ ] `px-4 sm:px-6 lg:px-8` container padding

## Testing Commands

### Start Dev Server
```bash
cd dorotheo-dental-clinic-website/frontend
pnpm dev
```

### View on Mobile Device (Same Network)
1. Get your local IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
2. Access: `http://YOUR_IP:3000`

### Chrome DevTools (Quick)
- Windows/Linux: `Ctrl + Shift + M`
- Mac: `Cmd + Option + M`

## Common Mistakes to Avoid

❌ **Don't** use fixed pixel widths
```tsx
<div className="w-[400px]">  // Bad on mobile
```

✅ **Do** use responsive widths
```tsx
<div className="w-full sm:w-[400px]">  // Good
```

❌ **Don't** forget overflow handling
```tsx
<div className="h-[600px]">  // Bad - can't scroll
```

✅ **Do** add overflow and max-height
```tsx
<div className="max-h-[90vh] overflow-y-auto">  // Good
```

❌ **Don't** use small touch targets
```tsx
<button className="p-1">  // Too small to tap
```

✅ **Do** use adequate padding
```tsx
<button className="p-3 sm:p-2">  // Tap-friendly
```

## Utility Classes Added

```css
/* Use these custom classes */
.tap-target        /* min 44x44px size */
.safe-top          /* iOS notch padding */
.safe-bottom       /* iOS home indicator */
.scrollbar-hide    /* Hide scrollbar */
.no-select         /* Prevent text selection */
```

## Quick Test Devices

### iPhone SE (Small)
- 375 x 667
- `text-xs`, `p-2`, `gap-2`

### iPhone 12 Pro (Medium)
- 390 x 844
- `text-sm`, `p-3`, `gap-3`

### iPad (Tablet)
- 768 x 1024
- Use `sm:` and `md:` breakpoints
- Should show tablet layout

### Desktop
- 1920 x 1080
- Full desktop experience
- `lg:` and `xl:` breakpoints active

## Priority Order for Implementation

1. **Critical** (Do First)
   - Viewport meta tag ✅
   - Navigation menu
   - Forms and modals
   - Touch target sizes

2. **Important** (Do Soon)
   - Text sizing
   - Spacing adjustments
   - Image responsiveness
   - Overflow handling

3. **Nice to Have** (Polish)
   - Animations
   - Advanced gestures
   - PWA features
   - Performance optimization

## Get Help

- Check: `project-documentation/MOBILE_RESPONSIVENESS_GUIDE.md`
- Tailwind Docs: https://tailwindcss.com/docs/responsive-design
- Test Tool: https://search.google.com/test/mobile-friendly

---
**Last Updated:** February 11, 2026
