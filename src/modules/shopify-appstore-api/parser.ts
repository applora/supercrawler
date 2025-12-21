import { type CheerioAPI } from "cheerio";
import dayjs from "dayjs";

const cleanPrice = (price: string): string => {
  if (!price) return "0";

  // Extract the first numeric price from the string
  // This handles cases like "$19.90/month or $190.80/year with save 20%"
  const priceMatch = price.match(/\$?(\d+(?:\.\d{1,2})?)/);
  if (priceMatch) {
    return priceMatch[1]!;
  }

  // Fallback to original logic
  return price.replace(/[^0-9.]/g, "") || "0";
};

export interface Review {
  app_url: string;
  app_name: string;
  reviewer: string;
  review_created_date: string;
  reviewer_location: string;
  rating: number;
  reviewer_latest_used_date: string;
  review_content: string;
  review_id: string;
}

export interface PaginationInfo {
  hasNextPage: boolean;
  totalPages: number;
  currentPage: number;
}

const APP_URL_IGNORE_PATHS = [
  "/partners",
  "/partner",
  "/built-in-features",
  "/compare",
  "/categories",
  "/collections",
  "/stories",
  "/store-create",
  "/app-groups",
  "/sitemap",
  "/?auth=1",
];

const CATEGORY_URL_PATHS = ["/categories/"];

const DEVELOPER_URL_PATHS = ["/partners/"];

export async function getAppUrls($: CheerioAPI): Promise<{
  total: number;
  urls: {
    url: string;
    handle: string | undefined;
  }[];
}> {
  const appUrls = $("a")
    .map((_i, el) => $(el).attr("href"))
    .get()
    .filter(
      (url) => url && !APP_URL_IGNORE_PATHS.some((path) => url.includes(path))
    )
    .filter((url) => url.includes("apps.shopify.com"))
    .map((url) => ({
      url,
      handle: url.split("/").pop(),
    }));
  const dedupedappUrls = [
    ...new Map(appUrls.map((i) => [i.handle, i])).values(),
  ];
  return {
    total: dedupedappUrls.length,
    urls: dedupedappUrls,
  };
}

export async function getCategoryUrls($: CheerioAPI): Promise<{
  total: number;
  urls: {
    url: string;
    handle: string | undefined;
  }[];
}> {
  const appUrls = $("a")
    .map((_i, el) => $(el).attr("href"))
    .get()
    .filter(
      (url) =>
        url &&
        CATEGORY_URL_PATHS.some(
          (path) => url.includes(path) && url.includes("/all")
        )
    )
    .filter((url) => url.includes("apps.shopify.com"))
    .map((url) => ({
      url,
      handle: url.split("/").at(-2),
    }));
  const dedupedappUrls = [
    ...new Map(appUrls.map((i) => [i.handle, i])).values(),
  ];
  return {
    total: dedupedappUrls.length,
    urls: dedupedappUrls,
  };
}

export async function getDeveloperUrls($: CheerioAPI): Promise<{
  total: number;
  urls: {
    url: string;
    handle: string | undefined;
  }[];
}> {
  const appUrls = $("a")
    .map((_i, el) => $(el).attr("href"))
    .get()
    .filter(
      (url) => url && DEVELOPER_URL_PATHS.some((path) => url.includes(path))
    )
    .filter((url) => url.includes("apps.shopify.com"))
    .map((url) => ({
      url,
      handle: url.split("/").pop(),
    }));

  const dedupedappUrls = [
    ...new Map(appUrls.map((i) => [i.handle, i])).values(),
  ];

  return {
    total: dedupedappUrls.length,
    urls: dedupedappUrls,
  };
}

const getLaunched = async ($: CheerioAPI) => {
  return new Promise((resolve) => {
    // Find the last grid section in #adp-developer which contains launch date
    const launchSection = $("#adp-developer").find(".tw-grid").last();
    const launched = launchSection
      .find(".tw-text-fg-secondary.tw-text-body-md")
      .text()
      .split("·")[0]!
      .trim();
    resolve(launched);
  });
};

