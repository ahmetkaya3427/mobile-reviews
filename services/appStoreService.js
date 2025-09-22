const axios = require('axios');

class AppStoreService {
  constructor() {
    this.baseUrl = 'https://itunes.apple.com';
  }

  /**
   * Fetch reviews from Apple App Store
   * @param {string} appId - iOS App ID (e.g., 1436987707)
   * @param {string} country - Country code (e.g., 'tr' for Turkey)
   * @param {number} limit - Maximum number of reviews to fetch
   * @returns {Promise<Array>} Array of review objects
   */
  async fetchReviews(appId, country = 'tr', limit = 100) {
    try {
      console.log(`Fetching App Store reviews for app ID ${appId} in ${country}...`);
      
      const reviews = [];
      let page = 1;
      const maxPages = Math.ceil(limit / 50); // App Store returns max 50 reviews per page

      while (reviews.length < limit && page <= maxPages) {
        const pageReviews = await this.fetchReviewsPage(appId, country, page);
        
        if (pageReviews.length === 0) {
          break; // No more reviews available
        }

        reviews.push(...pageReviews.slice(0, limit - reviews.length));
        page++;
      }

      console.log(`Fetched ${reviews.length} reviews from App Store`);
      return reviews;

    } catch (error) {
      console.error('Error fetching App Store reviews:', error.message);
      throw new Error(`Failed to fetch App Store reviews: ${error.message}`);
    }
  }

  /**
   * Fetch reviews for a specific page
   */
  async fetchReviewsPage(appId, country, page) {
    try {
      // Use iTunes RSS feed for customer reviews
      const url = `${this.baseUrl}/${country}/rss/customerreviews/page=${page}/id=${appId}/sortby=mostrecent/json`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      if (!response.data || !response.data.feed || !response.data.feed.entry) {
        return [];
      }

      const entries = response.data.feed.entry;
      const reviews = [];

      // Skip the first entry as it's usually app information, not a review
      for (let i = 1; i < entries.length; i++) {
        const entry = entries[i];
        
        if (entry && entry.content && entry.content.label) {
          const review = {
            id: `as_${entry.id.label}`,
            platform: 'App Store',
            author: entry.author ? entry.author.name.label : 'Anonymous',
            rating: entry['im:rating'] ? parseInt(entry['im:rating'].label) : 0,
            title: entry.title ? entry.title.label : '',
            content: entry.content.label,
            date: entry.updated ? entry.updated.label : '',
            version: entry['im:version'] ? entry['im:version'].label : '',
            language: country
          };

          // Filter for Turkish content if possible
          if (this.isTurkishContent(review.content) || country === 'tr') {
            reviews.push(review);
          }
        }
      }

      return reviews;

    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`No reviews found for page ${page}`);
        return [];
      }
      
      console.error(`Error fetching page ${page}:`, error.message);
      return [];
    }
  }

  /**
   * Simple Turkish content detection
   */
  isTurkishContent(text) {
    // Check for Turkish characters and common Turkish words
    const turkishChars = /[çğıöşüÇĞIİÖŞÜ]/;
    const turkishWords = /\b(ve|bir|bu|için|ile|den|var|yok|çok|iyi|kötü|güzel|uygulama|oyun)\b/i;
    
    return turkishChars.test(text) || turkishWords.test(text);
  }

  /**
   * Get app information from App Store
   */
  async getAppInfo(appId, country = 'tr') {
    try {
      const url = `${this.baseUrl}/lookup?id=${appId}&country=${country}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (response.data && response.data.results && response.data.results.length > 0) {
        const app = response.data.results[0];
        
        return {
          name: app.trackName,
          developer: app.artistName,
          rating: app.averageUserRating,
          reviews_count: app.userRatingCount,
          version: app.version,
          price: app.formattedPrice || 'Free',
          category: app.primaryGenreName,
          updated: app.currentVersionReleaseDate,
          description: app.description,
          app_store_url: app.trackViewUrl
        };
      }

      return null;

    } catch (error) {
      console.error('Error fetching app info:', error.message);
      return null;
    }
  }

  /**
   * Search for apps in App Store
   */
  async searchApps(term, country = 'tr', limit = 10) {
    try {
      const url = `${this.baseUrl}/search?term=${encodeURIComponent(term)}&country=${country}&media=software&limit=${limit}`;
      
      const response = await axios.get(url);

      if (response.data && response.data.results) {
        return response.data.results.map(app => ({
          id: app.trackId,
          name: app.trackName,
          developer: app.artistName,
          rating: app.averageUserRating,
          category: app.primaryGenreName,
          price: app.formattedPrice || 'Free',
          app_store_url: app.trackViewUrl
        }));
      }

      return [];

    } catch (error) {
      console.error('Error searching apps:', error.message);
      return [];
    }
  }

  /**
   * Get reviews summary and statistics
   */
  async getReviewsStats(appId, country = 'tr') {
    try {
      const appInfo = await this.getAppInfo(appId, country);
      const reviews = await this.fetchReviews(appId, country, 50); // Sample for stats

      if (!appInfo) {
        return null;
      }

      const stats = {
        total_reviews: appInfo.reviews_count,
        average_rating: appInfo.rating,
        sample_size: reviews.length,
        rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        recent_reviews: reviews.slice(0, 5)
      };

      // Calculate rating distribution from sample
      reviews.forEach(review => {
        if (review.rating >= 1 && review.rating <= 5) {
          stats.rating_distribution[review.rating]++;
        }
      });

      return stats;

    } catch (error) {
      console.error('Error getting reviews stats:', error.message);
      return null;
    }
  }
}

module.exports = AppStoreService;
