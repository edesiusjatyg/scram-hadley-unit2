'use client';

import { useGameStore } from '../store/gameStore';
import { THRESHOLDS } from '../lib/simulation/constants';
import { PlantState } from '../types/plant';

export default function PlantStatusPanel() {
  const { plant } = useGameStore();

  const getColor = (val: number, alertLow: number, alertHigh: number, scramLow: number, scramHigh: number) => {
    if (val <= scramLow || val >= scramHigh) return 'text-[#ff4444]';
    if (val <= alertLow || val >= alertHigh) return 'text-[#ffaa00]';
    return 'text-[#33ff33]';
  };

  const getEccsColor = (running: boolean) => running ? 'text-[#33ff33]' : 'text-[#1a7a1a]';

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 pb-4 whitespace-pre">
      <div className="mb-4">
        <div className="underline mb-1">CORE</div>
        <div>
          <span className="inline-block w-32">POWER</span>: 
          <span className={getColor(plant.core.thermalPower, THRESHOLDS.CORE.POWER_ALERT_LOW, THRESHOLDS.CORE.POWER_ALERT_HIGH, 0, THRESHOLDS.CORE.POWER_SCRAM)}>
            {' '}{plant.core.thermalPower.toFixed(0)} MWt [{(plant.core.thermalPower / 3900 * 100).toFixed(1)}%]
          </span>
        </div>
        <div>
          <span className="inline-block w-32">NEUTRON FLUX</span>: 
          <span className={getColor(plant.core.neutronFlux, 95, 105, 0, THRESHOLDS.CORE.FLUX_SCRAM)}>
            {' '}{plant.core.neutronFlux.toFixed(1)}%
          </span>
        </div>
        <div>
          <span className="inline-block w-32">ROD POS</span>: 
          <span className={getColor(plant.core.rodPosition, THRESHOLDS.CORE.ROD_POS_ALERT_LOW, THRESHOLDS.CORE.ROD_POS_ALERT_HIGH, -1, 101)}>
            {' '}{plant.core.rodPosition.toFixed(0)}% WD
          </span>
        </div>
        <div>
          <span className="inline-block w-32">REACTIVITY</span>: 
          <span className={getColor(plant.core.reactivity, -THRESHOLDS.CORE.REACTIVITY_ALERT, THRESHOLDS.CORE.REACTIVITY_ALERT, -5000, THRESHOLDS.CORE.REACTIVITY_SCRAM)}>
            {' '}{plant.core.reactivity > 0 ? '+' : ''}{plant.core.reactivity.toFixed(0)} pcm
          </span>
        </div>
        <div>
          <span className="inline-block w-32">FUEL TEMP</span>: 
          <span className={getColor(plant.core.fuelTemperature, 0, THRESHOLDS.CORE.FUEL_TEMP_ALERT, 0, THRESHOLDS.CORE.FUEL_TEMP_SCRAM)}>
            {' '}{plant.core.fuelTemperature.toFixed(0)}°C
          </span>
        </div>
        <div>
          <span className="inline-block w-32">XENON SUPP</span>: 
          <span className={getColor(plant.core.xenonConcentration, 0, THRESHOLDS.CORE.XENON_ALERT, 0, THRESHOLDS.CORE.XENON_SCRAM)}>
            {' '}{plant.core.xenonConcentration.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="mb-4">
        <div className="underline mb-1">PRIMARY COOLING</div>
        <div>
          <span className="inline-block w-32">RPV LEVEL</span>: 
          <span className={getColor(plant.cooling.rpvWaterLevel, THRESHOLDS.COOLING.LEVEL_L3, THRESHOLDS.COOLING.LEVEL_L5, THRESHOLDS.COOLING.LEVEL_L2, THRESHOLDS.COOLING.LEVEL_SCRAM_HIGH)}>
            {' '}{plant.cooling.rpvWaterLevel.toFixed(1)}%
          </span>
        </div>
        <div>
          <span className="inline-block w-32">RPV PRESS</span>: 
          <span className={getColor(plant.cooling.rpvPressure, THRESHOLDS.COOLING.PRESSURE_ALERT_LOW, THRESHOLDS.COOLING.PRESSURE_ALERT_HIGH, THRESHOLDS.COOLING.PRESSURE_SCRAM_LOW, THRESHOLDS.COOLING.PRESSURE_SCRAM_HIGH)}>
            {' '}{plant.cooling.rpvPressure.toFixed(2)} MPa
          </span>
        </div>
        <div>
          <span className="inline-block w-32">RECIRC-A</span>: 
          <span className={getColor(plant.cooling.recircPumpSpeed[0], THRESHOLDS.COOLING.RECIRC_ALERT, 101, THRESHOLDS.COOLING.RECIRC_SCRAM, 101)}>
            {' '}{plant.cooling.recircPumpSpeed[0].toFixed(0)}%
          </span>
        </div>
        <div>
          <span className="inline-block w-32">RECIRC-B</span>: 
          <span className={getColor(plant.cooling.recircPumpSpeed[1], THRESHOLDS.COOLING.RECIRC_ALERT, 101, THRESHOLDS.COOLING.RECIRC_SCRAM, 101)}>
            {' '}{plant.cooling.recircPumpSpeed[1].toFixed(0)}%
          </span>
        </div>
        <div>
          <span className="inline-block w-32">DRYWELL</span>: 
          <span className={getColor(plant.cooling.drywellPressure, -1, THRESHOLDS.COOLING.DRYWELL_ALERT, -1, THRESHOLDS.COOLING.DRYWELL_SCRAM)}>
            {' '}{plant.cooling.drywellPressure.toFixed(1)} kPa
          </span>
        </div>
      </div>

      <div className="mb-4">
        <div className="underline mb-1">SECONDARY</div>
        <div>
          <span className="inline-block w-32">TURBINE</span>: 
          <span className={getColor(plant.secondary.turbineSpeed, THRESHOLDS.SECONDARY.TURBINE_SPEED_ALERT_LOW, THRESHOLDS.SECONDARY.TURBINE_SPEED_ALERT_HIGH, 0, THRESHOLDS.SECONDARY.TURBINE_SPEED_TRIP)}>
            {' '}{plant.secondary.turbineSpeed.toFixed(0)} rpm
          </span>
        </div>
        <div>
          <span className="inline-block w-32">FW FLOW</span>: 
          <span className={getColor(plant.secondary.feedwaterFlow, THRESHOLDS.SECONDARY.FW_FLOW_ALERT_LOW, THRESHOLDS.SECONDARY.FW_FLOW_ALERT_HIGH, THRESHOLDS.SECONDARY.FW_FLOW_ALARM, 9999)}>
            {' '}{plant.secondary.feedwaterFlow.toFixed(0)} kg/s
          </span>
        </div>
        <div>
          <span className="inline-block w-32">CONDENSER</span>: 
          <span className={getColor(plant.secondary.condenserPressure, 0, THRESHOLDS.SECONDARY.COND_PRESS_ALERT, 0, THRESHOLDS.SECONDARY.COND_PRESS_TRIP)}>
            {' '}{plant.secondary.condenserPressure.toFixed(1)} mbar
          </span>
        </div>
      </div>

      <div className="mb-4">
        <div className="underline mb-1">ECCS STATUS</div>
        <div>
          <span className="inline-block w-32">RCIC: <span className={getEccsColor(plant.flags.rcicRunning)}>{plant.flags.rcicRunning ? 'RUNNING' : 'STBY'}</span></span>
          <span>HPCI: <span className={getEccsColor(plant.flags.hpciRunning)}>{plant.flags.hpciRunning ? 'RUNNING' : 'STBY'}</span></span>
        </div>
        <div>
          <span className="inline-block w-32">LPCI: <span className={getEccsColor(plant.flags.lpciRunning)}>{plant.flags.lpciRunning ? 'RUNNING' : 'STBY'}</span></span>
          <span>CS  : <span className={getEccsColor(plant.flags.coreSprayRunning)}>{plant.flags.coreSprayRunning ? 'RUNNING' : 'STBY'}</span></span>
        </div>
        <div>
          <span className="inline-block w-32">ADS : <span className={plant.flags.adsActivated ? 'text-[#ff4444]' : 'text-[#33ff33]'}>{plant.flags.adsActivated ? 'ACTUATED' : 'ARMED'}</span></span>
        </div>
      </div>

      <div className="mb-4">
        <div className="underline mb-1">POWER SYSTEMS</div>
        <div>
          <span className="inline-block w-32">OFFSITE PWR</span>: 
          <span className={plant.flags.offSitePowerAvailable ? 'text-[#33ff33]' : 'text-[#ff4444]'}>
            {' '}{plant.flags.offSitePowerAvailable ? 'AVAIL' : 'LOSS'}
          </span>
        </div>
        <div>
          <span className="inline-block w-32">DIESEL</span>: 
          <span className={plant.flags.dieselGeneratorRunning ? 'text-[#33ff33]' : 'text-[#1a7a1a]'}>
            {' '}{plant.flags.dieselGeneratorRunning ? 'RUNNING' : 'STBY'}
          </span>
        </div>
        <div>
          <span className="inline-block w-32">BATTERY</span>: 
          <span className={getColor(plant.flags.batteryChargePercent, 20, 101, 0, 101)}>
            {' '}{plant.flags.batteryChargePercent.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
