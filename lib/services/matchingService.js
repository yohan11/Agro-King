/**
 * Moteur de Matching Temporel et Géographique
 * AGRO KING - Module Consommateurs (Partie 2)
 */

import { CYCLE_STATUS } from '../models/schemas.js';

/**
 * Calcule la distance approximative en kilomètres entre deux points GPS (formule de Haversine)
 */
export function calculerDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 9999;
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calcule la différence en jours entre deux dates (dateB - dateA)
 */
export function differenceEnJours(dateA, dateB) {
  const tA = new Date(dateA).setHours(0, 0, 0, 0);
  const tB = new Date(dateB).setHours(0, 0, 0, 0);
  return Math.round((tB - tA) / (1000 * 60 * 60 * 24));
}

/**
 * Recherche et sélectionne le cycle d'élevage optimal selon les critères stricts :
 * 1. Termine 1 à 2 jours avant la date de l'événement (ou tolérance 0 à 3 jours si spécifié)
 * 2. Le plus proche géographiquement du client
 * 3. Non déjà assigné à un autre consommateur
 * 
 * @param {Object} params
 * @param {Date|string} params.dateEvenement Date de l'événement cible
 * @param {Object} params.localisation Coordonnées ou quartier { ville, quartier, lat, lng }
 * @param {number} params.quantiteRequise Nombre de poulets souhaités
 * @param {Array<Object>} params.cyclesDisponibles Liste des cycles disponibles
 * @param {Object} [params.options] Options additionnelles (tolérance jours, exclure réserves)
 * 
 * @returns {Object|null} Le cycle candidat optimal avec son score et délai, ou null si aucun cycle compatible
 */
export function trouverCycleOptimal({
  dateEvenement,
  localisation = {},
  quantiteRequise = 100,
  cyclesDisponibles = [],
  options = {}
}) {
  if (!dateEvenement || !cyclesDisponibles || cyclesDisponibles.length === 0) {
    return null;
  }

  const dateCible = new Date(dateEvenement);
  const latClient = localisation.lat || (localisation.coordinates ? localisation.coordinates[1] : null);
  const lngClient = localisation.lng || (localisation.coordinates ? localisation.coordinates[0] : null);
  const villeClient = (localisation.ville || 'Douala').toLowerCase();

  const candidats = cyclesDisponibles.filter(cycle => {
    // Ne pas prendre les cycles de réserve sauf si explicitement demandé
    if (cycle.est_reserve && !options.inclureReserves) return false;
    
    // Le cycle doit être disponible / non assigné
    if (cycle.statut !== CYCLE_STATUS.DISPONIBLE && cycle.statut !== CYCLE_STATUS.EN_COURS) {
      return false;
    }
    if (cycle.assigne_a_caisse_id) return false; // Déjà verrouillé pour une autre caisse

    // Vérifier la capacité minimale
    const capacite = cycle.chicks_count || cycle.poulets_disponibles || 100;
    if (capacite < quantiteRequise) return false;

    // Date de fin estimée
    const dateFinCycle = new Date(cycle.date_fin_estimee || cycle.date_fin);
    const ecartJours = differenceEnJours(dateFinCycle, dateCible);

    // Contrainte temporelle : Idéalement le cycle se termine 1 à 2 jours avant l'événement
    // (Tolérance par défaut : 1 <= ecartJours <= 3)
    const maxEcart = options.maxEcartJours !== undefined ? options.maxEcartJours : 3;
    const minEcart = options.minEcartJours !== undefined ? options.minEcartJours : 1;

    return ecartJours >= minEcart && ecartJours <= maxEcart;
  });

  if (candidats.length === 0) {
    return null;
  }

  // Trier les candidats par ordre de priorité :
  // 1. Écart idéal (1 à 2 jours avant)
  // 2. Proximité géographique
  const candidatsAvecScore = candidats.map(cycle => {
    const dateFinCycle = new Date(cycle.date_fin_estimee || cycle.date_fin);
    const ecartJours = differenceEnJours(dateFinCycle, dateCible);

    const latCycle = cycle.localisation?.lat || (cycle.localisation?.coordinates ? cycle.localisation.coordinates[1] : null);
    const lngCycle = cycle.localisation?.lng || (cycle.localisation?.coordinates ? cycle.localisation.coordinates[0] : null);
    const distanceKm = calculerDistanceKm(latClient, lngClient, latCycle, lngCycle);

    const memeVille = (cycle.zone_geographique || cycle.localisation?.ville || 'Douala').toLowerCase() === villeClient;

    // Score temporel : 1 ou 2 jours avant = score parfait (0 point de pénalité)
    let scoreTemporel = 0;
    if (ecartJours === 1 || ecartJours === 2) {
      scoreTemporel = 0;
    } else {
      scoreTemporel = Math.abs(ecartJours - 1.5) * 10;
    }

    // Score géographique : pénalité distance en km (avec bonus de même ville)
    let scoreGeo = distanceKm;
    if (!memeVille) scoreGeo += 500;

    const scoreTotal = scoreTemporel + scoreGeo;

    return {
      cycle,
      ecartJours,
      distanceKm,
      scoreTotal
    };
  });

  // Tri par score total croissant (le plus petit score = le meilleur match)
  candidatsAvecScore.sort((a, b) => a.scoreTotal - b.scoreTotal);

  return candidatsAvecScore[0];
}

/**
 * Recherche spécifique d'un cycle de réserve pour la réassignation en cas d'incident
 */
export function trouverCycleDeReserve({
  zoneGeographique = 'Douala',
  dateEvenement,
  cyclesReserves = []
}) {
  if (!cyclesReserves || cyclesReserves.length === 0) return null;

  const dateCible = new Date(dateEvenement);
  const zoneRecherchee = (zoneGeographique || 'Douala').toLowerCase();

  const reservesCompatibles = cyclesReserves.filter(cycle => {
    if (!cycle.est_reserve) return false;
    if (cycle.statut === CYCLE_STATUS.TERMINE || cycle.statut === CYCLE_STATUS.INCIDENT) return false;
    if (cycle.utilise_pour_reassignation) return false;

    const zoneCycle = (cycle.zone_geographique || cycle.localisation?.ville || 'Douala').toLowerCase();
    if (zoneCycle !== zoneRecherchee) return false;

    // Vérifier compatibilité de date de fin
    const dateFinCycle = new Date(cycle.date_fin_estimee || cycle.date_fin);
    const ecartJours = differenceEnJours(dateFinCycle, dateCible);

    // Compatible si se termine au moins 0 à 4 jours avant l'événement
    return ecartJours >= 0 && ecartJours <= 4;
  });

  if (reservesCompatibles.length === 0) return null;

  // Prendre la plus proche temporellement
  reservesCompatibles.sort((a, b) => {
    const diffA = Math.abs(differenceEnJours(new Date(a.date_fin_estimee), dateCible) - 1.5);
    const diffB = Math.abs(differenceEnJours(new Date(b.date_fin_estimee), dateCible) - 1.5);
    return diffA - diffB;
  });

  return reservesCompatibles[0];
}
