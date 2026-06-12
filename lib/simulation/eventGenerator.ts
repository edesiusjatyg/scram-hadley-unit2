import { PlantState } from '../../types/plant';
import { THRESHOLDS } from './constants';

export interface ShiftEvent {
  id: string;
  triggerTick: number;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  announcementText: string;
  alarmsToTrigger: string[];
  countdown?: number; // ticks
  countdownFailState?: string;
  countdownAlarmCode?: string;
  stateChanges: (state: PlantState) => PlantState;
}

const EVENT_POOL: ShiftEvent[] = [
  {
    id: 'FW-PUMP-B-TRIP',
    triggerTick: 60,
    severity: 'minor',
    announcementText: 'FEEDWATER PUMP B HAS TRIPPED.',
    alarmsToTrigger: ['B-04 FEEDWATER FLOW LOW', 'B-05 FW PUMP TRIP'],
    countdown: 240, // 4 mins
    countdownFailState: 'CORE LEVEL L2',
    countdownAlarmCode: 'B-04 FEEDWATER FLOW LOW',
    stateChanges: (state) => {
      const next = JSON.parse(JSON.stringify(state)) as PlantState;
      next.flags.feedwaterPump[1] = false;
      return next;
    }
  },
  {
    id: 'CONDENSER-VAC-LOSS',
    triggerTick: 150,
    severity: 'moderate',
    announcementText: 'CONDENSER VACUUM DEGRADING. PRESSURE RISING.',
    alarmsToTrigger: ['B-07 CONDENSER VACUUM LOSS'],
    countdown: 150, // 2:30 mins
    countdownFailState: 'TURBINE TRIP',
    countdownAlarmCode: 'B-07 CONDENSER VACUUM LOSS',
    stateChanges: (state) => {
      const next = JSON.parse(JSON.stringify(state)) as PlantState;
      next.secondary.condenserVacuum = 84;
      next.secondary.condenserPressure = 26;
      return next;
    }
  },
  {
    id: 'TURBINE-TRIP', // E.g., if triggered directly
    triggerTick: 180,
    severity: 'major',
    announcementText: 'GRID DISTURBANCE DETECTED. TURBINE TRIP.',
    alarmsToTrigger: [
      'B-06 TURBINE TRIP — OVERSPEED',
      'B-02 RPV PRESSURE HIGH',
      'A-01 MSIV CLOSURE — SCRAM SIGNAL'
    ],
    countdown: 90, // 1:30 mins
    countdownFailState: 'PRESSURE EXCURSION',
    countdownAlarmCode: 'B-02 RPV PRESSURE HIGH',
    stateChanges: (state) => {
      const next = JSON.parse(JSON.stringify(state)) as PlantState;
      next.secondary.turbineValvePosition = 0;
      next.flags.scramSignalActive = true;
      next.flags.msivOpen = false;
      return next;
    }
  },
  {
    id: 'SBO',
    triggerTick: 200,
    severity: 'critical',
    announcementText: 'LOSS OF OFFSITE POWER DETECTED.',
    alarmsToTrigger: ['A-04 LOSS OF OFFSITE POWER', 'C-04 DIESEL START SIGNAL'],
    countdown: 480, // 8 mins
    countdownFailState: 'BATTERY DEPLETION',
    countdownAlarmCode: 'A-04 LOSS OF OFFSITE POWER',
    stateChanges: (state) => {
      const next = JSON.parse(JSON.stringify(state)) as PlantState;
      next.flags.offSitePowerAvailable = false;
      return next;
    }
  },
  {
    id: 'INSTRUMENT-FAILURE-LEVEL',
    triggerTick: 100,
    severity: 'minor',
    announcementText: 'INSTRUMENT FAULT DETECTED.',
    alarmsToTrigger: ['C-05 INSTRUMENT FAULT — RPV LEVEL NARROW RANGE'],
    stateChanges: (state) => {
      const next = JSON.parse(JSON.stringify(state)) as PlantState;
      next.instruments.rpvWaterLevel.failureMode = 'missing';
      next.instruments.rpvWaterLevel.failedAtTick = next.clock.tickCount;
      return next;
    }
  }
];

export const generateShiftEvents = (): string[] => {
  return ['FW-PUMP-B-TRIP', 'INSTRUMENT-FAILURE-LEVEL', 'CONDENSER-VAC-LOSS', 'SBO'];
};

export const applyShiftEvents = (state: PlantState): PlantState => {
  let nextState = JSON.parse(JSON.stringify(state)) as PlantState;
  
  if (!nextState.events) {
    nextState.events = { activeEvents: [], eventPool: generateShiftEvents(), countdowns: [] };
  }

  const currentTick = nextState.clock.tickCount;

  // Process event pool
  const remainingEvents = [...nextState.events.eventPool];
  for (const eventId of nextState.events.eventPool) {
    const eventDef = EVENT_POOL.find(e => e.id === eventId);
    if (eventDef && currentTick === eventDef.triggerTick) {
      // Fire the event
      nextState = eventDef.stateChanges(nextState);
      
      // Remove from pool, add to active
      remainingEvents.splice(remainingEvents.indexOf(eventId), 1);
      nextState.events.activeEvents.push(eventId);
      
      // Trigger alarms cascade
      eventDef.alarmsToTrigger.forEach(code => {
        if (!nextState.alarms.find(a => a.code === code)) {
          nextState.alarms.push({ code, acknowledged: false, tickFired: currentTick });
        }
      });

      // Add countdown if exists
      if (eventDef.countdown && eventDef.countdownFailState && eventDef.countdownAlarmCode) {
        nextState.events.countdowns.push({
          eventId: eventDef.id,
          ticksRemaining: eventDef.countdown,
          failState: eventDef.countdownFailState,
          alarmCode: eventDef.countdownAlarmCode
        });
      }

      // Log event
      nextState.logs.push({
        tick: currentTick,
        gameTime: formatGameTime(nextState.clock.gameTimeMinutes),
        message: `EVENT: ${eventDef.announcementText}`,
        type: 'alarm'
      });
    }
  }
  nextState.events.eventPool = remainingEvents;

  // Process countdowns
  const activeCountdowns = [...nextState.events.countdowns];
  for (let i = activeCountdowns.length - 1; i >= 0; i--) {
    const cd = activeCountdowns[i];
    cd.ticksRemaining -= 1;
    if (cd.ticksRemaining <= 0) {
      // Fail state reached
      nextState.logs.push({
        tick: currentTick,
        gameTime: formatGameTime(nextState.clock.gameTimeMinutes),
        message: `CRITICAL TIMER EXPIRED: ${cd.failState}`,
        type: 'alarm'
      });
      // In a real implementation, we'd trigger the fail state logic here if not already handled by physics.
      activeCountdowns.splice(i, 1);
    }
  }
  nextState.events.countdowns = activeCountdowns;

  return nextState;
};

function formatGameTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60).toString().padStart(2, '0');
  const mins = (minutes % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}`;
}
