import { Body, Controller, Delete, Inject, Param, ParseUUIDPipe, Put } from "@nestjs/common";
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
import { REACTIONS, Reactions } from "./reaction.types";
import { REACTABLE_SEGMENTS, ReactableArc, ReactableArcPipe } from "./utils/reactable-arc.pipe";

@ApiTags("reactions")
@Controller("reactions")
export class ReactionController {
  constructor(@Inject(REACTIONS) private readonly reactions: Reactions) {}

  @ApiOperation({
    summary: "Set your vote on anything that can carry a reaction",
    description:
      "Absolute, not a toggle: the vote you send is the vote you end up holding, and sending the same one twice changes nothing the second time. Withdraw with DELETE. `myReaction` is exact; the counts are the subject's as of the last flush plus this call's own change, so the caller sees their own vote immediately and other viewers see it within a couple of seconds.",
  })
  @ApiParam({ name: "entityType", enum: REACTABLE_SEGMENTS })
  @ApiParam({ name: "entityId", format: "uuid" })
  @ApiOkResponse({ type: ReactionResultDto })
  @ApiBadRequestResponse({ description: "Not a kind that can carry reactions" })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Subject not found" })
  @Auth()
  @Put(":entityType/:entityId")
  async setVote(
    @Param("entityType", ReactableArcPipe) arc: ReactableArc,
    @Param("entityId", ParseUUIDPipe) entityId: string,
    @Body() { type }: ReactDto,
    @CurrentUserId() userId: string,
  ): Promise<ReactionResultDto> {
    const target = arc(entityId);
    await this.reactions.assertSubjectExists(target);

    return this.reactions.setVote(target, userId, type);
  }

  @ApiOperation({
    summary: "Withdraw your vote",
    description: "Idempotent: withdrawing a vote you do not hold is not an error.",
  })
  @ApiParam({ name: "entityType", enum: REACTABLE_SEGMENTS })
  @ApiParam({ name: "entityId", format: "uuid" })
  @ApiOkResponse({ type: ReactionResultDto })
  @ApiBadRequestResponse({ description: "Not a kind that can carry reactions" })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Subject not found" })
  @Auth()
  @Delete(":entityType/:entityId")
  async clearVote(
    @Param("entityType", ReactableArcPipe) arc: ReactableArc,
    @Param("entityId", ParseUUIDPipe) entityId: string,
    @CurrentUserId() userId: string,
  ): Promise<ReactionResultDto> {
    const target = arc(entityId);
    await this.reactions.assertSubjectExists(target);

    return this.reactions.clearVote(target, userId);
  }
}
