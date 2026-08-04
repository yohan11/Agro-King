/**
 * SUITE DE TESTS AUTOMATISÉS COMPLÈTE
 * Modules Entrepreneurs (Partie 1) & Consommateurs (Partie 2)
 * AGRO KING Platform
 */

import assert from 'node:assert/strict';
import {
  PACK_PRICES,
  SUBSCRIPTION_STATUS,
  CYCLE_STATUS,
  SAVINGS_STATUS,
  OFFICIAL_PAYER_IDENTITY,
  THRESHOLD_UNLOCK_PERCENT,
  DEADLINE_DAYS_REMAINING_25,
  STANDARD_CHICKEN_MARKET_PRICE,
  toObjectId
} from '../lib/models/schemas.js';

import {
  calculerCompensationEnNature
} from '../lib/services/compensationService.js';

import {
  trouverCycleOptimal,
  trouverCycleDeReserve,
  calculerDistanceKm,
  differenceEnJours
} from '../lib/services/matchingService.js';

import {
  creerSouscriptionPack,
  enregistrerDepotEntrepreneur,
  verifierEcheancesEtRappels,
  appliquerCompensationFinCycle
} from '../lib/services/entrepreneurService.js';

import {
  creerCaisseEpargneConsommateur,
  enregistrerDepotConsommateur,
  gererIncidentCycle,
  annulerEtRembourserCaisse
} from '../lib/services/consommateurService.js';

// Mock DB en mémoire pour tester l'orchestration complète sans dépendance externe
class InMemoryDb {
  constructor() {
    this.collections = {
      entrepreneur_subscriptions: [],
      cycles: [],
      consommateur_savings: [],
      supplier_payouts: [],
      compensations_en_nature: [],
      notifications: []
    };
  }

  collection(name) {
    if (!this.collections[name]) this.collections[name] = [];
    const list = this.collections[name];

    return {
      find: (query = {}) => ({
        toArray: async () => {
          return list.filter(item => {
            for (const key of Object.keys(query)) {
              if (key === '$or') {
                const orMatch = query.$or.some(q => Object.entries(q).every(([k, v]) => String(item[k]) === String(v)));
                if (!orMatch) return false;
                continue;
              }
              const cond = query[key];
              if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
                if (cond.$in && !cond.$in.includes(item[key])) return false;
                if (cond.$ne && item[key] === cond.$ne) return false;
                if (cond.$gt && !(item[key] > cond.$gt)) return false;
              } else if (String(item[key]) !== String(cond)) {
                return false;
              }
            }
            return true;
          });
        }
      }),
      findOne: async (query = {}) => {
        return list.find(item => {
          return Object.entries(query).every(([k, v]) => String(item[k]) === String(v));
        }) || null;
      },
      insertOne: async (doc) => {
        const id = doc._id || ('id_' + Math.random().toString(36).substring(2, 9));
        const newDoc = { ...doc, _id: id };
        list.push(newDoc);
        return { insertedId: id };
      },
      updateOne: async (query, update) => {
        const item = list.find(it => String(it._id) === String(query._id));
        if (!item) return { modifiedCount: 0 };
        if (update.$set) Object.assign(item, update.$set);
        if (update.$push) {
          for (const [k, v] of Object.entries(update.$push)) {
            if (!item[k]) item[k] = [];
            item[k].push(v);
          }
        }
        return { modifiedCount: 1 };
      }
    };
  }
}

// Couleurs de console
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`${GREEN}  ✓ [PASS] ${testName}${RESET}`);
    passedTests++;
  } catch (err) {
    console.error(`${RED}  ✗ [FAIL] ${testName}${RESET}`);
    console.error(`    ${RED}${err.message}${RESET}`);
  }
}

async function runAsyncTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`${GREEN}  ✓ [PASS] ${testName}${RESET}`);
    passedTests++;
  } catch (err) {
    console.error(`${RED}  ✗ [FAIL] ${testName}${RESET}`);
    console.error(`    ${RED}${err.stack || err.message}${RESET}`);
  }
}

console.log(`${BLUE}====================================================${RESET}`);
console.log(`${BLUE}  SUITE DE VALIDATION : AGRO KING ENTREPRENEURS & CONSOMMATEURS${RESET}`);
console.log(`${BLUE}====================================================${RESET}\n`);

