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
  msivOpen: boolean;            // Main Steam Isolation Valves
  bypassValveOpen: boolean;     // Steam Bypass to Condenser
  srvOpen: boolean[];           // Safety Relief Valves [0..7]
  adsActivated: boolean;
  
  // ECCS
  rcicRunning: boolean;
  hpciRunning: boolean;
  lpciRunning: boolean;
  coreSprayRunning: boolean;
  
  // Pumps
  recircPump: [boolean, boolean];     // [A, B]
  feedwaterPump: [boolean, boolean];  // [A, B]
  condensatePump: boolean;
  
  // Power
  offSitePowerAvailable: boolean;
  dieselGeneratorRunning: boolean;
  batteryDcAvailable: boolean;
  batteryChargePercent: number;       // 0-100%
  
  // Protection
  scramSignalActive: boolean;
  rpsChannelFault: [boolean, boolean, boolean, boolean]; // 4 RPS channels
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

export interface ShiftEventState {
  activeEvents: string[]; // IDs of active events
  eventPool: string[]; // IDs of upcoming events
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
}
