import assertExistsUtil from "../../../common/utils/assert-exists.util";
import { PrismaService } from "../../prisma/prisma.service";

export type UserExistenceClient = Pick<PrismaService, "user">;

export default function assertUserExists(client: UserExistenceClient, id: string): Promise<void> {
  return assertExistsUtil(client.user, id, "User");
}
