export type FetchMethod = "fetch" | "cf-browser" | "external-service";

export interface BrowserFetchOptions {
  url: string;
  body?: string;
  headers?: Record<string, string>;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  userAgent?: string;
  fetchMethod?: FetchMethod;
  timeout?: number;
}

export interface BrowserFetchResult {
  html: string;
  status: number;
  headers: Record<string, string>;
  method: FetchMethod;
}

export const browserFetch = async (
  options: BrowserFetchOptions
): Promise<BrowserFetchResult> => {
  const {
    url,
    body,
    headers = {},
    method = "GET",
    userAgent: customUserAgent,
    fetchMethod = "fetch",
    timeout = 30000,
  } = options;

  // Use provided user agent or generate a random one
  const finalUserAgent = customUserAgent || "";

  // Prepare headers with User-Agent
  const finalHeaders = {
    "User-Agent": finalUserAgent,
    ...headers,
  };

  return await performStandardFetch(url, method, finalHeaders, body, timeout);
};

async function performStandardFetch(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | undefined,
  timeout: number
): Promise<BrowserFetchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const init: RequestInit = {
      method,
      headers,
      body: body === undefined ? null : (body as BodyInit),
      signal: controller.signal,
    };

    const response = await fetch(url, init);

    clearTimeout(timeoutId);

    const html = await response.text();
    const responseHeaders: Record<string, string> = {};

    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      html,
      status: response.status,
      headers: responseHeaders,
      method: "fetch",
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw new Error(
      `Fetch failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Helper function to generate random user agents
export const getRandomUserAgent = (): string => {
  return "";
};

// Helper function to get user agent for specific browser/device
export const getUserAgentForDevice = (
  device: "desktop" | "mobile" | "tablet"
): string => {
  // const ua = new UserAgent({ deviceCategory: device });
  return "";
};
