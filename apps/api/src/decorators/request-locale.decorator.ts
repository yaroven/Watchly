import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { Locale } from "../common/locale.const";
import { negotiateLocale } from "../common/utils/locale.util";

export const requestLocaleFactory = (_data: unknown, context: ExecutionContext): Locale =>
  negotiateLocale(context.switchToHttp().getRequest<Request>().headers["accept-language"]);

export const RequestLocale = createParamDecorator(requestLocaleFactory);
