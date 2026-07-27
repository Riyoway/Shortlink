export interface VercelRequest {
  method?: string;
  headers: {
    authorization?: string;
    cookie?: string;
  };
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface VercelResponse {
  setHeader(name: string, value: string | string[]): void;
  status(statusCode: number): VercelResponse;
  send(body: string): void;
  redirect(statusCode: number, url: string): void;
}
