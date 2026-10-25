import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
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
  @ApiServiceUnavailableResponse({ description: "The vote cache is unreachable" })
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Put(":entityType/:entityId")
  async setVote(
    @Param("entityType", ReactableArcPipe) arc: ReactableArc,
    @Param("entityId", ParseUUIDPipe) entityId: string,
    @Body() { type }: ReactDto,
    @CurrentUserId() userId: string,
  ): Promise<ReactionResultDto> {
    const target = arc(entityId);
    await this.reactionService.assertSubjectExists(target);

    return this.reactionService.setVote(target, userId, type);
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
  @ApiServiceUnavailableResponse({ description: "The vote cache is unreachable" })
  @Auth()
  @Delete(":entityType/:entityId")
  async clearVote(
    @Param("entityType", ReactableArcPipe) arc: ReactableArc,
    @Param("entityId", ParseUUIDPipe) entityId: string,
    @CurrentUserId() userId: string,
  ): Promise<ReactionResultDto> {
    const target = arc(entityId);
    await this.reactionService.assertSubjectExists(target);

    return this.reactionService.clearVote(target, userId);
  }
}
