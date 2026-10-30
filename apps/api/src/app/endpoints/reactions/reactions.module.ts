import { Module } from "@nestjs/common";
import { ReactionModule } from "../../../services/reaction/reaction.module";
import { ReactionsController } from "./reactions.controller";

@Module({
  imports: [ReactionModule],
  controllers: [ReactionsController],
})
export class ReactionsModule {}
