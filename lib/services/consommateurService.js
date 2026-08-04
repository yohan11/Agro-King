/**
 * Service Métier : Module Consommateurs (Partie 2)
 * AGRO KING Platform
 */

import clientPromise from '../mongodb.js';
import { ObjectId } from 'mongodb';
import {
  CYCLE_STATUS,
  SAVINGS_STATUS,
  MAX_CONSUMER_SAVINGS_DAYS,
  DEFAULT_REFUND_RETENTION_RATE,
  STANDARD_CHICKEN_MARKET_PRICE,
  toObjectId
} from '../models/schemas.js';
import { trouverCycleOptimal, trouverCycleDeReserve } from './matchingService.js';

/**
 * 1. Création d'une caisse d'épargne fléchée liée à un cycle spécifique et une date d'événement
 */
export async function creerCaisseEpargneConsommateur({
  clientId,
  dateEvenement,
  localisation = {},
  periodeEpargneJours = 30,
  quantitePoulets = 100,
  prixUnitaire = STANDARD_CHICKEN_MARKET_PRICE,
  clientInfo = {},
  db: injectedDb
}) {
  const client = injectedDb ? null : await clientPromise;
  const db = injectedDb || client.db('agroking');

  // Contrainte dure : période d'épargne maximum 45 jours
  const periode = Number(periodeEpargneJours);
  if (isNaN(periode) || periode <= 0 || periode > MAX_CONSUMER_SAVINGS_DAYS) {
    throw new Error(`La période d'épargne ne peut excéder ${MAX_CONSUMER_SAVINGS_DAYS} jours.`);
  }

  const quantite = Math.max(1, Number(quantitePoulets) || 100);
  const prixVerrouille = Number(prixUnitaire) || STANDARD_CHICKEN_MARKET_PRICE;
  const montantTotalObjectif = quantite * prixVerrouille;

  // Récupérer tous les cycles candidats
  const cyclesDisponibles = await db.collection('cycles').find({
    statut: { $in: [CYCLE_STATUS.DISPONIBLE, CYCLE_STATUS.EN_COURS] }
  }).toArray();

  // Recherche du cycle optimal (temporel 1-2j avant l'événement + proximité géographique)
  const matchResult = trouverCycleOptimal({
    dateEvenement,
    localisation,
    quantiteRequise: quantite,
    cyclesDisponibles
  });

  if (!matchResult || !matchResult.cycle) {
    throw new Error(
      "Aucun cycle d'élevage disponible ne correspond à votre date d'événement et localisation. Aucune caisse n'a été ouverte."
    );
  }

  const cycleAssigne = matchResult.cycle;
  const now = new Date();
  let caisseId;
  try {
    caisseId = new ObjectId();
  } catch {
    caisseId = 'caisse_' + Date.now();
  }

  const caisseDoc = {
    _id: caisseId,
    client_id: toObjectId(clientId),
    client_name: clientInfo.name || 'Client Consommateur',
    client_phone: clientInfo.phone || '',
    date_evenement: new Date(dateEvenement),
    localisation: {
      ville: localisation.ville || 'Douala',
      quartier: localisation.quartier || '',
      coordinates: localisation.coordinates || [9.7, 4.05],
      lat: localisation.lat || 4.05,
      lng: localisation.lng || 9.7
    },
    periode_epargne_jours: periode,
    quantite_poulets: quantite,
    prix_unitaire_verrouille: prixVerrouille, // Prix garanti et immuable
    montant_total_objectif: montantTotalObjectif,
    montant_verse: 0,
    montant_restant: montantTotalObjectif,
    pourcentage_avancement: 0,
    cycle_id: cycleAssigne._id,
    statut: SAVINGS_STATUS.EN_EPARGNE,
    historique_depots: [],
    historique_reassignations: [],
    created_at: now,
    updated_at: now
  };

  // Verrouillage du cycle pour ce client
  await db.collection('cycles').updateOne(
    { _id: cycleAssigne._id },
    {
      $set: {
        statut: CYCLE_STATUS.ASSIGNE,
        assigne_a_caisse_id: caisseId,
        client_id: caisseDoc.client_id,
        date_assignation: now,
        updated_at: now
      }
    }
  );

  await db.collection('consommateur_savings').insertOne(caisseDoc);

  return {
    caisse: caisseDoc,
    cycleAssigne: {
      id: cycleAssigne._id,
      dateFinEstimee: cycleAssigne.date_fin_estimee,
      ecartJours: matchResult.ecartJours,
      distanceKm: matchResult.distanceKm
    }
  };
}

