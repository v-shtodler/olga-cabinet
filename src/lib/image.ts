/* Shared client-side image helper: crop a picked file to a square and re-encode it small
   enough to live in one text column (data: URL, no storage bucket, works offline). */
export const AVATAR_SIZE = 192; // enough for a 2× 96pt avatar
const MAX = 170_000;            // chars of data: URL — the server rejects above 180 000

export async function toSquareDataUrl(file: File, size = AVATAR_SIZE): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Браузер не дав обробити зображення.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  for (const [type, q] of [["image/webp", 0.82], ["image/jpeg", 0.82]] as const) {
    const url = canvas.toDataURL(type, q);
    if (url.startsWith(`data:${type}`) && url.length <= MAX) return url;
  }
  throw new Error("Не вдалося стиснути фото — спробуйте інше.");
}
