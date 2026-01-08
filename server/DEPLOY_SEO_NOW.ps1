# 🚀 SEO DEPLOYMENT SCRIPT FOR MUSEFACTORY & UGLOBALHORIZONS
# Copy and run these commands in PowerShell to apply SEO changes

# STEP 1: Apply SEO to UGlobalHorizons
echo "📁 Applying SEO changes to UGlobalHorizons..."
cd "C:\Users\DELL\Saas\uglobalhorizons\frontend"

# Copy the SEO-optimized index.html
copy "C:\Users\DELL\Saas\teemplot\server\FINAL_UGLOBALHORIZONS_INDEX.html" "index.html"

echo "✅ UGlobalHorizons SEO applied!"
echo ""

# STEP 2: Apply SEO to MuseFactory  
echo "📁 Applying SEO changes to MuseFactory..."
cd "C:\Users\DELL\Saas\musefactory"

# Copy the SEO-optimized index.html
copy "C:\Users\DELL\Saas\teemplot\server\FINAL_MUSEFACTORY_INDEX.html" "index.html"

echo "✅ MuseFactory SEO applied!"
echo ""

# STEP 3: Git operations for UGlobalHorizons
echo "🔧 Git operations for UGlobalHorizons..."
cd "C:\Users\DELL\Saas\uglobalhorizons\frontend"
git add index.html
git commit -m "SEO optimization: Enhanced meta tags for wealth creation search visibility in Nigeria"
git push origin main

echo "✅ UGlobalHorizons pushed!"
echo ""

# STEP 4: Git operations for MuseFactory
echo "🔧 Git operations for MuseFactory..."
cd "C:\Users\DELL\Saas\musefactory"
git add index.html
git commit -m "SEO optimization: Enhanced meta tags for search visibility in Nigeria"
git push origin main

echo "✅ MuseFactory pushed!"
echo ""

echo "🎉 DEPLOYMENT COMPLETE!"
echo ""
echo "📊 TARGET SEARCH TERMS:"
echo "- UGlobalHorizons: 'U-Global Horizons', 'wealth creation Nigeria', 'investment management Lagos'"
echo "- MuseFactory: 'The Muse Factory', 'Nigerian fashion designer', 'Lagos fashion boutique'"
echo ""
echo "🔍 NEXT STEPS:"
echo "1. Deploy to your hosting platforms"
echo "2. Submit sitemaps to Google Search Console"
echo "3. Monitor search performance after 1-2 weeks"
echo "4. Register Google My Business profiles"
echo ""
echo "✨ Both sites should now be much more visible in Google search!"