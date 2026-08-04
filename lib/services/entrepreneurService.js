/**
 * Service Métier : Module Entrepreneurs (Partie 1)
 * AGRO KING Platform
 */

import clientPromise from '../mongodb.js';
import { ObjectId } from 'mongodb';
import {
  PACK_PRICES,
  SUBSCRIPTION_STATUS,
  CYCLE_STATUS,
  OFFICIAL_PAYER_IDENTITY,
  THRESHOLD_UNLOCK_PERCENT,
  DEADLINE_DAYS_REMAINING_25,
  toObjectId
} from '../models/schemas.js';
import { calculerCompensationEnNature } from './compensationService.js';

/**
 * 1. Souscription d'un entrepreneur à un pack et initialisation de sa caisse virtuelle
 */
export async function creerSouscriptionPack({
  entrepreneurId,
  packType = 'pack-100',
  clauseAcceptee = false,
  entrepreneurInfo = {},
  db: injectedDb
}) {
  // Règle stricte : la clause de compensation en nature doit être acceptée explicitement
  if (!clauseAcceptee) {
    throw new Error("L'acceptation de la clause de compensation en nature est obligatoire pour souscrire.");
  }

  const packConfig = PACK_PRICES[packType] || PACK_PRICES['pack-100'];
  const montantTotal = packConfig.price;

  const client = injectedDb ? null : await clientPromise;
  const db = injectedDb || client.db('agroking');

  const now = new Date();
  let subId;
  try {
    subId = new ObjectId();
  } catch {
    subId = 'sub_' + Date.now();
  }

  const subscriptionDoc = {
    _id: subId,
    entrepreneur_id: toObjectId(entrepreneurId),
    entrepreneur_name: entrepreneurInfo.name || 'Entrepreneur Partenaire',
    entrepreneur_phone: entrepreneurInfo.phone || '',
    pack_type: packType,
    pack_name: packConfig.name,
    chicks_count: packConfig.chicksCount,
    montant_total_pack: montantTotal,
    montant_verse: 0,
    montant_restant: montantTotal,
    pourcentage_avancement: 0,
    clause_compensation_acceptee: true,
    clause_compensation_date: now,
    statut: SUBSCRIPTION_STATUS.EN_FINANCEMENT,
    cycle_id: null,
    date_deblocage_75: null,
    date_limite_solde: null,
    rappels_envoyes: [],
    historique_depots: [],
    created_at: now,
    updated_at: now
  };

  await db.collection('entrepreneur_subscriptions').insertOne(subscriptionDoc);
  return { id: subId, ...subscriptionDoc };
}

/**
 * 2. Alimentation de la caisse virtuelle de l'entrepreneur par tranches (OM/MOMO)
 */
export async function enregistrerDepotEntrepreneur({
  subscriptionId,
  montant,
  modePaiement = 'MOMO', // OM ou MOMO
  referenceTransaction = null,
  db: injectedDb
}) {
  const depotAmount = Number(montant);
  if (isNaN(depotAmount) || depotAmount <= 0) {
    throw new Error("Montant de dépôt invalide.");
  }

  const client = injectedDb ? null : await clientPromise;
  const db = injectedDb || client.db('agroking');
  const subId = toObjectId(subscriptionId);

  const subscription = await db.collection('entrepreneur_subscriptions').findOne({ _id: subId });
  if (!subscription) {
    throw new Error("Souscription entrepreneur introuvable.");
  }

  const now = new Date();
  const nouveauMontantVerse = (subscription.montant_verse || 0) + depotAmount;
  const nouveauMontantRestant = Math.max(0, subscription.montant_total_pack - nouveauMontantVerse);
  const pourcentage = Number(((nouveauMontantVerse / subscription.montant_total_pack) * 100).toFixed(2));

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
    reference: referenceTransaction || `DEPOT-${Date.now()}`,
    date: now,
    cumul_apres: nouveauMontantVerse
  };

  let nouveauStatut = subscription.statut;
  let doitDeclencher75 = false;

  // Déblocage à 75%
  if (pourcentage >= THRESHOLD_UNLOCK_PERCENT && subscription.statut === SUBSCRIPTION_STATUS.EN_FINANCEMENT) {
    nouveauStatut = SUBSCRIPTION_STATUS.DEBLOQUE_75;
    doitDeclencher75 = true;
  } else if (pourcentage >= 100 && (subscription.statut === SUBSCRIPTION_STATUS.DEBLOQUE_75 || subscription.statut === SUBSCRIPTION_STATUS.EN_RETARD)) {
    nouveauStatut = SUBSCRIPTION_STATUS.SOLDE_100;
  }

  // Mise à jour de la souscription
  await db.collection('entrepreneur_subscriptions').updateOne(
    { _id: subId },
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

  let orchestrationResult = null;
  if (doitDeclencher75) {
    orchestrationResult = await orchestrerSeuil75Atteint({
      subscriptionId: subId,
      db,
      client
    });
  }

  return {
    subscriptionId: subId,
    montantVerse: nouveauMontantVerse,
    montantRestant: nouveauMontantRestant,
    pourcentageAvancement: pourcentage,
    statut: nouveauStatut,
    seuil75Atteint: doitDeclencher75,
    orchestration: orchestrationResult
  };
}

