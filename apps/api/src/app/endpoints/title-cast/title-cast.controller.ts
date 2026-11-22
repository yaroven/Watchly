import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseInterceptors } from "@nestjs/common";
import {
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { type Locale } from "../../../common/locale.const";
import { VaryAcceptLanguageInterceptor } from "../../../common/utils/vary-accept-language.interceptor";
import { RequestLocale } from "../../../decorators/request-locale.decorator";
import { AdminOnly } from "../../../decorators/roles.decorator";
import { TitleCastService } from "../../../services/title-cast/title-cast.service";
import { TitleExistsPipe } from "../../../services/title/utils/title-exists.pipe";
import { SetTitleCastDto } from "./dto/request/set-title-cast.dto";
import { CastCreditResponseDto } from "./dto/response/cast-credit-response.dto";

@ApiTags("titles")
@ApiHeader({
  name: "Accept-Language",
  required: false,
  description:
    "Language of character names in the cast read (en, uk); English when absent or unsupported. " +
    "A cast save always answers in English.",
})
@UseInterceptors(VaryAcceptLanguageInterceptor)
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
    @RequestLocale() locale: Locale,
  ): Promise<CastCreditResponseDto[]> {
    return this.titleCastService.findForTitle(id, locale);
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
