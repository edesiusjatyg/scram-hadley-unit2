export const PHYSICS = {
  RATED_POWER_MWT: 3900,
  VOID_COEFFICIENT: -120,        // pcm per % void change
  DOPPLER_COEFFICIENT: -2.8,     // pcm per °C fuel temp change
  DELAYED_NEUTRON_FRACTION: 0.0065,
  XENON_BUILDUP_RATE: 0.3,       // % suppression per tick at full power
  XENON_DECAY_RATE: 0.15,        // % suppression per tick at zero power
  XENON_EQUILIBRIUM: 4.2,        // % suppression at steady 100% power
  ROD_INSERT_SPEED_NORMAL: 2,    // % withdrawn per tick (manual)
  ROD_INSERT_SPEED_SCRAM: 100,   // full insertion in <1 tick (4 seconds real)
  POWER_CHANGE_PER_ROD_PCT: 1.2, // MWt change per 1% rod movement
  RPV_VOLUME_CONSTANT: 100,      // Divisor for flow rate to level change
};

export const ECCS = {
  RCIC_START_LEVEL: 25,         // % wide-range (Level 2)
  RCIC_FLOW_GPM: 600,
  RCIC_MAX_PRESSURE_MPA: 8.0,
  RCIC_BATTERY_LIFE_TICKS: 480, // 8 game-hours (scaled)

  HPCI_START_LEVEL: 25,         // % wide-range (Level 2), or drywell >14 kPa
  HPCI_START_DRYWELL_KPA: 14,
  HPCI_FLOW_GPM: 5000,
  HPCI_SPINUP_TICKS: 1,         // ~10 seconds

  ADS_TRIGGER_LEVEL: 10,        // % wide-range (low-low)
  ADS_TRIGGER_DELAY_TICKS: 2,   // 105-second timer compressed
  ADS_TARGET_PRESSURE_MPA: 0.32,

  LPCI_ACTIVATE_PRESSURE_MPA: 0.375,
  LPCI_FLOW_GPM: 40000,
  CORE_SPRAY_FLOW_GPM: 12500,
};

export const THRESHOLDS = {
  CORE: {
    ROD_POS_ALERT_LOW: 5,
    ROD_POS_ALERT_HIGH: 95,
    FLUX_ALERT_DEV: 5,
    FLUX_SCRAM: 110,
    POWER_ALERT_LOW: 3610,
    POWER_ALERT_HIGH: 4200,
    POWER_SCRAM: 4400,
    REACTIVITY_ALERT: 50,
    REACTIVITY_SCRAM: 200,
    XENON_ALERT: 15,
    XENON_SCRAM: 40,
    FUEL_TEMP_ALERT: 360,
    FUEL_TEMP_SCRAM: 420,
    FUEL_TEMP_DAMAGE: 500, // Core integrity lost
  },
  COOLING: {
    LEVEL_L5: 85, // Alert high
    LEVEL_L4: 63, // Normal
    LEVEL_L3: 30, // Alert low
    LEVEL_L2: 15, // SCRAM low
    LEVEL_SCRAM_HIGH: 92,
    LEVEL_ADS_TRIGGER: 10,
    LEVEL_UNCOVERY: 5,

    PRESSURE_ALERT_LOW: 6.0,
    PRESSURE_ALERT_HIGH: 7.6,
    PRESSURE_SCRAM_LOW: 4.0,
    PRESSURE_SCRAM_HIGH: 8.5, // SRV lift / SCRAM

    RECIRC_ALERT: 60, // either pump
    RECIRC_SCRAM: 20, // both pumps

    CORE_FLOW_ALERT: 70,
    CORE_FLOW_SCRAM: 40,

    DRYWELL_ALERT: 10,
    DRYWELL_SCRAM: 14, // LOCA

    POOL_TEMP_ALERT: 50,
    POOL_TEMP_SCRAM: 70,
    POOL_TEMP_LIMIT: 90, // Containment failure
  },
  SECONDARY: {
    TURBINE_SPEED_ALERT_LOW: 3400,
    TURBINE_SPEED_ALERT_HIGH: 3700,
    TURBINE_SPEED_TRIP: 3800,

    VALVE_POS_ALERT: 50,
    VALVE_POS_TRIP: 0, // Turbine trip -> MSIV close -> SCRAM

    FW_FLOW_ALERT_LOW: 1400,
    FW_FLOW_ALERT_HIGH: 2000,
    FW_FLOW_ALARM: 800,

    FW_PRESS_ALERT: 7.5,
    FW_PRESS_ALARM: 6.5,

    COND_PRESS_ALERT: 25,
    COND_PRESS_TRIP: 30, // Low vacuum trip -> turbine trip

    COND_VAC_ALERT: 85,
    COND_VAC_TRIP: 75,
  }
};
