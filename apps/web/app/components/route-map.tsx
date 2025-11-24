'use client';

import { RouteStop } from '../data/routes';

type Props = { stops: RouteStop[]; caption?: string };

export function RouteMap({ stops, caption }: Props) {
  return (
    <div className="route-map" aria-label="Route preview sketch">
      {stops.map((stop, index) => {
        if (index === 0) return null;
        const prev = stops[index - 1];
        const dx = stop.position.x - prev.position.x;
        const dy = stop.position.y - prev.position.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <div
            key={`${prev.id}-${stop.id}-line`}
            className="route-line"
            style={{
              left: `${prev.position.x}%`,
              top: `${prev.position.y}%`,
              width: `${length}%`,
              transform: `rotate(${angle}deg)`
            }}
          />
        );
      })}
      {stops.map((stop, index) => (
        <div
          key={stop.id}
          className={`route-node ${stop.dropType === '@house' ? 'house' : 'mailbox'} ${index === 0 ? 'origin' : ''}`}
          style={{ left: `${stop.position.x}%`, top: `${stop.position.y}%` }}
          title={`${stop.label} — ${stop.address}`}
        />
      ))}
      {caption ? (
        <div style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 13, color: '#425466' }}>{caption}</div>
      ) : null}
    </div>
  );
}