const getLanguages = async ($: CheerioAPI) => {
  return new Promise((resolve) => {
    // First try to get languages from JSON-LD structured data
    const jsonLdScript = $('script[type="application/ld+json"]').first();
    if (jsonLdScript.length > 0) {
      try {
        const jsonLd = JSON.parse(jsonLdScript.html() || "{}");
        if (jsonLd.inLanguage) {
          if (Array.isArray(jsonLd.inLanguage)) {
            resolve(jsonLd.inLanguage);
            return;
          } else if (typeof jsonLd.inLanguage === "string") {
            resolve([jsonLd.inLanguage]);
            return;
          }
        }
      } catch (e) {
        // Continue with DOM parsing
      }
    }

    // Look for the new HTML structure with "Languages" label
    const languageContainers = $(".tw-flex.tw-flex-col");
    languageContainers.each((_, containerEl) => {
      const $container = $(containerEl);
      const languageLabel = $container.find('p:contains("Languages")');

      if (languageLabel.length > 0) {
        // Find the corresponding content div
        const languageContent = $container
          .find('p:contains("Languages")')
          .parent()
          .find(".tw-col-span-full.sm\\:tw-col-span-3 p");
        if (languageContent.length > 0) {
          const languagesText = languageContent.first().text().trim();
          // Parse languages separated by commas and "and"
          const languages = languagesText
            .split(/,|\band\b/)
            .map((lang) => lang.trim().replace(/\s+/g, " "))
            .filter((lang) => lang.length > 0 && lang.length < 30);

          if (languages.length > 0) {
            resolve(languages);
            return false; // break
          }
        }
      }
    });

    // Look for language info in app details sections (fallback)
    const languageSelectors = [
      '[data-test-id="languages"]',
      '.tw-text-fg-secondary:contains("Languages")',
      ".languages-section",
      "#adp-developer .tw-grid",
      ".app-details-languages",
    ];

    for (const selector of languageSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const text = element.text().trim();
        // Look for language indicators: common patterns
        const languagePatterns = [
          /English|French|German|Spanish|Italian|Portuguese|Dutch|Chinese|Japanese|Korean|Russian/i,
          /[A-Za-z]+(, [A-Za-z]+)+/g,
        ];

        for (const pattern of languagePatterns) {
          const match = text.match(pattern);
          if (match) {
            const languages = match[0]
              .split(",")
              .map((lang: string) => lang.trim());
            if (
              languages.length > 0 &&
              languages.every(
                (lang: string) => lang.length > 1 && lang.length < 20
              )
            ) {
              resolve(languages);
              return;
            }
          }
        }
      }
    }

    // Fallback to original logic with more thorough search
    const grids = $(".tw-grid");
    grids.each((_, gridEl) => {
      const $grid = $(gridEl);
      const text = $grid
        .find(".tw-text-fg-secondary.tw-text-body-md")
        .text()
        .trim();
      // Check if this contains language-like content (comma-separated values)
      if (text && text.includes(",") && text.split(",").length > 1) {
        const items = text.split(",").map((item: string) => item.trim());
        // Basic heuristic: if most items look like language names (short words)
        const likelyLanguages = items.filter(
          (item) => item.length > 0 && item.length < 20
        );
        if (likelyLanguages.length === items.length && items.length > 1) {
          resolve(likelyLanguages);
          return false; // break
        }
      }
      return true; // continue
    });
    resolve([]);
  });
};

const getWorksWith = async ($: CheerioAPI) => {
  return new Promise((resolve) => {
    // Look for the "Works with" section using the specific HTML structure
    const worksWithSection = $("p:contains('Works with')").parent();

    if (worksWithSection.length > 0) {
      // Find the ul element that contains the works with items
      const worksWithList = worksWithSection.find("ul");

      if (worksWithList.length > 0) {
        const worksWithItems = worksWithList
          .find("li")
          .map((_, li) => {
            const text = $(li).text().trim();
            // Remove the trailing comma if present
            return text.replace(/,$/, "");
          })
          .get()
          .filter((item) => item.length > 0);

        if (worksWithItems.length > 0) {
          resolve(worksWithItems);
          return;
        }
      }
    }

    // Fallback: Look for any grid section containing "Works with"
    $(".tw-grid").each((_, gridEl) => {
      const $grid = $(gridEl);
      const labelElement = $grid.find('p:contains("Works with")');

      if (labelElement.length > 0) {
        // Find the corresponding list items
        const worksWithItems = $grid
          .find("li")
          .map((_, li) => {
            const text = $(li).text().trim();
            return text.replace(/,$/, "");
          })
          .get()
          .filter((item) => item.length > 0);

        if (worksWithItems.length > 0) {
          resolve(worksWithItems);
          return false; // break
        }
      }
    });

    // If nothing found, return empty array
    resolve([]);
  });
};

const getCategories = async ($: CheerioAPI) => {
  return new Promise((resolve) => {
    const categories: { name: string; url: string }[] = [];

    // Extract main categories from accordion titles
    $(
      '[data-accordion-target="wrapper"] .tw-flex.tw-justify-between a[href*="/categories/"]'
    ).each((_, a) => {
      const $a = $(a);
      const name = $a.text().trim();
      const url = $a.attr("href")?.trim() || "";

      if (name && url && !categories.some((cat) => cat.name === name)) {
        categories.push({
          name,
          url: url.startsWith("http") ? url : `https://apps.shopify.com${url}`,
        });
      }
    });

    // If we found visible categories in the accordion, return them
    if (categories.length > 0) {
      resolve(categories);
      return;
    }

    // Fallback: Try multiple selectors for finding categories (legacy logic)
    const categorySelectors = [
      'p:contains("Categories")',
      '[data-test-id="categories"]',
      ".categories-section",
      ".app-categories",
      'h2:contains("Categories")',
      'h3:contains("Categories")',
      'h4:contains("Categories")',
      'h5:contains("Categories")',
      'h6:contains("Categories")',
    ];

    for (const selector of categorySelectors) {
      $(selector).each((_, el) => {
        const $parent = $(el).closest(
          ".tw-grid, .category-container, .tw-flex-col"
        );

        // Try different selectors for category links
        const categoryLinks = $parent.find(
          '.tw-flex.tw-justify-between a, .category-links a, [data-test-id="category-link"]'
        );
        if (categoryLinks.length > 0) {
          categoryLinks.each((_, a) => {
            const $a = $(a);
            const name = $a.text().trim();
            const url = $a.attr("href")?.trim() || "";
            if (name && url && !categories.some((cat) => cat.name === name)) {
              categories.push({
                name,
                url: url.startsWith("http")
                  ? url
                  : `https://apps.shopify.com${url}`,
              });
            }
          });

          if (categories.length > 0) {
            resolve(categories);
            return false;
          }
        }

        // Alternative: find links within the parent that go to categories
        const alternativeLinks = $parent.find('a[href*="/categories/"]');
        if (alternativeLinks.length > 0) {
          alternativeLinks.each((_, a) => {
            const $a = $(a);
            const name = $a.text().trim();
            const url = $a.attr("href")?.trim() || "";

            if (name && url && !categories.some((cat) => cat.name === name)) {
              categories.push({
                name,
                url: url.startsWith("http")
                  ? url
                  : `https://apps.shopify.com${url}`,
              });
            }
          });

          if (categories.length > 0) {
            resolve(categories);
            return false;
          }
        }
      });
    }

    // Try to find categories from breadcrumb or navigation
    const breadcrumbCategories = $(
      '.breadcrumb a, .nav-breadcrumb a, [data-test-id="breadcrumb"] a'
    )
      .map((_, a) => {
        const $a = $(a);
        const name = $a.text().trim();
        const url = $a.attr("href")?.trim() || "";

        if (name && url && name !== "Apps" && name !== "Home") {
          return {
            name,
            handle: url.split("/").at(-1),
            url: url.startsWith("http")
              ? url
              : `https://apps.shopify.com${url}`,
          };
        }
        return null;
      })
      .get()
      .filter(Boolean) as { name: string; url: string }[];

    if (breadcrumbCategories.length > 0) {
      resolve([...categories, ...breadcrumbCategories]);
      return;
    }

    // Fallback to original logic
    $('p:contains("Categories")').each((_, el) => {
      const $parent = $(el).closest(".tw-grid");
      const categoryLinks = $parent.find(
        '.tw-flex.tw-justify-between a[href*="/categories/"]'
      );

      categoryLinks.each((_, a) => {
        const $a = $(a);
        const name = $a.text().trim();
        const url = $a.attr("href")?.trim() || "";
        if (name && url && !categories.some((cat) => cat.name === name)) {
          categories.push({
            name,
            url: url.startsWith("http")
              ? url
              : `https://apps.shopify.com${url}`,
          });
        }
      });

      if (categories.length > 0) {
        resolve(categories);
        return false;
      }
    });

    // If still no categories found, resolve with empty array
    resolve(categories);
  });
};

