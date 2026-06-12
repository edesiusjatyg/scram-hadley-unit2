import { PlantState } from '../../types/plant';

export interface ScoreBreakdown {
  baseScore: number;
  scramPenalty: number;
  alarmManagement: number;
  procedureCompliance: number;
  stabilityBonus: number;
  efficiencyBonus: number;
  total: number;
  grade: string;
}

export const calculateScore = (state: PlantState): ScoreBreakdown => {
  let baseScore = 1000;
  let scramPenalty = state.flags.scramSignalActive ? -100 : 0;
  
  // Calculate alarm management score
  let alarmManagement = 0;
  state.alarms.forEach(a => {
    // Highly simplified: assuming acknowledged means it was managed okay for now.
    // In a full tracker we'd check how many ticks it took to acknowledge.
    if (a.acknowledged) {
      alarmManagement += 5;
    } else {
      alarmManagement -= 10;
    }
  });

  // Simplified bonuses
  let stabilityBonus = (state.flags.scramSignalActive || state.alarms.length > 5) ? 0 : 200;
  let efficiencyBonus = (state.flags.rcicRunning || state.flags.hpciRunning || state.flags.lpciRunning || state.flags.coreSprayRunning) ? 0 : 100;

  // Simplified procedure compliance
  let procedureCompliance = 0;
  if (state.flags.scramSignalActive && state.core.rodPosition === 0) {
    procedureCompliance += 50; // successfully scrammed
  }

  let total = baseScore + scramPenalty + alarmManagement + procedureCompliance + stabilityBonus + efficiencyBonus;

  let grade = 'F';
  if (total >= 1300) grade = 'A';
  else if (total >= 1000) grade = 'B';
  else if (total >= 800) grade = 'C';
  else if (total >= 500) grade = 'D';

  return {
    baseScore,
    scramPenalty,
    alarmManagement,
    procedureCompliance,
    stabilityBonus,
    efficiencyBonus,
    total,
    grade
  };
};
