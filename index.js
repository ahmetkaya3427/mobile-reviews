const express = require('express');
const cors = require('cors');
require('dotenv').config();

const GooglePlayService = require('./services/googlePlayService');
const AppStoreService = require('./services/appStoreService');
const appConfig = require('./config');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const googlePlayService = new GooglePlayService();
const appStoreService = new AppStoreService();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'App Store & Google Play API - Koton Reviews',
    endpoints: {
      '/reviews': 'Get all reviews from both platforms',
      '/reviews/android': 'Get Android/Google Play reviews only',
      '/reviews/ios': 'Get iOS/App Store reviews only',
      '/app-info': 'Get app information from both platforms',
      '/stats': 'Get review statistics'
    },
    app_info: {
      android_package: appConfig.android.packageId,
      ios_app_id: appConfig.ios.appId,
      language: appConfig.settings.language
    }
  });
});

// Get all reviews from both platforms
app.get('/reviews', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || appConfig.settings.maxReviews;
    const limitPerPlatform = Math.ceil(limit / 2);

    console.log(`Fetching reviews from both platforms (${limitPerPlatform} each)...`);

    // Fetch reviews from both platforms in parallel
    const [androidReviews, iosReviews] = await Promise.allSettled([
      googlePlayService.fetchReviews(
        appConfig.android.packageId,
        appConfig.settings.language,
        limitPerPlatform
      ),
      appStoreService.fetchReviews(
        appConfig.ios.appId,
        appConfig.settings.country,
        limitPerPlatform
      )
    ]);

    const result = {
      success: true,
      total_reviews: 0,
      platforms: {
        android: {
          success: androidReviews.status === 'fulfilled',
          count: 0,
          reviews: []
        },
        ios: {
          success: iosReviews.status === 'fulfilled',
          count: 0,
          reviews: []
        }
      },
      combined_reviews: []
    };

    // Process Android reviews
    if (androidReviews.status === 'fulfilled') {
      result.platforms.android.reviews = androidReviews.value;
      result.platforms.android.count = androidReviews.value.length;
      result.combined_reviews.push(...androidReviews.value);
    } else {
      result.platforms.android.error = androidReviews.reason.message;
    }

    // Process iOS reviews
    if (iosReviews.status === 'fulfilled') {
      result.platforms.ios.reviews = iosReviews.value;
      result.platforms.ios.count = iosReviews.value.length;
      result.combined_reviews.push(...iosReviews.value);
    } else {
      result.platforms.ios.error = iosReviews.reason.message;
    }

    // Sort combined reviews by date (newest first)
    result.combined_reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    result.total_reviews = result.combined_reviews.length;

    res.json(result);

  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get Android/Google Play reviews only
app.get('/reviews/android', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || appConfig.settings.maxReviews;

    console.log(`Fetching Android reviews...`);

    const reviews = await googlePlayService.fetchReviews(
      appConfig.android.packageId,
      appConfig.settings.language,
      limit
    );

    res.json({
      success: true,
      platform: 'Google Play Store',
      count: reviews.length,
      reviews: reviews
    });

  } catch (error) {
    console.error('Error fetching Android reviews:', error);
    res.status(500).json({
      success: false,
      platform: 'Google Play Store',
      error: error.message
    });
  }
});

// Get iOS/App Store reviews only
app.get('/reviews/ios', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || appConfig.settings.maxReviews;

    console.log(`Fetching iOS reviews...`);

    const reviews = await appStoreService.fetchReviews(
      appConfig.ios.appId,
      appConfig.settings.country,
      limit
    );

    res.json({
      success: true,
      platform: 'App Store',
      count: reviews.length,
      reviews: reviews
    });

  } catch (error) {
    console.error('Error fetching iOS reviews:', error);
    res.status(500).json({
      success: false,
      platform: 'App Store',
      error: error.message
    });
  }
});

// Get app information from both platforms
app.get('/app-info', async (req, res) => {
  try {
    console.log('Fetching app information from both platforms...');

    const [androidInfo, iosInfo] = await Promise.allSettled([
      googlePlayService.getAppInfo(appConfig.android.packageId, appConfig.settings.language),
      appStoreService.getAppInfo(appConfig.ios.appId, appConfig.settings.country)
    ]);

    const result = {
      success: true,
      android: {
        success: androidInfo.status === 'fulfilled',
        info: androidInfo.status === 'fulfilled' ? androidInfo.value : null,
        error: androidInfo.status === 'rejected' ? androidInfo.reason.message : null
      },
      ios: {
        success: iosInfo.status === 'fulfilled',
        info: iosInfo.status === 'fulfilled' ? iosInfo.value : null,
        error: iosInfo.status === 'rejected' ? iosInfo.reason.message : null
      }
    };

    res.json(result);

  } catch (error) {
    console.error('Error fetching app info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get review statistics
app.get('/stats', async (req, res) => {
  try {
    console.log('Fetching review statistics...');

    const [androidStats, iosStats] = await Promise.allSettled([
      (async () => {
        const reviews = await googlePlayService.fetchReviews(
          appConfig.android.packageId,
          appConfig.settings.language,
          50
        );
        return {
          platform: 'Google Play',
          sample_size: reviews.length,
          ratings: reviews.reduce((acc, review) => {
            acc[review.rating] = (acc[review.rating] || 0) + 1;
            return acc;
          }, {}),
          recent_reviews: reviews.slice(0, 5)
        };
      })(),
      appStoreService.getReviewsStats(appConfig.ios.appId, appConfig.settings.country)
    ]);

    const result = {
      success: true,
      android: {
        success: androidStats.status === 'fulfilled',
        stats: androidStats.status === 'fulfilled' ? androidStats.value : null,
        error: androidStats.status === 'rejected' ? androidStats.reason.message : null
      },
      ios: {
        success: iosStats.status === 'fulfilled',
        stats: iosStats.status === 'fulfilled' ? iosStats.value : null,
        error: iosStats.status === 'rejected' ? iosStats.reason.message : null
      }
    };

    res.json(result);

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    app_config: {
      android_package: appConfig.android.packageId,
      ios_app_id: appConfig.ios.appId,
      language: appConfig.settings.language,
      country: appConfig.settings.country
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    available_endpoints: [
      'GET /',
      'GET /reviews',
      'GET /reviews/android',
      'GET /reviews/ios',
      'GET /app-info',
      'GET /stats',
      'GET /health'
    ]
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 App Store & Google Play API server running on port ${port}`);
  console.log(`📱 Configured for Koton app:`);
  console.log(`   - Android: ${appConfig.android.packageId}`);
  console.log(`   - iOS: ${appConfig.ios.appId}`);
  console.log(`   - Language: ${appConfig.settings.language}`);
  console.log(`\n🌐 Available endpoints:`);
  console.log(`   - http://localhost:${port}/`);
  console.log(`   - http://localhost:${port}/reviews`);
  console.log(`   - http://localhost:${port}/reviews/android`);
  console.log(`   - http://localhost:${port}/reviews/ios`);
  console.log(`   - http://localhost:${port}/app-info`);
  console.log(`   - http://localhost:${port}/stats`);
});

module.exports = app;