function extractReviews($: CheerioAPI): Review[] {
  const reviews: Review[] = [];

  // Helper function to clean text
  const cleanText = (text: string): string => {
    return text
      .replace(/\s+/g, " ") // Replace multiple whitespace with single space
      .replace(/\n+/g, " ") // Replace newlines with space
      .trim(); // Remove leading/trailing whitespace
  };

  // Extract app URL and name from the reviews page header or from title
  let appUrl =
    $("#arp-reviews h1 a").attr("href")?.trim() ||
    $("h1 a").attr("href")?.trim() ||
    $('link[rel="canonical"]').attr("href")?.trim() ||
    "";
  let appName =
    $("#arp-reviews h1 a").text()?.trim() ||
    $("h1 a").text()?.trim() ||
    $("title").text().split("|")[0]?.trim() ||
    "";

  // If we don't have the full URL, construct it
  if (appUrl && !appUrl.startsWith("http")) {
    appUrl = `https://apps.shopify.com${appUrl}`;
  }

  // Fallback to extract app name from canonical URL if needed
  if (!appName && appUrl) {
    appName = appUrl.split("/").pop()?.split("?")[0]?.replace(/-/g, " ") || "";
    appName = appName.replace(/\b\w/g, (char: string) => char.toUpperCase());
  }

  // Find review containers using multiple selectors
  $("[data-merchant-review], [data-review-content-id]").each((_, reviewEl) => {
    const $review = $(reviewEl);

    // Extract reviewer name - try multiple selectors
    let reviewer = cleanText(
      $review.find(".tw-text-heading-xs.tw-text-fg-primary").text() ||
        $review.find(".tw-text-heading-xs").first().text() ||
        $review.find(".reviewer-name").first().text() ||
        $review.find("[title]").first().attr("title") ||
        ""
    );

    // Try to get reviewer from the first text element
    if (!reviewer) {
      const firstTextEl = $review
        .find(
          '.tw-text-fg-primary, .reviewer-name, [data-test-id="reviewer-name"]'
        )
        .first();
      reviewer = cleanText(
        firstTextEl.text() || firstTextEl.attr("title") || ""
      );
    }

    // Extract rating - analyze star SVGs or aria-label
    let rating = 0;
    const starsContainer = $review.find(
      '[aria-label*="out of"], [role="img"][aria-label*="star"]'
    );

    if (starsContainer.length > 0) {
      // Extract rating from aria-label first
      const ariaLabel = starsContainer.first().attr("aria-label") || "";
      const ratingMatch = ariaLabel.match(/(\d+(\.\d+)?)\s*out of\s*\d+/);
      if (ratingMatch) {
        rating = parseFloat(ratingMatch[1]!);
      } else {
        // Fallback: count filled stars by analyzing SVG paths
        const starSvgs = starsContainer.find("svg");
        let filledStars = 0;

        starSvgs.each((_i, svgEl) => {
          const pathData = $(svgEl).find("path").attr("d") || "";
          // Check if this is a filled star vs empty star based on path data
          // Filled star: starts with "M8 0.75C" and doesn't have inner cutout
          // Empty star: starts with "M8.00001 0.25C" and has "ZM8.00001 2.695L..." inner cutout
          if (
            pathData.includes("M8 0.75C") &&
            !pathData.includes("ZM8.00001 2.695L")
          ) {
            filledStars++;
          }
        });

        rating = filledStars;
      }
    } else {
      // Fallback: look for star SVGs in the review and analyze them
      const starSvgs = $review.find(
        'svg[viewBox*="0 0 16 15"], svg[viewBox*="0 0 24 24"]'
      );
      let filledStars = 0;

      starSvgs.each((_i, svgEl) => {
        const pathData = $(svgEl).find("path").attr("d") || "";
        if (
          pathData.includes("M8 0.75C") &&
          !pathData.includes("ZM8.00001 2.695L")
        ) {
          filledStars++;
        }
      });

      rating = filledStars > 0 ? filledStars : 5; // Default to 5 if no stars found
    }

    // Extract review date - look for date-like text in multiple locations
    let reviewDate = "";
    const dateSelectors = [
      ".tw-text-body-xs.tw-text-fg-tertiary",
      ".tw-text-fg-tertiary",
      ".review-date",
      '[data-test-id="review-date"]',
      "time[datetime]",
    ];

    for (const selector of dateSelectors) {
      const dateElements = $review.find(selector);
      dateElements.each((_i, el) => {
        const text = cleanText($(el).text() || $(el).attr("datetime") || "");
        // Look for date patterns like "March 31, 2025", "2024-03-31", or relative dates
        if (
          text.match(
            /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/
          ) ||
          text.match(/\d{4}-\d{2}-\d{2}/) ||
          text.match(/\d{1,2}\/\d{1,2}\/\d{4}/) ||
          text.match(/\d+\s+(day|week|month|year)s?\s+ago/)
        ) {
          reviewDate = text;
          return false; // break
        }
      });
      if (reviewDate) break;
    }

    // Extract reviewer location and usage time from the structured layout
    // Look for the reviewer info container
    const reviewerInfoSelectors = [
      ".tw-space-y-1.md\\:tw-space-y-2.tw-text-fg-tertiary.tw-text-body-xs",
      ".reviewer-info",
      '[data-test-id="reviewer-info"]',
      ".tw-text-fg-tertiary .tw-text-body-xs",
    ];

    let location = "";
    let usageTime = "";

    for (const selector of reviewerInfoSelectors) {
      const reviewerInfoContainer = $review.find(selector);
      if (reviewerInfoContainer.length > 0) {
        const infoElements = reviewerInfoContainer.find("div, span");
        infoElements.each((index: number, el) => {
          const text = cleanText($(el).text());
          if (text && !reviewDate.includes(text) && text !== reviewer) {
            // Skip elements that look like the reviewer name or review date
            if (
              index === 1 ||
              text.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z]{2})?$/)
            ) {
              // Second element or text that looks like a location (City, State)
              // Simple location like "Canada" or "United States" should also match
              if (
                text !== "" &&
                !text.match(/using|days?|months?|years?|app|since|ago/i)
              ) {
                location = text;
              }
            } else if (
              text.match(/using|days?|months?|years?|app|since|ago/i)
            ) {
              // Text that indicates usage time
              usageTime = text;
            } else if (location && index > 1) {
              // If we already have location, this might be usage time
              usageTime = text;
            }
          }
        });
        if (location || usageTime) break;
      }
    }

    // Fallback: extract location and usage from other patterns
    if (!location || !usageTime) {
      const infoElements = $review.find(
        '.tw-text-fg-tertiary, .reviewer-meta, [data-test-id*="reviewer"]'
      );
      infoElements.each((_i, el) => {
        const text = cleanText($(el).text());
        if (text && !reviewDate.includes(text) && text !== reviewer) {
          if (
            !location &&
            text.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z]{2})?$/)
          ) {
            location = text;
          } else if (
            !usageTime &&
            text.match(/using|days?|months?|years?|app|since|ago/i)
          ) {
            usageTime = text;
          }
        }
      });
    }

    // Extract review content - try multiple selectors
    const reviewContentSelectors = [
      "[data-truncate-review] p",
      ".tw-text-body-md.tw-text-fg-secondary p",
      ".tw-text-body-md p",
      ".review-content",
      '[data-test-id="review-content"]',
      "p",
    ];

    let reviewContent = "";
    for (const selector of reviewContentSelectors) {
      const content = cleanText($review.find(selector).first().text());
      if (content && content.length > 10) {
        // Ensure we have meaningful content
        reviewContent = content;
        break;
      }
    }

    // Only add review if we have essential information
    if (reviewer && reviewContent) {
      // Ensure app_url is properly formatted
      if (!appUrl) {
        appUrl = "";
      }

      // Extract review_id from the review container or its parent elements
      let reviewId = $review.attr("data-review-id") || "";

      // If not found on the review element, try to find it in parent elements
      if (!reviewId) {
        reviewId =
          $review.find("[data-review-id]").attr("data-review-id") || "";
        if (!reviewId) {
          reviewId =
            $review.closest("[data-review-id]").attr("data-review-id") || "";
        }
      }

      reviews.push({
        app_url: appUrl,
        app_name: appName || "Unknown App",
        reviewer,
        review_created_date: dayjs(reviewDate).format(),
        reviewer_location: location,
        rating,
        reviewer_latest_used_date: usageTime,
        review_content: reviewContent,
        review_id: reviewId,
      });
    }
  });

  return reviews;
}

