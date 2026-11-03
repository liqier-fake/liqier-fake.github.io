const base = import.meta.env.BASE_URL || '/';

export function sitePath(path: string): string {
  if (/^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith('#')) return path;
  return `${base.endsWith('/') ? base : `${base}/`}${path.replace(/^\/+/, '')}`;
}
