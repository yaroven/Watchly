import { Controller, Get, Req } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { OptionalAuth } from "../auth/decorators/optional-auth.decorator";
import { FeatureFlagsDto } from "./dto/response/feature-flags.dto";
import { FeatureFlagService } from "./feature-flag.service";
import { viewerContextOf } from "./viewer-context.util";

@ApiTags("feature-flags")
@Controller("feature-flags")
export class FeatureFlagController {
  constructor(private readonly featureFlags: FeatureFlagService) {}

  @ApiOperation({
    summary: "Which features this viewer gets",
    description:
      "Public. The api is the only source of truth for flags: the client renders what this says and never decides on its own. Signed-in callers get flags resolved for them, so a flag rolled out to some users answers differently per caller; anonymous callers get the global value.",
  })
  @ApiOkResponse({ type: FeatureFlagsDto })
  @OptionalAuth()
  @Get()
  async getAll(@Req() request: Request): Promise<FeatureFlagsDto> {
    return new FeatureFlagsDto(await this.featureFlags.snapshotFor(viewerContextOf(request)));
  }
}
