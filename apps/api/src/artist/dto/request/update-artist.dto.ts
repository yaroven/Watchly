import { CreateArtistDto } from "./create-artist.dto";

/** Full-object update: every field the client already has (from a prior GET) must be resent. */
export class UpdateArtistDto extends CreateArtistDto {}
