export function NetflixBadge({ onNetflix }: { onNetflix: boolean }) {
  return onNetflix ? (
    <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Na Netflix</span>
  ) : (
    <span className="rounded bg-neutral-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-neutral-100">Fora da Netflix</span>
  );
}
