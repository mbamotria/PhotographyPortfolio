// ===== CLOUDINARY CONFIGURATION =====

const CLOUDINARY_CONFIG = {
    // Your Cloudinary cloud name
    cloudName: 'YOUR_CLOUDINARY_CLOUD_NAME',
    
    // Upload preset name (we'll create this in Cloudinary dashboard)
    uploadPreset: 'portfolio_preset',
    
    // Folder where uploaded images go
    folder: 'PhotographyPortfolio',
    
    // Image transformation settings for thumbnails
    thumbnail: {
        width: 600,
        crop: 'fill',
        quality: 'auto',
        fetchFormat: 'auto'
    },
    
    // Image transformation for full-size lightbox view
    fullSize: {
        width: 2000,
        quality: 'auto',
        fetchFormat: 'auto'
    }
};

// ===== SETUP INSTRUCTIONS =====
/*
STEP 1 - Create Upload Preset in Cloudinary:
1. Go to Settings → Upload → Upload presets
2. Click "Add upload preset"
3. Set Preset name: portfolio_preset
4. Set Signing mode: Unsigned
5. Set Folder: PhotographyPortfolio
6. Save

STEP 2 - That's it! 
- Click "Upload Photos" button on your site
- Select images and upload
- They automatically appear in your gallery
*/
// Export for use in gallery.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CLOUDINARY_CONFIG;
}
