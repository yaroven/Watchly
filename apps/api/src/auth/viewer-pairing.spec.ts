import { Type } from "@nestjs/common";
import { GUARDS_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  currentUserIdFactory,
  optionalUserIdFactory,
} from "./decorators/current-user-id.decorator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "./guards/optional-jwt-auth.guard";

/**
 * The pairing rule, checked against every route there is.
 *
 * `@CurrentUserId()` is typed `string` but delivers whatever the guard left on
 * the request, so on an `@OptionalAuth()` route it 500s every anonymous caller.
 * The inverse — `@OptionalUserId()` behind `@Auth()` — is merely redundant, which
 * is what makes the rule easy to forget: only one direction bites.
 *
 * Until now the rule was pinned by four supertest specs, leaving eleven routes
 * covered by attention alone. This walks the route metadata instead, so a route
 * added tomorrow is covered the moment its file lands — including one whose
 * module is never registered in a test.
 */

// This spec loads every controller file, which reaches `external-ratings` and
// through it `@nestjs/schedule` — ESM-only, and nothing transforms node_modules.
// Only the decorator is needed here, and only so the import resolves.
jest.mock("@nestjs/schedule", () => ({ Cron: () => () => undefined, CronExpression: {} }));

const SRC_ROOT = path.join(__dirname, "..");

function findControllerFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return findControllerFiles(full);
    return entry.endsWith(".controller.ts") && !entry.endsWith(".spec.ts") ? [full] : [];
  });
}

function loadControllers(): Type<unknown>[] {
  return findControllerFiles(SRC_ROOT).flatMap((file) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
    const exported = require(file) as Record<string, unknown>;
    return Object.values(exported).filter(
      (value): value is Type<unknown> =>
        typeof value === "function" && Reflect.hasMetadata(PATH_METADATA, value),
    );
  });
}

type ViewerScope = "required" | "optional" | "none";

interface RouteUnderTest {
  label: string;
  scope: ViewerScope;
  usesCurrentUserId: boolean;
  usesOptionalUserId: boolean;
}

function guardsOf(controller: Type<unknown>, method: string): unknown[] {
  const onClass: unknown[] = (Reflect.getMetadata(GUARDS_METADATA, controller) as unknown[]) ?? [];
  const handler = (controller.prototype as Record<string, object>)[method];
  const onMethod: unknown[] = (Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[]) ?? [];
  return [...onClass, ...onMethod];
}

function scopeOf(guards: unknown[]): ViewerScope {
  // Checked in this order on purpose: @AdminOnly() stacks RolesGuard on top of
  // JwtAuthGuard, and no route carries both the mandatory and the optional guard.
  if (guards.includes(OptionalJwtAuthGuard)) return "optional";
  if (guards.includes(JwtAuthGuard)) return "required";
  return "none";
}

function paramFactories(controller: Type<unknown>, method: string): unknown[] {
  const args =
    (Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, method) as Record<
      string,
      { factory?: unknown }
    >) ?? {};
  return Object.values(args).map((arg) => arg.factory);
}

function collectRoutes(): RouteUnderTest[] {
  return loadControllers().flatMap((controller) => {
    const prototype = controller.prototype as Record<string, unknown>;
    return Object.getOwnPropertyNames(prototype)
      .filter((method) => method !== "constructor")
      .filter((method) => Reflect.hasMetadata(PATH_METADATA, prototype[method] as object))
      .map((method) => {
        const factories = paramFactories(controller, method);
        return {
          label: `${controller.name}.${method}`,
          scope: scopeOf(guardsOf(controller, method)),
          usesCurrentUserId: factories.includes(currentUserIdFactory),
          usesOptionalUserId: factories.includes(optionalUserIdFactory),
        };
      });
  });
}

describe("viewer decorator pairing", () => {
  const routes = collectRoutes();

  it("finds the routes at all — a silent empty list would pass everything below", () => {
    expect(routes.length).toBeGreaterThan(30);
    expect(routes.filter((route) => route.usesCurrentUserId).length).toBeGreaterThan(5);
    expect(routes.filter((route) => route.usesOptionalUserId).length).toBeGreaterThan(3);
  });

  it.each(["AuthController.getMe", "UserAvatarController.createUploadUrl"])(
    "covers %s, which has no request-level spec of its own",
    (label) => {
      expect(routes.map((route) => route.label)).toContain(label);
    },
  );

  it("never puts @CurrentUserId() on a route that allows anonymous callers", () => {
    const offenders = routes
      .filter((route) => route.usesCurrentUserId && route.scope !== "required")
      .map((route) => `${route.label} (guard scope: ${route.scope})`);

    expect(offenders).toEqual([]);
  });

  it("never puts @OptionalUserId() on a route that already guarantees a viewer", () => {
    const offenders = routes
      .filter((route) => route.usesOptionalUserId && route.scope !== "optional")
      .map((route) => `${route.label} (guard scope: ${route.scope})`);

    expect(offenders).toEqual([]);
  });

  it("never reads a viewer on a route with no auth guard at all", () => {
    const offenders = routes
      .filter((route) => route.scope === "none")
      .filter((route) => route.usesCurrentUserId || route.usesOptionalUserId)
      .map((route) => route.label);

    expect(offenders).toEqual([]);
  });
});
