import { Injectable } from "@nestjs/common";
import BucketType from "../s3/enums/bucket-type.enum";
import { assertManagedPosterUrl } from "../s3/poster-assertion.util";
import { S3Service } from "../s3/s3.service";

export type PosterEntityKind = "titles" | "seasons";

@Injectable()
export class PosterService {
  constructor(private readonly s3Service: S3Service) {}

  getPosterKey(kind: PosterEntityKind, id: string): string {
    return `posters/${kind}/${id}`;
  }

  async assertManagedPosterUrl(
    kind: PosterEntityKind,
    id: string,
    posterUrl: string,
    defaultPosterUrl?: string,
  ): Promise<void> {
    await assertManagedPosterUrl(
      this.s3Service,
      this.getPosterKey(kind, id),
      posterUrl,
      defaultPosterUrl,
    );
  }

  async createUploadUrl(
    kind: PosterEntityKind,
    id: string,
  ): Promise<{ uploadUrl: string; posterUrl: string }> {
    const key = this.getPosterKey(kind, id);
    const uploadUrl = await this.s3Service.getUploadPresignedUrl(key, BucketType.PROCESSED, 120);
    const posterUrl = await this.s3Service.getReadPresignedUrl(key, BucketType.PROCESSED);

    return { uploadUrl, posterUrl };
  }

  async deletePoster(kind: PosterEntityKind, id: string): Promise<void> {
    await this.s3Service.deleteObject(this.getPosterKey(kind, id), BucketType.PROCESSED);
  }
}