function extractPaginationInfo($: CheerioAPI): PaginationInfo {
  // Find pagination container
  const paginationContainer = $('[aria-label="pagination"]');

  if (paginationContainer.length === 0) {
    return {
      hasNextPage: false,
      totalPages: 1,
      currentPage: 1,
    };
  }

  // Check for "Next" link or button
  const hasNextPage =
    paginationContainer.find(
      'a[rel="next"], a[aria-label*="Next"], button[aria-label*="Next"]'
    ).length > 0;

  // Extract all page numbers
  const pageNumbers: number[] = [];
  paginationContainer
    .find('a[aria-label*="Page"], button[aria-label*="Page"]')
    .each((_, el) => {
      const ariaLabel = $(el).attr("aria-label") || "";
      const pageMatch = ariaLabel.match(/Page (\d+)/);
      if (pageMatch) {
        pageNumbers.push(parseInt(pageMatch[1]!, 10));
      }
    });

  const totalPages = pageNumbers.length > 0 ? Math.max(...pageNumbers) : 1;

  // Extract current page
  const currentPageEl = paginationContainer.find(
    'a[aria-label*="Current Page"], button[aria-label*="Current Page"]'
  );
  const currentPageMatch = currentPageEl
    .attr("aria-label")
    ?.match(/Page (\d+)/);
  const currentPage = currentPageMatch ? parseInt(currentPageMatch[1]!, 10) : 1;

  return {
    hasNextPage,
    totalPages,
    currentPage,
  };
}

