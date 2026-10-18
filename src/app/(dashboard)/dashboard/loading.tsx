export default function DashboardLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement du tableau de bord"
      className="animate-pulse space-y-8"
    >
      <div className="space-y-3">
        <div className="h-8 w-56 rounded bg-gray-200" />
        <div className="h-4 w-72 max-w-full rounded bg-gray-100" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-lg border bg-white p-6">
            <div className="h-4 w-28 rounded bg-gray-100" />
            <div className="mt-4 h-8 w-16 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      <div className="space-y-5 rounded-lg border bg-white p-6">
        <div className="h-6 w-44 rounded bg-gray-200" />
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-10 rounded bg-gray-100" />
        ))}
      </div>
    </div>
  );
}