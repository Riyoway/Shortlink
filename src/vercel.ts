export interface VercelRequest {
  method?: string;
  headers: {
    authorization?: string;
  };
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(statusCode: number): VercelResponse;
  send(body: string): void;
  redirect(statusCode: number, url: string): void;
}
