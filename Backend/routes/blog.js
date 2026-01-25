const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');

/**
 * GET /api/blogs
 * Get all blogs
 * Query params: limit (default: 50, max: 100)
 */
router.get('/', blogController.getAllBlogs);

/**
 * GET /api/blogs/category/:category
 * Get blogs filtered by category
 * Categories: 'Security Tips', 'Threat Analysis', 'Case Studies', 'Email Security', 'Enterprise', 'Phishing'
 * Query params: limit (default: 50, max: 100)
 */
router.get('/category/:category', blogController.getBlogsByCategory);

/**
 * GET /api/blogs/counts/categories
 * Get count of blogs per category
 */
router.get('/counts/categories', blogController.getCategoryCounts);

/**
 * GET /api/blogs/search
 * Search blogs by keyword
 * Query params: q (search query), limit (default: 50, max: 100)
 */
router.get('/search', blogController.searchBlogs);

/**
 * GET /api/blogs/recent
 * Get recent blog posts
 * Query params: limit (default: 3, max: 10)
 */
router.get('/recent', blogController.getRecentPosts);

module.exports = router;
