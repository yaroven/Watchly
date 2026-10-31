import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { setLogRoot } from "../../common/utils/log-root.util";

@Injectable()
export class LogRootService {
  constructor(logger: PinoLogger) {
    setLogRoot(logger.logger);
  }
}
