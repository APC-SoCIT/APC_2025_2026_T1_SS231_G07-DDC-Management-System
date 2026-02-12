# 📱 Mobile Responsiveness Quick Reference

## 🎯 Quick Patterns

### Responsive Padding
```tsx
// Section
py-12 sm:py-16 md:py-20

// Container
px-4 sm:px-6 lg:px-8

// Card
p-4 sm:p-6 lg:p-8
```

### Responsive Typography
```tsx
// H1
text-3xl sm:text-4xl md:text-5xl lg:text-6xl

// H2
text-2xl sm:text-3xl md:text-4xl

// Body
text-sm sm:text-base md:text-lg

// Small
text-xs sm:text-sm
```

### Responsive Grids
```tsx
// 1/2/3 columns
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6

// 1/2 columns
grid grid-cols-1 md:grid-cols-2 gap-6

// Stats (2/4)
grid grid-cols-2 md:grid-cols-4 gap-4
```

### Responsive Flexbox
```tsx
// Stack on mobile
flex flex-col sm:flex-row gap-3 sm:gap-4

// Wrap on mobile
flex flex-wrap gap-2 sm:gap-3
```

### Responsive Buttons
```tsx
// Full width mobile, auto desktop
w-full sm:w-auto px-6 py-3 touch-manipulation

// Large tap target
tap-target px-6 py-3
```

### Responsive Images
```tsx
// Height
h-40 sm:h-48 md:h-64 lg:h-80

// With optimization
<Image
  src="/image.jpg"
  alt="Description"
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw, 50vw"
  priority // if above fold
/>
```

## 📐 Breakpoints Cheat Sheet

| Class | Width | Device |
|-------|-------|--------|
| (default) | < 640px | Mobile |
| sm: | ≥ 640px | Large phone |
| md: | ≥ 768px | Tablet |
| lg: | ≥ 1024px | Desktop |
| xl: | ≥ 1280px | Large desktop |
| 2xl: | ≥ 1536px | Extra large |

## ✅ Component Checklist

When creating/updating a component:

- [ ] Mobile-first approach (start with smallest screen)
- [ ] Touch targets ≥ 44px (use `touch-manipulation`)
- [ ] Responsive padding (p-4 sm:p-6)
- [ ] Responsive text (text-sm sm:text-base)
- [ ] Responsive grid/flex (stack on mobile)
- [ ] Image optimization (sizes prop)
- [ ] No horizontal scroll
- [ ] Test on 375px, 768px, 1024px
- [ ] Add hover states for desktop only

## 🎨 Common Patterns

### Hero Section
```tsx
<section className="pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-14 md:pb-16 px-4 sm:px-6 lg:px-8">
  <div className="max-w-7xl mx-auto">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
      {/* Content */}
    </div>
  </div>
</section>
```

### Card Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
  {items.map(item => (
    <div key={item.id} className="bg-white rounded-lg p-4 sm:p-6">
      {/* Card content */}
    </div>
  ))}
</div>
```

### Form
```tsx
<form className="space-y-4 sm:space-y-6">
  <div>
    <label className="block text-sm font-medium mb-2">
      Label
    </label>
    <input 
      type="text"
      className="w-full px-4 py-3 rounded-lg border text-base"
    />
  </div>
  <button className="w-full sm:w-auto px-6 py-3 bg-primary text-white rounded-lg">
    Submit
  </button>
</form>
```

### Modal
```tsx
<div className="fixed inset-0 p-2 sm:p-4 flex items-center justify-center">
  <div className="bg-white rounded-lg sm:rounded-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
    {/* Modal content */}
  </div>
</div>
```

### Navigation Bar
```tsx
<nav className="fixed top-0 left-0 right-0 z-50 bg-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between h-16 sm:h-20">
      {/* Nav content */}
    </div>
  </div>
</nav>
```

## 🛠️ Utility Classes

### Mobile-Specific
```css
.tap-target          /* 44x44px minimum */
.touch-manipulation  /* Optimize for touch */
.safe-top            /* iOS notch padding top */
.safe-bottom         /* iOS home indicator */
.scrollbar-hide      /* Hide scrollbar */
.no-select           /* Prevent text selection */
```

### Show/Hide
```tsx
// Show on mobile only
className="block lg:hidden"

