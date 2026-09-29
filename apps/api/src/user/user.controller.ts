import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { AdminOnly } from "../auth/decorators/roles.decorator";
import { FilteringParams } from "../common/pagination/filtering-params.decorator";
import { Filter, Sorting } from "../common/pagination/pagination.types";
import { SortingParams } from "../common/pagination/sorting-params.decorator";
import { PaginatedResponseOf } from "../common/utils/paginated-response-of.util";
import { GetAllUserDto } from "./dto/request/get-all-user.dto";
import { UpdateUserRoleDto } from "./dto/request/update-user-role.dto";
import { UserResponseDto } from "./dto/response/user-response.dto";
import { UserService } from "./user.service";

@ApiTags("users")
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({
    summary: "List users with filter, sort, and pagination",
    description:
      "`filter` (repeatable): `property:rule:value`. Filterable: email, role. `sort`: `property:direction`. Sortable: email, createdAt.",
  })
  @ApiOkResponse({ type: PaginatedResponseOf(UserResponseDto) })
  @AdminOnly()
  @Get()
  findAll(
    @Query() query: GetAllUserDto,
    @SortingParams(["email", "createdAt"]) sort?: Sorting,
    @FilteringParams(["email", "role"]) filters?: Filter[],
  ) {
    return this.userService.findAll(query, sort, filters);
  }

  @ApiOperation({ summary: "Get a user by id" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: "User not found" })
  @AdminOnly()
  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const user = await this.userService.findOne(id);
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    return user;
  }

  @ApiOperation({ summary: "Change a user's role" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: "User not found" })
  @AdminOnly()
  @Patch(":id/role")
  updateRole(@Param("id", ParseUUIDPipe) id: string, @Body() data: UpdateUserRoleDto) {
    return this.userService.update(id, data);
  }
}
