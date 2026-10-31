import { Episode, Prisma, Season, Title } from "@prisma/client";

export type EpisodeWithPath = Episode & { season: Season & { title: Title } };

const episodeQuery = {
  detailed: () => ({ season: { include: { title: true } } }) satisfies Prisma.EpisodeInclude,
};

export default episodeQuery;
