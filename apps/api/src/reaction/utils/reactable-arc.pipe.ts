import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import { ReactionTarget } from "../reaction.service";

/**
 * `/reactions/titles/:id` rather than `/reactions/TITLE/:id`: the URL segment
 * is the plural the rest of the API already uses for that collection, and this
 * is where it becomes the arc the row will hang off.
 */
const ARCS: Record<string, (id: string) => ReactionTarget> = {
  titles: (titleId) => ({ titleId }),
  comments: (commentId) => ({ commentId }),
};

export const REACTABLE_SEGMENTS = Object.keys(ARCS);

export type ReactableArc = (id: string) => ReactionTarget;

@Injectable()
export class ReactableArcPipe implements PipeTransform<string, ReactableArc> {
  transform(value: string): ReactableArc {
    const arc = ARCS[value];

    if (!arc) {
      throw new BadRequestException(
        `Cannot react to "${value}" — expected one of ${REACTABLE_SEGMENTS.join(", ")}`,
      );
    }

    return arc;
  }
}
