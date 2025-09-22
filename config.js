// Koton App Configuration
const appConfig = {
  android: {
    packageId: 'com.koton.app',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.koton.app'
  },
  ios: {
    appId: '1436987707',
    appStoreUrl: 'https://apps.apple.com/app/id1436987707'
  },
  settings: {
    language: 'tr', // Turkish language
    country: 'TR', // Turkey
    maxReviews: 100 // Maximum number of reviews to fetch per platform
  }
};

module.exports = appConfig;
