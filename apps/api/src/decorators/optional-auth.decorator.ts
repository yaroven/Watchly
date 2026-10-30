import { applyDecorators, UseGuards } from "@nestjs/common";
import { OptionalJwtAuthGuard } from "../guards/optional-jwt-auth.guard";

export const OptionalAuth = () => applyDecorators(UseGuards(OptionalJwtAuthGuard));
