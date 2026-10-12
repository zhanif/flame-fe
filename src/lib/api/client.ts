export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Same-origin call to flame-be. The session lives in an httpOnly cookie, so
 *  there is no token handling here — only the `{ data }` / `{ error }` envelope. */
export async function apiCall<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      json?.error?.code ?? 'UNKNOWN',
      json?.error?.message ?? 'The request failed',
    );
  }
  return json.data as T;
}
