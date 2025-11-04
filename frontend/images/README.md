# Images Directory

## Login Background Image

Please place your login background image here with the filename:
- `login-background.jpg` (or `.png`, `.webp`)

### Image Specifications (Recommended)
- **Format**: JPG, PNG, or WebP
- **Size**: 1920x1080px or larger (will be scaled down)
- **File Size**: Under 500KB for faster loading
- **Aspect Ratio**: 16:9 or similar

### Current Image
The login page is configured to use `login-background.jpg` as the background image.

If you have the image file:
1. Save it as `login-background.jpg` in this `images/` folder
2. The login page will automatically use it as the background

### Alternative Formats
If your image has a different name or format, update the CSS in `css/styles.css`:
```css
background: url('../images/your-image-name.jpg') center/cover no-repeat;
```

