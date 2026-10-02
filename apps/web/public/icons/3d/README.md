# 3D Icons Directory

## Required Icons

Download the following 3D icons from **https://3dicons.co** (PNG format, 512x512px):

### High Priority (Required for Free Numbers tab)
- [ ] **phone.png** - For number list items
- [ ] **globe.png** - For country selection header
- [ ] **inbox.png** or **mail.png** - For message inbox header
- [ ] **refresh.png** or **sync.png** - For refresh button
- [ ] **alert.png** or **warning.png** - For warning banners

### Low Priority (Optional)
- [ ] **lock.png** - For Private SMS indicator
- [ ] **unlock.png** - For Free Numbers indicator  
- [ ] **copy.png** - For copy buttons (can keep lucide icon)

## Download Instructions

1. Visit https://3dicons.co
2. Search for each icon by name
3. Download in PNG format with transparency
4. Resize to 512x512px if needed
5. Compress using https://tinypng.com (target <50KB per file)
6. Save with the exact filenames listed above

## Alternative Sources

If 3dicons.co is unavailable:
- **IconScout**: https://iconscout.com/3d-illustrations
- **icons8**: https://icons8.com/3d-icons
- **Spline**: https://spline.design/icons

## File Size Requirements

- Ideal: 20-30KB per icon
- Maximum: 50KB per icon
- Total for all icons: <300KB

## Once Downloaded

After placing icons in this directory:
1. Verify all filenames match exactly
2. Check file sizes are under 50KB
3. Test visibility on white and dark backgrounds
4. Run: `cd apps/web && npm run build`
5. Start dev server and view at http://localhost:3000/numbers
