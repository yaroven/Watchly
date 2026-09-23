import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { JwtConfig, JwtConfigName } from "../config/jwt.config";
import { AuthService, AuthTokens } from "./auth.service";
import { Auth } from "./decorators/auth.decorator";
import { LoginRequestDto } from "./dto/request/login.dto";
import { RegistrationRequestDto } from "./dto/request/registration.dto";
import { REFRESH_COOKIE_NAME, setRefreshCookie } from "./refresh-cookie.util";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post("login")
  async login(@Body() body: LoginRequestDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(body);
    return this.respondWithSession(res, tokens);
  }

  @Post("register")
  async register(@Body() body: RegistrationRequestDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.register(body);
    return this.respondWithSession(res, tokens);
  }

  @Auth()
  @Get("me")
  async getMe(@Req() { userId }: Request) {
    return this.authService.getMe(userId);
  }

  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const refreshToken = cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) throw new UnauthorizedException("Missing refresh token");

    const tokens = await this.authService.refreshTokens(refreshToken);
    return this.respondWithSession(res, tokens);
  }

  /** Refresh token goes in the httpOnly cookie only — the JSON body never carries it. */
  private respondWithSession(res: Response, tokens: AuthTokens) {
    const { refreshExpiresIn } = this.configService.get<JwtConfig>(JwtConfigName)!;
    setRefreshCookie(res, tokens.refreshToken, refreshExpiresIn);

    return { accessToken: tokens.accessToken, userId: tokens.userId, role: tokens.role };
  }
}
