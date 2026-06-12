'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import PlantStatusPanel from './PlantStatusPanel';
import EventLogPanel from './EventLogPanel';
import AlarmTicker from './AlarmTicker';
import CommandInput from './CommandInput';
import DebriefScreen from './DebriefScreen';

export default function GameShell() {
  const { isRunning, isGameOver, tick, plant, startSimulation, pauseSimulation } = useGameStore();

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isRunning && !isGameOver) {
      intervalId = setInterval(() => {
        tick();
      }, 1000); // 1 tick = 1 real second = 1 game minute
    }
    return () => clearInterval(intervalId);
  }, [isRunning, isGameOver, tick]);

  if (isGameOver) {
    return <DebriefScreen />;
  }

  const modeText = plant.flags.scramSignalActive ? 'SCRAM ACTIVE' : 'POWER OPERATION';
  const hrs = Math.floor(plant.clock.gameTimeMinutes / 60).toString().padStart(2, '0');
  const mins = (plant.clock.gameTimeMinutes % 60).toString().padStart(2, '0');
  const timeStr = `${hrs}${mins}`;

  return (
    <div className="flex flex-col h-screen w-full border-2 border-[#33ff33] p-1 box-border select-none">
      {/* Header */}
      <div className="flex flex-col border-b-2 border-[#33ff33] p-2 mb-2">
        <div className="flex justify-between">
          <span>HADLEY NUCLEAR STATION — UNIT 2</span>
          <span>SHIFT: {timeStr}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>RO: PLAYER     SS: WARD, E.</span>
          <span>MODE: {modeText}</span>
          <span>
            {isRunning ? (
              <span className="cursor-pointer" onClick={pauseSimulation}>[PAUSE]</span>
            ) : (
              <span className="cursor-pointer blink" onClick={startSimulation}>[START SIMULATION]</span>
            )}
          </span>
        </div>
      </div>

      {/* Main Panels */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="w-[45%] border-r-2 border-[#33ff33] pr-2 flex flex-col">
          <PlantStatusPanel />
        </div>

        {/* Right Panel */}
        <div className="w-[55%] pl-2 flex flex-col">
          <EventLogPanel />
        </div>
      </div>

      {/* Alarms */}
      <div className="border-t-2 border-[#33ff33] mt-2">
        <AlarmTicker />
      </div>

      {/* Input */}
      <div className="border-t-2 border-[#33ff33]">
        <CommandInput />
      </div>
    </div>
  );
}