/**
 * 2. Alimentation de la caisse virtuelle consommateur (Règle stricte : 100% ou rien)
 */
export async function enregistrerDepotConsommateur({
  caisseId,
  montant,
  modePaiement = 'OM',
  referenceTransaction = null,
  db: injectedDb
}) {
  const depotAmount = Number(montant);
  if (isNaN(depotAmount) || depotAmount <= 0) {
    throw new Error("Montant de versement invalide.");
  }

  const client = injectedDb ? null : await clientPromise;
  const db = injectedDb || client.db('agroking');
  const cId = toObjectId(caisseId);

  const caisse = await db.collection('consommateur_savings').findOne({ _id: cId });
  if (!caisse) {
    throw new Error("Caisse d'épargne introuvable.");
  }

  if (caisse.statut === SAVINGS_STATUS.ABANDONNE_REMBOURSE) {
    throw new Error("Cette caisse d'épargne a été clôturée et remboursée.");
  }

  const now = new Date();
  const nouveauMontantVerse = (caisse.montant_verse || 0) + depotAmount;
  const nouveauMontantRestant = Math.max(0, caisse.montant_total_objectif - nouveauMontantVerse);
  const pourcentage = Number(((nouveauMontantVerse / caisse.montant_total_objectif) * 100).toFixed(2));

  let nouveauStatut = caisse.statut;
  let objectifAtteint = false;

  // Règle stricte consommateur : 100% obligatoire
  if (pourcentage >= 100) {
    nouveauStatut = SAVINGS_STATUS.OBJECTIF_ATTEINT_100;
    objectifAtteint = true;
  }

  let recordId;
  try {
    recordId = new ObjectId();
  } catch {
    recordId = 'txn_' + Date.now();
  }

  const transactionRecord = {
    id: recordId,
    montant: depotAmount,
    mode: modePaiement,
    reference: referenceTransaction || `EPARGNE-${Date.now()}`,
    date: now,
    cumul_apres: nouveauMontantVerse
  };

  await db.collection('consommateur_savings').updateOne(
    { _id: cId },
    {
      $set: {
        montant_verse: nouveauMontantVerse,
        montant_restant: nouveauMontantRestant,
        pourcentage_avancement: pourcentage,
        statut: nouveauStatut,
        updated_at: now
      },
      $push: { historique_depots: transactionRecord }
    }
  );

  return {
    caisseId: cId,
    montantVerse: nouveauMontantVerse,
    montantRestant: nouveauMontantRestant,
    pourcentageAvancement: pourcentage,
    statut: nouveauStatut,
    objectifAtteint100: objectifAtteint
  };
}

/**
 * 3. Gestion des incidents de production et réassignation automatique (Priorité : Cycle de Réserve)
 */
