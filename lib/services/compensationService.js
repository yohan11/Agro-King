/**
 * Service de Calcul et d'Application de la Compensation en Nature
 * AGRO KING - Module Entrepreneurs (Partie 1)
 */

import { STANDARD_CHICKEN_MARKET_PRICE } from '../models/schemas.js';

/**
 * Fonction pure et isolée pour calculer la compensation en nature sur cheptel en cas de solde impayé.
 * 
 * @param {Object} params
 * @param {number} params.montantTotalPack Montant total du pack souscrit (FCFA)
 * @param {number} params.montantPaye Montant total versé par l'entrepreneur (FCFA)
 * @param {number} [params.soldeImpaye] Solde restant dû (si omis, calculé comme montantTotalPack - montantPaye)
 * @param {number} params.nombrePouletsProduits Nombre total de poulets vivants prêts en fin de cycle
 * @param {number} [params.prixUnitaireVente] Prix unitaire du poulet sur le marché (défaut: 3 500 FCFA)
 * 
 * @returns {Object} Résultat détaillé du partage de cheptel
 */
export function calculerCompensationEnNature({
  montantTotalPack,
  montantPaye,
  soldeImpaye,
  nombrePouletsProduits,
  prixUnitaireVente = STANDARD_CHICKEN_MARKET_PRICE
}) {
  const totalPack = Number(montantTotalPack) || 0;
  const paye = Number(montantPaye) || 0;
  const soldeDu = soldeImpaye !== undefined ? Number(soldeImpaye) : Math.max(0, totalPack - paye);
  const totalPoulets = Math.max(0, Number(nombrePouletsProduits) || 0);
  const prixUnitaire = Math.max(1, Number(prixUnitaireVente) || STANDARD_CHICKEN_MARKET_PRICE);

  // Valeur totale marchande du cheptel produit
  const valeurTotaleCheptel = totalPoulets * prixUnitaire;

  // Si aucun solde impayé, 100% revient à l'entrepreneur
  if (soldeDu <= 0 || totalPoulets === 0) {
    return {
      soldeImpaye: 0,
      valeurTotaleCheptel,
      nombrePouletsTotal: totalPoulets,
      prixUnitaire,
      nombrePouletsAgroKing: 0,
      nombrePouletsEntrepreneur: totalPoulets,
      valeurPartAgroKing: 0,
      valeurPartEntrepreneur: valeurTotaleCheptel,
      pourcentageCheptelRetenu: 0,
      clauseRespectee: true
    };
  }

  // Nombre de poulets nécessaires pour couvrir la valeur exacte du solde impayé
  // Utilisation de Math.ceil pour couvrir la dette ou au prorata de la valeur
  const pouletsPourCouvrirDette = Math.min(totalPoulets, Math.ceil(soldeDu / prixUnitaire));
  const pouletsRestantsEntrepreneur = Math.max(0, totalPoulets - pouletsPourCouvrirDette);

  const valeurAgroKing = pouletsPourCouvrirDette * prixUnitaire;
  const valeurEntrepreneur = pouletsRestantsEntrepreneur * prixUnitaire;
  const pourcentageRetenu = Number(((pouletsPourCouvrirDette / totalPoulets) * 100).toFixed(2));

  return {
    soldeImpaye: soldeDu,
    valeurTotaleCheptel,
    nombrePouletsTotal: totalPoulets,
    prixUnitaire,
    nombrePouletsAgroKing: pouletsPourCouvrirDette,
    nombrePouletsEntrepreneur: pouletsRestantsEntrepreneur,
    valeurPartAgroKing: valeurAgroKing,
    valeurPartEntrepreneur: valeurEntrepreneur,
    pourcentageCheptelRetenu: pourcentageRetenu,
    clauseRespectee: true
  };
}
