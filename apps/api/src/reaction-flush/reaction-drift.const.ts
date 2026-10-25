import { ReactionArc } from "../reaction/utils/reaction-target.const";

export const driftKey = (arc: ReactionArc): string => `reactions:drift:${arc}`;
