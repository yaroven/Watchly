import { registerAs } from "@nestjs/config";
import { DEV_DEFAULTS } from "../common/dev-defaults.const";
import { requireInProduction } from "../common/env.util";

export const JwtConfigName = "jwt";

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  /** Deliberately a different secret from `secret` — a leaked access-token secret shouldn't let an attacker mint refresh tokens too. */
  refreshSecret: string;
  refreshExpiresIn: string;
}

export default registerAs(JwtConfigName, (): JwtConfig => ({
  secret: requireInProduction(process.env.JWT_SECRET, "JWT_SECRET", DEV_DEFAULTS.JWT_SECRET),
  expiresIn: requireInProduction(
    process.env.JWT_EXPIRES_IN,
    "JWT_EXPIRES_IN",
    DEV_DEFAULTS.JWT_EXPIRES_IN,
  ),
  refreshSecret: requireInProduction(
    process.env.JWT_REFRESH_SECRET,
    "JWT_REFRESH_SECRET",
    DEV_DEFAULTS.JWT_REFRESH_SECRET,
  ),
  refreshExpiresIn: requireInProduction(
    process.env.JWT_REFRESH_EXPIRES_IN,
    "JWT_REFRESH_EXPIRES_IN",
    DEV_DEFAULTS.JWT_REFRESH_EXPIRES_IN,
  ),
}));
