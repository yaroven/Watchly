import { registerAs } from "@nestjs/config";
import { requireInProduction } from "../common/env.util";

export const OmdbConfigName = "omdb";

export interface OmdbConfig {
  apiKey: string;
  baseUrl: string;
}

export default registerAs(OmdbConfigName, () => ({
  apiKey: requireInProduction(process.env.OMDB_API_KEY, "OMDB_API_KEY", ""),
  baseUrl: process.env.OMDB_API_URL || "https://www.omdbapi.com/",
}));
