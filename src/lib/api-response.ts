import type { Context } from "hono";

type StatusCode = number;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    count?: number;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export function success<T>(
  c: Context,
  data?: T,
  message?: string,
  meta?: ApiResponse<T>["meta"]
) {
  const response: ApiResponse<T> = {
    success: true,
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (message !== undefined) {
    response.message = message;
  }

  if (meta) {
    response.meta = meta;
  }

  return c.json(response);
}

export function error(
  c: Context,
  errorMessage: string,
  statusCode: StatusCode = 500,
  message?: string
) {
  const response: ApiResponse = {
    success: false,
    error: errorMessage,
  };

  if (message !== undefined) {
    response.message = message;
  }
  // @ts-ignore
  return c.json(response, statusCode);
}
