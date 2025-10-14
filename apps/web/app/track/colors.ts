export const palette = [
  '#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#7c3aed', '#0ea5e9', '#10b981', '#f43f5e', '#a855f7', '#22c55e'
];
export function colorForRoute(routeId){
  if (!routeId) return '#475569';
  let h = 0; for (let i=0;i<routeId.length;i++) h = (h*31 + routeId.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}