const axios = require('axios');
const cheerio = require('cheerio');

class GooglePlayService {
  constructor() {
    this.baseUrl = 'https://play.google.com/store/getreviews';
  }

  /**
   * Fetch reviews from Google Play Store
   * @param {string} packageId - Android package ID (e.g., com.koton.app)
   * @param {string} language - Language code (e.g., 'tr' for Turkish)
   * @param {number} limit - Maximum number of reviews to fetch
   * @returns {Promise<Array>} Array of review objects
   */
  async fetchReviews(packageId, language = 'tr', limit = 100) {
    try {
      console.log(`Fetching Google Play reviews for ${packageId} in ${language}...`);
      
      // First approach: Try to get reviews using Google Play Store internal API
      const reviews = await this.getReviewsFromPlayStore(packageId, language, limit);
      
      if (reviews && reviews.length > 0) {
        return reviews;
      }

      // Fallback: Use web scraping if API doesn't work
      return await this.scrapeReviewsFromWeb(packageId, language, limit);

    } catch (error) {
      console.error('Error fetching Google Play reviews:', error.message);
      throw new Error(`Failed to fetch Google Play reviews: ${error.message}`);
    }
  }

  /**
   * Get reviews using Google Play Store internal API
   */
  async getReviewsFromPlayStore(packageId, language, limit) {
    try {
      const url = `https://play.google.com/store/getreviews`;
      const params = {
        id: packageId,
        reviewType: 0,
        pageNum: 0,
        reviewSortOrder: 0,
        xhr: 1,
        hl: language
      };

      const response = await axios.post(url, null, {
        params,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (response.data && response.data.length > 5) {
        // Parse the response which is usually wrapped in )]}'
        const jsonStr = response.data.substring(5);
        const data = JSON.parse(jsonStr);
        
        if (data && data[0] && data[0][2]) {
          return this.parsePlayStoreReviews(data[0][2], limit);
        }
      }

      return [];
    } catch (error) {
      console.log('Play Store API method failed, trying web scraping...');
      return [];
    }
  }

  /**
   * Scrape reviews from Google Play Store web page
   */
  async scrapeReviewsFromWeb(packageId, language, limit) {
    try {
      const url = `https://play.google.com/store/apps/details?id=${packageId}&hl=${language}&gl=TR&showAllReviews=true`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept-Language': `${language},en;q=0.9`
        }
      });

      const $ = cheerio.load(response.data);
      const reviews = [];

      // Look for review containers
      $('.RHo1pe').each((index, element) => {
        if (reviews.length >= limit) return false;

        const $review = $(element);
        
        // Extract review data
        const author = $review.find('.X5PpBb').text().trim();
        const rating = $review.find('.iXRFPc').attr('aria-label') || '';
        const date = $review.find('.bp9Aid').text().trim();
        const content = $review.find('.h3YV2d').text().trim();
        const helpful = $review.find('.AJTPZc').text().trim();

        if (content && author) {
          // Extract numeric rating from aria-label
          const ratingMatch = rating.match(/(\d+)/);
          const numericRating = ratingMatch ? parseInt(ratingMatch[1]) : 0;

          reviews.push({
            id: `gp_${Date.now()}_${index}`,
            platform: 'Google Play',
            author: author,
            rating: numericRating,
            date: date,
            content: content,
            helpful: helpful,
            language: language
          });
        }
      });

      console.log(`Scraped ${reviews.length} reviews from Google Play Store`);
      return reviews;

    } catch (error) {
      console.error('Web scraping failed:', error.message);
      return [];
    }
  }

  /**
   * Parse reviews from Play Store API response
   */
  parsePlayStoreReviews(htmlContent, limit) {
    try {
      const $ = cheerio.load(htmlContent);
      const reviews = [];

      $('.RHo1pe').each((index, element) => {
        if (reviews.length >= limit) return false;

        const $review = $(element);
        
        const author = $review.find('.X5PpBb').text().trim();
        const rating = $review.find('.iXRFPc').length;
        const date = $review.find('.bp9Aid').text().trim();
        const content = $review.find('.h3YV2d').text().trim();

        if (content && author) {
          reviews.push({
            id: `gp_api_${Date.now()}_${index}`,
            platform: 'Google Play',
            author: author,
            rating: rating,
            date: date,
            content: content,
            language: 'tr'
          });
        }
      });

      return reviews;
    } catch (error) {
      console.error('Error parsing Play Store reviews:', error.message);
      return [];
    }
  }

  /**
   * Get app information from Google Play Store
   */
  async getAppInfo(packageId, language = 'tr') {
    try {
      const url = `https://play.google.com/store/apps/details?id=${packageId}&hl=${language}&gl=TR`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);

      return {
        name: $('h1[itemprop="name"]').text().trim(),
        developer: $('.wRygue .Vbfug a').text().trim(),
        rating: $('.TT9eCd').text().trim(),
        reviews_count: $('.AYi5wd.TBRnV').text().trim(),
        installs: $('.wVqUob:contains("İndirme")').next().text().trim(),
        updated: $('.xg1aie').text().trim(),
        version: $('.htlgb:contains("Sürüm")').next().text().trim()
      };
    } catch (error) {
      console.error('Error fetching app info:', error.message);
      return null;
    }
  }
}

module.exports = GooglePlayService;
