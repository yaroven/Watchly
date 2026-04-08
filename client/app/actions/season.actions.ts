"use server";

import { SeasonService } from "@/app/services/season.service";
import { CreateSeasonDto, UpdateSeasonDto } from "@/app/types/season";
import { revalidatePath } from "next/cache";

export async function createSeasonAction(dto: CreateSeasonDto) {
  const result = await SeasonService.create(dto);
  revalidatePath(`/admin/titles/${dto.titleId}`);
  return result;
}

export async function updateSeasonAction(id: string, titleId: string, dto: UpdateSeasonDto) {
  const result = await SeasonService.update(id, dto);
  revalidatePath(`/admin/titles/${titleId}`);
  return result;
}

export async function deleteSeasonAction(id: string, titleId: string) {
  await SeasonService.delete(id);
  revalidatePath(`/admin/titles/${titleId}`);
}
