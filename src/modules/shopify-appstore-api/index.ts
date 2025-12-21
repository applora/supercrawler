import { load } from "cheerio";
import { browserFetch } from "@/lib/fetch.js";
import {
  getAppDetail,
  getAppReviews,
  getAppUrls,
  getCategoryDetail,
  getDeveloperDetail,
  getSearchResults,
} from "./parser.js";

// Custom error class to include HTTP status
export class FetchError extends Error {
  constructor(
    message: string,
    public status: number,
    public cause?: Error
  ) {
    super(message);
    this.name = "FetchError";
  }
}

// Unified error handler for checking response status
function checkResponseStatus(res: any, url?: string) {
  if (res.status !== 200) {
    const message = url
      ? `Failed to fetch ${url}. Status: ${res.status}`
      : `Request failed with status: ${res.status}`;
    throw new FetchError(message, res.status);
  }
  return res;
}

export const getAppList = async () => {
  const url = "https://apps.shopify.com/sitemap";
  const res = await browserFetch({
    url,
    headers: {
      Accept:
        "text/html,application/xhtml+xml;q=0.9,application/xml;q=0.8,*/*;q=0.7",
    },
  });
  checkResponseStatus(res, url);

  const $ = load(res.html);
  const [apps] = await Promise.all([getAppUrls($)]);

  return {
    apps,
  };
};

export const getPageAppReviews = async (handle: string, page: number = 1) => {
  const url = `https://apps.shopify.com/${handle}/reviews?page=` + page;
  const res = await browserFetch({
    url,
    headers: {
      Accept:
        "text/html,application/xhtml+xml;q=0.9,application/xml;q=0.8,*/*;q=0.7",
    },
  });
  checkResponseStatus(res, url);

  const $ = load(res.html);
  const data = await getAppReviews($);
  return data;
};

export const getCurrentShopifyAppInfo = async (handle: string) => {
  const url = `https://apps.shopify.com/${handle}`;
  const res = await browserFetch({ url });
  checkResponseStatus(res, url);

  const $ = load(res.html);
  const data = await getAppDetail($);
  return data;
};

export const getCurrentShopifyCategory = async (
  handle: string,
  page: number = 1
) => {
  const url = `https://apps.shopify.com/categories/${handle}?page=${page}`;
  const res = await browserFetch({ url });
  checkResponseStatus(res, url);

  const $ = load(res.html);
  const data = await getCategoryDetail($);
  return data;
};

export const getCurrentShopifyDeveloper = async (handle: string) => {
  const url = `https://apps.shopify.com/partners/${handle}`;
  const res = await browserFetch({ url });
  checkResponseStatus(res, url);

  const $ = load(res.html);
  const data = await getDeveloperDetail($);
  return data;
};

export const getCurrentShopifyKeywordAuthComplete = async (keyword: string) => {
  // Fetch the search page with the specific search URL structure
  const searchUrl = `https://apps.shopify.com/search/autocomplete?v=3&q=${encodeURIComponent(
    keyword
  )}&st_source=autocomplete`;
  // Fetch the search page
  const res = await browserFetch({
    url: searchUrl,
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Turbo-Frame": "search_page",
    },
  });
  return JSON.parse(res.html);
};

export const getCurrentShopifyKeyword = async (
  keyword: string,
  page: number = 1
) => {
  // Fetch the search page with the specific search URL structure
  const searchUrl = `https://apps.shopify.com/search?q=${encodeURIComponent(
    keyword
  )}&page=${page}`;

  // Fetch the search page
  const res = await browserFetch({
    url: searchUrl,
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Turbo-Frame": "search_page",
    },
  });

  // Extract the turbo-frame content directly from the initial response
  // The turbo-frame is in the format: <turbo-frame id="search_page">content</turbo-frame>
  const turboFrameMatch = res.html.match(
    /<turbo-frame[^>]*id="search_page"[^>]*>([\s\S]*?)<\/turbo-frame>/
  );

  if (turboFrameMatch && turboFrameMatch[1]) {
    // Parse the turbo-frame content directly
    const $ = load(turboFrameMatch[1]);
    const data = await getSearchResults($, keyword, page);
    return data;
  }

  // If no turbo-frame found in initial response, try to find and fetch it
  const turboFrameSrcMatch = res.html.match(/<turbo-frame[^>]+src="([^"]+)"/);
  if (turboFrameSrcMatch) {
    let turboFrameSrc = turboFrameSrcMatch[1];

    // Update the turbo-frame src URL with the correct page parameter
    if (page > 1 && turboFrameSrc) {
      const turboUrlObj = new URL(turboFrameSrc, "https://apps.shopify.com");
      turboUrlObj.searchParams.set("page", page.toString());
      turboFrameSrc = turboUrlObj.pathname + turboUrlObj.search;
    }

    // @ts-ignore
    const turboUrl = turboFrameSrc.startsWith("http")
      ? turboFrameSrc
      : `https://apps.shopify.com${turboFrameSrc}`;

    // Fetch the turbo-frame content
    const turboRes = await browserFetch({
      // @ts-ignore
      url: turboUrl,
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Turbo-Frame": "search_page",
      },
    });

    const $ = load(turboRes.html);
    const data = await getSearchResults($, keyword, page);
    return data;
  }

  // Return empty results if nothing was found
  return {
    query: keyword,
    totalCount: 0,
    apps: [],
    pagination: {
      hasNextPage: false,
      totalPages: 1,
      currentPage: page,
    },
    hasResults: false,
  };
};