// --------------------------------------------------------------------------
// PARTIE 1 : MODULE ENTREPRENEURS
// --------------------------------------------------------------------------
console.log(`${YELLOW}▶ PARTIE 1 : TESTS DU MODULE ENTREPRENEURS${RESET}`);

runTest("1.1 Calcul compensation en nature : solde nul = 0 retenue pour AgroKing", () => {
  const res = calculerCompensationEnNature({
    montantTotalPack: 258200,
    montantPaye: 258200,
    soldeImpaye: 0,
    nombrePouletsProduits: 100,
    prixUnitaireVente: 3500
  });

  assert.equal(res.soldeImpaye, 0);
  assert.equal(res.nombrePouletsAgroKing, 0);
  assert.equal(res.nombrePouletsEntrepreneur, 100);
  assert.equal(res.pourcentageCheptelRetenu, 0);
});

runTest("1.2 Calcul compensation en nature : solde 25% impayé (64 550 F)", () => {
  // Sur un pack à 258 200 F, 25% restants = 64 550 F.
  // Prix poulet = 3 500 F -> 64 550 / 3500 = 18.44 -> Math.ceil = 19 poulets
  const res = calculerCompensationEnNature({
    montantTotalPack: 258200,
    montantPaye: 193650, // 75% payés
    soldeImpaye: 64550,
    nombrePouletsProduits: 100,
    prixUnitaireVente: 3500
  });

  assert.equal(res.soldeImpaye, 64550);
  assert.equal(res.nombrePouletsAgroKing, 19);
  assert.equal(res.nombrePouletsEntrepreneur, 81);
  assert.equal(res.valeurPartAgroKing, 19 * 3500); // 66 500 FCFA
  assert.equal(res.valeurPartEntrepreneur, 81 * 3500); // 283 500 FCFA
  assert.equal(res.pourcentageCheptelRetenu, 19);
});

runTest("1.3 Seuil 75% : Ne déclenche PAS à 74.9%", () => {
  const total = 258200;
  const montant74_9 = total * 0.749; // 193 391.8
  const pourcentage = Number(((montant74_9 / total) * 100).toFixed(2));
  
  assert.equal(pourcentage < 75.0, true);
  assert.equal(pourcentage < THRESHOLD_UNLOCK_PERCENT, true);
});

runTest("1.4 Seuil 75% : Déclenche exactement à 75.0%", () => {
  const total = 258200;
  const montant75 = total * 0.75; // 193 650
  const pourcentage = Number(((montant75 / total) * 100).toFixed(2));
  
  assert.equal(pourcentage >= THRESHOLD_UNLOCK_PERCENT, true);
});

runTest("1.5 Échéancier : 15 jours à partir de la date de début du cycle", () => {
  const dateDebut = new Date('2026-08-01T00:00:00Z');
  const dateLimite = new Date(dateDebut.getTime() + DEADLINE_DAYS_REMAINING_25 * 24 * 60 * 60 * 1000);
  const diffJours = differenceEnJours(dateDebut, dateLimite);

  assert.equal(diffJours, 15);
  assert.equal(OFFICIAL_PAYER_IDENTITY, 'AGRO KING SAS');
});

