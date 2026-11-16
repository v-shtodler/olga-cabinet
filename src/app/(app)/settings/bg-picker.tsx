"use client";
import { useState } from "react";
import clsx from "clsx";
import type { Bg, BgStrength } from "@/app/layout";

/* Фон: a palette + how strongly it shows. Applied to <html> at once (live preview) and remembered
   in a cookie, so the server renders the same background on the next load — no flash. */
const NAMES: [Bg, string][] = [
  ["none", "Без фону"],
  ["sunrise", "Світанок"],
  ["peach", "Персик"],
  ["blossom", "Цвіт"],
  ["lavender", "Лаванда"],
  ["ocean", "Океан"],
  ["mint", "М’ята"],
  ["sand", "Пісок"],
  ["steel", "Сталь"],
];
const STRENGTHS: [BgStrength, string][] = [["soft", "Ледь"], ["medium", "Помірно"], ["vivid", "Яскраво"]];

function cookie(k: string, v: string) { document.cookie = `${k}=${v}; path=/; max-age=31536000; samesite=lax`; }

export function BgPicker({ initial, initialStrength }: { initial: Bg; initialStrength: BgStrength }) {
  const [bg, setBg] = useState<Bg>(initial);
  const [str, setStr] = useState<BgStrength>(initialStrength);

  function pickBg(v: Bg) { setBg(v); document.documentElement.setAttribute("data-bg", v); cookie("bg", v); }
  function pickStr(v: BgStrength) { setStr(v); document.documentElement.setAttribute("data-bgs", v); cookie("bgs", v); }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Кольоровий фон">
        {NAMES.map(([v, label]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={bg === v}
            onClick={() => pickBg(v)}
            className="flex flex-col items-center gap-1.5 p-1.5 rounded-[12px] cursor-pointer border-0 bg-transparent transition-colors"
            style={bg === v ? { background: "var(--fill-3)" } : undefined}
          >
            <span
              data-bg={v}
              aria-hidden="true"
              className={clsx("bgp w-full h-10 rounded-[9px]", v === "none" && "bgp-none")}
              style={{ boxShadow: bg === v ? "0 0 0 2px var(--accent)" : "inset 0 0 0 1px var(--hair)" }}
            />
            <span className="text-[11px] font-medium leading-tight" style={{ color: bg === v ? "var(--accent)" : "var(--muted)" }}>{label}</span>
          </button>
        ))}
      </div>
      <div className={clsx("flex flex-col gap-1.5", bg === "none" && "opacity-40 pointer-events-none")}>
        <span className="text-[13px] text-muted">Насиченість</span>
        <div className="seg seg-fill" role="radiogroup" aria-label="Насиченість фону">
          {STRENGTHS.map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={str === v} className={clsx(str === v && "on")} onClick={() => pickStr(v)}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
