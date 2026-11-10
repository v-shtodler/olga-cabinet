type P = { size?: number; className?: string };
const base = (size: number, sw = 2) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true });

export const Home = ({ size = 22, className }: P) => <svg {...base(size)} className={className}><path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z" /></svg>;
export const Cal = ({ size = 22, className }: P) => <svg {...base(size)} className={className}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
export const Plus = ({ size = 24, className }: P) => <svg {...base(size, 2.4)} className={className}><path d="M12 5v14M5 12h14" /></svg>;
export const Users = ({ size = 22, className }: P) => <svg {...base(size)} className={className}><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M17 11a4 4 0 0 0 0-8M22 21a7 7 0 0 0-6-6.9" /></svg>;
export const Chart = ({ size = 22, className }: P) => <svg {...base(size)} className={className}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
export const Spark = ({ size = 16, className }: P) => <svg {...base(size, 2.2)} className={className}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" /></svg>;
export const Clock = ({ size = 16, className }: P) => <svg {...base(size, 2.2)} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
export const Card = ({ size = 16, className }: P) => <svg {...base(size, 2.2)} className={className}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></svg>;
export const Flag = ({ size = 16, className }: P) => <svg {...base(size, 2.2)} className={className}><path d="M5 21V4h12l-2 4 2 4H5" /></svg>;
export const Leaf = ({ size = 16, className }: P) => <svg {...base(size, 2.2)} className={className}><path d="M4 20c0-9 6-15 16-16-1 10-7 16-16 16z" /><path d="M4 20l8-8" /></svg>;
export const Tax = ({ size = 16, className }: P) => <svg {...base(size, 2.2)} className={className}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></svg>;
export const Tag = ({ size = 16, className }: P) => <svg {...base(size, 2.2)} className={className}><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.5" /></svg>;
export const Back = ({ size = 16, className }: P) => <svg {...base(size, 2.4)} className={className}><path d="M15 6l-6 6 6 6" /></svg>;
export const Right = ({ size = 14, className }: P) => <svg {...base(size, 2.4)} className={className}><path d="M9 6l6 6-6 6" /></svg>;
export const X = ({ size = 16, className }: P) => <svg {...base(size, 2.4)} className={className}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const Gear = ({ size = 18, className }: P) => <svg {...base(size)} className={className}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>;
