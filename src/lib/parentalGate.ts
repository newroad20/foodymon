// Parental gate (Apple 1.3 / Google Families): an adult-level question before leaving the kid
// experience. Two-digit × one-digit products are hard to guess for young children.
export interface GateQuestion {
  a: number;
  b: number;
}

export function makeGateQuestion(rand: () => number = Math.random): GateQuestion {
  return { a: 12 + Math.floor(rand() * 8), b: 3 + Math.floor(rand() * 6) }; // 12–19 × 3–8
}

export function checkGate(q: GateQuestion, answer: string): boolean {
  return answer.trim() !== '' && Number(answer.trim()) === q.a * q.b;
}
