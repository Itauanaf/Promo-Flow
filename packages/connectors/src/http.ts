export interface HttpClientOptions { maxAttempts?: number; baseDelayMs?: number; fetchImpl?: typeof fetch; }

export class ResilientHttpClient {
  private readonly maxAttempts: number; private readonly baseDelayMs: number; private readonly fetchImpl: typeof fetch;
  constructor(options: HttpClientOptions = {}) { this.maxAttempts = options.maxAttempts ?? 3; this.baseDelayMs = options.baseDelayMs ?? 300; this.fetchImpl = options.fetchImpl ?? fetch; }
  async request(url: string, init?: RequestInit): Promise<Response> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const response = await this.fetchImpl(url, init);
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === this.maxAttempts) return response;
      const retryAfter = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : this.baseDelayMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 100);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    throw new Error("Retry loop exited unexpectedly");
  }
}
