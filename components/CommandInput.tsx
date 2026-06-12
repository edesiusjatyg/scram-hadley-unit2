'use client';

import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export default function CommandInput() {
  const { submitCommand, plant } = useGameStore();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep focus on input
  useEffect(() => {
    const focusInput = () => inputRef.current?.focus();
    window.addEventListener('click', focusInput);
    return () => window.removeEventListener('click', focusInput);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (input.trim() === '') return;
      submitCommand(input);
      setHistory(prev => [input, ...prev.slice(0, 19)]);
      setHistoryIdx(-1);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIdx < history.length - 1) {
        const nextIdx = historyIdx + 1;
        setHistoryIdx(nextIdx);
        setInput(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInput(history[nextIdx]);
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setInput('');
      }
    }
  };

  const isLocked = plant.flags.scramSignalActive && plant.clock.shiftPhase !== 'post-scram' && plant.clock.tickCount % 2 === 0;

  return (
    <div className="flex items-center px-2 py-1 bg-[#0a0a0a]">
      <span className="mr-2">&gt;</span>
      <input
        ref={inputRef}
        type="text"
        className="flex-1 bg-transparent outline-none border-none text-[#33ff33] uppercase"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        spellCheck={false}
        autoComplete="off"
        disabled={isLocked}
        style={{ caretColor: '#33ff33' }}
      />
      {isLocked && <span className="ml-2 blink text-[#ff4444]">SYS LOCKED</span>}
    </div>
  );
}