await runAsyncTest("1.6 Orchestration complète Entrepreneur : Clause, Déblocage 75%, Paiement Fournisseur & Compensation", async () => {
  const mockDb = new InMemoryDb();

  // 1. Refus si clause non acceptée
  let errorRaised = false;
  try {
    await creerSouscriptionPack({
      entrepreneurId: 'ent_1',
      packType: 'pack-100',
      clauseAcceptee: false,
      db: mockDb
    });
  } catch (err) {
    errorRaised = true;
  }
  assert.equal(errorRaised, true, "Doit refuser la souscription sans acceptation de la clause");

  // 2. Souscription acceptée
  const sub = await creerSouscriptionPack({
    entrepreneurId: 'ent_1',
    packType: 'pack-100',
    clauseAcceptee: true,
    entrepreneurInfo: { name: 'Moussa Éleveur', phone: '690000001' },
    db: mockDb
  });
  assert.equal(sub.montant_total_pack, 258200);
  assert.equal(sub.statut, SUBSCRIPTION_STATUS.EN_FINANCEMENT);

  // 3. Dépôt de 50% (129 100 F) -> Pas de déblocage
  const dep50 = await enregistrerDepotEntrepreneur({
    subscriptionId: sub.id,
    montant: 129100,
    modePaiement: 'MOMO',
    db: mockDb
  });
  assert.equal(dep50.pourcentageAvancement, 50);
  assert.equal(dep50.statut, SUBSCRIPTION_STATUS.EN_FINANCEMENT);
  assert.equal(dep50.seuil75Atteint, false);

  // 4. Dépôt amenant à 75% (+64 550 F = 193 650 F) -> Déblocage déclenché !
  const dep75 = await enregistrerDepotEntrepreneur({
    subscriptionId: sub.id,
    montant: 64550,
    modePaiement: 'OM',
    db: mockDb
  });
  assert.equal(dep75.pourcentageAvancement, 75);
  assert.equal(dep75.statut, SUBSCRIPTION_STATUS.DEBLOQUE_75);
  assert.equal(dep75.seuil75Atteint, true);
  assert.notEqual(dep75.orchestration, null);

  // Vérifier le paiement fournisseur : payé par 'AGRO KING SAS'
  const payouts = await mockDb.collection('supplier_payouts').find({ subscription_id: sub.id }).toArray();
  assert.equal(payouts.length, 1);
  assert.equal(payouts[0].payeur_officiel, 'AGRO KING SAS');
  assert.equal(payouts[0].montant_paye, 243200);

  // Vérifier le démarrage du cycle d'élevage
  const cycles = await mockDb.collection('cycles').find({ subscription_id: sub.id }).toArray();
  assert.equal(cycles.length, 1);
  assert.equal(cycles[0].statut, CYCLE_STATUS.EN_COURS);
  assert.equal(cycles[0].chicks_count, 100);

  // 5. Application de la compensation en nature si fin de cycle avec solde restant (64 550 F)
  const compResult = await appliquerCompensationFinCycle({
    subscriptionId: sub.id,
    cheptelProduit: { nombre_poulets: 100, prix_unitaire: 3500 },
    db: mockDb
  });

  assert.equal(compResult.nombrePouletsAgroKing, 19);
  assert.equal(compResult.nombrePouletsEntrepreneur, 81);
  assert.equal(compResult.soldeImpaye, 64550);

  const subFinal = await mockDb.collection('entrepreneur_subscriptions').findOne({ _id: sub.id });
  assert.equal(subFinal.statut, SUBSCRIPTION_STATUS.COMPENSE);
});

console.log('');

// --------------------------------------------------------------------------
// PARTIE 2 : MODULE CONSOMMATEURS
// --------------------------------------------------------------------------
console.log(`${YELLOW}▶ PARTIE 2 : TESTS DU MODULE CONSOMMATEURS${RESET}`);

runTest("2.1 Distance géographique Haversine", () => {
  // Akwa Douala -> Bonabéri Douala (~7 km)
  const dist = calculerDistanceKm(4.05, 9.7, 4.08, 9.66);
  assert.equal(dist > 0 && dist < 15, true);
});

runTest("2.2 Matching : Priorité 1-2 jours avant date d'événement", () => {
  const dateEvenement = new Date('2026-09-15T00:00:00Z');
  
  const cycles = [
    {
      _id: 'cycle_trop_tot',
      statut: CYCLE_STATUS.DISPONIBLE,
      chicks_count: 100,
      date_fin_estimee: new Date('2026-09-01T00:00:00Z'), // 14 jours avant (trop tôt)
      localisation: { ville: 'Douala', lat: 4.05, lng: 9.7 }
    },
    {
      _id: 'cycle_parfait',
      statut: CYCLE_STATUS.DISPONIBLE,
      chicks_count: 100,
      date_fin_estimee: new Date('2026-09-14T00:00:00Z'), // 1 jour avant (parfait !)
      localisation: { ville: 'Douala', lat: 4.05, lng: 9.7 }
    },
    {
      _id: 'cycle_apres_evenement',
      statut: CYCLE_STATUS.DISPONIBLE,
      chicks_count: 100,
      date_fin_estimee: new Date('2026-09-16T00:00:00Z'), // Après événement (inutilisable)
      localisation: { ville: 'Douala', lat: 4.05, lng: 9.7 }
    }
  ];

  const match = trouverCycleOptimal({
    dateEvenement,
    localisation: { ville: 'Douala', lat: 4.05, lng: 9.7 },
    quantiteRequise: 100,
    cyclesDisponibles: cycles
  });

  assert.notEqual(match, null);
  assert.equal(match.cycle._id, 'cycle_parfait');
  assert.equal(match.ecartJours, 1);
});

