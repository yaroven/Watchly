import { ReactionArc } from "../reaction/enums/reaction-arc.enum";

export const driftKey = (arc: ReactionArc): string => `reactions:drift:${arc}`;
