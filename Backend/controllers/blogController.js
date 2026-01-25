const Parser = require('rss-parser');
const axios = require('axios');
const https = require('https');
const http = require('http');

// RSS Feed sources
const RSS_FEEDS = {
  hackersNews: 'https://feeds.feedburner.com/TheHackersNews',
  bleepingComputer: 'https://www.bleepingcomputer.com/feed/'
};

// CORS proxy fallback (if direct RSS fails)
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/',
];

// Allowed categories for filtering
const ALLOWED_CATEGORIES = {
  'Security Tips': 'Security Tips',
  'Threat Analysis': 'Threat Analysis',
  'Case Studies': 'Case Studies',
  'Email Security': 'Email Security',
  'Enterprise': 'Enterprise',
  'Phishing': 'Phishing'
};

// Keywords mapping for categorization
const CATEGORY_KEYWORDS = {
  'Security Tips': [
    'tips', 'best practices', 'how to', 'guide', 'protection', 'prevent', 'defense',
    'secure', 'safety', 'protect', 'advice', 'recommendations', 'tutorial', 'steps'
  ],
  'Threat Analysis': [
    'threat', 'attack', 'malware', 'ransomware', 'vulnerability', 'exploit', 
    'breach', 'hacker', 'cybercrime', 'campaign', 'APT', 'analysis', 'investigation',
    'discovered', 'uncovered', 'detected'
  ],
  'Case Studies': [
    'case study', 'incident', 'post-mortem', 'analysis', 'examination', 'investigation',
    'real-world', 'example', 'breakdown', 'how', 'lessons learned'
  ],
  'Email Security': [
    'email', 'smtp', 'spf', 'dkim', 'dmarc', 'authentication', 'spoofing', 'phishing email',
    'inbox', 'mailbox', 'email security', 'email protection', 'compromise', 'credential'
  ],
  'Enterprise': [
    'enterprise', 'business', 'corporate', 'organization', 'company', 'employee',
    'workplace', 'industry', 'sector', 'firms', 'organizations', 'institutions'
  ],
  'Phishing': [
    'phishing', 'phish', 'credential theft', 'social engineering', 'impersonation',
    'fake', 'scam', 'fraudulent', 'deceptive', 'cloned', 'spoofed', 'impersonate'
  ]
};

// Initialize RSS parser with improved options
const parser = new Parser({
  timeout: 30000, // 30 second timeout
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: false }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
      ['image', 'imageUrl'],
      ['description', 'description'],
      ['content:encoded', 'fullContent']
    ]
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/rss+xml, application/atom+xml, application/xml',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
});

/**
 * Extract featured image from various RSS fields
 */
function getImageFromItem(item) {
  // Try media:content with url attribute
  if (item.mediaContent?.url) return item.mediaContent.url;
  
  // Try media:thumbnail
  if (item.mediaThumbnail?.url) return item.mediaThumbnail.url;
  
  // Try image url
  if (item.imageUrl) return item.imageUrl;
  
  // Try to extract from content
  if (item.fullContent) {
    const imgRegex = /<img[^>]+src="([^">]+)"/;
    const match = item.fullContent.match(imgRegex);
    if (match) return match[1];
  }
  
  // Fallback placeholder
  return null;
}

/**
 * Calculate read time based on word count
 */
function calculateReadTime(text) {
  if (!text) return 1;
  const wordCount = text.split(/\s+/).length;
  const wordsPerMinute = 200;
  const minutes = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  return minutes;
}

/**
 * Extract text from HTML
 */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Categorize blog post based on title, summary, and categories
 */
function categorizePost(item) {
  const categories = [];
  const titleLower = (item.title || '').toLowerCase();
  const summaryLower = ((item.summary || item.description || item.fullContent) || '').toLowerCase();
  const contentToSearch = titleLower + ' ' + summaryLower;
  
  // Check RSS categories first
  if (item.categories && Array.isArray(item.categories)) {
    item.categories.forEach(cat => {
      const catName = cat.name || cat;
      const catLower = catName.toLowerCase();
      
      Object.entries(ALLOWED_CATEGORIES).forEach(([key, value]) => {
        if (catLower.includes(key.toLowerCase())) {
          if (!categories.includes(value)) categories.push(value);
        }
      });
    });
  }
  
  // Check keywords if no categories found
  if (categories.length === 0) {
    Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
      for (let keyword of keywords) {
        if (contentToSearch.includes(keyword.toLowerCase())) {
          if (!categories.includes(category)) categories.push(category);
          break;
        }
      }
    });
  }
  
  // Default to most general category if nothing matched
  if (categories.length === 0) {
    categories.push('Security Tips');
  }
  
  return categories;
}

/**
 * Format blog post to consistent structure
 */
function formatBlogPost(item, source) {
  const pubDate = new Date(item.pubDate || item.published || new Date());
  const summary = stripHtml(item.summary || item.description || item.fullContent || '').substring(0, 300);
  const readTime = calculateReadTime(item.fullContent || item.summary || item.description);
  
  return {
    id: `${source}-${item.guid || item.link}`,
    title: item.title || 'Untitled',
    link: item.link,
    author: item.author || item.creator || (source === 'hackersNews' ? 'The Hacker News' : 'BleepingComputer'),
    pubDate: pubDate,
    pubDateFormatted: pubDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    summary: summary,
    image: getImageFromItem(item),
    categories: categorizePost(item),
    source: source,
    sourceUrl: source === 'hackersNews' ? 'thehackernews.com' : 'bleepingcomputer.com',
    readTime: `${readTime} min read`,
    tags: categorizePost(item) // Tags same as categories for display
  };
}

/**
 * Fetch and parse RSS feed with retry logic
 */
