"use client";
export function CsvButton({ csv, filename }: { csv: string; filename: string }) {
  function download() {
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }
  return <button type="button" className="btn" onClick={download}>Експорт CSV</button>;
}
