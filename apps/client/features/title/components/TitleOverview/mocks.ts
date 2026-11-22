export interface StreamStats {
  photos: string[];
}

export interface TitleOverviewFixture {
  stream: StreamStats;
}

const DEFAULT_FIXTURE: TitleOverviewFixture = {
  stream: {
    photos: Array.from({ length: 10 }, (_, index) => `https://picsum.photos/id/${1050 + index}/400/400`),
  },
};

const OVERRIDES: Record<string, Partial<TitleOverviewFixture>> = {};

export function getTitleOverviewFixture(titleId: string): TitleOverviewFixture {
  const override = OVERRIDES[titleId];
  if (!override) return DEFAULT_FIXTURE;
  return { ...DEFAULT_FIXTURE, ...override };
}
