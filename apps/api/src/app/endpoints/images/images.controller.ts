import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Auth } from "../../../decorators/auth.decorator";
import { CurrentUserId } from "../../../decorators/current-user-id.decorator";
import { AdminOnly } from "../../../decorators/roles.decorator";
import { ArtistExistsPipe } from "../../../services/artist/utils/artist-exists.pipe";
import { ImageKind } from "../../../services/image/enums/image-kind.enum";
import { SeasonExistsPipe } from "../../../services/season/utils/season-exists.pipe";
import { TitleExistsPipe } from "../../../services/title/utils/title-exists.pipe";
import { CompleteImageUploadDto } from "./dto/request/complete-image-upload.dto";
import { CreateImageUploadUrlDto } from "./dto/request/create-image-upload-url.dto";
import { ImageUploadUrlDto } from "./dto/response/image-upload-url.dto";
import { ImagesService } from "./images.service";

const UPLOAD_DESCRIPTION =
  "PUT the image to the returned URL with the same Content-Type, then POST its rawKey to `upload-url/complete`. Processing is asynchronous: the image appears on its owner once the worker has converted it, so re-read the owner rather than assuming it is immediate.";

const COMPLETE_DESCRIPTION =
  "Call after the PUT has succeeded. Checks the rawKey was issued for this owner and kind and that the object is in the bucket, then queues the conversion. Calling it twice queues one conversion.";

const UPLOAD_THROTTLE = { default: { limit: 3, ttl: 60000 } };

@ApiTags("titles")
@Controller("titles/:id/poster")
export class TitlePosterController {
  constructor(private readonly images: ImagesService) {}

