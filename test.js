// Test script to verify the API functionality
const GooglePlayService = require('./services/googlePlayService');
const AppStoreService = require('./services/appStoreService');
const appConfig = require('./config');

async function testAPI() {
  console.log('🧪 Testing App Store & Google Play API...\n');

  const googlePlayService = new GooglePlayService();
  const appStoreService = new AppStoreService();

  // Test 1: Google Play Service
  console.log('📱 Testing Google Play Service...');
  try {
    const androidReviews = await googlePlayService.fetchReviews(
      appConfig.android.packageId,
      appConfig.settings.language,
      5
    );
    console.log(`✅ Google Play: Fetched ${androidReviews.length} reviews`);
    if (androidReviews.length > 0) {
      console.log('Sample review:', {
        author: androidReviews[0].author,
        rating: androidReviews[0].rating,
        content: androidReviews[0].content.substring(0, 100) + '...'
      });
    }
  } catch (error) {
    console.log('❌ Google Play error:', error.message);
  }

  console.log('\n');

  // Test 2: App Store Service
  console.log('🍎 Testing App Store Service...');
  try {
    const iosReviews = await appStoreService.fetchReviews(
      appConfig.ios.appId,
      appConfig.settings.country,
      5
    );
    console.log(`✅ App Store: Fetched ${iosReviews.length} reviews`);
    if (iosReviews.length > 0) {
      console.log('Sample review:', {
        author: iosReviews[0].author,
        rating: iosReviews[0].rating,
        content: iosReviews[0].content.substring(0, 100) + '...'
      });
    }
  } catch (error) {
    console.log('❌ App Store error:', error.message);
  }

  console.log('\n');

  // Test 3: App Info
  console.log('📋 Testing App Info Services...');
  try {
    const [androidInfo, iosInfo] = await Promise.allSettled([
      googlePlayService.getAppInfo(appConfig.android.packageId, appConfig.settings.language),
      appStoreService.getAppInfo(appConfig.ios.appId, appConfig.settings.country)
    ]);

    if (androidInfo.status === 'fulfilled' && androidInfo.value) {
      console.log('✅ Google Play App Info:', {
        name: androidInfo.value.name,
        developer: androidInfo.value.developer,
        rating: androidInfo.value.rating
      });
    } else {
      console.log('❌ Google Play App Info failed');
    }

    if (iosInfo.status === 'fulfilled' && iosInfo.value) {
      console.log('✅ App Store App Info:', {
        name: iosInfo.value.name,
        developer: iosInfo.value.developer,
        rating: iosInfo.value.rating
      });
    } else {
      console.log('❌ App Store App Info failed');
    }
  } catch (error) {
    console.log('❌ App Info error:', error.message);
  }

  console.log('\n🎉 Test completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAPI().catch(console.error);
}

module.exports = testAPI;
