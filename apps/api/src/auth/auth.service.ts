import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { Role } from "@prisma/client";
import { JwtConfig, JwtConfigName } from "../config/jwt.config";
import { UserResponseDto } from "../user/dto/response/user-response.dto";
import { UserService } from "../user/user.service";
import { LoginRequestDto } from "./dto/request/login.dto";
import { RegistrationRequestDto } from "./dto/request/registration.dto";
import { JwtPayload } from "./interfaces/jwt-payload.interface";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: Role;
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login({ email, password }: LoginRequestDto): Promise<AuthTokens> {
    const user = await this.userService.validateUser(email, password);
    if (!user) throw new BadRequestException("Invalid email or password");

    return this.issueTokens({ userId: user.id, role: user.role });
  }

  /** Creates the account and signs the user straight in — same response shape as `login`. */
  async register({ email, password }: RegistrationRequestDto): Promise<AuthTokens> {
    const existing = await this.userService.findByEmail(email);
    if (existing) throw new ConflictException("User with this email already exists");

    const user = await this.userService.create({ email, password, role: Role.USER });
    return this.issueTokens({ userId: user.id, role: user.role });
  }

  async getMe(userId: string | undefined): Promise<UserResponseDto | null> {
    if (!userId) throw new UnauthorizedException("Unauthorized access");
    const user = await this.userService.findOne(userId);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const { refreshSecret } = this.configService.get<JwtConfig>(JwtConfigName)!;

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const user = await this.userService.findOne(payload.userId);
    if (!user) throw new UnauthorizedException("User no longer exists");

    return this.issueTokens({ userId: user.id, role: user.role });
  }

  private issueTokens(payload: JwtPayload): AuthTokens {
    const { refreshSecret, refreshExpiresIn } = this.configService.get<JwtConfig>(JwtConfigName)!;

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn as JwtSignOptions["expiresIn"],
      }),
      userId: payload.userId,
      role: payload.role,
    };
  }
}
