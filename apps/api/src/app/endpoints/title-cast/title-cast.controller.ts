import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { AdminOnly } from "../../../decorators/roles.decorator";
import { TitleCastService } from "../../../services/title-cast/title-cast.service";
import { TitleExistsPipe } from "../../../services/title/utils/title-exists.pipe";
import { SetTitleCastDto } from "./dto/request/set-title-cast.dto";
import { CastCreditResponseDto } from "./dto/response/cast-credit-response.dto";

@ApiTags("titles")
@Controller("titles")
export class TitleCastController {
  constructor(private readonly titleCastService: TitleCastService) {}

  @ApiOperation({ summary: "Get a title's cast, ordered for display" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: [CastCreditResponseDto] })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Get(":id/cast")
  findForTitle(
    @Param("id", ParseUUIDPipe, TitleExistsPipe) id: string,
  ): Promise<CastCreditResponseDto[]> {
    return this.titleCastService.findForTitle(id);
  }

  @ApiOperation({ summary: "Replace a title's cast" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: [CastCreditResponseDto] })
  @ApiNotFoundResponse({ description: "Title not found" })
  @AdminOnly()
  @Put(":id/cast")
  replaceForTitle(
    @Param("id", ParseUUIDPipe, TitleExistsPipe) id: string,
    @Body() dto: SetTitleCastDto,
  ): Promise<CastCreditResponseDto[]> {
    return this.titleCastService.replaceForTitle(id, dto.credits);
  }
}
