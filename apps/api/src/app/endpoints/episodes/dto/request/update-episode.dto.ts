import { OmitType } from "@nestjs/swagger";
import { EpisodeUpdate } from "../../../../../services/episode/episode.types";
import { CreateEpisodeDto } from "./create-episode.dto";

export class UpdateEpisodeDto
  extends OmitType(CreateEpisodeDto, ["seasonId"])
  implements EpisodeUpdate {}
