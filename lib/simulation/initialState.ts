import { PlantState } from '../../types/plant';
import { PHYSICS } from './constants';

export const generateInitialState = (): PlantState => ({
  clock: {
    tickCount: 0,
    gameTimeMinutes: 0,
    shiftPhase: 'normal',
  },
  core: {
    rodPosition: 48,
    neutronFlux: 100.0,
    thermalPower: PHYSICS.RATED_POWER_MWT,
    reactivity: 0,
    xenonConcentration: PHYSICS.XENON_EQUILIBRIUM,
    fuelTemperature: 304,
  },
  cooling: {
    rpvWaterLevel: 63,
    rpvPressure: 7.21,
    recircPumpSpeed: [100, 100],
    coreFlowRate: 100,
    drywellPressure: 1.2,
    suppressionPoolTemp: 25,
  },
  secondary: {
    turbineSpeed: 3600,
    turbineValvePosition: 100,
    feedwaterFlow: 1812,
    feedwaterPressure: 8.5,
    condenserPressure: 8.4,
    condenserVacuum: 98.0,
    mainSteamFlow: 1812,
    bypassValvePosition: 0,
  },
  flags: {
    msivOpen: true,
    bypassValveOpen: false,
    srvOpen: [false, false, false, false, false, false, false, false],
    adsActivated: false,
    rcicRunning: false,
    hpciRunning: false,
    lpciRunning: false,
    coreSprayRunning: false,
    recircPump: [true, true],
    feedwaterPump: [true, true],
    condensatePump: true,
    offSitePowerAvailable: true,
    dieselGeneratorRunning: false,
    batteryDcAvailable: true,
    batteryChargePercent: 100,
    scramSignalActive: false,
    rpsChannelFault: [false, false, false, false],
  },
  alarms: [],
  logs: [
    {
      tick: 0,
      gameTime: '00:00',
      message: 'SHIFT HANDOVER COMPLETE. UNIT 2 AT 100% POWER.',
      type: 'routine',
    },
  ],
  events: {
    activeEvents: [],
    eventPool: [], // populated later
  },
});
