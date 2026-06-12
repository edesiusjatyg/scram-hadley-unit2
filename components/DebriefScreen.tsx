'use client';

import { useGameStore } from '../store/gameStore';
import { calculateScore } from '../lib/scoring/scoreCalculator';

export default function DebriefScreen() {
  const { gameOverReason, plant } = useGameStore();

  const success = gameOverReason === 'SHIFT COMPLETED.';
  const scoreBreakdown = calculateScore(plant);

  return (
    <div className="flex flex-col h-screen w-full items-center justify-center border-2 border-[#33ff33] p-4 text-center overflow-y-auto py-10">
      <h1 className={`text-2xl mb-4 ${success ? 'text-[#33ff33]' : 'text-[#ff4444]'}`}>
        {success ? 'SHIFT COMPLETED SUCCESSFULLY' : 'CRITICAL FAILURE'}
      </h1>
      
      <p className="mb-8">{gameOverReason}</p>

      <div className="text-left border border-[#33ff33] p-4 inline-block w-[500px]">
        <div className="underline mb-2">SHIFT DEBRIEF</div>
        <div className="flex justify-between mb-1">
          <span>OPERATOR:</span>
          <span>PLAYER</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>TIME ELAPSED:</span>
          <span>{plant.clock.gameTimeMinutes} MIN</span>
        </div>
        
        <div className="border-t border-[#33ff33] my-2"></div>
        
        <div className="flex justify-between mb-1">
          <span>BASE SCORE:</span>
          <span>{scoreBreakdown.baseScore}</span>
        </div>
        <div className="flex justify-between mb-1 text-[#ff4444]">
          <span>SCRAM PENALTY:</span>
          <span>{scoreBreakdown.scramPenalty}</span>
        </div>
        <div className="flex justify-between mb-1 text-[#ff4444]">
          <span>UNNECESSARY ECCS PENALTY:</span>
          <span>{scoreBreakdown.unnecessaryEccsPenalty}</span>
        </div>
        <div className="flex justify-between mb-1 text-[#ff4444]">
          <span>INSTRUMENT IGNORE PENALTY:</span>
          <span>{scoreBreakdown.instrumentIgnorePenalty}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>ALARM TRIAGE SCORE:</span>
          <span>{scoreBreakdown.alarmTriageScore > 0 ? '+' : ''}{scoreBreakdown.alarmTriageScore}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>PROCEDURE COMPLIANCE:</span>
          <span>+{scoreBreakdown.procedureCompliance}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>CONSEQUENCE MANAGEMENT:</span>
          <span>+{scoreBreakdown.consequenceManagement}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>CRISIS BONUS:</span>
          <span>+{scoreBreakdown.crisisBonus}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>CLEAN SHIFT BONUS:</span>
          <span>+{scoreBreakdown.cleanShiftBonus}</span>
        </div>

        <div className="border-t border-[#33ff33] my-2"></div>

        <div className="flex justify-between mb-1 font-bold text-lg">
          <span>FINAL SCORE:</span>
          <span>{scoreBreakdown.total} PTS</span>
        </div>
        <div className="flex justify-between mt-4">
          <span>GRADE:</span>
          <span className={['S', 'A', 'B'].includes(scoreBreakdown.grade) ? 'text-[#33ff33] font-bold' : 'text-[#ff4444] font-bold'}>
            {scoreBreakdown.grade}
          </span>
        </div>
      </div>

      <button 
        className="mt-8 border border-[#33ff33] px-4 py-2 hover:bg-[#33ff33] hover:text-[#0a0a0a]"
        onClick={() => window.location.reload()}
      >
        ACKNOWLEDGE & RESTART
      </button>
    </div>
  );
}
