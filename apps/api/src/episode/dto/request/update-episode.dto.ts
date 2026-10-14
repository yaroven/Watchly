import { OmitType } from "@nestjs/swagger";
import { CreateEpisodeDto } from "./create-episode.dto";

export class UpdateEpisodeDto extends OmitType(CreateEpisodeDto, ["seasonId"]) {}