function extractCounts($: CheerioAPI) {
  const counts = $(".app-reviews-metrics")
    .find(".tw-text-body-md ul li")
    .map((_, el) => {
      const $el = $(el);
      const label = $el.find(".tw-mr-2xs").text().trim();
      const count = $el.find("a").text().trim();
      return {
        label,
        count: Number(count.replace(/,/g, "")),
      };
    })
    .get();
  return counts;
}

export async function getAppDetail($: CheerioAPI) {
  const baseInfo = $("#adp-hero");
  const title =
    baseInfo.find("h1").text().trim() || $("h1").first().text().trim();
  const logo =
    baseInfo.find("img").attr("src")?.trim() ||
    $('img[alt*="Invoice"]').attr("src")?.trim();

  // Extract rating from JSON-LD or fallback to hero section
  let rating = "";
  const jsonLdScript = $('script[type="application/ld+json"]').first();
  if (jsonLdScript.length > 0) {
    try {
      const jsonLd = JSON.parse(jsonLdScript.html() || "{}");
      if (jsonLd.aggregateRating?.ratingValue) {
        rating = jsonLd.aggregateRating.ratingValue.toString();
      }
    } catch (e) {
      // Fallback to DOM parsing
    }
  }

  if (!rating) {
    rating =
      baseInfo.find("dd span.tw-text-fg-secondary").first().text().trim() ||
      $('.tw-text-fg-secondary:contains("star")').first().text().trim();
  }

  // Extract pricing information
  let pricing = "";
  const pricingElement = baseInfo.find("dl").first().find("dd").first();
  pricing =
    pricingElement.text().trim() ||
    $('[data-test-id*="pricing"]').text().trim() ||
    $('meta[property="twitter:data1"]').attr("content") ||
    "";

  const languages = await getLanguages($);
  const categories = await getCategories($);
  const worksWith = await getWorksWith($);

  // Extract description from multiple possible locations
  const descriptionText =
    $("#app-details").text()?.trim() ||
    $('[data-test-id="app-description"]').text().trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    $(".tw-text-body-md.tw-text-fg-secondary").first().text().trim() ||
    "";

  // Extract developer information
  const developerSection = $("#adp-developer");
  let developerName = developerSection
    .find(".tw-grid")
    .eq(1)
    .find("a")
    .first()
    .text()
    .trim();
  let developerUrl = developerSection
    .find(".tw-grid")
    .eq(1)
    .find("a")
    .first()
    .attr("href")
    ?.trim();

  if (!developerName) {
    // Try alternative selectors for developer name
    developerName =
      $('[data-test-id="developer-name"]').text().trim() ||
      $(".tw-text-body-md a").first().text().trim() ||
      $('meta[property="twitter:site"]').attr("content")?.replace("@", "") ||
      "";
  }

  if (!developerUrl) {
    // Try alternative selectors for developer URL
    developerUrl =
      developerSection
        .find(".tw-grid")
        .eq(1)
        .find("a")
        .first()
        .attr("href")
        ?.trim() ||
      $('[data-test-id="developer-name"] a').first().attr("href")?.trim() ||
      $(".tw-text-body-md a").first().attr("href")?.trim() ||
      "";
  }

  let developerAddress = developerSection
    .find(".tw-grid")
    .eq(1)
    .find("p.tw-text-fg-tertiary.tw-text-body-md")
    .text()
    .trim();

  if (!developerAddress) {
    developerAddress =
      $('[data-test-id="developer-location"]').text().trim() || "";
  }

  // Extract review count from the reviews link
  let reviewCount = 0;
  const reviewsLink = $(
    'a[data-test-id="reviews_link"], a#reviews-link, a[href*="#adp-reviews"]'
  );
  if (reviewsLink.length > 0) {
    const reviewText = reviewsLink.first().text().trim();
    const reviewMatch = reviewText.match(/\(([\d,]+)\)/);
    if (reviewMatch) {
      reviewCount = parseInt(reviewMatch[1]!.replace(/,/g, ""), 10);
    }
  }

  // Fallback: try to find review count in other elements
  if (reviewCount === 0) {
    const ratingSection = $(".tw-border-r.tw-border-r-stroke-secondary");
    const reviewLink = ratingSection.find('a[href*="#adp-reviews"]');
    const reviewText = reviewLink.text().trim();
    const reviewMatch = reviewText.match(/\(([\d,]+)\)/);
    if (reviewMatch) {
      reviewCount = parseInt(reviewMatch[1]!.replace(/,/g, ""), 10);
    }
  }

  const developer = {
    name: developerName,
    address: developerAddress,
    url: developerUrl,
  };

  // Extract pricing plans - look for multiple possible selectors
  const pricings = $('#adp-pricing, [data-test-id="pricing-section"]')
    .find('.app-details-pricing-plan-card, [data-test-id="pricing-plan"]')
    .map((_, el) => {
      const $card = $(el);
      const name =
        $card
          .find('[data-pricing-component-target="cardHeading"], .plan-name')
          .children()
          .eq(0)
          .text()
          .trim() || $card.find(".plan-name, h3, h4").first().text().trim();
      const price =
        $card
          .find('[data-pricing-component-target="cardHeading"]')
          .children()
          .eq(1)
          .text()
          .trim() || $card.find(".plan-price, .price").first().text().trim();

      // Extract description from additional charges element
      const description =
        $card.find('[data-test-id="additional-charges"]').text().trim() ||
        $card.find(".plan-description, .pricing-description").text().trim() ||
        "";

      // Extract features from the features list
      const features = $card
        .find(
          '[data-test-id="features"] ul, .features ul, ul[data-test-id="features"]'
        )
        .children()
        .map((_i, li) => $(li).text().trim())
        .get()
        .filter(Boolean);

      return {
        name,
        price: cleanPrice(price),
        description,
        features,
      };
    })
    .get();

  const launched = await getLaunched($);

  return {
    title,
    description: descriptionText,
    logo,
    rating,
    reviewCount,
    developer,
    languages,
    categories,
    worksWith,
    pricing,
    pricings,
    launchedDate: launched ? dayjs(launched as string).format() : null,
  };
}

