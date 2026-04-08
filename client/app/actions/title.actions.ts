"use server";

import { TitleService } from "@/app/services/title.service";
import { CreateTitleDto, UpdateTitleDto } from "@/app/types/title";
import { revalidatePath } from "next/cache";

export async function createTitleAction(dto: Omit<CreateTitleDto, "videoFile">) {
  const result = await TitleService.createTitle(dto);
  revalidatePath("/admin/titles");
  revalidatePath("/");
  return result;
}

export async function updateTitleAction(id: string, dto: UpdateTitleDto) {
  const result = await TitleService.update(id, dto);
  revalidatePath(`/admin/titles/${id}`);
  revalidatePath("/admin/titles");
  revalidatePath("/");
  return result;
}

export async function deleteTitleAction(id: string) {
  await TitleService.delete(id);
  revalidatePath("/admin/titles");
  revalidatePath("/");
}
