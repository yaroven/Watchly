import { Module } from "@nestjs/common";
import { ImageModule } from "../image/image.module";
import { PrismaModule } from "../prisma/prisma.module";
import { UserService } from "./user.service";

@Module({
  imports: [PrismaModule, ImageModule],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