/**
 * 3. Déblocage automatique et irréversible à 75% (Paiement Fournisseur sous nom AgroKing + Démarrage Cycle)
 */
export async function orchestrerSeuil75Atteint({ subscriptionId, db, client }) {
  if (!db) {
    const mongoClient = client || (await clientPromise);
    db = mongoClient.db('agroking');
  }

  const subId = toObjectId(subscriptionId);
  const subscription = await db.collection('entrepreneur_subscriptions').findOne({ _id: subId });
  if (!subscription) throw new Error("Souscription introuvable.");

  const packConfig = PACK_PRICES[subscription.pack_type] || PACK_PRICES['pack-100'];
  const now = new Date();

  // Date limite pour verser les 25% restants : Date de début du cycle + 15 jours
  const dateLimiteSolde = new Date(now.getTime() + DEADLINE_DAYS_REMAINING_25 * 24 * 60 * 60 * 1000);
  const dateFinEstimee = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000); // Cycle standard 45 jours

  // 1. Déblocage des fonds vers le fournisseur (AgroKing paie en son nom propre)
  const supplierPayoutDoc = {
    subscription_id: subId,
    entrepreneur_id: subscription.entrepreneur_id,
    fournisseur_nom: 'Couvoir & Aliments Partenaires AgroKing',
    payeur_officiel: OFFICIAL_PAYER_IDENTITY, // Règle stricte : L'identité de l'entrepreneur n'est pas dévoilée
    montant_paye: packConfig.supplierCost,
    pack_type: subscription.pack_type,
    statut: 'execute',
    date_paiement: now,
    created_at: now
  };
  const payoutResult = await db.collection('supplier_payouts').insertOne(supplierPayoutDoc);
  const payoutId = payoutResult.insertedId || supplierPayoutDoc._id;

  // 2. Démarrage du cycle d'élevage associé
  const cycleDoc = {
    entrepreneur_id: subscription.entrepreneur_id,
    subscription_id: subId,
    pack_type: subscription.pack_type,
    chicks_count: subscription.chicks_count,
    statut: CYCLE_STATUS.EN_COURS,
    est_reserve: false,
    zone_geographique: 'Douala',
    date_debut: now,
    date_fin_estimee: dateFinEstimee,
    date_limite_solde: dateLimiteSolde,
    deblocage_fournisseur_id: payoutId,
    created_at: now,
    updated_at: now
  };
  const cycleResult = await db.collection('cycles').insertOne(cycleDoc);
  const cycleId = cycleResult.insertedId || cycleDoc._id;

  // 3. Liaison sur la souscription avec verrouillage
  await db.collection('entrepreneur_subscriptions').updateOne(
    { _id: subId },
    {
      $set: {
        cycle_id: cycleId,
        date_deblocage_75: now,
        date_limite_solde: dateLimiteSolde,
        payout_fournisseur_id: payoutId,
        updated_at: now
      }
    }
  );

  return {
    cycleId,
    payoutId,
    dateDebutCycle: now,
    dateLimiteSolde,
    montantFournisseur: packConfig.supplierCost
  };
}

/**
 * 4. Job de vérification des échéances et envoi des rappels automatiques (J+10, J+13, J+15)
 */
