import { PlantState } from '../../types/plant';

export interface ScoreBreakdown {
  baseScore: number;
  scramPenalty: number;
  unnecessaryEccsPenalty: number;
  instrumentIgnorePenalty: number;
  alarmTriageScore: number;
  procedureCompliance: number;
  consequenceManagement: number;
  crisisBonus: number;
  cleanShiftBonus: number;
  total: number;
  grade: string;
}

export const calculateScore = (state: PlantState): ScoreBreakdown => {
  let baseScore = 1000;
  
  let scramPenalty = state.flags.scramSignalActive ? -150 : 0;
  
  // Basic heuristics for these new metrics:
  let unnecessaryEccsPenalty = 0; // Simplified
  let instrumentIgnorePenalty = 0; // Simplified
  
  let alarmTriageScore = 0;
  state.alarms.forEach(a => {
    if (a.acknowledged) {
      if (a.code.startsWith('A-')) alarmTriageScore += 10;
      else if (a.code.startsWith('B-')) alarmTriageScore += 5;
      else alarmTriageScore += 2;
    } else {
      alarmTriageScore -= 20;
    }
  });

  let procedureCompliance = state.flags.scramSignalActive ? 75 : 0; // Simplified

  let consequenceManagement = 0;
  if (state.cooling.suppressionPoolTemp <= 50) consequenceManagement += 150;
  
  let equipmentIntact = true;
  Object.values(state.equipment).forEach(eq => {
    if (eq.healthPercent < 60) equipmentIntact = false;
  });
  if (equipmentIntact) consequenceManagement += 100;

  let crisisBonus = state.events.activeEvents.length > 2 ? 300 : 0;
  
  let cleanShiftBonus = 0;
  if (!state.flags.scramSignalActive && !state.flags.hpciRunning && !state.flags.rcicRunning && state.events.activeEvents.length === 0) {
    cleanShiftBonus = 200;
  }

  let total = baseScore + scramPenalty + unnecessaryEccsPenalty + instrumentIgnorePenalty + alarmTriageScore + procedureCompliance + consequenceManagement + crisisBonus + cleanShiftBonus;

  let grade = 'F';
  if (total >= 1800) grade = 'S';
  else if (total >= 1400) grade = 'A';
  else if (total >= 1000) grade = 'B';
  else if (total >= 600) grade = 'C';

  return {
    baseScore,
    scramPenalty,
    unnecessaryEccsPenalty,
    instrumentIgnorePenalty,
    alarmTriageScore,
    procedureCompliance,
    consequenceManagement,
    crisisBonus,
    cleanShiftBonus,
    total,
    grade
  };
};
