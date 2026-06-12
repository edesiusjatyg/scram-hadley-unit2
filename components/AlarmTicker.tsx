'use client';

import { useGameStore } from '../store/gameStore';

export default function AlarmTicker() {
  const { plant } = useGameStore();

  const activeAlarms = plant.alarms.filter(a => !a.acknowledged);

  if (activeAlarms.length === 0) {
    return (
      <div className="h-6 flex items-center px-2 text-[#1a7a1a]">
        NO ACTIVE ALARMS
      </div>
    );
  }

  const formatCountdown = (ticks: number) => {
    const mins = Math.floor(ticks / 60).toString().padStart(2, '0');
    const secs = (ticks % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="h-6 flex items-center px-2 overflow-hidden whitespace-nowrap">
      <div className="flex animate-[scroll_20s_linear_infinite]">
        {activeAlarms.map((alarm, idx) => {
          let color = 'text-[#ffaa00]';
          if (alarm.code.startsWith('A-')) color = 'text-[#ff4444] blink';
          if (alarm.code.startsWith('C-')) color = 'text-[#33ff33]';

          // Find if this alarm has an associated countdown
          const cd = plant.events.countdowns.find(c => c.alarmCode === alarm.code);

          return (
            <span key={`${alarm.code}-${idx}`} className={`mr-8 flex items-center ${color}`}>
              ⚠ {alarm.code}
              {cd && ` — ${cd.failState} IN ${formatCountdown(cd.ticksRemaining)}`}
            </span>
          );
        })}
      </div>
    </div>
  );
}
