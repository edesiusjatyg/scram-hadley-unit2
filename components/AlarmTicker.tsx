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

  return (
    <div className="h-6 flex items-center px-2 overflow-hidden whitespace-nowrap">
      <div className="flex animate-[scroll_20s_linear_infinite]">
        {activeAlarms.map((alarm, idx) => {
          let color = 'text-[#ffaa00]';
          if (alarm.code.startsWith('A-')) color = 'text-[#ff4444] blink';
          if (alarm.code.startsWith('C-')) color = 'text-[#33ff33]';

          return (
            <span key={alarm.code} className={`mr-8 flex items-center ${color}`}>
              ⚠ {alarm.code}
            </span>
          );
        })}
      </div>
    </div>
  );
}
