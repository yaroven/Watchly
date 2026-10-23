import { ReactionArc } from "../reaction/utils/reaction-target.const";

/**
 * Where the reconciler leaves its findings and where the api reads them. No
 * TTL: a stale number is the honest answer to "when did this last run", and
 * zeroing it on expiry would read as "nothing has drifted".
 */
export const driftKey = (arc: ReactionArc): string => `reactions:drift:${arc}`;

export const DRIFT_ARCS: ReactionArc[] = ["title", "comment"];
