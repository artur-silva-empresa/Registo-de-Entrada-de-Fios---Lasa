import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const parseCustomDate = (dateStr?: string): Date | null => {
  if (!dateStr || dateStr === '-') return null;
  const str = dateStr.trim();
  
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  }
  
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
    } else {
      let p0 = parseInt(parts[0], 10);
      let p1 = parseInt(parts[1], 10);
      let p2 = parts[2];
          
      let month = p0;
      let day = p1;
          
      if (p0 > 12) {
        day = p0;
        month = p1;
      }
          
      let year = parseInt(p2, 10);
      if (year < 100) year += 2000;
          
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month - 1, day);
      }
    }
  }
  
  const dObj = new Date(str);
  if (!isNaN(dObj.getTime())) return dObj;
  
  return null;
};

export const isPastDate = (dateStr?: string) => {
  const d = parseCustomDate(dateStr);
  if (!d) return false;
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  return d.getTime() < now.getTime();
};
