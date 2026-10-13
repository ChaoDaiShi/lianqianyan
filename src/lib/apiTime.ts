/** The API stores naive UTC; browser-generated timestamps already include Z. */
export function parseApiInstant(value: string): Date {
  const instant = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;
  return new Date(instant);
}

export function formatApiTime(value: string, options?: Intl.DateTimeFormatOptions): string {
  return parseApiInstant(value).toLocaleString('zh-CN', options);
}
