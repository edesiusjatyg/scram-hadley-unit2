import { PlantState, ActiveAlarm } from '../../types/plant';
import { THRESHOLDS } from './constants';

export const checkAlarms = (state: PlantState): PlantState => {
  const nextState = JSON.parse(JSON.stringify(state)) as PlantState;
  const currentTick = nextState.clock.tickCount;

  const triggerAlarm = (code: string) => {
    if (!nextState.alarms.find(a => a.code === code)) {
      nextState.alarms.push({ code, acknowledged: false, tickFired: currentTick });
      nextState.logs.push({
        tick: currentTick,
        gameTime: formatGameTime(nextState.clock.gameTimeMinutes),
        message: `ALARM: ${code}`,
        type: 'alarm'
      });
    }
  };

  const clearAlarm = (code: string) => {
    const idx = nextState.alarms.findIndex(a => a.code === code);
    if (idx !== -1) {
      nextState.alarms.splice(idx, 1);
      nextState.logs.push({
        tick: currentTick,
        gameTime: formatGameTime(nextState.clock.gameTimeMinutes),
        message: `ALARM CLEARED: ${code}`,
        type: 'routine'
      });
    }
  };

  // Check SCRAM A-01
  if (nextState.flags.scramSignalActive) triggerAlarm('A-01 SCRAM SIGNAL ACTIVE');
  else clearAlarm('A-01 SCRAM SIGNAL ACTIVE');

  // Check Level L2 A-02
  if (nextState.cooling.rpvWaterLevel <= THRESHOLDS.COOLING.LEVEL_L2) triggerAlarm('A-02 RPV LEVEL LOW-LOW (L2)');
  else clearAlarm('A-02 RPV LEVEL LOW-LOW (L2)');

  // Check High Drywell A-03
  if (nextState.cooling.drywellPressure >= THRESHOLDS.COOLING.DRYWELL_SCRAM) triggerAlarm('A-03 HIGH DRYWELL PRESSURE');
  else clearAlarm('A-03 HIGH DRYWELL PRESSURE');

  // Level L3 B-01
  if (nextState.cooling.rpvWaterLevel <= THRESHOLDS.COOLING.LEVEL_L3 && nextState.cooling.rpvWaterLevel > THRESHOLDS.COOLING.LEVEL_L2) triggerAlarm('B-01 RPV LEVEL LOW (L3)');
  else clearAlarm('B-01 RPV LEVEL LOW (L3)');

  // Feedwater Flow Low B-04
  if (nextState.secondary.feedwaterFlow < THRESHOLDS.SECONDARY.FW_FLOW_ALARM) triggerAlarm('B-04 FEEDWATER FLOW LOW');
  else clearAlarm('B-04 FEEDWATER FLOW LOW');

  // Turbine Trip B-06
  if (nextState.secondary.turbineValvePosition === 0) triggerAlarm('B-06 TURBINE TRIP');
  else clearAlarm('B-06 TURBINE TRIP');

  return nextState;
};

function formatGameTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60).toString().padStart(2, '0');
  const mins = (minutes % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}`;
}
