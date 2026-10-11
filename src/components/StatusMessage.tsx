export function StatusMessage({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="p-6 text-center text-sm text-neutral-400">
      {children}
    </p>
  );
}
