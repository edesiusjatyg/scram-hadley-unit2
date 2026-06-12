'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

export default function EventLogPanel() {
  const { plant } = useGameStore();
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [plant.logs]);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto whitespace-pre pr-2 break-all">
      {plant.logs.map((log, idx) => {
        let colorClass = 'text-[#33ff33]'; // routine
        if (log.type === 'alarm') colorClass = 'text-[#ffaa00]';
        if (log.message.includes('ALARM: A-')) colorClass = 'text-[#ff4444] blink';
        if (log.type === 'command') colorClass = 'text-[#33ff33]';

        return (
          <div key={`${log.tick}-${idx}`} className={`mb-1 ${colorClass}`}>
            [{log.gameTime}] {log.message}
          </div>
        );
      })}
      <div ref={logEndRef} />
    </div>
  );
}
