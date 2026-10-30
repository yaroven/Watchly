import assertExistsUtil from "../../../common/utils/assert-exists.util";
import { PrismaService } from "../../prisma/prisma.service";

export type TitleExistenceClient = Pick<PrismaService, "title">;

export default function assertTitleExists(client: TitleExistenceClient, id: string): Promise<void> {
  return assertExistsUtil(client.title, id, "Title");
}
