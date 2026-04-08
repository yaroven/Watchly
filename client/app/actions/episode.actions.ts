"use server";

import { EpisodeService } from "@/app/services/episode.service";
import { CreateEpisodeDto, UpdateEpisodeDto } from "@/app/types/episode";
import { revalidatePath } from "next/cache";

export async function createEpisodeAction(
  titleId: string,
  dto: Omit<CreateEpisodeDto, "videoFile">,
) {
  const result = await EpisodeService.create(dto);
  revalidatePath(`/admin/titles/${titleId}`);
  return result;
}

export async function updateEpisodeAction(titleId: string, id: string, dto: UpdateEpisodeDto) {
  const result = await EpisodeService.update(id, dto);
  revalidatePath(`/admin/titles/${titleId}`);
  return result;
}

export async function deleteEpisodeAction(titleId: string, id: string) {
  await EpisodeService.delete(id);
  revalidatePath(`/admin/titles/${titleId}`);
}
