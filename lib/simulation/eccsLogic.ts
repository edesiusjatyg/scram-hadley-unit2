import { PlantState } from '../../types/plant';
import { ECCS, THRESHOLDS } from './constants';

// We need a way to track the ADS delay timer without adding it to state if we can avoid it,
// or we add a small tracker in the function. For purity, we should ideally track it in state.
// Since we don't have a specific field for adsTimer in state, let's assume it fires instantly for now
// or we could add `adsTimerTicks` to state.flags if necessary. For simplicity we will auto trigger.

export const applyEccsLogic = (state: PlantState): PlantState => {
  const nextState = JSON.parse(JSON.stringify(state)) as PlantState;

  // Level 2 triggers
  if (nextState.cooling.rpvWaterLevel <= THRESHOLDS.COOLING.LEVEL_L2) {
    if (!nextState.flags.rcicRunning && nextState.flags.batteryDcAvailable) {
      nextState.flags.rcicRunning = true;
      nextState.logs.push({
        tick: nextState.clock.tickCount,
        gameTime: formatGameTime(nextState.clock.gameTimeMinutes),
        message: 'RCIC AUTO-STARTED (LEVEL 2)',
        type: 'alarm'
      });
    }
    if (!nextState.flags.hpciRunning) {
      nextState.flags.hpciRunning = true;
      nextState.logs.push({
        tick: nextState.clock.tickCount,
        gameTime: formatGameTime(nextState.clock.gameTimeMinutes),
        message: 'HPCI AUTO-STARTED (LEVEL 2)',
        type: 'alarm'
      });
    }
  }

  // High drywell triggers HPCI
  if (nextState.cooling.drywellPressure >= THRESHOLDS.COOLING.DRYWELL_SCRAM && !nextState.flags.hpciRunning) {
    nextState.flags.hpciRunning = true;
    nextState.logs.push({
      tick: nextState.clock.tickCount,
      gameTime: formatGameTime(nextState.clock.gameTimeMinutes),
      message: 'HPCI AUTO-STARTED (HIGH DRYWELL PRESSURE)',
      type: 'alarm'
    });
  }

  // ADS Trigger
  if (nextState.cooling.rpvWaterLevel <= ECCS.ADS_TRIGGER_LEVEL && !nextState.flags.adsActivated) {
    nextState.flags.adsActivated = true;
    nextState.flags.srvOpen = nextState.flags.srvOpen.map(() => true); // ADS opens SRVs
    nextState.logs.push({
      tick: nextState.clock.tickCount,
      gameTime: formatGameTime(nextState.clock.gameTimeMinutes),
      message: 'ADS ACTUATED (LEVEL LOW-LOW)',
      type: 'alarm'
    });
  }

  // LPCI / Core Spray Trigger
  if ((nextState.flags.adsActivated || nextState.cooling.drywellPressure >= THRESHOLDS.COOLING.DRYWELL_SCRAM) && 
      nextState.cooling.rpvPressure < ECCS.LPCI_ACTIVATE_PRESSURE_MPA) {
    if (!nextState.flags.lpciRunning) {
      nextState.flags.lpciRunning = true;
      nextState.logs.push({
        tick: nextState.clock.tickCount,
        gameTime: formatGameTime(nextState.clock.gameTimeMinutes),
        message: 'LPCI AUTO-STARTED (LOW PRESSURE INJECTION)',
        type: 'alarm'
      });
    }
    if (!nextState.flags.coreSprayRunning) {
      nextState.flags.coreSprayRunning = true;
      nextState.logs.push({
        tick: nextState.clock.tickCount,
        gameTime: formatGameTime(nextState.clock.gameTimeMinutes),
        message: 'CORE SPRAY AUTO-STARTED',
        type: 'alarm'
      });
    }
  }

  return nextState;
};

function formatGameTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60).toString().padStart(2, '0');
  const mins = (minutes % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}`;
}