export async function getAppReviews($: CheerioAPI) {
  const reviews = extractReviews($);
  const pagination = extractPaginationInfo($);
  const counts = extractCounts($);

  return {
    reviews,
    // summary: counts,
    pagination,
  };
}

// Define the structure for app items with sponsorship info
export interface CategoryApp {
  name: string;
  url: string;
  handle?: string;
  developer?: string;
  rating?: number;
  isSponsored: boolean;
  isBuiltForShopify: boolean;
  position: number;
}

export interface CategoryPaginationInfo {
  hasNextPage: boolean;
  totalPages: number;
  currentPage: number;
}

// Parse category information from Shopify category page
export async function getCategoryDetail($: CheerioAPI): Promise<{
  name: string;
  description: string;
  appCount: number;
  apps: CategoryApp[];
  pagination: CategoryPaginationInfo;
  pageType: "topic" | "secondary" | "tertiary";
}> {
  // Determine page type by checking URL structure
  const canonicalUrl = $('link[rel="canonical"]').attr("href") || "";
  const pathParts = canonicalUrl.split("/").filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1]?.split("?")[0];

  // Count hyphens to determine page type
  const hyphenCount = (lastPart?.match(/-/g) || []).length;
  let pageType: "topic" | "secondary" | "tertiary";

  if (hyphenCount <= 1) {
    pageType = "topic"; // sales-channels
  } else if (hyphenCount === 2) {
    pageType = "secondary"; // sales-channels-selling-in-person
  } else {
    pageType = "tertiary"; // sales-channels-selling-in-person-sku-and-barcodes
  }

  // Extract category name from h1 or title
  let categoryName = $("h1").first().text().trim();
  if (!categoryName) {
    categoryName =
      $("title")
        .text()
        .split("|")[0]
        ?.replace("Best", "")
        .replace("Apps For", "")
        .trim() || "";
  }

  // Extract category description
  const categoryDescription =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    "";

  // Extract app count for this category - look for the element with "X apps" text
  let appCount = 0;

  // First try to find it in the app-count element
  const appCountText =
    $("#app-count span").text().trim() ||
    $('span:contains("apps")').text().trim() ||
    $('.tw-text-body-lg:contains("apps")').text().trim();

  // Extract number from text like "230 apps"
  const countMatch = appCountText.match(/(\d+)\s+apps?/i);
  if (countMatch) {
    appCount = parseInt(countMatch[1]!);
  } else {
    // Fallback: try to extract from title or description
    const titleText = $("title").text() || "";
    const titleCountMatch = titleText.match(/(\d+)\s+apps?/i);
    if (titleCountMatch) {
      appCount = parseInt(titleCountMatch[1]!);
    }
  }

  // Extract apps and their order with sponsorship information
  const apps: CategoryApp[] = [];
  let position = 1;

  // Find all app cards
  $('[data-app-card-target="wrapper"], [data-app-card-name-value]').each(
    (_, el) => {
      const $card = $(el);

      // Extract app details from data attributes or fallback to text
      const name =
        $card.attr("data-app-card-name-value") ||
        $card.find("h3, h4, .app-name").first().text().trim();

      const url =
        $card.attr("data-app-card-app-link-value") ||
        $card.find("a").first().attr("href") ||
        "";

      // Check if this is a sponsored app
      const appLink = $card.attr("data-app-card-app-link-value") || "";
      const isSponsored =
        appLink.includes("surface_detail=category-ads") ||
        appLink.includes("ot=") ||
        $card.closest("section").find('h2:contains("Sponsored apps")').length >
          0;

      // Check if this app has Built for Shopify badge
      const isBuiltForShopify =
        $card.find(".built-for-shopify-badge").length > 0 ||
        $card.find('[class*="built-for-shopify"]').length > 0;

      if (name && url) {
        apps.push({
          name,
          url: url.startsWith("http") ? url : `https://apps.shopify.com${url}`,
          isSponsored,
          handle: url.split("/").pop()?.split("?")[0]!,
          isBuiltForShopify,
          position: position++,
        });
      }
    }
  );

  // Extract pagination information
  const pagination: CategoryPaginationInfo = {
    hasNextPage: false,
    totalPages: 1,
    currentPage: 1,
  };

  // Look for pagination controls
  const paginationContainer = $('[aria-label="pagination"]');
  if (paginationContainer.length > 0) {
    // Check for next page
    const nextLink = paginationContainer.find('a[rel="next"]');
    pagination.hasNextPage = nextLink.length > 0;

    // Extract current page from URL or pagination
    const urlParams = new URLSearchParams(canonicalUrl.split("?")[1] || "");
    pagination.currentPage = parseInt(urlParams.get("page") || "1");

    // Get total pages from pagination links
    const pageLinks = paginationContainer.find('a[aria-label*="Page"]');
    const pageNumbers: number[] = [];
    pageLinks.each((_, link) => {
      const ariaLabel = $(link).attr("aria-label") || "";
      const match = ariaLabel.match(/Page (\d+)/);
      if (match) {
        pageNumbers.push(parseInt(match[1]!));
      }
    });

    if (pageNumbers.length > 0) {
      pagination.totalPages = Math.max(...pageNumbers);
    } else if (pagination.hasNextPage) {
      pagination.totalPages = pagination.currentPage + 1;
    }
  }

  return {
    name: categoryName,
    description: categoryDescription,
    appCount,
    apps,
    pagination,
    pageType,
  };
}

