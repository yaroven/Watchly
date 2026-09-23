import { CreateGenreDto } from "./create-genre.dto";

/** Full-object update: every field the client already has (from a prior GET) must be resent. */
export class UpdateGenreDto extends CreateGenreDto {}
