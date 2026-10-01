import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { S3Module } from "../s3/s3.module";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

@Module({
  imports: [PrismaModule, S3Module],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
