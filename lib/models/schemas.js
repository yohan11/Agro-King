/**
 * Modèles, Constantes et Types pour les Modules Entrepreneurs et Consommateurs
 * AGRO KING Platform
 */

export const PACK_PRICES = {
  'pack-100': {
    name: 'Pack 100 Poussins',
    chicksCount: 100,
    price: 280000,
    cashPrice: 270000,
    supplierCost: 243200,
    deliveryCost: 15000,
    description: '100 poussins vaccinés + 10 sacs d\'aliments + livraisons échelonnées'
  },
  'pack-200': {
    name: 'Pack 200 Poussins',
    chicksCount: 200,
    price: 560000,
    cashPrice: 540000,
    supplierCost: 486400,
    deliveryCost: 30000,
    description: '200 poussins vaccinés + 20 sacs d\'aliments + livraisons échelonnées'
  },
  'pack-500': {
    name: 'Pack 500 Poussins',
    chicksCount: 500,
    price: 1400000,
    cashPrice: 1350000,
    supplierCost: 1216000,
    deliveryCost: 75000,
    description: '500 poussins vaccinés + 50 sacs d\'aliments + livraisons échelonnées'
  },
  'pack-reforme': {
    name: 'Pack Réforme 100 Poulets',
    chicksCount: 100,
    price: 78000,
    cashPrice: 78000,
    supplierCost: 74100,
    deliveryCost: 0,
    description: '4 sacs finition pour engraissement 45-60 jours'
  }
};

export const SUBSCRIPTION_STATUS = {
  EN_FINANCEMENT: 'en_financement', // Dépôts échelonnés en cours (< 75%)
  DEBLOQUE_75: 'debloque_75',       // Seuil 75% atteint -> Paiement fournisseur + cycle démarré
  SOLDE_100: 'solde_100',           // 100% payé dans le délai des 15 jours
  EN_RETARD: 'en_retard',           // Délai de 15j dépassé sans solde complet
  COMPENSE: 'compense'              // Compensation en nature appliquée en fin de cycle
};

export const CYCLE_STATUS = {
  EN_FINANCEMENT: 'en_financement',
  DISPONIBLE: 'disponible',             // Prêt sur le marché ou non assigné
  EN_COURS: 'en_cours',                 // Cycle d'élevage en cours chez l'éleveur
  ASSIGNE: 'assigné',                   // Réservé/assigné à une caisse consommateur
  RESERVE_SECURITE: 'réservé_sécurité', // Cycle de réserve (filet de sécurité)
  INCIDENT: 'incident',                 // Incident signalé (mortalité, maladie)
  TERMINE: 'terminé'                    // Vente ou abattage terminé
};

export const SAVINGS_STATUS = {
  EN_EPARGNE: 'en_epargne',                         // Épargne fléchée en cours (< 100%)
  OBJECTIF_ATTEINT_100: 'objectif_atteint_100',     // 100% atteint -> Commande validée
  LIVRE: 'livre',                                   // Poulets livrés pour l'événement
  ABANDONNE_REMBOURSE: 'abandonne_rembourse'       // Annulé et remboursé partiellement
};

export const OFFICIAL_PAYER_IDENTITY = 'AGRO KING SAS';
export const THRESHOLD_UNLOCK_PERCENT = 75.0;
export const DEADLINE_DAYS_REMAINING_25 = 15;
export const MAX_CONSUMER_SAVINGS_DAYS = 45;
export const DEFAULT_REFUND_RETENTION_RATE = 0.10; // 10% retenu, 90% remboursé

export const STANDARD_CHICKEN_MARKET_PRICE = 3700; // Prix standard de référence FCFA pour compte client

import { ObjectId } from 'mongodb';

/**
 * Convertit en toute sécurité un ID en ObjectId sans faire planter les tests avec des mocks
 */
export function toObjectId(id) {
  if (!id) return null;
  try {
    if (typeof id === 'string' && ObjectId.isValid(id) && id.length === 24) {
      return new ObjectId(id);
    }
  } catch {
    // Si c'est un mock ou une chaîne non hexadécimale, retourner tel quel
  }
  return id;
}