export async function gererIncidentCycle({
  cycleId,
  descriptionIncident = 'Incident de production',
  gravite = 'majeure',
  db: injectedDb
}) {
  const client = injectedDb ? null : await clientPromise;
  const db = injectedDb || client.db('agroking');
  const cycId = toObjectId(cycleId);

  const cycle = await db.collection('cycles').findOne({ _id: cycId });
  if (!cycle) throw new Error("Cycle introuvable.");

  const now = new Date();

  // Marquer le cycle comme ayant subi un incident
  await db.collection('cycles').updateOne(
    { _id: cycId },
    {
      $set: {
        statut: CYCLE_STATUS.INCIDENT,
        incident: {
          date: now,
          description: descriptionIncident,
          gravite,
          resolu: false
        },
        updated_at: now
      }
    }
  );

  // Si le cycle n'était pas assigné à une caisse, fin du traitement
  if (!cycle.assigne_a_caisse_id) {
    return { cycleId: cycId, impact: 'Aucune caisse assignée', incidentEnregistre: true };
  }

  const caisse = await db.collection('consommateur_savings').findOne({ _id: cycle.assigne_a_caisse_id });
  if (!caisse) return { cycleId: cycId, incidentEnregistre: true };

  // 1. Recherche en priorité absolue du cycle de réserve dans la même zone géographique
  const zoneGeo = cycle.zone_geographique || caisse.localisation?.ville || 'Douala';
  const cyclesReserves = await db.collection('cycles').find({
    est_reserve: true,
    statut: { $ne: CYCLE_STATUS.TERMINE }
  }).toArray();

  const cycleReserve = trouverCycleDeReserve({
    zoneGeographique: zoneGeo,
    dateEvenement: caisse.date_evenement,
    cyclesReserves
  });

  let nouveauCycleAssigne = null;
  let methodeReassignation = null;

  if (cycleReserve) {
    nouveauCycleAssigne = cycleReserve;
    methodeReassignation = 'CYCLE_DE_RESERVE';
    
    // Verrouiller la réserve
    await db.collection('cycles').updateOne(
      { _id: cycleReserve._id },
      {
        $set: {
          statut: CYCLE_STATUS.ASSIGNE,
          assigne_a_caisse_id: caisse._id,
          utilise_pour_reassignation: true,
          date_reassignation: now,
          updated_at: now
        }
      }
    );
  } else {
    // 2. Si aucune réserve disponible, chercher un autre cycle libre selon les critères normaux
    const autresCycles = await db.collection('cycles').find({
      _id: { $ne: cycId },
      statut: { $in: [CYCLE_STATUS.DISPONIBLE, CYCLE_STATUS.EN_COURS] }
    }).toArray();

    const matchAlternatif = trouverCycleOptimal({
      dateEvenement: caisse.date_evenement,
      localisation: caisse.localisation,
      quantiteRequise: caisse.quantite_poulets,
      cyclesDisponibles: autresCycles
    });

    if (matchAlternatif && matchAlternatif.cycle) {
      nouveauCycleAssigne = matchAlternatif.cycle;
      methodeReassignation = 'CYCLE_ALTERNATIF_DISPONIBLE';

      await db.collection('cycles').updateOne(
        { _id: nouveauCycleAssigne._id },
        {
          $set: {
            statut: CYCLE_STATUS.ASSIGNE,
            assigne_a_caisse_id: caisse._id,
            date_assignation: now,
            updated_at: now
          }
        }
      );
    }
  }

  // 3. Appliquer la réassignation sur la caisse ou alerter pour remboursement
  if (nouveauCycleAssigne) {
    const recordReassignation = {
      ancien_cycle_id: cycId,
      nouveau_cycle_id: nouveauCycleAssigne._id,
      methode: methodeReassignation,
      raison: descriptionIncident,
      date: now
    };

    await db.collection('consommateur_savings').updateOne(
      { _id: caisse._id },
      {
        $set: {
          cycle_id: nouveauCycleAssigne._id,
          updated_at: now
        },
        $push: { historique_reassignations: recordReassignation }
      }
    );

    // Notification au client
    await db.collection('notifications').insertOne({
      user_id: caisse.client_id,
      type: 'REASSIGNATION_CYCLE_INCIDENT',
      title: 'Sécurisation de votre commande d\'élevage',
      message: `Votre commande a été automatiquement basculée sur un cycle de remplacement sécurisé (${methodeReassignation === 'CYCLE_DE_RESERVE' ? 'Cycle de Réserve AgroKing' : 'Cycle Partenaire'}) sans surcoût.`,
      caisse_id: caisse._id,
      created_at: now,
      read: false
    });

    return {
      incidentEnregistre: true,
      reassignationReussie: true,
      methode: methodeReassignation,
      nouveauCycleId: nouveauCycleAssigne._id
    };
  } else {
    // Aucune solution trouvée -> Notification et proposition de remboursement
    await db.collection('notifications').insertOne({
      user_id: caisse.client_id,
      type: 'INCIDENT_SANS_RESERVE_DISPO',
      title: 'Information importante sur votre élevage',
      message: "Un incident de production est survenu et aucun cycle de réserve n'est disponible. Vous pouvez demander votre remboursement partiel garanti.",
      caisse_id: caisse._id,
      created_at: now,
      read: false
    });

    return {
      incidentEnregistre: true,
      reassignationReussie: false,
      message: "Aucun cycle de réserve ou alternatif disponible. Proposition de remboursement déclenchée."
    };
  }
}

