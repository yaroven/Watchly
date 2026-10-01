import { Role } from "@prisma/client";

// Set by JwtAuthGuard once the JWT strategy validates the request.
declare global {
  namespace Express {
    export interface Request {
      userId?: string;
      role?: Role;
      /**
       * Which question the guard on this route answered.
       *
       * `userId` alone cannot say: after a guard runs, the request carries a
       * possibly-absent string and no longer records whether a mandatory guard
       * guaranteed it or an optional one was allowed to skip it. That is exactly
       * the fact the decorator pairing is about, so the guards record it and
       * `@CurrentUserId()` can refuse an optional route by name instead of
       * failing as a generic "no viewer".
       *
       * Unset means no auth guard ran at all.
       */
      viewerScope?: "required" | "optional";
    }
  }
}

export {};