export async function verifierEcheancesEtRappels({ db } = {}) {
  if (!db) {
    const client = await clientPromise;
    db = client.db('agroking');
  }

  const now = new Date();
  const souscriptionsActives = await db.collection('entrepreneur_subscriptions').find({
    statut: { $in: [SUBSCRIPTION_STATUS.DEBLOQUE_75, SUBSCRIPTION_STATUS.EN_RETARD] },
    montant_restant: { $gt: 0 }
  }).toArray();

  const resultats = [];

  for (const sub of souscriptionsActives) {
    if (!sub.date_deblocage_75 || !sub.date_limite_solde) continue;

    const diffJoursEcoules = Math.floor((now - new Date(sub.date_deblocage_75)) / (1000 * 60 * 60 * 24));
    const diffJoursRestants = Math.ceil((new Date(sub.date_limite_solde) - now) / (1000 * 60 * 60 * 24));

    let typeRappel = null;
    let message = null;

    if (diffJoursEcoules >= 15 && sub.statut !== SUBSCRIPTION_STATUS.EN_RETARD) {
      // Dépassé : passe en retard
      await db.collection('entrepreneur_subscriptions').updateOne(
        { _id: sub._id },
        { $set: { statut: SUBSCRIPTION_STATUS.EN_RETARD, updated_at: now } }
      );
      typeRappel = 'ECHEANCE_DEPASSEE';
      message = `Votre délai de 15 jours pour solder les 25% restants (${sub.montant_restant} FCFA) est expiré. La clause de compensation en nature sera appliquée à la fin du cycle.`;
    } else if (diffJoursEcoules >= 13) {
      typeRappel = 'RAPPEL_J13_URGENT';
      message = `Attention : il ne vous reste que 2 jours pour verser le solde de ${sub.montant_restant} FCFA avant application de la clause de compensation en nature.`;
    } else if (diffJoursEcoules >= 10) {
      typeRappel = 'RAPPEL_J10_AVANCE';
      message = `Rappel : vous avez jusqu'au ${new Date(sub.date_limite_solde).toLocaleDateString('fr-FR')} pour solder les 25% restants (${sub.montant_restant} FCFA).`;
    }

    if (typeRappel) {
      // Vérifier si ce rappel a déjà été envoyé aujourd'hui
      const dejaEnvoye = (sub.rappels_envoyes || []).some(r => r.type === typeRappel);
      if (!dejaEnvoye) {
        await db.collection('entrepreneur_subscriptions').updateOne(
          { _id: sub._id },
          {
            $push: {
              rappels_envoyes: {
                type: typeRappel,
                date: now,
                jours_ecoules: diffJoursEcoules,
                jours_restants: diffJoursRestants,
                message
              }
            }
          }
        );

        // Insertion dans la collection notifications
        await db.collection('notifications').insertOne({
          user_id: sub.entrepreneur_id,
          type: 'RAPPEL_SOLDE_ENTREPRENEUR',
          title: 'Rappel Solde Pack AgroKing',
          message,
          subscription_id: sub._id,
          created_at: now,
          read: false
        });

        resultats.push({ subscriptionId: sub._id, typeRappel, diffJoursEcoules, diffJoursRestants });
      }
    }
  }

  return resultats;
}

/**
 * 5. Application de la clause de compensation en nature en fin de cycle si solde impayé
 */
export async function appliquerCompensationFinCycle({ subscriptionId, cheptelProduit, db }) {
  if (!db) {
    const client = await clientPromise;
    db = client.db('agroking');
  }

  const subId = toObjectId(subscriptionId);
  const subscription = await db.collection('entrepreneur_subscriptions').findOne({ _id: subId });
  if (!subscription) throw new Error("Souscription introuvable.");

  const totalPoulets = Number(cheptelProduit?.nombre_poulets || subscription.chicks_count || 100);
  const prixUnitaire = Number(cheptelProduit?.prix_unitaire || 3500);

  const compensation = calculerCompensationEnNature({
    montantTotalPack: subscription.montant_total_pack,
    montantPaye: subscription.montant_verse,
    soldeImpaye: subscription.montant_restant,
    nombrePouletsProduits: totalPoulets,
    prixUnitaireVente: prixUnitaire
  });

  const now = new Date();
  const compensationRecord = {
    subscription_id: subId,
    entrepreneur_id: subscription.entrepreneur_id,
    cycle_id: subscription.cycle_id,
    solde_impaye: compensation.soldeImpaye,
    valeur_totale_cheptel: compensation.valeurTotaleCheptel,
    nombre_poulets_total: compensation.nombrePouletsTotal,
    prix_unitaire: compensation.prixUnitaire,
    nombre_poulets_agroking: compensation.nombrePouletsAgroKing,
    nombre_poulets_entrepreneur: compensation.nombrePouletsEntrepreneur,
    valeur_part_agroking: compensation.valeurPartAgroKing,
    valeur_part_entrepreneur: compensation.valeurPartEntrepreneur,
    pourcentage_retenu: compensation.pourcentageCheptelRetenu,
    created_at: now
  };

  const compResult = await db.collection('compensations_en_nature').insertOne(compensationRecord);
  const compId = compResult.insertedId || compensationRecord._id;

  await db.collection('entrepreneur_subscriptions').updateOne(
    { _id: subId },
    {
      $set: {
        statut: SUBSCRIPTION_STATUS.COMPENSE,
        compensation_id: compId,
        updated_at: now
      }
    }
  );

  return { id: compId, ...compensation };
}
