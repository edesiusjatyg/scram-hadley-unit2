import { PlantState } from '../../types/plant';

export const applyCrewDialogue = (state: PlantState): PlantState => {
  const nextState = JSON.parse(JSON.stringify(state)) as PlantState;
  const tick = nextState.clock.tickCount;

  const addCrewMessage = (msg: string) => {
    nextState.logs.push({
      tick,
      gameTime: formatGameTime(nextState.clock.gameTimeMinutes),
      message: `CREW: ${msg}`,
      type: 'crew'
    });
  };

  // Example generic crew dialogues based on time or conditions
  if (tick === 30) {
    addCrewMessage('SS WARD — "RO, verify control rod pattern is stable."');
  }

  if (tick === 65 && !nextState.flags.feedwaterPump[1]) {
    addCrewMessage('ARO — "Feedwater pump B trip confirmed. Should we start the backup or reduce power?"');
  }

  if (nextState.flags.scramSignalActive && tick % 15 === 0) {
    addCrewMessage('SS WARD — "RO, verify all rods are fully inserted. Monitor RPV level carefully."');
  }

  if (!nextState.flags.offSitePowerAvailable && !nextState.flags.dieselGeneratorRunning && tick % 10 === 0) {
    addCrewMessage('ARO — "Diesel generators still not running. We are draining battery DC."');
  }

  // Check unacknowledged Priority A alarms
  const unackA = nextState.alarms.find(a => !a.acknowledged && a.code.startsWith('A-'));
  if (unackA && tick > unackA.tickFired + 5 && tick % 5 === 0) {
    addCrewMessage(`SS WARD — "RO, acknowledge alarm ${unackA.code}!"`);
  }

  return nextState;
};

function formatGameTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60).toString().padStart(2, '0');
  const mins = (minutes % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}`;
}
