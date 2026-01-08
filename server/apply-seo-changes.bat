# SEO Implementation Script for MuseFactory and UGlobalHorizons
# This script copies the SEO-optimized files to the correct locations

echo "🚀 Starting SEO implementation for MuseFactory and UGlobalHorizons..."

# Copy MuseFactory SEO-optimized files
echo "📁 Copying MuseFactory files..."
copy "c:\Users\DELL\Saas\teemplot\server\musefactory-index-NO-PWA.html" "c:\Users\DELL\Saas\musefactory\index.html"
copy "c:\Users\DELL\Saas\teemplot\server\musefactory-vite-config-NO-PWA.ts" "c:\Users\DELL\Saas\musefactory\vite.config.ts"

# Copy UGlobalHorizons SEO-optimized files  
echo "📁 Copying UGlobalHorizons files..."
copy "c:\Users\DELL\Saas\teemplot\server\uglobalhorizons-index-NO-PWA.html" "c:\Users\DELL\Saas\uglobalhorizons\frontend\index.html"
copy "c:\Users\DELL\Saas\teemplot\server\uglobalhorizons-vite-config-NO-PWA.ts" "c:\Users\DELL\Saas\uglobalhorizons\frontend\vite.config.ts"

echo "✅ SEO files copied successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Navigate to each project directory"
echo "2. Run 'git add .' to stage changes"
echo "3. Run 'git commit -m \"Add SEO optimization for search visibility\"'"
echo "4. Run 'git push' to deploy changes"
echo ""
echo "🎯 Target search terms:"
echo "- MuseFactory: 'Nigerian fashion designer', 'Lagos fashion boutique'"
echo "- UGlobalHorizons: 'U-Global Horizons', 'wealth creation Nigeria'"