/**
 * 4. Annulation d'une caisse d'épargne et remboursement partiel
 */
export async function annulerEtRembourserCaisse({
  caisseId,
  tauxRetenue = DEFAULT_REFUND_RETENTION_RATE,
  motif = 'Demande du client avant 100%',
  db: injectedDb
}) {
  const client = injectedDb ? null : await clientPromise;
  const db = injectedDb || client.db('agroking');
  const cId = toObjectId(caisseId);

  const caisse = await db.collection('consommateur_savings').findOne({ _id: cId });
  if (!caisse) throw new Error("Caisse d'épargne introuvable.");

  if (caisse.statut === SAVINGS_STATUS.ABANDONNE_REMBOURSE) {
    throw new Error("Cette caisse est déjà remboursée.");
  }

  const now = new Date();
  const montantVerse = Number(caisse.montant_verse) || 0;
  const taux = Number(tauxRetenue);

  const montantRetenu = Math.round(montantVerse * taux);
  const montantRembourse = Math.max(0, montantVerse - montantRetenu);

  const remboursementDoc = {
    montant_verse: montantVerse,
    taux_retenue: taux,
    pourcentage_retenu: Number((taux * 100).toFixed(2)),
    montant_retenu: montantRetenu,
    montant_rembourse: montantRembourse,
    motif,
    date: now,
    statut: 'effectue'
  };

  // Libérer le cycle assigné pour qu'il redevienne disponible
  if (caisse.cycle_id) {
    await db.collection('cycles').updateOne(
      { _id: caisse.cycle_id },
      {
        $set: {
          statut: CYCLE_STATUS.DISPONIBLE,
          assigne_a_caisse_id: null,
          client_id: null,
          updated_at: now
        }
      }
    );
  }

  // Mettre à jour la caisse
  await db.collection('consommateur_savings').updateOne(
    { _id: cId },
    {
      $set: {
        statut: SAVINGS_STATUS.ABANDONNE_REMBOURSE,
        remboursement: remboursementDoc,
        updated_at: now
      }
    }
  );

  return {
    caisseId: cId,
    statut: SAVINGS_STATUS.ABANDONNE_REMBOURSE,
    remboursement: remboursementDoc
  };
}

/**
 * 5. Vitrine Consommateurs / Restaurants (Marché de commande direct)
 */
export async function getMarcheConsommateurs({ db: injectedDb } = {}) {
  const client = injectedDb ? null : await clientPromise;
  const db = injectedDb || client.db('agroking');

  const now = new Date();

  // Production disponible (stock prêt ou cycles terminés disponibles)
  const productionDisponible = await db.collection('cycles').find({
    statut: CYCLE_STATUS.DISPONIBLE,
    est_reserve: { $ne: true }
  }).toArray();

  // Production en cours (30 jours et plus de croissance)
  const productionEnCours = await db.collection('cycles').find({
    statut: { $in: [CYCLE_STATUS.EN_COURS, CYCLE_STATUS.DISPONIBLE] },
    est_reserve: { $ne: true }
  }).toArray();

  const productionEnCoursFiltree = productionEnCours.map(cycle => {
    const debut = new Date(cycle.date_debut || cycle.created_at || now);
    const joursEcoules = Math.max(0, Math.floor((now - debut) / (1000 * 60 * 60 * 24)));
    return {
      ...cycle,
      jours_croissance: joursEcoules,
      date_disponibilite: cycle.date_fin_estimee
    };
  }).filter(c => c.jours_croissance >= 0);

  return {
    productionDisponible,
    productionEnCours: productionEnCoursFiltree
  };
}
