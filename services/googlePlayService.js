const axios = require('axios');
const cheerio = require('cheerio');
const gplay = require('google-play-scraper');

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
      
      // Primary approach: Use google-play-scraper library
      const libraryReviews = await this.getReviewsWithLibrary(packageId, language, limit);
      
      if (libraryReviews && libraryReviews.length > 0) {
        return libraryReviews;
      }

      // Fallback 1: Try Google Play Store internal API
      const apiReviews = await this.getReviewsFromPlayStore(packageId, language, limit);
      
      if (apiReviews && apiReviews.length > 0) {
        return apiReviews;
      }

      // Fallback 2: Use manual web scraping
      return await this.scrapeReviewsFromWeb(packageId, language, limit);

    } catch (error) {
      console.error('Error fetching Google Play reviews:', error.message);
      throw new Error(`Failed to fetch Google Play reviews: ${error.message}`);
    }
  }

  /**
   * Get reviews using google-play-scraper library (Primary method)
   */
  async getReviewsWithLibrary(packageId, language, limit) {
    try {
      console.log(`Using google-play-scraper library for ${packageId}...`);
      
      const reviews = await gplay.reviews({
        appId: packageId,
        lang: language,
        country: 'tr',
        sort: gplay.sort.NEWEST,
        num: Math.min(limit, 200),
        paginate: true,
        nextPaginationToken: null
      });

      if (!reviews || !reviews.data || reviews.data.length === 0) {
        console.log('No reviews found with library method');
        return [];
      }

      const formattedReviews = reviews.data.map((review, index) => {
        // Handle date safely
        let formattedDate;
        try {
          if (review.date) {
            formattedDate = review.date instanceof Date ? 
              review.date.toISOString().split('T')[0] : 
              new Date(review.date).toISOString().split('T')[0];
          } else {
            formattedDate = new Date().toISOString().split('T')[0];
          }
        } catch (dateError) {
          formattedDate = new Date().toISOString().split('T')[0];
        }

        // Handle reply date safely
        let formattedReplyDate = null;
        try {
          if (review.replyDate) {
            formattedReplyDate = review.replyDate instanceof Date ? 
              review.replyDate.toISOString().split('T')[0] : 
              new Date(review.replyDate).toISOString().split('T')[0];
          }
        } catch (replyDateError) {
          formattedReplyDate = null;
        }

        return {
          id: `gp_lib_${review.id || Date.now()}_${index}`,
          platform: 'Google Play',
          author: review.userName || 'Anonymous',
          rating: review.score || 0,
          date: formattedDate,
          content: review.text || '',
          helpful: review.thumbsUp || 0,
          language: language,
          version: review.version || '',
          reply: review.replyText || null,
          replyDate: formattedReplyDate
        };
      }).filter(review => review.content && review.content.length > 10);

      console.log(`Successfully extracted ${formattedReviews.length} reviews using library`);
      return formattedReviews;

    } catch (error) {
      console.log('Google Play Scraper library failed:', error.message);
      return [];
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': `${language},en;q=0.9`,
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': `${language},en;q=0.9`,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const reviews = [];

      // Try to extract from JavaScript data first
      let jsReviews = this.extractReviewsFromJavaScript(response.data, limit);
      if (jsReviews.length > 0) {
        console.log(`Extracted ${jsReviews.length} reviews from JavaScript data`);
        return jsReviews;
      }

      // Fallback to HTML scraping
      // Look for review containers with multiple possible selectors
      const reviewSelectors = [
        '[data-review-id]',  // Most reliable selector (found 6 elements)
        '.RHo1pe',           // Original selector
        '.review-item',      // Backup selector
        '.single-review'     // Generic selector
      ];

      let reviewElements = [];
      for (const selector of reviewSelectors) {
        reviewElements = $(selector);
        if (reviewElements.length > 0) {
          console.log(`Found ${reviewElements.length} reviews with selector: ${selector}`);
          break;
        }
      }

      if (reviewElements.length === 0) {
        console.log('No review elements found with any selector. Checking page structure...');
        console.log('Page title:', $('title').text());
        console.log('Page has content:', $.html().length > 1000);
        return [];
      }

      reviewElements.each((index, element) => {
        if (reviews.length >= limit) return false;

        const $review = $(element);
        
        // Extract review data with multiple fallback selectors
        const author = $review.find('.X5PpBb, .author-name, [data-reviewer-name]').text().trim() || 
                      $review.text().match(/([^\\n]+?)(?:more_vert|Uygunsuz)/)?.[1]?.trim() || 'Anonymous';
        
        // Try multiple ways to get rating
        const ratingElement = $review.find('.iXRFPc, .star-rating, [data-rating]');
        const rating = ratingElement.attr('aria-label') || ratingElement.attr('data-rating') || '';
        
        // Try multiple ways to get date
        const date = $review.find('.bp9Aid, .review-date, .date').text().trim() ||
                    $review.text().match(/(\d{1,2}\s+\w+\s+\d{4})/)?.[1] || '';
        
        // Try multiple ways to get content
        const content = $review.find('.h3YV2d, .review-text, .content').text().trim() ||
                       this.extractContentFromReviewElement($review);
        
        const helpful = $review.find('.AJTPZc, .helpful-count').text().trim();

        if (content && content.length > 10) {
          // Extract numeric rating from aria-label or text
          let numericRating = 0;
          const ratingMatch = rating.match(/(\d+)/);
          if (ratingMatch) {
            numericRating = parseInt(ratingMatch[1]);
          } else {
            // Try to count stars or find rating in text
            const starCount = $review.find('.iXRFPc, .star, .filled-star').length;
            numericRating = starCount > 0 ? starCount : this.extractRatingFromText($review.text());
          }

          reviews.push({
            id: `gp_web_${Date.now()}_${index}`,
            platform: 'Google Play',
            author: author || `User_${index + 1}`,
            rating: numericRating,
            date: date || new Date().toISOString().split('T')[0],
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
      console.log(`Fetching app info for ${packageId}...`);
      
      // Primary approach: Use google-play-scraper library
      try {
        const appInfo = await gplay.app({
          appId: packageId,
          lang: language,
          country: 'tr'
        });

        return {
          name: appInfo.title || '',
          developer: appInfo.developer || '',
          rating: appInfo.score ? appInfo.score.toFixed(1) : '0',
          reviews_count: appInfo.reviews ? appInfo.reviews.toLocaleString() : '0',
          installs: appInfo.installs || '0',
          updated: appInfo.updated || '',
          version: appInfo.version || '',
          description: appInfo.description || '',
          price: appInfo.price || 'Free',
          category: appInfo.genre || '',
          screenshots: appInfo.screenshots || [],
          video: appInfo.video || null
        };
      } catch (libraryError) {
        console.log('Library app method failed, trying manual scraping...');
      }
      
      // Fallback: Manual scraping approach
      try {
        const url = `https://play.google.com/store/apps/details?id=${packageId}&hl=${language}&gl=TR`;
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          timeout: 10000
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
      } catch (fallbackError) {
        console.error('App info fetch failed:', fallbackError.message);
        return null;
      }
    } catch (error) {
      console.error('Error fetching app info:', error.message);
      return null;
    }
  }

  /**
   * Extract reviews from JavaScript data in the page
   */
  extractReviewsFromJavaScript(htmlData, limit) {
    try {
      // Look for AF_initDataCallback with review data
      const jsDataRegex = /AF_initDataCallback\({[^}]+data:\s*(\[.*?\])/g;
      const reviews = [];
      let match;

      while ((match = jsDataRegex.exec(htmlData)) !== null && reviews.length < limit) {
        try {
          const data = JSON.parse(match[1]);
          const extractedReviews = this.parseNestedReviewData(data, limit - reviews.length);
          reviews.push(...extractedReviews);
        } catch (parseError) {
          // Skip invalid JSON
          continue;
        }
      }

      return reviews;
    } catch (error) {
      console.log('JavaScript extraction failed:', error.message);
      return [];
    }
  }

  /**
   * Recursively parse nested review data from JavaScript
   */
  parseNestedReviewData(data, limit) {
    const reviews = [];
    
    if (!Array.isArray(data)) return reviews;

    for (const item of data) {
      if (reviews.length >= limit) break;
      
      if (Array.isArray(item)) {
        // Check if this looks like review data
        if (item.length > 5 && typeof item[0] === 'string' && 
            item.some(subItem => typeof subItem === 'string' && subItem.length > 50)) {
          
          const review = this.parseReviewArray(item);
          if (review) {
            reviews.push(review);
          }
        } else {
          // Recurse into nested arrays
          const nestedReviews = this.parseNestedReviewData(item, limit - reviews.length);
          reviews.push(...nestedReviews);
        }
      }
    }

    return reviews;
  }

  /**
   * Parse individual review from array data
   */
  parseReviewArray(arr) {
    try {
      // Look for patterns that indicate review data
      const possibleContent = arr.find(item => 
        typeof item === 'string' && item.length > 20 && item.length < 1000
      );
      
      const possibleAuthor = arr.find(item => 
        typeof item === 'string' && item.length > 2 && item.length < 50 && 
        !item.includes(' ') && item !== possibleContent
      );

      const possibleRating = arr.find(item => 
        typeof item === 'number' && item >= 1 && item <= 5
      );

      if (possibleContent && possibleAuthor) {
        return {
          id: `gp_js_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          platform: 'Google Play',
          author: possibleAuthor,
          rating: possibleRating || 0,
          date: new Date().toISOString().split('T')[0],
          content: possibleContent,
          helpful: '',
          language: 'tr'
        };
      }
    } catch (error) {
      // Skip invalid review data
    }
    
    return null;
  }

  /**
   * Extract content from review element with more aggressive parsing
   */
  extractContentFromReviewElement($review) {
    const fullText = $review.text();
    
    // Look for review content patterns - improved patterns
    const contentPatterns = [
      // Pattern for content after date
      /(\d{1,2}\s+\w+\s+\d{4})\s*(.+?)(?:Koton|Bu yorumu|$)/s,
      // Pattern after "Uygunsuz olarak işaretle"
      /Uygunsuz olarak işaretle.*?(\d{1,2}\s+\w+\s+\d{4})\s*(.+?)(?:Koton|$)/s,
      // Pattern for content between common markers
      /(?:more_vert|işaretle).*?(.{30,500}?)(?:Bu yorumu|Koton|Merhaba|$)/s,
      // General pattern for Turkish review content
      /([A-Za-zÇÖŞÜÄİĞçöşüğıI].{20,500}?)(?:\s*(?:Koton|Bu yorumu|Merhaba)|$)/s
    ];

    for (const pattern of contentPatterns) {
      const match = fullText.match(pattern);
      const content = match?.[match.length - 1]?.trim();
      
      if (content && content.length > 20 && content.length < 800) {
        // Clean up the content
        return content
          .replace(/\s+/g, ' ')
          .replace(/^[^A-Za-zÇÖŞÜÄİĞçöşüğıI]*/, '') // Remove leading non-letters
          .replace(/\s*(Koton|Bu yorumu|Merhaba).*$/i, '') // Remove trailing responses
          .trim();
      }
    }

    return '';
  }

  /**
   * Extract rating from text content
   */
  extractRatingFromText(text) {
    // Look for star ratings or numeric ratings
    const ratingPatterns = [
      /(\d)\s*yıldız/i,
      /(\d)\s*star/i,
      /rate[d]?\s*(\d)/i
    ];

    for (const pattern of ratingPatterns) {
      const match = text.match(pattern);
      if (match) {
        const rating = parseInt(match[1]);
        if (rating >= 1 && rating <= 5) {
          return rating;
        }
      }
    }

    return 0;
  }
}

module.exports = GooglePlayService;
