import { ExecutionContext } from "@nestjs/common";
import { EvaluationContext } from "@openfeature/server-sdk";
import type { Request } from "express";

export function viewerContextOf(request: Pick<Request, "userId" | "role">): EvaluationContext {
  if (!request.userId) return {};

  return {
    targetingKey: request.userId,
    ...(request.role ? { role: request.role } : {}),
  };
}

export const viewerContextFactory = (context: ExecutionContext): EvaluationContext =>
  viewerContextOf(context.switchToHttp().getRequest<Request>());
