// frontend/apiConfig/client.ts
import axios from "axios";
import type { AxiosResponse } from "axios";

export const api = axios.create({
  baseURL: "http://localhost:5000/api", // your backend URL
  timeout: 30_000,
  withCredentials: true, // if using cookies/sessions
});

export type ApiResult<T = unknown> = [Error, null] | [null, T];

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  fieldErrors?: FieldErrors;

  constructor(message: string, fieldErrors?: FieldErrors) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
  }
}

interface ApiErrorResponse {
  message?: unknown;
  fieldErrors?: unknown;
}

const parseFieldErrors = (value: unknown): FieldErrors | undefined => {
  if (typeof value !== "object" || value === null) return undefined;
  const result: FieldErrors = {};
  Object.entries(value).forEach(([key, messages]) => {
    if (Array.isArray(messages)) {
      result[key] = messages.filter(
        (m): m is string => typeof m === "string",
      );
    }
  });
  return result;
};

const toRequestError = (error: unknown): Error => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const responseMessage = error.response?.data?.message;
    if (typeof responseMessage === "string") {
      const fieldErrors = parseFieldErrors(error.response?.data?.fieldErrors);
      return fieldErrors
        ? new ApiError(responseMessage, fieldErrors)
        : new Error(responseMessage);
    }
    if (error.message) return new Error(error.message);
  }

  if (error instanceof Error) return error;
  return new Error("Request failed");
};

export const request = async <T>(
  operation: () => Promise<AxiosResponse<T>>,
): Promise<ApiResult<T>> => {
  try {
    const response = await operation();
    return [null, response.data];
  } catch (error) {
    return [toRequestError(error), null];
  }
};

export const mapApiResult = <TSource, TResult>(
  result: ApiResult<TSource>,
  map: (data: TSource) => TResult,
): ApiResult<TResult> => {
  if (result[0] !== null) return [result[0], null];
  const data = result[1];
  if (data === null) return [new Error("API response was empty"), null];
  return [null, map(data)];
};
