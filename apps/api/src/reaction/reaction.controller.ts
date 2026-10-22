import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { ReactDto } from "./dto/request/react.dto";
import { ReactionResultDto } from "./dto/response/reaction-result.dto";
import { ReactionService } from "./reaction.service";
import { REACTABLE_SEGMENTS, ReactableArc, ReactableArcPipe } from "./utils/reactable-arc.pipe";

@ApiTags("reactions")
@Controller("reactions")
export class ReactionController {
  constructor(private readonly reactionService: ReactionService) {}

  @ApiOperation({
    summary: "Like or dislike anything that can carry a reaction",
    description:
      "Sending the vote you already cast withdraws it; the other one switches sides. The counts in the response are the subject's own, recomputed by this call.",
  })
  @ApiParam({ name: "entityType", enum: REACTABLE_SEGMENTS })
  @ApiParam({ name: "entityId", format: "uuid" })
  @ApiOkResponse({ type: ReactionResultDto })
  @ApiBadRequestResponse({ description: "Not a kind that can carry reactions" })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Subject not found" })
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Post(":entityType/:entityId")
  async react(
    @Param("entityType", ReactableArcPipe) arc: ReactableArc,
    @Param("entityId", ParseUUIDPipe) entityId: string,
    @Body() { type }: ReactDto,
    @CurrentUserId() userId: string,
  ): Promise<ReactionResultDto> {
    const target = arc(entityId);
    await this.reactionService.assertSubjectExists(target);

    return this.reactionService.vote(target, userId, type);
  }

  @ApiOperation({ summary: "Withdraw your vote" })
  @ApiParam({ name: "entityType", enum: REACTABLE_SEGMENTS })
  @ApiParam({ name: "entityId", format: "uuid" })
  @ApiOkResponse({ type: ReactionResultDto })
  @ApiBadRequestResponse({ description: "Not a kind that can carry reactions" })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Subject not found" })
  @Auth()
  @Delete(":entityType/:entityId")
  async removeReaction(
    @Param("entityType", ReactableArcPipe) arc: ReactableArc,
    @Param("entityId", ParseUUIDPipe) entityId: string,
    @CurrentUserId() userId: string,
  ): Promise<ReactionResultDto> {
    const target = arc(entityId);
    await this.reactionService.assertSubjectExists(target);

    return this.reactionService.unvote(target, userId);
  }
}
