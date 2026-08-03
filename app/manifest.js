export default function manifest() {
  return {
    id: '/?source=pwa',
    name: 'AGRO KING - Élevage & Poussins',
    short_name: 'AGRO KING',
    description: 'Application officielle pour éleveurs : commande de poussins, alimentation et suivi de croissance.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8fafc',
    theme_color: '#1B5E20',
    categories: ['business', 'shopping', 'utilities'],
    prefer_related_applications: false,
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
