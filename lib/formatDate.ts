type DateStyle = 'short' | 'long'

const dateFormats: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { year: 'numeric', month: 'short' },
  long: { year: 'numeric', month: 'long', day: 'numeric' },
}

export function formatDate(
  date: string | Date,
  style: DateStyle = 'long',
  locale = 'en-US'
): string {
  return new Intl.DateTimeFormat(locale, {
    ...dateFormats[style],
    timeZone: 'UTC',
  }).format(new Date(date))
}