// Hide on mobile
className="hidden lg:block"

// Show on tablet+
className="hidden md:block"
```

## 🎯 Common Spacing Scales

### Gap (Grid/Flex)
```tsx
gap-2 sm:gap-3      // Tight
gap-3 sm:gap-4      // Normal
gap-4 sm:gap-6      // Comfortable
gap-6 sm:gap-8      // Spacious
```

### Padding (Cards/Sections)
```tsx
p-2 sm:p-3 md:p-4   // Tight
p-4 sm:p-6 md:p-8   // Normal
p-6 sm:p-8 md:p-12  // Spacious
```

### Margin Bottom (Sections)
```tsx
mb-4 sm:mb-6        // Small
mb-6 sm:mb-8        // Medium
mb-8 sm:mb-12       // Large
```

## 🧪 Testing Quick Commands

### Chrome DevTools
1. Open DevTools: `F12` or `Cmd+Opt+I`
2. Toggle Device Toolbar: `Ctrl+Shift+M` or `Cmd+Shift+M`
3. Select device: iPhone SE, iPad, etc.

### Common Test Sizes
- **Mobile:** 375px × 667px (iPhone SE)
- **Mobile Large:** 414px × 896px (iPhone 11)
- **Tablet:** 768px × 1024px (iPad)
- **Desktop:** 1920px × 1080px

## ❌ Common Mistakes

### DON'T
```tsx
// ❌ Fixed widths
className="w-[500px]"

// ❌ Desktop-first
className="text-xl lg:text-sm"

// ❌ Tiny touch targets
className="px-1 py-1"

// ❌ No mobile variant
className="text-lg"

// ❌ Missing sizes
<Image src="/img.jpg" alt="..." fill />
```

### DO
```tsx
// ✅ Fluid widths
className="w-full max-w-2xl"

// ✅ Mobile-first
className="text-sm sm:text-base lg:text-lg"

// ✅ Touch-friendly
className="px-6 py-3 touch-manipulation"

// ✅ Responsive
className="text-sm sm:text-base"

// ✅ Optimized images
<Image 
  src="/img.jpg" 
  alt="..." 
  fill 
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

## 📝 Before/After Examples

### Button
```tsx
// Before
<button className="px-4 py-2">Click</button>

// After
<button className="px-6 py-3 sm:px-8 sm:py-3.5 touch-manipulation">
  Click
</button>
```

### Heading
```tsx
// Before
<h1 className="text-5xl">Title</h1>

// After
<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
  Title
</h1>
```

### Grid
```tsx
// Before
<div className="grid grid-cols-3 gap-6">

// After
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
```

### Image
```tsx
// Before
<div className="h-[400px]">
  <Image src="/img.jpg" alt="..." fill />
</div>

// After
<div className="h-48 sm:h-64 md:h-80 lg:h-96">
  <Image 
    src="/img.jpg" 
    alt="..." 
    fill 
    className="object-cover"
    sizes="(max-width: 768px) 100vw, 50vw"
  />
</div>
```

## 🚀 Performance Tips

1. **Image Optimization**
   - Always use `sizes` prop
   - Use `priority` for above-fold images
   - Use appropriate formats (WebP)

2. **CSS Optimization**
   - Tailwind purges unused CSS
   - Use utility classes consistently
   - Avoid custom CSS when possible

3. **Touch Optimization**
   - Add `touch-manipulation` to interactive elements
   - Remove hover states on touch devices
   - Use CSS touch-action property

4. **Loading States**
   - Show skeletons on mobile
   - Progressive image loading
   - Lazy load below-fold content

## 📞 Need Help?

### Resources
- Tailwind Docs: https://tailwindcss.com/docs
- Next.js Image: https://nextjs.org/docs/api-reference/next/image
- Mobile Web Best Practices: https://web.dev/mobile

### Testing Tools
- Chrome DevTools
- Firefox Responsive Design Mode
- Safari Developer Tools
- BrowserStack (real devices)

---

**Last Updated:** February 12, 2026  
**Quick Reference Version:** 1.0