// Use CategoryApp and CategoryPaginationInfo directly for search results
// to maintain consistency between category and search results

// Parse search results from Shopify search page
export async function getSearchResults(
  $: CheerioAPI,
  query: string,
  page: number = 1
): Promise<{
  query: string;
  totalCount: number;
  apps: CategoryApp[];
  pagination: CategoryPaginationInfo;
  hasResults: boolean;
}> {
  // Extract total count of apps found
  let totalCount = 0;

  // Look for count in various possible locations
  const countSelectors = [
    '[data-testid="app-count"]',
    "#app-count",
    '.tw-text-body-lg:contains("apps")',
    'span:contains("apps")',
    ".search-results-count",
  ];

  for (const selector of countSelectors) {
    const countText = $(selector).first().text().trim();
    // Handle format like "670 apps"
    const countMatch = countText.match(/(\d+(?:,\d+)*)\s*apps?/i);
    if (countMatch) {
      totalCount = parseInt(countMatch[1]!.replace(/,/g, ""));
      break;
    }
  }

  // Additional: try to find count in the title or meta description
  if (totalCount === 0) {
    const title = $("title").text();
    const titleMatch = title.match(/(\d+(?:,\d+)*)\s+apps?/i);
    if (titleMatch) {
      totalCount = parseInt(titleMatch[1]!.replace(/,/g, ""));
    }
  }

  // Extract apps from search results
  const apps: CategoryApp[] = [];
  let position = 1;

  // Find all app cards in search results
  $('[data-app-card-target="wrapper"], [data-app-card-name-value]').each(
    (_, el) => {
      const $card = $(el);

      // Extract app details
      const name =
        $card.attr("data-app-card-name-value") ||
        $card.find("h3, h4, .app-name").first().text().trim();

      const url =
        $card.attr("data-app-card-app-link-value") ||
        $card.find("a").first().attr("href") ||
        "";

      // Check if this is a sponsored app
      const appLink = $card.attr("data-app-card-app-link-value") || "";

      // Check URL parameters for sponsored indicators
      let isSponsored =
        appLink.includes("surface_type=search_ad") || // Search ads
        appLink.includes("ot=") || // Offer token
        (appLink.includes("surface_type=search") &&
          appLink.includes("surface_intra_position=1")); // First position in search

      // Check for "Ad" label in the card with specific class pattern
      isSponsored =
        isSponsored ||
        $card.find("span").filter(function () {
          const text = $(this).text().trim();
          const hasAdText = text === "Ad";
          const hasAdClass =
            $(this).hasClass("tw-border") && $(this).hasClass("tw-rounded-xl");
          return hasAdText && hasAdClass;
        }).length > 0;

      // Check if the app is in a "Best match" section with surface_intra_position=1
      if (!isSponsored && appLink.includes("surface_intra_position=1")) {
        // Check if it's the first app in the Best match section
        const parentSection = $card.closest("section");
        const hasBestMatchHeader =
          parentSection.find("h2").filter(function () {
            return $(this).text().toLowerCase().includes("best match");
          }).length > 0;

        if (hasBestMatchHeader) {
          isSponsored = true;
        }
      }

      // Check if this app has Built for Shopify badge
      const isBuiltForShopify =
        $card.find(".built-for-shopify-badge").length > 0 ||
        $card.find('[class*="built-for-shopify"]').length > 0;

      if (name && url) {
        apps.push({
          name,
          url: url.startsWith("http") ? url : `https://apps.shopify.com${url}`,
          isSponsored,
          isBuiltForShopify,
          position: position++,
        });
      }
    }
  );

  // Extract pagination information
  const pagination: CategoryPaginationInfo = {
    hasNextPage: false,
    totalPages: 1,
    currentPage: 1,
  };

  // Look for pagination controls
  const paginationContainer = $('[aria-label="pagination"]');
  if (paginationContainer.length > 0) {
    // Check for next page
    const nextLink = paginationContainer.find('a[rel="next"]');
    pagination.hasNextPage = nextLink.length > 0;

    // Extract current page from URL
    const canonicalUrl = $('link[rel="canonical"]').attr("href") || "";
    const urlParams = new URLSearchParams(canonicalUrl.split("?")[1] || "");
    // Use the provided page parameter if available, otherwise extract from URL
    pagination.currentPage =
      page > 1 ? page : parseInt(urlParams.get("page") || "1");

    // Get total pages from pagination links
    const pageLinks = paginationContainer.find('a[aria-label*="Page"]');
    const pageNumbers: number[] = [];
    pageLinks.each((_, link) => {
      const ariaLabel = $(link).attr("aria-label") || "";
      const match = ariaLabel.match(/Page (\d+)/);
      if (match) {
        pageNumbers.push(parseInt(match[1]!));
      }
    });

    if (pageNumbers.length > 0) {
      pagination.totalPages = Math.max(...pageNumbers);
    } else if (pagination.hasNextPage) {
      pagination.totalPages = pagination.currentPage + 1;
    }
  }

  // Check if there are any results (check for "no results" message)
  const hasResults =
    apps.length > 0 ||
    (!$("body").text().includes("No results") &&
      !$("body").text().includes("didn't find any") &&
      !$("body").text().includes("Try different keywords"));

  return {
    query,
    totalCount,
    apps,
    pagination,
    hasResults,
  };
}