runTest("2.3 Matching : Refus si aucun cycle compatible", () => {
  const dateEvenement = new Date('2026-11-20T00:00:00Z');
  const cycles = [
    {
      _id: 'cycle_1',
      statut: CYCLE_STATUS.DISPONIBLE,
      chicks_count: 100,
      date_fin_estimee: new Date('2026-09-01T00:00:00Z'),
      localisation: { ville: 'Douala', lat: 4.05, lng: 9.7 }
    }
  ];

  const match = trouverCycleOptimal({
    dateEvenement,
    localisation: { ville: 'Douala', lat: 4.05, lng: 9.7 },
    quantiteRequise: 100,
    cyclesDisponibles: cycles
  });

  assert.equal(match, null);
});

runTest("2.4 Cycle de Réserve : Sélection de la réserve dans la même zone géographique", () => {
  const dateEvenement = new Date('2026-09-15T00:00:00Z');
  const reserves = [
    {
      _id: 'reserve_yaounde',
      est_reserve: true,
      zone_geographique: 'Yaoundé',
      date_fin_estimee: new Date('2026-09-14T00:00:00Z'),
      statut: CYCLE_STATUS.RESERVE_SECURITE
    },
    {
      _id: 'reserve_douala',
      est_reserve: true,
      zone_geographique: 'Douala',
      date_fin_estimee: new Date('2026-09-14T00:00:00Z'),
      statut: CYCLE_STATUS.RESERVE_SECURITE
    }
  ];

  const reserveTrouvee = trouverCycleDeReserve({
    zoneGeographique: 'Douala',
    dateEvenement,
    cyclesReserves: reserves
  });

  assert.notEqual(reserveTrouvee, null);
  assert.equal(reserveTrouvee._id, 'reserve_douala');
});

await runAsyncTest("2.5 Caisse d'épargne consommateur & Règle stricte 100%", async () => {
  const mockDb = new InMemoryDb();
  
  // Ajouter un cycle disponible
  const cycleIns = await mockDb.collection('cycles').insertOne({
    chicks_count: 100,
    statut: CYCLE_STATUS.DISPONIBLE,
    date_fin_estimee: new Date('2026-09-14T00:00:00Z'),
    zone_geographique: 'Douala',
    localisation: { ville: 'Douala', lat: 4.05, lng: 9.7 }
  });

  // 1. Création de la caisse
  const caisseRes = await creerCaisseEpargneConsommateur({
    clientId: 'client_123',
    dateEvenement: '2026-09-15',
    localisation: { ville: 'Douala', lat: 4.05, lng: 9.7 },
    periodeEpargneJours: 30,
    quantitePoulets: 100,
    prixUnitaire: 3500,
    clientInfo: { name: 'Restaurant Le Wouri' },
    db: mockDb
  });

  assert.equal(caisseRes.caisse.montant_total_objectif, 350000);
  assert.equal(caisseRes.caisse.statut, SAVINGS_STATUS.EN_EPARGNE);

  // 2. Dépôt à 75% -> Reste au statut en_epargne (contrairement aux entrepreneurs, pas de déblocage à 75%)
  const depot75 = await enregistrerDepotConsommateur({
    caisseId: caisseRes.caisse._id,
    montant: 262500, // 75%
    modePaiement: 'OM',
    db: mockDb
  });

  assert.equal(depot75.pourcentageAvancement, 75);
  assert.equal(depot75.statut, SAVINGS_STATUS.EN_EPARGNE);
  assert.equal(depot75.objectifAtteint100, false);

  // 3. Complément à 100% -> Bascule en objectif_atteint_100
  const depot100 = await enregistrerDepotConsommateur({
    caisseId: caisseRes.caisse._id,
    montant: 87500, // 25% restants
    modePaiement: 'OM',
    db: mockDb
  });

  assert.equal(depot100.pourcentageAvancement, 100);
  assert.equal(depot100.statut, SAVINGS_STATUS.OBJECTIF_ATTEINT_100);
  assert.equal(depot100.objectifAtteint100, true);
});

