export default function FocusBanner({ state }: { state: string }) {
  if (state !== "off_task") return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-2xl shadow-lg z-50">
      ⚠️ You seem off-task
    </div>
  );
}