import { NotFoundException } from "@nestjs/common";

interface AssertableDelegate {
  findUnique(args: any): Promise<{ id: string } | null>;
}

export default async function assertExistsUtil(
  delegate: AssertableDelegate,
  id: string,
  label: string,
): Promise<void> {
  const row = await delegate.findUnique({ where: { id }, select: { id: true } });
  if (!row) throw new NotFoundException(`${label} with id ${id} not found`);
}
