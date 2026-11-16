import Link from "next/link";
import clsx from "clsx";
import { iso, brandColor, brandText, type ShootView } from "@/lib/domain";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

/* iOS Calendar month grid: hairline cells, today in a filled circle, every shoot a
   brand-coloured label. On a phone the labels shrink but keep the brand's name —
   two per day plus "ще N" — so a glance tells you whose day it is. */
export function MonthGrid({ cells, month, byDay, dlByDay, blocked, sel, today, dayLink }: {
  cells: Date[]; month: number;
  byDay: Map<string, ShootView[]>; dlByDay: Map<string, ShootView[]>;
  blocked: Set<string>; sel: string; today: string;
  dayLink: (d: Date) => string;
}) {
  return (
    <div className="grid grid-cols-7 gap-px rounded-[12px] overflow-hidden" style={{ background: "var(--hair)" }}>
      {WEEKDAYS.map((w) => <div key={w} className="text-[11px] sm:text-[12px] font-medium text-muted text-center py-1.5" style={{ background: "var(--glass)" }}>{w}</div>)}
      {cells.map((d) => {
        const k = iso(d); const out = d.getMonth() !== month; const ev = byDay.get(k) ?? []; const dl = dlByDay.get(k) ?? [];
        const isSel = k === sel; const isToday = k === today; const isFree = !out && ev.length === 0 && !blocked.has(k) && k >= today;
        return (
          // a cell always paints its own surface, or the grid's hairline colour shows through;
          // days of the neighbouring month only fade their contents, the way iOS does it
          <Link key={k} href={dayLink(d)} className={clsx("min-h-[74px] sm:min-h-[112px] p-[3px] sm:p-1.5 flex flex-col gap-[3px] sm:gap-1 text-left transition-colors", out && "[&>*]:opacity-40")}
            style={{ background: isSel ? "color-mix(in srgb, var(--accent) 10%, var(--glass))" : "var(--glass)" }}>
            <span className="self-center sm:self-start w-[22px] h-[22px] sm:w-[26px] sm:h-[26px] rounded-full inline-flex items-center justify-center text-[13px] sm:text-[14px] font-semibold shrink-0"
              style={isToday ? { background: "var(--accent)", color: "#fff" } : blocked.has(k) ? { background: "var(--fill-2)", color: "var(--muted)" } : isFree ? { color: "var(--good)" } : undefined}>{d.getDate()}</span>
            <span className="flex flex-col gap-[2px] sm:gap-[3px] min-w-0">
              {ev.slice(0, 3).map((s, i) => {
                const col = brandColor(s.client_hue);
                return (
                  // filled with the client's own colour — whose day it is reads from across the room
                  <span key={s.id} className={clsx("block px-[4px] sm:px-1.5 py-[1px] sm:py-[2px] rounded-[4px] sm:rounded-[5px] text-[10px] sm:text-[11px] font-semibold leading-[1.3] truncate", i > 1 && "hidden sm:block")}
                    style={{ background: col, color: brandText(col) }}>
                    {s.status === "request" ? "? " : ""}{s.client_name}
                  </span>
                );
              })}
              {dl.slice(0, 1).map((s) => <span key={"d" + s.id} className={clsx("px-[3px] sm:px-1.5 py-[1px] sm:py-[2px] rounded-[4px] sm:rounded-[5px] text-[10px] sm:text-[11px] font-semibold sm:font-medium truncate", ev.length > 1 && "hidden sm:block")} style={{ background: "var(--sun)", color: "#1c1c1e" }}>⏱ {s.client_name}</span>)}
              {ev.length > 2 && <span className="text-[10px] text-muted px-[3px] sm:hidden">ще {ev.length - 2}</span>}
              {ev.length > 3 && <span className="text-[11px] text-muted px-1.5 hidden sm:block">ще {ev.length - 3}</span>}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
