/* Instant skeleton while a screen's data loads — shows on the first frame after a tap, before the server answers. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Завантаження" className="animate-pulse">
      <div className="h-9 w-56 rounded-xl bg-glass-2 mb-5 mt-1" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-3.5">{[0, 1, 2, 3].map((i) => <div key={i} className="card h-[92px]" />)}</div>
      <div className="flex flex-wrap gap-3.5"><div className="card flex-[999_1_560px] h-[320px]" /><div className="card flex-[1_1_300px] h-[320px]" /></div>
    </div>
  );
}
