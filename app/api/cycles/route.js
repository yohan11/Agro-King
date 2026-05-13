import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function getSessionUser() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get('agroking_session');
  if (!cookie) return null;
  try {
    return JSON.parse(cookie.value);
  } catch {
    return null;
  }
}

function calculateCycleProgress(startDateStr, chicksCount) {
  const startDate = new Date(startDateStr);
  const today = new Date();
  const diffTime = Math.abs(today - startDate);
  const day = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1; 
  const currentDay = Math.max(0, day);
  
  let currentStage = 'Terminé';
  let sacsNeeded = 0;
  let reminderActive = false;
  let nextStageSacs = 0;
  
  const multiplier = (chicksCount || 100) / 100;
  
  if (currentDay <= 14) {
    currentStage = 'Stade 1 : 0–14 jours (Démarrage)';
    sacsNeeded = 1 * multiplier;
    if (currentDay === 13) {
      reminderActive = true;
      nextStageSacs = 2 * multiplier; // For Croissance
    }
  } else if (currentDay <= 25) {
    currentStage = 'Stade 2 : 14–25 jours (Croissance)';
    sacsNeeded = 2 * multiplier;
    if (currentDay === 24) {
      reminderActive = true;
      nextStageSacs = 2 * multiplier; // For Croissance 2
    }
  } else if (currentDay <= 35) {
    currentStage = 'Stade 3 : 25–35 jours (Croissance 2)';
    sacsNeeded = 2 * multiplier;
    if (currentDay === 34) {
      reminderActive = true;
      nextStageSacs = 5 * multiplier; // For Finition
    }
  } else if (currentDay <= 45) {
    currentStage = 'Stade 4 : 35–45 jours (Finition)';
    sacsNeeded = 5 * multiplier;
  } else {
    currentStage = 'Cycle Terminé';
  }

  return { currentDay, currentStage, sacsNeeded, reminderActive, nextStageSacs };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cycles = await db.getTable('cycles');
  const users = await db.getTable('users');

  let filteredCycles = cycles;
  if (user.role === 'Farmer') {
    filteredCycles = cycles.filter(c => c.user_id === user.id);
  }

  const enrichedCycles = filteredCycles.map(cycle => {
    const owner = users.find(u => u.id === cycle.user_id);
    const progress = calculateCycleProgress(cycle.start_date, cycle.chicks);
    return {
      ...cycle,
      farmer_name: owner ? owner.name : 'Inconnu',
      current_day: progress.currentDay,
      current_stage: progress.currentStage,
      sacs_needed: progress.sacsNeeded,
      reminder_active: progress.reminderActive,
      next_stage_sacs: progress.nextStageSacs
    };
  });
  
  return NextResponse.json(enrichedCycles);
}
