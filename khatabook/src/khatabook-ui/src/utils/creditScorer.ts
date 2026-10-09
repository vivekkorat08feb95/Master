import { Party } from '../types';

export interface CreditRiskAssessment {
  score: number; // 0 - 100 (100 = safest)
  tier: 'SAFE' | 'MODERATE' | 'HIGH_RISK';
  label: string;
  color: 'emerald' | 'amber' | 'rose';
  recommendation: string;
  limitUtilizationPct: number;
}

export function assessPartyCreditRisk(party: Party): CreditRiskAssessment {
  const balance = party.currentBalance || 0;
  const limit = party.creditLimit || 0;

  // If customer doesn't owe any money, they are totally safe
  if (balance <= 0) {
    return {
      score: 95,
      tier: 'SAFE',
      label: 'Excellent Credit (Settled)',
      color: 'emerald',
      recommendation: 'Safe to extend full credit terms. No overdue amounts.',
      limitUtilizationPct: 0,
    };
  }

  // Calculate limit utilization percentage
  let limitUtilization = 0;
  if (limit > 0) {
    limitUtilization = Math.round((balance / limit) * 100);
  }

  let score = 80;

  if (limit > 0) {
    if (limitUtilization >= 100) {
      score -= 50;
    } else if (limitUtilization >= 75) {
      score -= 30;
    } else if (limitUtilization >= 50) {
      score -= 15;
    }
  } else {
    // No limit set, but owes significant balance
    if (balance > 25000) score -= 45;
    else if (balance > 10000) score -= 25;
    else if (balance > 3000) score -= 10;
  }

  score = Math.max(10, Math.min(100, score));

  if (score >= 70) {
    return {
      score,
      tier: 'SAFE',
      label: 'Low Risk (Good Standing)',
      color: 'emerald',
      recommendation: 'Regular payer. Safe for normal Udhaar transactions.',
      limitUtilizationPct: limitUtilization,
    };
  } else if (score >= 45) {
    return {
      score,
      tier: 'MODERATE',
      label: 'Moderate Risk (Watchlist)',
      color: 'amber',
      recommendation: 'Balance growing. Request partial payment before extending new credit.',
      limitUtilizationPct: limitUtilization,
    };
  } else {
    return {
      score,
      tier: 'HIGH_RISK',
      label: 'High Risk (Credit Alert)',
      color: 'rose',
      recommendation: 'Credit limit reached or heavy dues. Settle existing balance first!',
      limitUtilizationPct: limitUtilization,
    };
  }
}
