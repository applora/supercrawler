import { Hono } from "hono";
import { success, error } from "@/lib/api-response.js";
import { FetchError } from "@/modules/shopify-appstore-api/index.js";
import {
  getAppList,
  getPageAppReviews,
  getCurrentShopifyAppInfo,
  getCurrentShopifyCategory,
  getCurrentShopifyDeveloper,
  getCurrentShopifyKeywordAuthComplete,
  getCurrentShopifyKeyword,
} from "@/modules/shopify-appstore-api/index.js";

// Helper function to handle errors and extract status
function handleError(e: any) {
  if (e instanceof FetchError) {
    // This is a FetchError with status
    return {
      message: e.message || 'Request failed',
      status: e.status
    };
  }
  // Regular Error
  return {
    message: e instanceof Error ? e.message : 'Unknown error',
    status: 500
  };
}

const app = new Hono()
  // Get all apps from sitemap
  .get("/apps", async (c) => {
    try {
      const result = await getAppList();
      return success(c, result);
    } catch (e) {
      const err = handleError(e);
      return error(c, err.message, err.status);
    }
  })

  // Get app reviews with pagination
  .get("/apps/:handle/reviews", async (c) => {
    try {
      const handle = c.req.param("handle");
      const page = Number(c.req.query("page")) || 1;

      const result = await getPageAppReviews(handle, page);
      return success(c, result);
    } catch (e) {
      const err = handleError(e);
      return error(c, err.message, err.status);
    }
  })

  // Get app details by handle
  .get("/apps/:handle", async (c) => {
    try {
      const handle = c.req.param("handle");
      const result = await getCurrentShopifyAppInfo(handle);
      return success(c, result);
    } catch (e) {
      const err = handleError(e);
      return error(c, err.message, err.status);
    }
  })

  // Get category details with pagination
  .get("/categories/:handle", async (c) => {
    try {
      const handle = c.req.param("handle");
      const page = Number(c.req.query("page")) || 1;

      const result = await getCurrentShopifyCategory(handle, page);
      return success(c, result);
    } catch (e) {
      const err = handleError(e);
      return error(c, err.message, err.status);
    }
  })

  // Get developer details by handle
  .get("/developers/:handle", async (c) => {
    try {
      const handle = c.req.param("handle");
      const result = await getCurrentShopifyDeveloper(handle);
      return success(c, result);
    } catch (e) {
      const err = handleError(e);
      return error(c, err.message, err.status);
    }
  })

  // Search autocomplete for keywords
  .get("/search/autocomplete", async (c) => {
    try {
      const keyword = c.req.query("q");
      if (!keyword) {
        return error(c, "Query parameter 'q' is required", 400);
      }

      const result = await getCurrentShopifyKeywordAuthComplete(keyword);
      return success(c, result);
    } catch (e) {
      const err = handleError(e);
      return error(c, err.message, err.status);
    }
  })

  // Search apps by keyword with pagination
  .get("/search", async (c) => {
    try {
      const keyword = c.req.query("q");
      if (!keyword) {
        return error(c, "Query parameter 'q' is required", 400);
      }

      const page = Number(c.req.query("page")) || 1;
      const result = await getCurrentShopifyKeyword(keyword, page);
      return success(c, result);
    } catch (e) {
      const err = handleError(e);
      return error(c, err.message, err.status);
    }
  });

export default app;
