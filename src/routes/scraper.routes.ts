import { Router } from "express";
import { ScraperController } from "../controllers/scraper.controller";
import { asyncHandler } from "../middleware/async-handler";
import {
  validate,
  validateQuery,
  fetchRequestSchema,
  batchFetchRequestSchema,
  cacheClearQuerySchema,
} from "../validators/scraper.validator";

const router = Router();

/**
 * @swagger
 * /api/scraper/fetch:
 *   post:
 *     summary: Scrape a single URL
 *     description: Fetch HTML content from a URL using specified scraping strategy
 *     tags: [Scraper]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: URL to scrape
 *                 example: https://example.com
 *               options:
 *                 $ref: '#/components/schemas/ScraperOptions'
 *     responses:
 *       200:
 *         description: Successful scraping
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ScraperResult'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         description: Internal server error
 */
router.post(
  "/fetch",
  validate(fetchRequestSchema),
  asyncHandler(ScraperController.fetch),
);

/**
 * @swagger
 * /api/scraper/batch:
 *   post:
 *     summary: Scrape multiple URLs
 *     description: Fetch HTML content from multiple URLs in parallel (max 10)
 *     tags: [Scraper]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - urls
 *             properties:
 *               urls:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *                   format: uri
 *                 example: ["https://example1.com", "https://example2.com"]
 *               options:
 *                 $ref: '#/components/schemas/ScraperOptions'
 *     responses:
 *       200:
 *         description: Batch scraping completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     successful:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     results:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ScraperResult'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post(
  "/batch",
  validate(batchFetchRequestSchema),
  asyncHandler(ScraperController.batchFetch),
);

/**
 * @swagger
 * /api/scraper/cache:
 *   delete:
 *     summary: Clear cache entries
 *     description: Clear cache entries matching the specified pattern
 *     tags: [Cache]
 *     parameters:
 *       - in: query
 *         name: pattern
 *         schema:
 *           type: string
 *           default: '*'
 *           pattern: '^[a-zA-Z0-9:*_-]+$'
 *         description: Cache key pattern (supports wildcards)
 *         example: 'example*'
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     cleared:
 *                       type: integer
 *                       description: Number of entries cleared
 *                     pattern:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.delete(
  "/cache",
  validateQuery(cacheClearQuerySchema),
  asyncHandler(ScraperController.clearCache),
);

/**
 * @swagger
 * /api/scraper/stats:
 *   get:
 *     summary: Get service statistics
 *     description: Retrieve statistics about browser pool, memory usage, and uptime
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     browserPool:
 *                       type: object
 *                       properties:
 *                         direct:
 *                           type: object
 *                           properties:
 *                             active:
 *                               type: boolean
 *                             contexts:
 *                               type: integer
 *                         proxy:
 *                           type: object
 *                           properties:
 *                             active:
 *                               type: boolean
 *                             contexts:
 *                               type: integer
 *                     uptime:
 *                       type: number
 *                       description: Process uptime in seconds
 *                     memory:
 *                       type: object
 *                       description: Memory usage details
 */
router.get("/stats", asyncHandler(ScraperController.getStats));

/**
 * @swagger
 * /api/scraper/health:
 *   get:
 *     summary: Health check
 *     description: Check service health including Redis connection and browser pool status
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: ok
 *                     services:
 *                       type: object
 *                       properties:
 *                         redis:
 *                           type: boolean
 *                         browserPool:
 *                           type: object
 */
router.get("/health", asyncHandler(ScraperController.getHealth));

export { router as scraperRouter };
