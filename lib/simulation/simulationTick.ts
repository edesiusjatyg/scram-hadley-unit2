import { PlantState } from '../../types/plant';
import { applyCascades } from './cascadeLogic';
import { applyEccsLogic } from './eccsLogic';
import { checkAlarms } from './alarmLogic';
import { applyShiftEvents } from './eventGenerator';
import { applyCrewDialogue } from '../crew/crewDialogue';
import { THRESHOLDS } from './constants';

export const simulationTick = (state: PlantState): PlantState => {
  // Deep clone to ensure we don't mutate
  let nextState = JSON.parse(JSON.stringify(state)) as PlantState;

  // 1. Advance Clock
  nextState.clock.tickCount += 1;
  nextState.clock.gameTimeMinutes = nextState.clock.tickCount; // 1 tick = 1 game minute
  
  // 2. Events & Crew
  nextState = applyShiftEvents(nextState);
  nextState = applyCrewDialogue(nextState);

  // 3. Physics & Cascades
  nextState = applyCascades(nextState);

  // 4. ECCS Auto-Actuation
  nextState = applyEccsLogic(nextState);

  // 5. Update Alarms
  nextState = checkAlarms(nextState);

  // 6. Fail conditions check
  if (
    nextState.core.fuelTemperature > THRESHOLDS.CORE.FUEL_TEMP_DAMAGE ||
    (nextState.cooling.rpvWaterLevel < THRESHOLDS.COOLING.LEVEL_UNCOVERY && !nextState.flags.rcicRunning && !nextState.flags.hpciRunning && !nextState.flags.lpciRunning && !nextState.flags.coreSprayRunning) ||
    nextState.core.reactivity > 500 ||
    nextState.cooling.suppressionPoolTemp > THRESHOLDS.COOLING.POOL_TEMP_LIMIT
  ) {
    nextState.clock.shiftPhase = 'emergency';
  } else if (nextState.flags.scramSignalActive) {
    nextState.clock.shiftPhase = 'post-scram';
  }

  return nextState;
};
