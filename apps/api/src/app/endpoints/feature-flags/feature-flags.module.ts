import { Module } from "@nestjs/common";
import { FeatureFlagModule } from "../../../services/feature-flag/feature-flag.module";
import { FeatureFlagsController } from "./feature-flags.controller";

@Module({
  imports: [FeatureFlagModule],
  controllers: [FeatureFlagsController],
})
export class FeatureFlagsModule {}
