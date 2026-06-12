export interface SimClock {
  tickCount: number;          // 0-360
  gameTimeMinutes: number;    // 0-360 (shift start = 0)
  shiftPhase: 'normal' | 'degraded' | 'emergency' | 'post-scram';
}

export interface ReactorCore {
  rodPosition: number;        // % withdrawn (0-100)
  neutronFlux: number;        // % rated power
  thermalPower: number;       // MWt
  reactivity: number;         // pcm
  xenonConcentration: number; // % suppression
  fuelTemperature: number;    // °C
}

export interface PrimaryCooling {
  rpvWaterLevel: number;      // % (wide range)
  rpvPressure: number;        // MPa
  recircPumpSpeed: [number, number]; // % rated (per pump, 2 pumps)
  coreFlowRate: number;       // % rated
  drywellPressure: number;    // kPa
  suppressionPoolTemp: number;// °C
}

export interface SecondaryLoop {
  turbineSpeed: number;       // rpm
  turbineValvePosition: number; // % open
  feedwaterFlow: number;      // kg/s
  feedwaterPressure: number;  // MPa
  condenserPressure: number;  // mbar
  condenserVacuum: number;    // %
  mainSteamFlow: number;      // kg/s
  bypassValvePosition: number;// % open
}

export interface SystemFlags {
  // Valves
  msivOpen: boolean;            
  bypassValveOpen: boolean;     
  srvOpen: boolean[];           
  adsActivated: boolean;
  
  // ECCS
  rcicRunning: boolean;
  hpciRunning: boolean;
  lpciRunning: boolean;
  coreSprayRunning: boolean;
  
  // Pumps
  recircPump: [boolean, boolean];     
  feedwaterPump: [boolean, boolean];  
  condensatePump: boolean;
  
  // Power
  offSitePowerAvailable: boolean;
  dieselGeneratorRunning: boolean;
  batteryDcAvailable: boolean;
  batteryChargePercent: number;       
  
  // Protection
  scramSignalActive: boolean;
  rpsChannelFault: [boolean, boolean, boolean, boolean]; 
}

export interface ActiveAlarm {
  code: string;
  acknowledged: boolean;
  tickFired: number;
}

export interface LogEntry {
  tick: number;
  gameTime: string;
  message: string;
  type: 'routine' | 'alarm' | 'crew' | 'command';
}

export interface ActiveCountdown {
  eventId: string;
  ticksRemaining: number;
  failState: string;
  alarmCode: string;
}

export interface ShiftEventState {
  activeEvents: string[]; // IDs of active events
  eventPool: string[]; // IDs of upcoming events
  countdowns: ActiveCountdown[];
}

export type InstrumentFailureMode = 'frozen' | 'zero' | 'noise' | 'offscale' | 'missing';

export interface InstrumentState {
  parameterId: string;
  failureMode: InstrumentFailureMode | null;
  failedAtTick: number | null;
  displayValue: number | string;
  trueValue: number;
}

export interface EquipmentHealth {
  id: string;
  healthPercent: number;
  degradationRate: number;
  failureProbability: number;
  breakerTripped: boolean;
  targetSetpoint?: number;
  currentValue?: number;
  ramping: boolean;
}

export interface PlantState {
  clock: SimClock;
  core: ReactorCore;
  cooling: PrimaryCooling;
  secondary: SecondaryLoop;
  flags: SystemFlags;
  alarms: ActiveAlarm[];
  logs: LogEntry[];
  events: ShiftEventState;
  instruments: Record<string, InstrumentState>;
  equipment: Record<string, EquipmentHealth>;
  difficulty: 'TRAINING' | 'NORMAL' | 'SENIOR RO' | 'INCIDENT';
  activeProcedure?: string;
  pendingAroCommand?: {
    command: string;
    executeAtTick: number;
  };
}
