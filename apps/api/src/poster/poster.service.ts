import { BadRequestException, Injectable } from "@nestjs/common";
import BucketType from "../s3/enums/bucket-type.enum";
import { S3Service } from "../s3/s3.service";

export type PosterEntityKind = "titles" | "seasons" | "artists";

const UPLOAD_URL_TTL_SECONDS = 120;

/**
 * Posters, addressed by key rather than by URL.
 *
 * The previous shape handed the client a presigned *read* URL alongside the
 * upload one and took it back on the next update, where it went into the row
 * verbatim — signature, `X-Amz-Expires=3600` and all. A stored signature is a
 * row that keeps claiming it works for an hour after it stops, and the guard
 * meant to police it compared only the URL's pathname, so the query string rode
 * along unread.
 *
 * Nothing about a poster now crosses the wire that the server does not already
 * know: the key is `posters/<kind>/<id>`, derivable from the row itself, so the
 * client's only job is to say it finished uploading — and even that is checked.
 */
@Injectable()
export class PosterService {
  constructor(private readonly s3Service: S3Service) {}

  getPosterKey(kind: PosterEntityKind, id: string): string {
    return `posters/${kind}/${id}`;
  }

  async createUploadUrl(kind: PosterEntityKind, id: string): Promise<{ uploadUrl: string }> {
    const uploadUrl = await this.s3Service.getUploadPresignedUrl(
      this.getPosterKey(kind, id),
      BucketType.PROCESSED,
      UPLOAD_URL_TTL_SECONDS,
    );

    return { uploadUrl };
  }

  /**
   * The key to store, once the object is actually there.
   *
   * Checked rather than taken on trust: "I uploaded it" is a claim by the
   * client, and accepting it unverified would point the row at nothing and
   * render a broken image for everyone.
   */
  async confirmUpload(kind: PosterEntityKind, id: string): Promise<string> {
    const key = this.getPosterKey(kind, id);

    if (!(await this.s3Service.objectExists(key, BucketType.PROCESSED))) {
      throw new BadRequestException("No uploaded image found — upload it before saving");
    }

    return key;
  }

  /** The public URL for a stored key, or null where there is no poster. */
  toPublicUrl(key: string | null | undefined): string | null {
    return key ? this.s3Service.getPublicUrl(key, BucketType.PROCESSED) : null;
  }

  async deletePoster(kind: PosterEntityKind, id: string): Promise<void> {
    await this.s3Service.deleteObject(this.getPosterKey(kind, id), BucketType.PROCESSED);
  }
}
