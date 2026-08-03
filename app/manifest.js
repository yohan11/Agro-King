export default function manifest() {
  return {
    id: '/?source=pwa',
    name: 'AGRO KING - Élevage & Poussins',
    short_name: 'AGRO KING',
    description: 'Application officielle pour éleveurs : commande de poussins, alimentation et suivi de croissance.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: [
      'window-controls-overlay',
      'standalone',
      'minimal-ui',
      'browser'
    ],
    orientation: 'portrait',
    background_color: '#f8fafc',
    theme_color: '#1B5E20',
    lang: 'fr',
    dir: 'ltr',
    categories: ['business', 'shopping', 'utilities', 'productivity'],
    iarc_rating_id: 'e84b072d-71b3-4d3e-86ae-31a8ce4e53b7',
    prefer_related_applications: false,
    related_applications: [
      {
        platform: 'play',
        url: 'https://play.google.com/store/apps/details?id=com.agroking.app',
        id: 'com.agroking.app'
      }
    ],
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    screenshots: [
      {
        src: '/screenshot-mobile.png',
        sizes: '512x512',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Interface de Commande et Suivi Éleveur AGRO KING'
      },
      {
        src: '/screenshot-desktop.png',
        sizes: '512x512',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Tableau de bord et gestion avicole AGRO KING'
      }
    ],
    shortcuts: [
      {
        name: 'Passer Commande',
        short_name: 'Commander',
        description: 'Commander des poussins ou aliments',
        url: '/farmer',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
      },
      {
        name: 'Mon Élevage',
        short_name: 'Suivi',
        description: 'Suivre mon cycle d\'élevage',
        url: '/farmer',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
      }
    ]
  };
}
