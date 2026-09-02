export type HttpRequest = {
  headers: Record<string, string | string[] | undefined>;
  ip: string;
  path: string;
  route?: { path?: string };
};

type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  path?: string;
  maxAge?: number;
};

export type HttpResponse = {
  cookie(name: string, value: string, options?: CookieOptions): void;
  clearCookie(name: string, options?: CookieOptions): void;
};
