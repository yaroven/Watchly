import assertExistsUtil from "../../../common/utils/assert-exists.util";
import { PrismaService } from "../../prisma/prisma.service";

export type SeasonExistenceClient = Pick<PrismaService, "season">;

export default function assertSeasonExists(
  client: SeasonExistenceClient,
  id: string,
): Promise<void> {
  return assertExistsUtil(client.season, id, "Season");
}
