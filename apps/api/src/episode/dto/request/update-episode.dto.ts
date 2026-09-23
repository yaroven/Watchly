import { OmitType, PartialType } from "@nestjs/swagger";
import { CreateEpisodeDto } from "./create-episode.dto";

/** `seasonId` is deliberately excluded — an episode doesn't move between seasons via update. */
export class UpdateEpisodeDto extends PartialType(OmitType(CreateEpisodeDto, ["seasonId"])) {}
