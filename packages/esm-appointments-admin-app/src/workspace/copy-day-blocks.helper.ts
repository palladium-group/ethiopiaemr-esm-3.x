import type { AvailabilityBlockFormValue } from '../types';

export type CopyDayBlocksMode = 'replace' | 'append';

export function copyDayBlocksToDays(
  blocks: Array<AvailabilityBlockFormValue>,
  sourceDay: string,
  targetDays: Array<string>,
  mode: CopyDayBlocksMode,
): Array<AvailabilityBlockFormValue> {
  const sourceBlocks = blocks.filter((block) => block.dayOfWeek === sourceDay && !block.voided);

  if (sourceBlocks.length === 0 || targetDays.length === 0) {
    return blocks;
  }

  const targetDaySet = new Set(targetDays);
  let nextBlocks = [...blocks];

  if (mode === 'replace') {
    nextBlocks = nextBlocks
      .map((block) => {
        if (!targetDaySet.has(block.dayOfWeek) || block.voided) {
          return block;
        }

        if (block.uuid) {
          return { ...block, voided: true };
        }

        return null;
      })
      .filter((block): block is AvailabilityBlockFormValue => block !== null);
  }

  const copies = targetDays.flatMap((targetDay) =>
    sourceBlocks.map((sourceBlock) => ({
      clientId: crypto.randomUUID(),
      dayOfWeek: targetDay,
      startTime: sourceBlock.startTime,
      endTime: sourceBlock.endTime,
      maxAppointmentsLimit: sourceBlock.maxAppointmentsLimit,
      voided: false,
    })),
  );

  return [...nextBlocks, ...copies];
}
