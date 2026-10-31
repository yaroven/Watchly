import { Module } from "@nestjs/common";
import { ExternalRatingsModule } from "../../../services/external-ratings/external-ratings.module";
import { ExternalRatingsController } from "./external-ratings.controller";

@Module({
  imports: [ExternalRatingsModule],
  controllers: [ExternalRatingsController],
})
export class ExternalRatingsEndpointModule {}