  @ApiOperation({
    summary: "Get a URL to upload the title's poster to",
    description: UPLOAD_DESCRIPTION,
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: ImageUploadUrlDto })
  @ApiBadRequestResponse({ description: "Not an image type the worker converts" })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiForbiddenResponse({ description: "Not an admin" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @Throttle(UPLOAD_THROTTLE)
  @AdminOnly()
  @HttpCode(HttpStatus.OK)
  @Post("upload-url")
  createUploadUrl(
    @Param("id", ParseUUIDPipe, TitleExistsPipe) id: string,
    @Body() data: CreateImageUploadUrlDto,
  ): Promise<ImageUploadUrlDto> {
    return this.images.createUploadUrl(ImageKind.TITLE_POSTER, id, data);
  }

  @ApiOperation({
    summary: "Queue the conversion of an uploaded image",
    description: COMPLETE_DESCRIPTION,
  })
  @ApiNoContentResponse({ description: "Conversion queued" })
  @ApiBadRequestResponse({
    description: "The rawKey is not this owner's, or nothing was uploaded to it",
  })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Owner not found" })
  @ApiForbiddenResponse({ description: "Not an admin" })
  @Throttle(UPLOAD_THROTTLE)
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("upload-url/complete")
  completeUpload(
    @Param("id", ParseUUIDPipe, TitleExistsPipe) id: string,
    @Body() { rawKey }: CompleteImageUploadDto,
  ): Promise<void> {
    return this.images.completeUpload(ImageKind.TITLE_POSTER, id, rawKey);
  }

  @ApiOperation({ summary: "Remove the title's poster" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiForbiddenResponse({ description: "Not an admin" })
  @ApiNotFoundResponse({ description: "Title not found" })
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete()
  remove(@Param("id", ParseUUIDPipe, TitleExistsPipe) id: string): Promise<void> {
    return this.images.remove(ImageKind.TITLE_POSTER, id);
  }
}

@ApiTags("seasons")
@Controller("seasons/:id/poster")
export class SeasonPosterController {
  constructor(private readonly images: ImagesService) {}

  @ApiOperation({
    summary: "Get a URL to upload the season's poster to",
    description: UPLOAD_DESCRIPTION,
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: ImageUploadUrlDto })
  @ApiBadRequestResponse({ description: "Not an image type the worker converts" })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiForbiddenResponse({ description: "Not an admin" })
  @ApiNotFoundResponse({ description: "Season not found" })
  @Throttle(UPLOAD_THROTTLE)
  @AdminOnly()
  @HttpCode(HttpStatus.OK)
  @Post("upload-url")
  createUploadUrl(
    @Param("id", ParseUUIDPipe, SeasonExistsPipe) id: string,
    @Body() data: CreateImageUploadUrlDto,
  ): Promise<ImageUploadUrlDto> {
    return this.images.createUploadUrl(ImageKind.SEASON_POSTER, id, data);
  }

  @ApiOperation({
    summary: "Queue the conversion of an uploaded image",
    description: COMPLETE_DESCRIPTION,
  })
  @ApiNoContentResponse({ description: "Conversion queued" })
  @ApiBadRequestResponse({
    description: "The rawKey is not this owner's, or nothing was uploaded to it",
  })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Owner not found" })
  @ApiForbiddenResponse({ description: "Not an admin" })
  @Throttle(UPLOAD_THROTTLE)
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("upload-url/complete")
  completeUpload(
    @Param("id", ParseUUIDPipe, SeasonExistsPipe) id: string,
    @Body() { rawKey }: CompleteImageUploadDto,
  ): Promise<void> {
    return this.images.completeUpload(ImageKind.SEASON_POSTER, id, rawKey);
  }

  @ApiOperation({ summary: "Remove the season's poster" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiForbiddenResponse({ description: "Not an admin" })
  @ApiNotFoundResponse({ description: "Season not found" })
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete()
  remove(@Param("id", ParseUUIDPipe, SeasonExistsPipe) id: string): Promise<void> {
    return this.images.remove(ImageKind.SEASON_POSTER, id);
  }
}

@ApiTags("artists")
@Controller("artists/:id/photo")
export class ArtistPhotoController {
  constructor(private readonly images: ImagesService) {}

  @ApiOperation({
    summary: "Get a URL to upload the artist's photo to",
    description: UPLOAD_DESCRIPTION,
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: ImageUploadUrlDto })
  @ApiBadRequestResponse({ description: "Not an image type the worker converts" })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiForbiddenResponse({ description: "Not an admin" })
  @ApiNotFoundResponse({ description: "Artist not found" })
  @Throttle(UPLOAD_THROTTLE)
  @AdminOnly()
  @HttpCode(HttpStatus.OK)
  @Post("upload-url")
  createUploadUrl(
    @Param("id", ParseUUIDPipe, ArtistExistsPipe) id: string,
    @Body() data: CreateImageUploadUrlDto,
  ): Promise<ImageUploadUrlDto> {
    return this.images.createUploadUrl(ImageKind.ARTIST_PHOTO, id, data);
  }

  @ApiOperation({
    summary: "Queue the conversion of an uploaded image",
    description: COMPLETE_DESCRIPTION,
  })
  @ApiNoContentResponse({ description: "Conversion queued" })
  @ApiBadRequestResponse({
    description: "The rawKey is not this owner's, or nothing was uploaded to it",
  })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiNotFoundResponse({ description: "Owner not found" })
  @ApiForbiddenResponse({ description: "Not an admin" })
  @Throttle(UPLOAD_THROTTLE)
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("upload-url/complete")
  completeUpload(
    @Param("id", ParseUUIDPipe, ArtistExistsPipe) id: string,
    @Body() { rawKey }: CompleteImageUploadDto,
  ): Promise<void> {
    return this.images.completeUpload(ImageKind.ARTIST_PHOTO, id, rawKey);
  }

  @ApiOperation({ summary: "Remove the artist's photo" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @ApiForbiddenResponse({ description: "Not an admin" })
  @ApiNotFoundResponse({ description: "Artist not found" })
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete()
  remove(@Param("id", ParseUUIDPipe, ArtistExistsPipe) id: string): Promise<void> {
    return this.images.remove(ImageKind.ARTIST_PHOTO, id);
  }
}

@ApiTags("users")
@Controller("users/me/avatar")
export class UserAvatarController {
  constructor(private readonly images: ImagesService) {}

  @ApiOperation({ summary: "Get a URL to upload your avatar to", description: UPLOAD_DESCRIPTION })
  @ApiOkResponse({ type: ImageUploadUrlDto })
  @ApiBadRequestResponse({ description: "Not an image type the worker converts" })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @Throttle(UPLOAD_THROTTLE)
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Post("upload-url")
  createUploadUrl(
    @Body() data: CreateImageUploadUrlDto,
    @CurrentUserId() userId: string,
  ): Promise<ImageUploadUrlDto> {
    return this.images.createUploadUrl(ImageKind.USER_AVATAR, userId, data);
  }

  @ApiOperation({
    summary: "Queue the conversion of an uploaded image",
    description: COMPLETE_DESCRIPTION,
  })
  @ApiNoContentResponse({ description: "Conversion queued" })
  @ApiBadRequestResponse({
    description: "The rawKey is not this owner's, or nothing was uploaded to it",
  })
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @Throttle(UPLOAD_THROTTLE)
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("upload-url/complete")
  completeUpload(
    @Body() { rawKey }: CompleteImageUploadDto,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    return this.images.completeUpload(ImageKind.USER_AVATAR, userId, rawKey);
  }

  @ApiOperation({ summary: "Remove your avatar" })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: "Not signed in" })
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete()
  remove(@CurrentUserId() userId: string): Promise<void> {
    return this.images.remove(ImageKind.USER_AVATAR, userId);
  }
}
