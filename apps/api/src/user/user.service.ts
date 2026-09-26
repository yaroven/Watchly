import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, Role, User } from "@prisma/client";
import { paginate } from "../common/pagination/paginate.util";
import { Filter, Sorting } from "../common/pagination/pagination.types";
import { buildOrderBy, buildWhere } from "../common/pagination/prisma-query.util";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/request/create-user.dto";
import { GetAllUserDto } from "./dto/request/get-all-user.dto";
import { UpdateUserDto } from "./dto/request/update-user.dto";
import { UserResponseDto } from "./dto/response/user-response.dto";
import { hashPassword, verifyPassword } from "./user.password.util";

/** Every query goes through this select so `password` never leaves the service. */
const USER_SAFE_SELECT = {
  id: true,
  email: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto): Promise<UserResponseDto> {
    const password = await hashPassword(data.password);

    try {
      const user = await this.prisma.user.create({
        data: { ...data, password, role: data.role ?? Role.USER },
        select: USER_SAFE_SELECT,
      });
      return new UserResponseDto(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(`User with email ${data.email} already exists`);
      }
      throw error;
    }
  }

  async findAll(
    { page = 1, limit = 10 }: GetAllUserDto,
    sort?: Sorting,
    filters: Filter[] = [],
  ): Promise<{ items: UserResponseDto[]; totalCount: number }> {
    const where = buildWhere(filters) as Prisma.UserWhereInput;
    const orderBy = (buildOrderBy(sort) ?? {
      createdAt: "desc",
    }) as Prisma.UserOrderByWithRelationInput;

    const { items, totalCount } = await paginate<Pick<User, "id" | "email" | "role" | "createdAt">>(
      this.prisma.user,
      {
        where,
        orderBy,
        page,
        limit,
        extra: { select: USER_SAFE_SELECT },
      },
    );

    return { items: items.map((user) => new UserResponseDto(user)), totalCount };
  }

  async findOne(id: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_SAFE_SELECT });
    return user ? new UserResponseDto(user) : null;
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({ where: { email }, select: USER_SAFE_SELECT });
    return user ? new UserResponseDto(user) : null;
  }

  async update(id: string, data: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.findOne(id);
    if (!user) throw new BadRequestException(`User with id ${id} not found`);

    const password = data.password ? await hashPassword(data.password) : undefined;

    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data: { ...data, password },
        select: USER_SAFE_SELECT,
      });
      return new UserResponseDto(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(`User with email ${data.email} already exists`);
      }
      throw error;
    }
  }

  async delete(id: string): Promise<UserResponseDto> {
    const user = await this.findOne(id);
    if (!user) throw new BadRequestException(`User with id ${id} not found`);

    const deleted = await this.prisma.user.delete({ where: { id }, select: USER_SAFE_SELECT });
    return new UserResponseDto(deleted);
  }

  async validateUser(email: string, password: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) return null;

    return new UserResponseDto(user);
  }
}
