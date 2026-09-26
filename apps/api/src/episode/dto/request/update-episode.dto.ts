import { OmitType } from "@nestjs/swagger";
import { CreateEpisodeDto } from "./create-episode.dto";

/**
 * Full-object update: every field the client already has (from a prior GET) must be resent.
 * `seasonId` is deliberately excluded — an episode doesn't move between seasons via update.
 */
export class UpdateEpisodeDto extends OmitType(CreateEpisodeDto, ["seasonId"]) {}