await runAsyncTest("2.6 Incident de production & Réassignation automatique vers la réserve", async () => {
  const mockDb = new InMemoryDb();

  // Cycle principal assigné à une caisse
  const cyclePrincipal = await mockDb.collection('cycles').insertOne({
    chicks_count: 100,
    statut: CYCLE_STATUS.ASSIGNE,
    date_fin_estimee: new Date('2026-09-14T00:00:00Z'),
    zone_geographique: 'Douala',
    assigne_a_caisse_id: 'caisse_1'
  });

  // Cycle de réserve
  const cycleReserve = await mockDb.collection('cycles').insertOne({
    chicks_count: 100,
    est_reserve: true,
    statut: CYCLE_STATUS.RESERVE_SECURITE,
    date_fin_estimee: new Date('2026-09-14T00:00:00Z'),
    zone_geographique: 'Douala'
  });

  // Caisse liée
  await mockDb.collection('consommateur_savings').insertOne({
    _id: 'caisse_1',
    client_id: 'client_restaurant',
    cycle_id: cyclePrincipal.insertedId,
    date_evenement: new Date('2026-09-15T00:00:00Z'),
    quantite_poulets: 100,
    localisation: { ville: 'Douala' },
    statut: SAVINGS_STATUS.EN_EPARGNE,
    historique_reassignations: []
  });

  // Déclencher un incident sur le cycle principal
  const resIncident = await gererIncidentCycle({
    cycleId: cyclePrincipal.insertedId,
    descriptionIncident: 'Mortalité de 40% suite à coupure électrique',
    db: mockDb
  });

  assert.equal(resIncident.incidentEnregistre, true);
  assert.equal(resIncident.reassignationReussie, true);
  assert.equal(resIncident.methode, 'CYCLE_DE_RESERVE');
  assert.equal(String(resIncident.nouveauCycleId), String(cycleReserve.insertedId));

  // Vérifier que la caisse a bien été mise à jour vers le nouveau cycle
  const caisseApres = await mockDb.collection('consommateur_savings').findOne({ _id: 'caisse_1' });
  assert.equal(String(caisseApres.cycle_id), String(cycleReserve.insertedId));
  assert.equal(caisseApres.historique_reassignations.length, 1);
});

await runAsyncTest("2.7 Annulation et Remboursement partiel (10% retenue / 90% remboursé)", async () => {
  const mockDb = new InMemoryDb();

  const cycleAssigne = await mockDb.collection('cycles').insertOne({
    statut: CYCLE_STATUS.ASSIGNE,
    assigne_a_caisse_id: 'caisse_abandon'
  });

  await mockDb.collection('consommateur_savings').insertOne({
    _id: 'caisse_abandon',
    client_id: 'client_mariage',
    cycle_id: cycleAssigne.insertedId,
    montant_verse: 200000,
    statut: SAVINGS_STATUS.EN_EPARGNE
  });

  const resRemboursement = await annulerEtRembourserCaisse({
    caisseId: 'caisse_abandon',
    tauxRetenue: 0.10, // 10% de retenue
    db: mockDb
  });

  assert.equal(resRemboursement.statut, SAVINGS_STATUS.ABANDONNE_REMBOURSE);
  assert.equal(resRemboursement.remboursement.montant_verse, 200000);
  assert.equal(resRemboursement.remboursement.montant_retenu, 20000); // 10%
  assert.equal(resRemboursement.remboursement.montant_rembourse, 180000); // 90%

  // Vérifier que le cycle a été libéré pour d'autres clients
  const cycleLibere = await mockDb.collection('cycles').findOne({ _id: cycleAssigne.insertedId });
  assert.equal(cycleLibere.statut, CYCLE_STATUS.DISPONIBLE);
  assert.equal(cycleLibere.assigne_a_caisse_id, null);
});

console.log(`\n${BLUE}====================================================${RESET}`);
console.log(`${GREEN}  RÉSULTAT : ${passedTests}/${totalTests} TESTS PASSÉS AVEC SUCCÈS ! 🚀${RESET}`);
console.log(`${BLUE}====================================================${RESET}\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
