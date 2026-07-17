import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller()
export class AppController {
  @ApiOperation({ summary: "Liveness check" })
  @Get("health")
  health() {
    return "OK";
  }
}
