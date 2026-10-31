import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../services/prisma/prisma.module";
import { UserModule } from "../../../services/user/user.module";
import { UserExistsPipe } from "../../../services/user/utils/user-exists.pipe";
import { UsersController } from "./users.controller";

@Module({
  imports: [UserModule, PrismaModule],
  controllers: [UsersController],
  providers: [UserExistsPipe],
})
export class UsersModule {}
