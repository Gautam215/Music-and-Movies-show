export type DiscoveryDateWindow = {
  start: string;
  end: string;
};

type HypeSignals = {
  popularity?: number;
  vote_average?: number;
  vote_count?: number;
};

function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getFeaturedDateWindow(now = new Date()): DiscoveryDateWindow {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() + 30);
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + 60);
  return { start: formatUtcDate(start), end: formatUtcDate(end) };
}

export function getCurrentMonthDateWindow(
  now = new Date(),
): DiscoveryDateWindow {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { start: formatUtcDate(start), end: formatUtcDate(now) };
}

export function getHypeScore({
  popularity = 0,
  vote_average = 0,
  vote_count = 0,
}: HypeSignals) {
  return popularity + vote_average * 2 + Math.log10(vote_count + 1) * 3;
}
