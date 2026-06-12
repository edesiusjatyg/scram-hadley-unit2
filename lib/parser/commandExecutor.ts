import { ParsedCommand } from './commandParser';
import { PlantState } from '../../types/plant';

export interface CommandResult {
  nextState: PlantState;
  response: string;
}

export function executeCommand(cmd: ParsedCommand, state: PlantState): CommandResult {
  const nextState = JSON.parse(JSON.stringify(state)) as PlantState;

  if (!cmd.valid) {
    return { nextState, response: cmd.errorMessage || 'INVALID COMMAND' };
  }

  const formatTime = (mins: number) => `${Math.floor(mins/60).toString().padStart(2,'0')}:${(mins%60).toString().padStart(2,'0')}`;

  // Handle ARO Delegation
  if (cmd.verb === 'TELL' && cmd.target === 'ARO') {
    // Basic implementation: we parse the rest of the command as a string, but the parser might not handle it well unless we change the parser.
    // For now, let's assume the parser just passes the rest as value or we handle it in pendingAroCommand.
    return { nextState, response: 'ARO: "I am ready for commands, but TELL ARO requires the raw command string parser update." (Not fully implemented)' };
  }
  
  if (cmd.verb === 'ASK' && cmd.target === 'ARO') {
    return { nextState, response: 'ARO: "RPV Level is ' + nextState.instruments.rpvWaterLevel.displayValue + '%. RPV Pressure is ' + nextState.instruments.rpvPressure.displayValue + ' MPa."' };
  }

  // Handle Auth
  if (cmd.verb === 'REQUEST' && cmd.target === 'AUTH') {
    return { nextState, response: 'SS WARD: "Authorization granted. Proceed."' };
  }

  switch (cmd.verb) {
    case 'SCRAM':
      nextState.flags.scramSignalActive = true;
      return {
        nextState,
        response: 'SCRAM SIGNAL INITIATED — ALL CONTROL RODS INSERTING. REACTOR POWER DROPPING.'
      };
      
    case 'SCRAM_RESET':
      if (nextState.flags.scramSignalActive) {
        nextState.flags.scramSignalActive = false;
        return { nextState, response: 'SCRAM SIGNAL RESET.' };
      }
      return { nextState, response: 'NO SCRAM SIGNAL ACTIVE TO RESET.' };

    case 'INSERT':
      if (cmd.target === 'RODS' && cmd.value !== undefined) {
        if (nextState.flags.scramSignalActive) {
          return { nextState, response: 'ROD WITHDRAWAL/INSERTION BLOCKED: SCRAM SIGNAL ACTIVE' };
        }
        const target = Math.max(0, Math.min(100, cmd.value));
        nextState.core.rodPosition = target;
        return { nextState, response: `ALL RODS INSERTING TO ${target}% WITHDRAWN.` };
      }
      return { nextState, response: 'SYNTAX: INSERT RODS [n%]' };

    case 'WITHDRAW':
      if (cmd.target === 'RODS' && cmd.value !== undefined) {
        if (nextState.flags.scramSignalActive) {
          return { nextState, response: 'ROD WITHDRAWAL BLOCKED: SCRAM SIGNAL ACTIVE' };
        }
        const target = Math.max(0, Math.min(100, cmd.value));
        nextState.core.rodPosition = target;
        return { nextState, response: `ALL RODS WITHDRAWING TO ${target}% WITHDRAWN.` };
      }
      return { nextState, response: 'SYNTAX: WITHDRAW RODS [n%]' };

    case 'SET':
      if (cmd.target === 'RECIRC-A' && cmd.value !== undefined) {
        nextState.equipment['RECIRC-A'].targetSetpoint = Math.max(0, Math.min(100, cmd.value));
        nextState.equipment['RECIRC-A'].ramping = true;
        return { nextState, response: `RECIRC-A SETPOINT: ${cmd.value}%. ADJUSTING...` };
      }
      if (cmd.target === 'RECIRC-B' && cmd.value !== undefined) {
        nextState.equipment['RECIRC-B'].targetSetpoint = Math.max(0, Math.min(100, cmd.value));
        nextState.equipment['RECIRC-B'].ramping = true;
        return { nextState, response: `RECIRC-B SETPOINT: ${cmd.value}%. ADJUSTING...` };
      }
      if (cmd.target === 'FW-FLOW' && cmd.value !== undefined) {
        nextState.equipment['FW-PUMP-A'].targetSetpoint = Math.max(0, cmd.value / 2);
        nextState.equipment['FW-PUMP-B'].targetSetpoint = Math.max(0, cmd.value / 2);
        nextState.equipment['FW-PUMP-A'].ramping = true;
        nextState.equipment['FW-PUMP-B'].ramping = true;
        return { nextState, response: `FEEDWATER FLOW SETPOINT: ${cmd.value} kg/s. PUMPS RAMPING...` };
      }
      return { nextState, response: 'UNKNOWN TARGET OR MISSING VALUE FOR SET COMMAND.' };

    case 'START':
      if (cmd.target === 'RCIC') {
        nextState.flags.rcicRunning = true;
        return { nextState, response: 'RCIC STARTED MANUALLY. FLOW ESTABLISHED.' };
      }
      if (cmd.target === 'HPCI') {
        nextState.flags.hpciRunning = true;
        return { nextState, response: 'HPCI STARTED MANUALLY. TURBINE SPINNING UP.' };
      }
      if (cmd.target === 'LPCI') {
        if (nextState.cooling.rpvPressure > 0.375) {
          return { nextState, response: 'LPCI START REJECTED: RPV PRESSURE TOO HIGH (>0.375 MPa).' };
        }
        nextState.flags.lpciRunning = true;
        return { nextState, response: 'LPCI STARTED MANUALLY.' };
      }
      if (cmd.target === 'CORE-SPRAY') {
        if (nextState.cooling.rpvPressure > 0.375) {
          return { nextState, response: 'CORE SPRAY START REJECTED: RPV PRESSURE TOO HIGH.' };
        }
        nextState.flags.coreSprayRunning = true;
        return { nextState, response: 'CORE SPRAY STARTED.' };
      }
      if (cmd.target === 'DIESEL') {
        nextState.flags.dieselGeneratorRunning = true;
        return { nextState, response: 'DIESEL GENERATOR STARTED.' };
      }
      if (cmd.target === 'VACUUM-EJECTOR') {
        nextState.secondary.condenserVacuum = 100;
        nextState.secondary.condenserPressure = 8.4;
        return { nextState, response: 'VACUUM EJECTOR STARTED. CONDENSER VACUUM RESTORING.' };
      }
      return { nextState, response: `UNABLE TO START ${cmd.target || 'UNKNOWN'}.` };

    case 'STOP':
      if (cmd.target === 'RCIC') {
        nextState.flags.rcicRunning = false;
        return { nextState, response: 'RCIC STOPPED.' };
      }
      if (cmd.target === 'HPCI') {
        nextState.flags.hpciRunning = false;
        return { nextState, response: 'HPCI STOPPED.' };
      }
      return { nextState, response: `UNABLE TO STOP ${cmd.target || 'UNKNOWN'}.` };

    case 'TRIP':
      if (cmd.target === 'TURBINE') {
        nextState.secondary.turbineValvePosition = 0;
        return { nextState, response: 'TURBINE TRIPPED MANUALLY.' };
      }
      return { nextState, response: `UNABLE TO TRIP ${cmd.target || 'UNKNOWN'}.` };

    case 'OPEN':
      if (cmd.target === 'BYPASS-VALVE') {
        nextState.flags.bypassValveOpen = true;
        return { nextState, response: 'STEAM BYPASS VALVE TO CONDENSER OPENED.' };
      }
      if (cmd.target?.startsWith('SRV-')) {
        const idx = parseInt(cmd.target.split('-')[1]) - 1;
        if (idx >= 0 && idx < 8) {
          nextState.flags.srvOpen[idx] = true;
          return { nextState, response: `SRV-${idx + 1} OPENED MANUALLY.` };
        }
      }
      if (cmd.target === 'MSIV') {
        if (nextState.cooling.drywellPressure >= 14) {
          return { nextState, response: 'MSIV OPEN REJECTED: LOCA ISOLATION SIGNAL ACTIVE.' };
        }
        nextState.flags.msivOpen = true;
        return { nextState, response: 'MSIV OPENED.' };
      }
      return { nextState, response: `UNABLE TO OPEN ${cmd.target || 'UNKNOWN'}.` };

    case 'CLOSE':
      if (cmd.target === 'BYPASS-VALVE') {
        nextState.flags.bypassValveOpen = false;
        return { nextState, response: 'STEAM BYPASS VALVE CLOSED.' };
      }
      if (cmd.target?.startsWith('SRV-')) {
        const idx = parseInt(cmd.target.split('-')[1]) - 1;
        if (idx >= 0 && idx < 8) {
          nextState.flags.srvOpen[idx] = false;
          return { nextState, response: `SRV-${idx + 1} CLOSED MANUALLY.` };
        }
      }
      if (cmd.target === 'MSIV') {
        nextState.flags.msivOpen = false;
        nextState.secondary.mainSteamFlow = 0;
        nextState.flags.scramSignalActive = true;
        return { nextState, response: 'MSIV CLOSED MANUALLY. SCRAM INITIATED.' };
      }
      return { nextState, response: `UNABLE TO CLOSE ${cmd.target || 'UNKNOWN'}.` };

    case 'INITIATE':
      if (cmd.target === 'ADS') {
        nextState.flags.adsActivated = true;
        nextState.flags.srvOpen = nextState.flags.srvOpen.map(() => true);
        return { nextState, response: 'ADS INITIATED MANUALLY. ALL SRVs OPENED. DEPRESSURIZATION IN PROGRESS.' };
      }
      return { nextState, response: 'UNKNOWN INITIATION TARGET.' };

    case 'ACK':
      if (cmd.target === 'ALL') {
        nextState.alarms.forEach(a => a.acknowledged = true);
        return { nextState, response: 'ALL ALARMS ACKNOWLEDGED.' };
      } else if (cmd.target) {
        const alarm = nextState.alarms.find(a => a.code.startsWith(cmd.target!));
        if (alarm) {
          alarm.acknowledged = true;
          return { nextState, response: `ALARM ${cmd.target} ACKNOWLEDGED.` };
        }
        return { nextState, response: `ALARM ${cmd.target} NOT FOUND.` };
      }
      return { nextState, response: 'SYNTAX: ACK [CODE] OR ACK ALL' };

    case 'STATUS':
      return {
        nextState,
        response: `CORE POWER: ${nextState.core.thermalPower.toFixed(0)} MWt | RPV LEVEL (IND): ${nextState.instruments.rpvWaterLevel.displayValue}% | RPV PRESS (IND): ${nextState.instruments.rpvPressure.displayValue} MPa`
      };

    case 'ALARMS':
      const active = nextState.alarms.filter(a => !a.acknowledged).map(a => a.code);
      return {
        nextState,
        response: active.length > 0 ? `ACTIVE ALARMS:\n${active.join('\n')}` : 'NO ACTIVE ALARMS.'
      };

    case 'LOG':
      const recent = nextState.logs.slice(-20).map(l => `[${l.gameTime}] ${l.message}`);
      return {
        nextState,
        response: `RECENT LOGS:\n${recent.join('\n')}`
      };

    case 'BYPASS':
      if (cmd.target?.startsWith('RPS-')) {
        const channelStr = cmd.target.split('-')[1];
        const channelMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
        const idx = channelMap[channelStr];
        if (idx !== undefined) {
          nextState.flags.rpsChannelFault[idx] = false;
          return { nextState, response: `RPS CHANNEL ${channelStr} BYPASSED.` };
        }
      }
      return { nextState, response: 'SYNTAX: BYPASS RPS-[A-D]' };

    case 'HELP':
      if (cmd.target === 'LOCA') {
        return { nextState, response: 'LOCA PROCEDURE: VERIFY SCRAM. START HPCI/RCIC. IF RPV LEVEL CONTINUES DROPPING, INITIATE ADS. THEN START LPCI/CORE SPRAY.' };
      }
      if (cmd.target === 'FEEDWATER') {
        return { nextState, response: 'FEEDWATER LOSS PROCEDURE: REDUCE POWER. START RCIC. VERIFY WATER LEVEL. SCRAM IF BELOW L3.' };
      }
      return {
        nextState,
        response: 'COMMANDS:\nSCRAM, INSERT/WITHDRAW RODS [n%], SET RECIRC-A/B [n%], START/STOP RCIC/HPCI/LPCI/CORE-SPRAY, OPEN/CLOSE BYPASS-VALVE/SRV-[1-8]/MSIV, INITIATE ADS, ACK [CODE]/ALL, STATUS, ALARMS, LOG, TIME, CREW, HELP [TOPIC]'
      };

    case 'TIME':
      return {
        nextState,
        response: `SHIFT TIME: ${formatTime(nextState.clock.gameTimeMinutes)} | TICKS ELAPSED: ${nextState.clock.tickCount}`
      };

    case 'CREW':
      return {
        nextState,
        response: 'CREW STATUS: SHIFT SUPERVISOR WARD, E. (ON DUTY) | ARO (ON DUTY)'
      };

    case 'CHECK':
      if (cmd.target === 'BATTERY') {
        return {
          nextState,
          response: `BATTERY CHARGE: ${nextState.flags.batteryChargePercent.toFixed(1)}%`
        };
      }
      return { nextState, response: 'SYNTAX: CHECK BATTERY' };

    case 'LOAD':
      if (cmd.target === 'DIESEL') {
        if (!nextState.flags.dieselGeneratorRunning) return { nextState, response: 'DIESEL MUST BE RUNNING TO LOAD.' };
        return { nextState, response: 'ELECTRICAL LOADS TRANSFERRED TO DIESEL GENERATOR.' };
      }
      return { nextState, response: 'SYNTAX: LOAD DIESEL' };

    default:
      return { nextState, response: `COMMAND ${cmd.verb} EXECUTED (NO-OP FOR NOW)` };
  }
}