// Parse developer information from Shopify partner page
export async function getDeveloperDetail($: CheerioAPI) {
  // Extract developer name from h1 or title
  const developerName =
    $("h1").first().text().trim() ||
    $("title").text().split("|")[0]?.trim() ||
    $('meta[property="og:title"]').attr("content")?.split("|")[0]?.trim() ||
    "";

  // Extract developer description from meta tags or content
  const developerDescription =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $(
      '.description, .developer-description, [data-test-id="developer-description"]'
    )
      .text()
      .trim() ||
    "";

  // Extract developer website from links or meta tags
  // Try to find partner pages specifically
  const developerWebsite =
    $('a[href*="partners"], a[href*="partner"]').first().attr("href")?.trim() ||
    $(".developer-link a").first().attr("href")?.trim() ||
    $('a[href*="http"]').first().attr("href")?.trim() ||
    $('link[rel="canonical"]').attr("href")?.trim() ||
    $('meta[property="og:url"]').attr("content")?.trim() ||
    $('.developer-website, [data-test-id="developer-website"]')
      .first()
      .attr("href") ||
    "";

  // Extract developer location from meta tags or content
  const developerLocation =
    $('.location, .developer-location, [data-test-id="developer-location"]')
      .first()
      .text()
      .trim() ||
    $('meta[property="business:contact_data:street_address"]')
      .attr("content")
      ?.trim() ||
    "";

  // Extract app count for this developer - look for numeric indicators
  let appCount = 0;
  const appCountText = $("title").text().match(/\d+/g)?.[0] || "0";
  appCount = parseInt(appCountText) || 0;

  // If no app count in title, look for other numeric indicators
  if (appCount === 0) {
    const bodyText = $("body").text();
    const numberMatches = bodyText.match(/\b\d+\b/g);
    if (numberMatches && numberMatches.length > 0) {
      // Look for reasonable app counts (usually 1-50)
      const potentialCounts = numberMatches.filter((n) => {
        const num = parseInt(n);
        return num > 0 && num < 100;
      });
      if (potentialCounts.length > 0) {
        appCount = parseInt(potentialCounts[0]!);
      }
    }
  }

  // Extract apps by this developer - look for app cards or links
  const apps: {
    name: string;
    url: string;
    category: string;
    rating?: number;
  }[] = [];

  // Look for app cards with various attributes
  $(
    '[data-app-card-name-value], [data-test-id*="app"], .app-card, .listing-card'
  ).each((_, el) => {
    const $card = $(el);

    // Try multiple selectors for app name
    const name =
      $card.attr("data-app-card-name-value") ||
      $card
        .find('[data-test-id="app-name"], .app-name, h3, h4, .app-title')
        .first()
        .text()
        .trim() ||
      $card.find("a").first().text().trim();

    // Try multiple selectors for app URL
    const url =
      $card.attr("data-app-card-app-link-value") ||
      $card.find("a").first().attr("href") ||
      $card.find('[data-test-id="app-link"]').first().attr("href") ||
      "";

    // Try to extract category and rating (may require visiting app detail pages)
    const category =
      $card
        .find('[data-test-id="app-category"], .app-category')
        .first()
        .text()
        .trim() ||
      $card.find(".category, [data-category]").first().text().trim() ||
      "";

    const ratingText = $card
      .find('[data-test-id="app-rating"], .app-rating, .rating')
      .first()
      .text()
      .trim();
    const rating = ratingText
      ? parseFloat(ratingText.match(/[\d.]+/)?.[0] || "0")
      : undefined;

    if (name && url) {
      // @ts-ignore
      apps.push({ name, url, category, rating });
    }
  });

  // Also look for app links that go to apps.shopify.com
  $('a[href*="apps.shopify.com"]').each((_, el) => {
    const $link = $(el);
    const url = $link.attr("href")?.trim();
    const name = $link.text().trim();

    if (name && url && !apps.some((app) => app.url === url)) {
      // @ts-ignore
      apps.push({ name, url, category: "", rating: undefined });
    }
  });

  // Extract social media links if any
  const socialLinks: { platform: string; url: string }[] = [];
  $(
    'a[href*="twitter.com"], a[href*="facebook.com"], a[href*="linkedin.com"], a[href*="instagram.com"], a[title*="social"], [data-test-id*="social"]'
  ).each((_, el) => {
    const $link = $(el);
    const href = $link.attr("href")?.trim() || "";
    const title =
      $link.attr("title")?.trim() ||
      $link.find("svg").attr("aria-label")?.trim() ||
      "";

    if (href) {
      // Determine platform from URL or title
      let platform = "";
      if (href.includes("twitter.com") || title.includes("Twitter"))
        platform = "Twitter";
      else if (href.includes("facebook.com") || title.includes("Facebook"))
        platform = "Facebook";
      else if (href.includes("linkedin.com") || title.includes("LinkedIn"))
        platform = "LinkedIn";
      else if (href.includes("instagram.com") || title.includes("Instagram"))
        platform = "Instagram";
      else platform = title || "Social";

      socialLinks.push({ platform, url: href });
    }
  });

  return {
    name: developerName,
    description: developerDescription,
    website: developerWebsite,
    location: developerLocation,
    url: developerWebsite, // Add URL field for developer page
    appCount,
    apps,
    socialLinks,
  };
}
