import { NotFoundException } from "@nestjs/common";

/**
 * The delegate shape this needs. `any` on the args for the same reason
 * `paginate` takes it: Prisma's generated delegate types are too precisely
 * overloaded to thread through a generic wrapper.
 */
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
