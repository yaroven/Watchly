import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import { ReactionArc } from "../enums/reaction-arc.enum";
import { arcOfSegment, REACTABLE_SEGMENTS } from "./reaction-target.const";

@Injectable()
export class ReactableArcPipe implements PipeTransform<string, ReactionArc> {
  transform(value: string): ReactionArc {
    const arc = arcOfSegment(value);

    if (!arc) {
      throw new BadRequestException(
        `Cannot react to "${value}" — expected one of ${REACTABLE_SEGMENTS.join(", ")}`,
      );
    }

    return arc;
  }
}
