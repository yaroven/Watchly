import { ApiProperty } from "@nestjs/swagger";
import { FeatureFlagSnapshot } from "../../feature-flag.const";

export class FeatureFlagsDto implements FeatureFlagSnapshot {
  @ApiProperty({ description: "Like / dislike on titles and comments" })
  reactions: boolean;

  constructor(snapshot: FeatureFlagSnapshot) {
    this.reactions = snapshot.reactions;
  }
}
