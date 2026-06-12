import { create } from 'zustand';
import { PlantState, LogEntry } from '../types/plant';
import { generateInitialState } from '../lib/simulation/initialState';
import { simulationTick } from '../lib/simulation/simulationTick';
import { parseCommand } from '../lib/parser/commandParser';
import { executeCommand } from '../lib/parser/commandExecutor';

interface GameState {
  plant: PlantState;
  isRunning: boolean;
  isGameOver: boolean;
  gameOverReason: string | null;
  startSimulation: () => void;
  pauseSimulation: () => void;
  tick: () => void;
  submitCommand: (commandStr: string) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  plant: generateInitialState(),
  isRunning: false,
  isGameOver: false,
  gameOverReason: null,

  startSimulation: () => set({ isRunning: true }),
  pauseSimulation: () => set({ isRunning: false }),

  tick: () => {
    const { plant, isRunning, isGameOver } = get();
    if (!isRunning || isGameOver) return;

    const nextPlant = simulationTick(plant);

    let gameOver = false;
    let reason = null;

    if (nextPlant.core.fuelTemperature > 500) {
      gameOver = true;
      reason = 'FUEL DAMAGE THRESHOLD EXCEEDED. CORE INTEGRITY LOST.';
    } else if (nextPlant.cooling.rpvWaterLevel < 5 && !nextPlant.flags.rcicRunning && !nextPlant.flags.hpciRunning && !nextPlant.flags.lpciRunning && !nextPlant.flags.coreSprayRunning) {
      gameOver = true;
      reason = 'CORE UNCOVERY CONFIRMED. FUEL DAMAGE IMMINENT.';
    } else if (nextPlant.core.reactivity > 500) {
      gameOver = true;
      reason = 'PROMPT CRITICALITY EVENT. SCRAM INEFFECTIVE.';
    } else if (nextPlant.cooling.suppressionPoolTemp > 90) {
      gameOver = true;
      reason = 'SUPPRESSION POOL THERMAL LIMIT EXCEEDED. CONTAINMENT FAILURE.';
    } else if (nextPlant.flags.rpsChannelFault.every(f => f === true)) {
      gameOver = true;
      reason = 'REACTOR PROTECTION SYSTEM INOPERABLE. SHUTDOWN REQUIRED.';
    }

    if (nextPlant.clock.tickCount >= 360 && !gameOver) {
      gameOver = true;
      reason = 'SHIFT COMPLETED.';
    }

    set({ plant: nextPlant, isGameOver: gameOver, gameOverReason: reason, isRunning: !gameOver });
  },

  submitCommand: (commandStr: string) => {
    set((state) => {
      const parsed = parseCommand(commandStr);
      const { nextState, response } = executeCommand(parsed, state.plant);

      const hrs = Math.floor(nextState.clock.gameTimeMinutes / 60).toString().padStart(2, '0');
      const mins = (nextState.clock.gameTimeMinutes % 60).toString().padStart(2, '0');
      const timeStr = `${hrs}:${mins}`;

      nextState.logs.push({
        tick: nextState.clock.tickCount,
        gameTime: timeStr,
        message: `> ${commandStr}`,
        type: 'command'
      });
      nextState.logs.push({
        tick: nextState.clock.tickCount,
        gameTime: timeStr,
        message: `>> ${response}`,
        type: 'command'
      });

      return { plant: nextState };
    });
  }
}));
