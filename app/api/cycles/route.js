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

function calculateCycleProgress(startDateStr, chicksCount, isReform = false) {
  const startDate = new Date(startDateStr);
  const today = new Date();
  const diffTime = Math.abs(today - startDate);
  const day = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1; 
  const currentDay = Math.max(0, day);
  
  let currentStage = 'Terminé';
  let sacsNeeded = 0;
  let reminderActive = false;
  let nextStageSacs = 0;
  let canActivateReform = false;
  
  const multiplier = (chicksCount || 100) / 100;
  
  if (currentDay <= 14) {
    currentStage = 'Stade 1 : 0–14 jours (Démarrage)';
    sacsNeeded = 1 * multiplier;
    if (currentDay >= 12 && currentDay <= 14) {
      reminderActive = true;
      nextStageSacs = 4 * multiplier; // 4 sacs Croissance
    }
  } else if (currentDay <= 28) {
    currentStage = 'Stade 2 : 15–28 jours (Croissance)';
    sacsNeeded = 4 * multiplier;
    if (currentDay >= 26 && currentDay <= 28) {
      reminderActive = true;
      nextStageSacs = 5 * multiplier; // 5 sacs Finition
    }
  } else if (currentDay <= 45) {
    currentStage = 'Stade 3 : 29–45 jours (Finition Standard)';
    sacsNeeded = 5 * multiplier;
    canActivateReform = true;
    if (currentDay >= 42 && currentDay <= 45) {
      reminderActive = true;
      nextStageSacs = 4 * multiplier; // 4 sacs Finition pour Réforme
    }
  } else if (isReform && currentDay <= 60) {
    currentStage = 'Stade 4 : 46–60 jours (Extension Réforme - Poulets Lourds)';
    sacsNeeded = 4 * multiplier;
  } else {
    currentStage = isReform ? 'Cycle Réforme Terminé (Prêt pour vente ~6 500 F)' : 'Cycle Standard Terminé (Prêt pour vente ~3 500 F)';
  }

  return { currentDay, currentStage, sacsNeeded, reminderActive, nextStageSacs, canActivateReform };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cycles = await db.getTable('cycles');
  const users = await db.getTable('users');

  let filteredCycles = cycles;
  if (user.role === 'Farmer') {
    filteredCycles = cycles.filter(c => (c.user_id && c.user_id.toString() === user.id.toString()) || (c.farmer_phone && c.farmer_phone === user.phone));
  }

  const enrichedCycles = filteredCycles.map(cycle => {
    const owner = users.find(u => (u._id && u._id.toString() === cycle.user_id?.toString()) || (u.id && u.id.toString() === cycle.user_id?.toString()));
    const progress = calculateCycleProgress(cycle.start_date, cycle.chicks, cycle.is_reform);
    const initialChicks = cycle.chicks || 100;
    const mortality = cycle.mortality_count || 0;
    const liveBirds = Math.max(0, initialChicks - mortality);
    const survivalRate = Math.round((liveBirds / initialChicks) * 100);

    return {
      ...cycle,
      farmer_name: owner ? owner.name : (cycle.farmer_name || 'Inconnu'),
      current_day: progress.currentDay,
      current_stage: progress.currentStage,
      sacs_needed: progress.sacsNeeded,
      reminder_active: progress.reminderActive,
      next_stage_sacs: progress.nextStageSacs,
      can_activate_reform: progress.canActivateReform,
      mortality_count: mortality,
      live_birds: liveBirds,
      survival_rate: survivalRate
    };
  });
  
  return NextResponse.json(enrichedCycles);
}

export async function PATCH(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { cycleId, mortality_count, is_reform, sale_price_per_bird } = body;

    if (!cycleId) {
      return NextResponse.json({ error: 'Cycle ID requis' }, { status: 400 });
    }

    const updates = {};
    if (mortality_count !== undefined) updates.mortality_count = Number(mortality_count);
    if (is_reform !== undefined) updates.is_reform = Boolean(is_reform);
    if (sale_price_per_bird !== undefined) updates.sale_price_per_bird = Number(sale_price_per_bird);
    if (body.visible_marche !== undefined) updates.visible_marche = Boolean(body.visible_marche);

    const updated = await db.updateDocument('cycles', cycleId, updates);
    return NextResponse.json({ success: true, cycle: updated });
  } catch (err) {
    console.error('Error updating cycle:', err);
    return NextResponse.json({ error: 'Erreur mise à jour cycle' }, { status: 500 });
  }
}