async function fetchFeed(feedUrl, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📡 Fetching RSS feed (attempt ${attempt}/${retries}): ${feedUrl}`);
      const feed = await parser.parseURL(feedUrl);
      console.log(`✅ Successfully fetched RSS from ${feedUrl}`);
      return feed.items || [];
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed for ${feedUrl}:`, error.message);
      
      if (attempt === retries) {
        console.error(`⚠️ All ${retries} attempts failed for ${feedUrl}. Using cached/empty data.`);
        return [];
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return [];
}

/**
 * Fetch RSS feed with alternative methods
 */
async function fetchFeedWithFallback(feedUrl, retries = 3) {
  // First try direct fetch
  const result = await fetchFeed(feedUrl, retries);
  
  if (result.length > 0) {
    return result;
  }
  
  // If direct fetch failed, try with improved axios (with timeout and retries)
  console.log(`🔄 Attempting alternative fetch method for ${feedUrl}`);
  try {
    const response = await axios.get(feedUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml',
        'Cache-Control': 'no-cache'
      },
      maxRedirects: 5
    });
    
    const feed = await parser.parseString(response.data);
    console.log(`✅ Alternative fetch succeeded for ${feedUrl}`);
    return feed.items || [];
  } catch (error) {
    console.error(`❌ Alternative fetch also failed for ${feedUrl}:`, error.message);
    return [];
  }
}

/**
 * Get all blogs from all RSS sources
 */
async function getAllBlogs(limit = 50) {
  try {
    console.log('🔄 Fetching blogs from all RSS sources...');
    
    const [hackersNewsPosts, bleepingComputerPosts] = await Promise.all([
      fetchFeedWithFallback(RSS_FEEDS.hackersNews),
      fetchFeedWithFallback(RSS_FEEDS.bleepingComputer)
    ]);
    
    console.log(`📊 Fetched ${hackersNewsPosts.length} from The Hacker News, ${bleepingComputerPosts.length} from BleepingComputer`);
    
    // Format posts
    const formattedHackersNews = hackersNewsPosts.map(post => formatBlogPost(post, 'hackersNews'));
    const formattedBleepingComputer = bleepingComputerPosts.map(post => formatBlogPost(post, 'bleepingComputer'));
    
    // Combine and sort by date (most recent first)
    let allBlogs = [...formattedHackersNews, ...formattedBleepingComputer];
    allBlogs.sort((a, b) => b.pubDate - a.pubDate);
    
    console.log(`✅ Processed ${allBlogs.length} blogs total, returning ${Math.min(limit, allBlogs.length)}`);
    
    // Limit results
    return allBlogs.slice(0, limit);
  } catch (error) {
    console.error('❌ Error in getAllBlogs:', error);
    return [];
  }
}

/**
 * Get blogs filtered by category
 */
async function getBlogsByCategory(category, limit = 50) {
  try {
    const allBlogs = await getAllBlogs(limit * 3); // Get more to account for filtering
    
    if (!category || category.toLowerCase() === 'all') {
      return allBlogs.slice(0, limit);
    }
    
    // Filter blogs by category
    const filteredBlogs = allBlogs.filter(blog => 
      blog.categories.some(cat => cat.toLowerCase() === category.toLowerCase())
    );
    
    return filteredBlogs.slice(0, limit);
  } catch (error) {
    console.error('Error in getBlogsByCategory:', error);
    return [];
  }
}

/**
 * Get category counts
 */
async function getCategoryCounts() {
  try {
    const allBlogs = await getAllBlogs(100);
    const counts = {};
    
    Object.keys(ALLOWED_CATEGORIES).forEach(category => {
      counts[category] = 0;
    });
    
    // Count blogs per category
    allBlogs.forEach(blog => {
      blog.categories.forEach(category => {
        if (counts.hasOwnProperty(category)) {
          counts[category]++;
        }
      });
    });
    
    return counts;
  } catch (error) {
    console.error('Error in getCategoryCounts:', error);
    return Object.keys(ALLOWED_CATEGORIES).reduce((acc, cat) => {
      acc[cat] = 0;
      return acc;
    }, {});
  }
}

/**
 * Search blogs by keyword
 */
async function searchBlogs(query, limit = 50) {
  try {
    const allBlogs = await getAllBlogs(limit * 2);
    const queryLower = query.toLowerCase();
    
    const results = allBlogs.filter(blog => 
      blog.title.toLowerCase().includes(queryLower) ||
      blog.summary.toLowerCase().includes(queryLower) ||
      blog.author.toLowerCase().includes(queryLower)
    );
    
    return results.slice(0, limit);
  } catch (error) {
    console.error('Error in searchBlogs:', error);
    return [];
  }
}

// Controller methods
exports.getAllBlogs = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const blogs = await getAllBlogs(limit);
    
    res.json({
      success: true,
      data: blogs,
      count: blogs.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs',
      error: error.message
    });
  }
};

exports.getBlogsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    
    const blogs = await getBlogsByCategory(category, limit);
    
    res.json({
      success: true,
      data: blogs,
      count: blogs.length,
      category: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs by category',
      error: error.message
    });
  }
};

exports.getCategoryCounts = async (req, res) => {
  try {
    const counts = await getCategoryCounts();
    
    res.json({
      success: true,
      data: counts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching category counts',
      error: error.message
    });
  }
};

exports.searchBlogs = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const results = await searchBlogs(q, limit);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      query: q
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching blogs',
      error: error.message
    });
  }
};

exports.getRecentPosts = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 3, 10);
    const blogs = await getAllBlogs(limit);
    
    res.json({
      success: true,
      data: blogs.slice(0, limit),
      count: blogs.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching recent posts',
      error: error.message
    });
  }
};
