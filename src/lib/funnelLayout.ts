export function funnelStepWidth(index: number, total: number): number {
  if (total <= 1) return 100;
  const taper = 14;
  return Math.max(48, 100 - index * taper);
}
