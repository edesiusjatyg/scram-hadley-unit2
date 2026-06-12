import { PlantState, ShiftEventState } from '../../types/plant';
import { THRESHOLDS } from './constants';

export interface ShiftEvent {
  id: string;
  triggerTick: number;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  announcementText: string;
  alarmCode: string;
  stateChanges: (state: PlantState) => PlantState;
}

const EVENT_POOL: ShiftEvent[] = [
  {
    id: 'FW-PUMP-B-TRIP',
    triggerTick: 60,
    severity: 'minor',
    announcementText: 'FEEDWATER PUMP B HAS TRIPPED.',
    alarmCode: 'B-04 FEEDWATER FLOW LOW',
    stateChanges: (state) => {
      const next = JSON.parse(JSON.stringify(state)) as PlantState;
      next.flags.feedwaterPump[1] = false;
      return next;
    }
  },
  {
    id: 'RECIRC-A-RUNBACK',
    triggerTick: 120,
    severity: 'minor',
    announcementText: 'RECIRC PUMP A SPEED DEVIATION DETECTED.',
    alarmCode: 'B-05 RECIRC PUMP TRIP',
    stateChanges: (state) => {
      const next = JSON.parse(JSON.stringify(state)) as PlantState;
      next.cooling.recircPumpSpeed[0] = 60;
      return next;
    }
  },
  {
    id: 'CONDENSER-VAC-LOSS',
    triggerTick: 150,
    severity: 'moderate',
    announcementText: 'CONDENSER VACUUM DEGRADING. PRESSURE RISING.',
    alarmCode: 'B-07 CONDENSER VACUUM LOSS',
    stateChanges: (state) => {
      const next = JSON.parse(JSON.stringify(state)) as PlantState;
      next.secondary.condenserVacuum = 84;
      next.secondary.condenserPressure = 26;
      return next;
    }
  },
  {
    id: 'TURBINE-TRIP',
    triggerTick: 180,
    severity: 'major',
    announcementText: 'GRID DISTURBANCE DETECTED. TURBINE TRIP.',
    alarmCode: 'B-06 TURBINE TRIP',
    stateChanges: (state) => {
      const next = JSON.parse(JSON.stringify(state)) as PlantState;
      next.secondary.turbineValvePosition = 0;
      return next;
    }
  },
  {
    id: 'SBO',
    triggerTick: 200,
    severity: 'critical',
    announcementText: 'LOSS OF OFFSITE POWER DETECTED.',
    alarmCode: 'A-04 LOSS OF OFFSITE POWER',
    stateChanges: (state) => {
      const next = JSON.parse(JSON.stringify(state)) as PlantState;
      next.flags.offSitePowerAvailable = false;
      return next;
    }
  },
  {
    id: 'LOCA-SMALL',
    triggerTick: 240,
    severity: 'critical',
    announcementText: 'HIGH DRYWELL PRESSURE INDICATED. POSSIBLE SMALL BREAK LOCA.',
    alarmCode: 'A-03 HIGH DRYWELL PRESSURE',
    stateChanges: (state) => {
      const next = JSON.parse(JSON.stringify(state)) as PlantState;
      next.cooling.drywellPressure = 15;
      return next;
    }
  },
  {
    id: 'RPS-CHANNEL-FAULT',
    triggerTick: 45,
    severity: 'minor',
    announcementText: 'RPS CHANNEL B SPURIOUS FAULT.',
    alarmCode: 'C-01 RPS CHANNEL FAULT',
    stateChanges: (state) => {
      const next = JSON.parse(JSON.stringify(state)) as PlantState;
      next.flags.rpsChannelFault[1] = true;
      return next;
    }
  }
];

export const generateShiftEvents = (): string[] => {
  // A typical shift selects 3-5 events
  // For simplicity, we just return a static list of 3 events for a "normal" difficulty
  return ['FW-PUMP-B-TRIP', 'CONDENSER-VAC-LOSS', 'SBO'];
};

export const applyShiftEvents = (state: PlantState): PlantState => {
  let nextState = JSON.parse(JSON.stringify(state)) as PlantState;
  
  if (!nextState.events) {
    nextState.events = { activeEvents: [], eventPool: generateShiftEvents() };
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
  return nextState;
};

function formatGameTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60).toString().padStart(2, '0');
  const mins = (minutes % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}`;
}
