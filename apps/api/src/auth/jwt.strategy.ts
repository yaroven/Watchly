import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JwtConfig, JwtConfigName } from "../config/jwt.config";
import { UserService } from "../user/user.service";
import { JwtPayload } from "./interfaces/jwt-payload.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
  ) {
    const jwt = configService.get<JwtConfig>(JwtConfigName)!;
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwt.secret,
    });
  }

  /** Re-fetches the user on every request so a deleted/banned account loses access immediately, even with a still-valid token. */
  async validate(payload: JwtPayload) {
    const user = await this.userService.findOne(payload.userId);
    if (!user) throw new UnauthorizedException();

    return user;
  }
}
