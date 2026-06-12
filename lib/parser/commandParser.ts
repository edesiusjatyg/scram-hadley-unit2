export interface ParsedCommand {
  verb: string;
  target?: string;
  value?: number;
  raw: string;
  valid: boolean;
  errorMessage?: string;
}

const COMMAND_ALIASES: Record<string, string> = {
  'SCR': 'SCRAM',
  'INS': 'INSERT',
  'WITH': 'WITHDRAW',
  'WD': 'WITHDRAW',
  'ACKNOWLEDGE': 'ACK',
  'STAT': 'STATUS',
};

const VALID_VERBS = [
  'SCRAM', 'INSERT', 'WITHDRAW', 'SET', 'TRIP', 'START', 'STOP',
  'OPEN', 'CLOSE', 'INITIATE', 'LOAD', 'CHECK', 'RESET', 'STATUS',
  'ALARMS', 'ACK', 'LOG', 'BYPASS', 'HELP', 'EOP', 'TIME', 'CREW'
];

export function parseCommand(input: string): ParsedCommand {
  const raw = input.trim();
  const normalized = raw.toUpperCase().replace(/\s+/g, ' ');
  const tokens = normalized.split(' ');

  if (tokens.length === 0 || tokens[0] === '') {
    return { verb: '', raw, valid: false, errorMessage: 'NO COMMAND ENTERED' };
  }

  let verbStr = tokens[0];
  
  // Resolve alias
  if (COMMAND_ALIASES[verbStr]) {
    verbStr = COMMAND_ALIASES[verbStr];
  }

  // Handle SCRAM RESET which is a two-word verb effectively, or SCRAM as single
  if (verbStr === 'SCRAM' && tokens[1] === 'RESET') {
    return { verb: 'SCRAM_RESET', raw, valid: true };
  }

  // Find closest valid verb
  const matchedVerb = VALID_VERBS.find(v => v.startsWith(verbStr));
  if (!matchedVerb) {
    return { verb: verbStr, raw, valid: false, errorMessage: `UNRECOGNIZED COMMAND: ${verbStr}. TYPE HELP FOR COMMAND LIST.` };
  }

  const result: ParsedCommand = { verb: matchedVerb, raw, valid: true };

  if (tokens.length > 1) {
    result.target = tokens[1];
  }

  if (tokens.length > 2) {
    const val = parseFloat(tokens[2]);
    if (!isNaN(val)) {
      result.value = val;
    } else {
      // If the value isn't a number but there's a third token, it might be a target modifier
      // For simplicity, we just store it as NaN or ignore
    }
  }

  return result;
}
