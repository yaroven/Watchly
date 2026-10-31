import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Role, User } from "@prisma/client";
import { paginate } from "../../common/pagination/paginate.util";
import { Filter, PageQuery, Sorting } from "../../common/pagination/pagination.types";
import { buildOrderBy, buildWhere } from "../../common/pagination/prisma-query.util";
import { Logged } from "../../decorators/logged.decorator";
import { ImageService } from "../image/image.service";
import { PrismaService } from "../prisma/prisma.service";
import { toUserView } from "./user.mapper";
import { UserInput, UserUpdate, UserView } from "./user.types";
import { hashPassword, verifyPassword } from "./utils/password.util";

const USER_SAFE_SELECT = {
  id: true,
  email: true,
  role: true,
  createdAt: true,
  displayName: true,
  avatarKey: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageService: ImageService,
  ) {}

  private toView(user: Omit<User, "password">): UserView {
    return toUserView(user, this.imageService.toPublicUrl(user.avatarKey));
  }

  @Logged()
  async create(data: UserInput): Promise<UserView> {
    const password = await hashPassword(data.password);

    try {
      const user = await this.prisma.user.create({
        data: { ...data, password, role: data.role ?? Role.USER },
        select: USER_SAFE_SELECT,
      });
      return this.toView(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(`User with email ${data.email} already exists`);
      }
      throw error;
    }
  }

  @Logged()
  async findAll(
    { page = 1, limit = 10 }: PageQuery,
    sort?: Sorting,
    filters: Filter[] = [],
  ): Promise<{ items: UserView[]; totalCount: number }> {
    const where = buildWhere(filters) as Prisma.UserWhereInput;
    const orderBy = (buildOrderBy(sort) ?? {
      createdAt: "desc",
    }) as Prisma.UserOrderByWithRelationInput;

    const { items, totalCount } = await paginate<Omit<User, "password">>(this.prisma.user, {
      where,
      orderBy,
      page,
      limit,
      extra: { select: USER_SAFE_SELECT },
    });

    return { items: items.map((user) => this.toView(user)), totalCount };
  }

  @Logged()
  async findOne(id: string): Promise<UserView | null> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_SAFE_SELECT });
    return user ? this.toView(user) : null;
  }

  @Logged()
  async findByEmail(email: string): Promise<UserView | null> {
    const user = await this.prisma.user.findUnique({ where: { email }, select: USER_SAFE_SELECT });
    return user ? this.toView(user) : null;
  }

  @Logged()
  async update(id: string, data: UserUpdate): Promise<UserView> {
    const password = data.password ? await hashPassword(data.password) : undefined;

    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data: { ...data, password },
        select: USER_SAFE_SELECT,
      });
      return this.toView(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(`User with email ${data.email} already exists`);
      }
      throw error;
    }
  }

  @Logged()
  async delete(id: string): Promise<UserView> {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException(`User with id ${id} not found`);

    const deleted = await this.prisma.user.delete({ where: { id }, select: USER_SAFE_SELECT });
    return this.toView(deleted);
  }

  @Logged({ data: (email: string) => ({ email }) })
  async validateUser(email: string, password: string): Promise<UserView | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) return null;

    return this.toView(user);
  }
}
