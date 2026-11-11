"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <div className="card max-w-md mx-auto mt-10 p-7 text-center">
      <div className="text-4xl mb-3" aria-hidden="true">{offline ? "📵" : "⚠️"}</div>
      <h1 className="text-2xl font-extrabold tracking-tighter mb-1">{offline ? "Немає інтернету" : "Щось пішло не так"}</h1>
      <p className="text-muted text-[13px] mb-5">{offline ? "Цей екран не вдалося завантажити без мережі. Ваші зміни в черзі збережені." : (error.message || "Сторінка не завантажилась. Спробуйте ще раз — дані не втрачено.")}</p>
      <div className="flex gap-2 justify-center flex-wrap">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>Спробувати ще раз</button>
        <Link href="/" className="btn">На головну</Link>
      </div>
    </div>
  );
}
