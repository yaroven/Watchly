const titleRatingKeys = {
  all: () => ["title-rating"] as const,
  detail: (titleId: string) => [...titleRatingKeys.all(), titleId] as const,
};

export default titleRatingKeys;
