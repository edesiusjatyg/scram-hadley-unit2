import { PlantState } from '../../types/plant';
import { PHYSICS, ECCS, THRESHOLDS } from './constants';

export const applyCascades = (state: PlantState): PlantState => {
  // Deep clone to ensure purity
  const nextState = JSON.parse(JSON.stringify(state)) as PlantState;

  // ---------------------------------------------------------
  // EQUIPMENT RAMPING & DEGRADATION
  // ---------------------------------------------------------
  Object.values(nextState.equipment).forEach(eq => {
    if (eq.ramping && eq.targetSetpoint !== undefined && eq.currentValue !== undefined) {
      const diff = eq.targetSetpoint - eq.currentValue;
      if (Math.abs(diff) < 5) {
        eq.currentValue = eq.targetSetpoint;
        eq.ramping = false;
      } else {
        eq.currentValue += Math.sign(diff) * Math.max(2, Math.abs(diff) * 0.2);
      }
    }
  });

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
  let fwCurrentA = nextState.equipment['FW-PUMP-A'].currentValue || 0;
  let fwCurrentB = nextState.equipment['FW-PUMP-B'].currentValue || 0;
  
  if (!nextState.flags.feedwaterPump[0]) fwCurrentA = 0;
  if (!nextState.flags.feedwaterPump[1]) fwCurrentB = 0;

  nextState.secondary.feedwaterFlow = (fwCurrentA + fwCurrentB) / 2;

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
    nextState.secondary.mainSteamFlow = (nextState.secondary.turbineValvePosition / 100) * 1800 * (nextState.cooling.rpvPressure / 7.21);
  }

  // ---------------------------------------------------------
  // LAYER 1 & 2 - Core Physics and Primary Loop combined
  // ---------------------------------------------------------

  if (nextState.flags.scramSignalActive) {
    nextState.core.rodPosition = Math.max(0, nextState.core.rodPosition - PHYSICS.ROD_INSERT_SPEED_SCRAM);
  }

  const recircA = nextState.flags.recircPump[0] ? (nextState.equipment['RECIRC-A'].currentValue || 0) : 0;
  const recircB = nextState.flags.recircPump[1] ? (nextState.equipment['RECIRC-B'].currentValue || 0) : 0;
  
  const targetCoreFlow = (recircA + recircB) / 2;
  nextState.cooling.coreFlowRate += (targetCoreFlow - nextState.cooling.coreFlowRate) * 0.2;

  let rodReactivity = (nextState.core.rodPosition - 48) * 10;
  let voidReactivity = (nextState.cooling.coreFlowRate - 100) * 2; 
  let tempReactivity = (304 - nextState.core.fuelTemperature) * Math.abs(PHYSICS.DOPPLER_COEFFICIENT);
  let xenonReactivity = (PHYSICS.XENON_EQUILIBRIUM - nextState.core.xenonConcentration) * 10;

  let totalReactivity = rodReactivity + voidReactivity + tempReactivity + xenonReactivity;
  
  if (nextState.flags.scramSignalActive && nextState.core.rodPosition === 0) {
    totalReactivity = -5000;
  }

  nextState.core.reactivity = totalReactivity;

  if (totalReactivity < -100) {
    nextState.core.neutronFlux = Math.max(0, nextState.core.neutronFlux * 0.5);
    nextState.core.thermalPower = Math.max(PHYSICS.RATED_POWER_MWT * 0.07, nextState.core.thermalPower * 0.7); 
  } else {
    let powerDelta = (totalReactivity / 100) * 5;
    nextState.core.neutronFlux = Math.max(0, nextState.core.neutronFlux + powerDelta);
    nextState.core.thermalPower = Math.max(0, (nextState.core.neutronFlux / 100) * PHYSICS.RATED_POWER_MWT);
  }

  const steamGenerationRate = nextState.core.thermalPower * (1812 / 3900); 

  const targetFuelTemp = 304 + (nextState.core.thermalPower - 3900) * 0.05;
  nextState.core.fuelTemperature += (targetFuelTemp - nextState.core.fuelTemperature) * 0.1;

  if (nextState.core.thermalPower > PHYSICS.RATED_POWER_MWT * 0.1) {
    nextState.core.xenonConcentration = Math.min(nextState.core.xenonConcentration + PHYSICS.XENON_BUILDUP_RATE, PHYSICS.XENON_EQUILIBRIUM * 1.5);
  } else {
    nextState.core.xenonConcentration = Math.max(0, nextState.core.xenonConcentration - PHYSICS.XENON_DECAY_RATE);
  }

  let steamFlowOut = nextState.secondary.mainSteamFlow;
  if (nextState.flags.bypassValveOpen) steamFlowOut += 1800 * (nextState.cooling.rpvPressure / 7.21) * 0.25; 
  
  let srvSteamOut = 0;
  let openSrvCount = 0;
  nextState.flags.srvOpen.forEach(isOpen => {
    if (isOpen) {
      srvSteamOut += 250; 
      openSrvCount += 1;
    }
  });
  steamFlowOut += srvSteamOut;

  if (nextState.cooling.drywellPressure >= THRESHOLDS.COOLING.DRYWELL_SCRAM) {
    nextState.cooling.rpvPressure -= 0.5; 
  } else if (nextState.flags.adsActivated) {
    nextState.cooling.rpvPressure = Math.max(0, nextState.cooling.rpvPressure - 1.0); 
  } else {
    let pressDelta = (steamGenerationRate - steamFlowOut) * 0.005;
    nextState.cooling.rpvPressure = Math.max(0.1, nextState.cooling.rpvPressure + pressDelta);
  }

  if (nextState.cooling.rpvPressure > THRESHOLDS.COOLING.PRESSURE_SCRAM_HIGH) {
    nextState.flags.srvOpen = nextState.flags.srvOpen.map(() => true);
    nextState.flags.scramSignalActive = true;
  }

  // Suppression pool heating logic
  nextState.cooling.suppressionPoolTemp -= 0.05; // Passive cooling
  nextState.cooling.suppressionPoolTemp += openSrvCount * 0.8;
  if (nextState.flags.rcicRunning) {
    nextState.cooling.suppressionPoolTemp += 0.3;
  }
  if (nextState.flags.hpciRunning) {
    nextState.cooling.suppressionPoolTemp += 0.5; // Assuming HPCI also dumps heat
  }
  nextState.cooling.suppressionPoolTemp = Math.max(20, nextState.cooling.suppressionPoolTemp); // Minimum ambient

  // ECCS Efficiency limit
  let eccsEfficiency = 1.0;
  if (nextState.cooling.suppressionPoolTemp >= 70) {
    nextState.flags.lpciRunning = false;
    nextState.flags.coreSprayRunning = false;
  } else if (nextState.cooling.suppressionPoolTemp >= 60) {
    eccsEfficiency = 0.8; // Drops 20%
  }

  let totalInjectionGpm = 0;
  if (nextState.flags.rcicRunning) totalInjectionGpm += ECCS.RCIC_FLOW_GPM;
  if (nextState.flags.hpciRunning) totalInjectionGpm += ECCS.HPCI_FLOW_GPM;
  if (nextState.flags.lpciRunning) totalInjectionGpm += ECCS.LPCI_FLOW_GPM * eccsEfficiency;
  if (nextState.flags.coreSprayRunning) totalInjectionGpm += ECCS.CORE_SPRAY_FLOW_GPM * eccsEfficiency;
  
  const totalInjectionKgS = totalInjectionGpm * 0.063; 

  let waterDeltaKgS = (nextState.secondary.feedwaterFlow + totalInjectionKgS) - steamGenerationRate;
  
  if (nextState.cooling.drywellPressure >= THRESHOLDS.COOLING.DRYWELL_SCRAM) {
    waterDeltaKgS -= 5000; 
  }

  nextState.cooling.rpvWaterLevel = Math.max(0, Math.min(100, nextState.cooling.rpvWaterLevel + (waterDeltaKgS / PHYSICS.RPV_VOLUME_CONSTANT)));

  // Update instrument true values
  nextState.instruments.rpvWaterLevel.trueValue = nextState.cooling.rpvWaterLevel;
  nextState.instruments.rpvPressure.trueValue = nextState.cooling.rpvPressure;
  nextState.instruments.neutronFlux.trueValue = nextState.core.neutronFlux;
  nextState.instruments.feedwaterFlow.trueValue = nextState.secondary.feedwaterFlow;
  nextState.instruments.drywellPressure.trueValue = nextState.cooling.drywellPressure;
  nextState.instruments.recircPumpSpeedA.trueValue = nextState.equipment['RECIRC-A'].currentValue || 0;
  nextState.instruments.recircPumpSpeedB.trueValue = nextState.equipment['RECIRC-B'].currentValue || 0;

  // Update display values based on failure modes
  Object.values(nextState.instruments).forEach(inst => {
    switch (inst.failureMode) {
      case 'frozen':
        // Display value stays what it was
        break;
      case 'zero':
        inst.displayValue = 0;
        break;
      case 'noise':
        inst.displayValue = inst.trueValue * (1 + (Math.random() * 0.4 - 0.2)); // ±20%
        break;
      case 'offscale':
        inst.displayValue = inst.trueValue * 10; // Simple peg
        break;
      case 'missing':
        inst.displayValue = '---';
        break;
      default:
        inst.displayValue = inst.trueValue;
        break;
    }
  });

  return nextState;
};
