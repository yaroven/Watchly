import { Role } from "@prisma/client";

// Set by JwtAuthGuard once the JWT strategy validates the request.
declare global {
  namespace Express {
    export interface Request {
      userId?: string;
      role?: Role;
    }
  }
}

export {};
