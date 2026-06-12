import { PlantState } from '../../types/plant';
import { PHYSICS, ECCS, THRESHOLDS } from './constants';

export const applyCascades = (state: PlantState): PlantState => {
  // Deep clone to ensure purity
  const nextState = JSON.parse(JSON.stringify(state)) as PlantState;

  // ---------------------------------------------------------
  // LAYER 4 - Power & DC
  // ---------------------------------------------------------
  if (!nextState.flags.offSitePowerAvailable) {
    if (!nextState.flags.dieselGeneratorRunning) {
      nextState.flags.feedwaterPump = [false, false];
      nextState.flags.condensatePump = false;
      // Recirc pumps coast down
      nextState.flags.recircPump = [false, false];
    }
    // Battery depletion
    const rcicLoad = nextState.flags.rcicRunning ? 1.0 : 0.2;
    nextState.flags.batteryChargePercent = Math.max(0, nextState.flags.batteryChargePercent - rcicLoad);
    
    if (nextState.flags.batteryChargePercent <= 0) {
      nextState.flags.batteryDcAvailable = false;
      nextState.flags.rcicRunning = false; // Fails without DC
    }
  }

  // ---------------------------------------------------------
  // LAYER 3 - Secondary Loop
  // ---------------------------------------------------------
  // Pumps mapping to flow
  if (!nextState.flags.feedwaterPump[0] && !nextState.flags.feedwaterPump[1]) {
    nextState.secondary.feedwaterFlow = 0;
  } else if (!nextState.flags.feedwaterPump[0] || !nextState.flags.feedwaterPump[1]) {
    nextState.secondary.feedwaterFlow = Math.min(nextState.secondary.feedwaterFlow, 900); // 50% capacity
  }

  if (nextState.secondary.condenserPressure > THRESHOLDS.SECONDARY.COND_PRESS_TRIP) {
    nextState.secondary.condenserVacuum = Math.max(0, nextState.secondary.condenserVacuum - 5);
  }
  if (nextState.secondary.condenserVacuum < THRESHOLDS.SECONDARY.COND_VAC_TRIP) {
    nextState.secondary.turbineValvePosition = 0; // Turbine trip
  }

  if (nextState.secondary.turbineSpeed > THRESHOLDS.SECONDARY.TURBINE_SPEED_TRIP) {
    nextState.secondary.turbineValvePosition = 0; // Overspeed trip
  }

  if (nextState.secondary.turbineValvePosition === 0) {
    nextState.secondary.mainSteamFlow = 0;
    nextState.flags.msivOpen = false;
    nextState.flags.scramSignalActive = true; // MSIV closure = SCRAM
    if (nextState.secondary.condenserPressure < THRESHOLDS.SECONDARY.COND_PRESS_TRIP) {
      nextState.flags.bypassValveOpen = true; // Auto open if condenser avail
    }
  } else {
    // Steam flow matches valve position * pressure factor
    nextState.secondary.mainSteamFlow = (nextState.secondary.turbineValvePosition / 100) * 1800 * (nextState.cooling.rpvPressure / 7.21);
  }

  // ---------------------------------------------------------
  // LAYER 1 & 2 - Core Physics and Primary Loop combined
  // ---------------------------------------------------------

  // SCRAM logic
  if (nextState.flags.scramSignalActive) {
    nextState.core.rodPosition = Math.max(0, nextState.core.rodPosition - PHYSICS.ROD_INSERT_SPEED_SCRAM);
  }

  // Recirc flow -> core flow
  const targetCoreFlow = (
    (nextState.flags.recircPump[0] ? nextState.cooling.recircPumpSpeed[0] : 0) +
    (nextState.flags.recircPump[1] ? nextState.cooling.recircPumpSpeed[1] : 0)
  ) / 2;
  // Gradual coast down or speed up
  nextState.cooling.coreFlowRate += (targetCoreFlow - nextState.cooling.coreFlowRate) * 0.2;

  // Simplified Reactivity model
  // Base reactivity depends on rod position (normalized to 48 = 0)
  let rodReactivity = (nextState.core.rodPosition - 48) * 10;
  let voidReactivity = (nextState.cooling.coreFlowRate - 100) * 2; // more flow = less void = positive react
  let tempReactivity = (304 - nextState.core.fuelTemperature) * Math.abs(PHYSICS.DOPPLER_COEFFICIENT);
  let xenonReactivity = (PHYSICS.XENON_EQUILIBRIUM - nextState.core.xenonConcentration) * 10;

  let totalReactivity = rodReactivity + voidReactivity + tempReactivity + xenonReactivity;
  
  if (nextState.flags.scramSignalActive && nextState.core.rodPosition === 0) {
    totalReactivity = -5000; // Deeply subcritical
  }

  nextState.core.reactivity = totalReactivity;

  // Power kinetics (very simplified point kinetics)
  if (totalReactivity < -100) {
    // Drop power fast but leave decay heat
    nextState.core.neutronFlux = Math.max(0, nextState.core.neutronFlux * 0.5);
    nextState.core.thermalPower = Math.max(PHYSICS.RATED_POWER_MWT * 0.07, nextState.core.thermalPower * 0.7); // 7% decay heat
  } else {
    let powerDelta = (totalReactivity / 100) * 5;
    nextState.core.neutronFlux = Math.max(0, nextState.core.neutronFlux + powerDelta);
    nextState.core.thermalPower = Math.max(0, (nextState.core.neutronFlux / 100) * PHYSICS.RATED_POWER_MWT);
  }

  // Heat transfer to coolant -> steam generation
  const steamGenerationRate = nextState.core.thermalPower * (1812 / 3900); // 1812 kg/s at 3900 MWt

  // Fuel temp dynamics
  const targetFuelTemp = 304 + (nextState.core.thermalPower - 3900) * 0.05;
  nextState.core.fuelTemperature += (targetFuelTemp - nextState.core.fuelTemperature) * 0.1;

  // Xenon dynamics
  if (nextState.core.thermalPower > PHYSICS.RATED_POWER_MWT * 0.1) {
    nextState.core.xenonConcentration = Math.min(nextState.core.xenonConcentration + PHYSICS.XENON_BUILDUP_RATE, PHYSICS.XENON_EQUILIBRIUM * 1.5);
  } else {
    nextState.core.xenonConcentration = Math.max(0, nextState.core.xenonConcentration - PHYSICS.XENON_DECAY_RATE);
  }

  // RPV Pressure dynamics
  // Pressure rises if steam gen > steam flow out
  let steamFlowOut = nextState.secondary.mainSteamFlow;
  if (nextState.flags.bypassValveOpen) steamFlowOut += 1800 * (nextState.cooling.rpvPressure / 7.21) * 0.25; // Bypass capacity 25%
  
  let srvSteamOut = 0;
  nextState.flags.srvOpen.forEach(isOpen => {
    if (isOpen) {
      srvSteamOut += 250; // roughly 250 kg/s per SRV
    }
  });
  steamFlowOut += srvSteamOut;

  // LOCA pressure drop
  if (nextState.cooling.drywellPressure >= THRESHOLDS.COOLING.DRYWELL_SCRAM) {
    nextState.cooling.rpvPressure -= 0.5; // rapid drop
  } else if (nextState.flags.adsActivated) {
    nextState.cooling.rpvPressure = Math.max(0, nextState.cooling.rpvPressure - 1.0); // ADS rapid depress
  } else {
    let pressDelta = (steamGenerationRate - steamFlowOut) * 0.005;
    nextState.cooling.rpvPressure = Math.max(0.1, nextState.cooling.rpvPressure + pressDelta);
  }

  // SRV auto-lift
  if (nextState.cooling.rpvPressure > THRESHOLDS.COOLING.PRESSURE_SCRAM_HIGH) {
    nextState.flags.srvOpen = nextState.flags.srvOpen.map(() => true);
    nextState.flags.scramSignalActive = true;
  }

  // Suppression pool temp
  if (srvSteamOut > 0 || nextState.flags.adsActivated) {
    nextState.cooling.suppressionPoolTemp += 1.0;
  }

  // RPV Level dynamics
  // Level increases with FW/ECCS, drops with steam gen / LOCA
  let totalInjectionGpm = 0;
  if (nextState.flags.rcicRunning) totalInjectionGpm += ECCS.RCIC_FLOW_GPM;
  if (nextState.flags.hpciRunning) totalInjectionGpm += ECCS.HPCI_FLOW_GPM;
  if (nextState.flags.lpciRunning) totalInjectionGpm += ECCS.LPCI_FLOW_GPM;
  if (nextState.flags.coreSprayRunning) totalInjectionGpm += ECCS.CORE_SPRAY_FLOW_GPM;
  
  const totalInjectionKgS = totalInjectionGpm * 0.063; // approx conversion

  let waterDeltaKgS = (nextState.secondary.feedwaterFlow + totalInjectionKgS) - steamGenerationRate;
  
  if (nextState.cooling.drywellPressure >= THRESHOLDS.COOLING.DRYWELL_SCRAM) {
    waterDeltaKgS -= 5000; // LOCA leak rate
  }

  nextState.cooling.rpvWaterLevel = Math.max(0, Math.min(100, nextState.cooling.rpvWaterLevel + (waterDeltaKgS / PHYSICS.RPV_VOLUME_CONSTANT)));

  return nextState;
};
