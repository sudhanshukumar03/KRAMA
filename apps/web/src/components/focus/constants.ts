export const BUNDLED_WALLPAPERS = [
  { id: 'deep-ocean', name: 'Deep Ocean', css: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
  { id: 'aurora', name: 'Aurora', css: 'linear-gradient(135deg, #005c97, #363795)' },
  { id: 'forest-night', name: 'Forest Night', css: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' },
  { id: 'ember', name: 'Ember', css: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)' },
  { id: 'indigo', name: 'Indigo', css: 'linear-gradient(135deg, #1e1b4b, #312e81, #4338ca)' },
  { id: 'volcanic', name: 'Volcanic', css: 'linear-gradient(135deg, #200122, #6f0000)' },
  { id: 'slate', name: 'Slate', css: 'linear-gradient(135deg, #141e30, #243b55)' },
  { id: 'sage', name: 'Sage', css: 'linear-gradient(135deg, #11251c, #1d3b2a, #2a4d3a)' },
] as const;
export interface CuratedWallpaper {
  id: string;
  name: string;
  subtitle: string;
  url: string;
  credit: string;
}

export const CURATED_WALLPAPERS: CuratedWallpaper[] = [
  {
    id: 'interstellar',
    name: 'Interstellar',
    subtitle: 'Cosmic Singularity & Farmhouse',
    url: '/wallpapers/interstellar.png',
    credit: 'Deep Space Singularity',
  },
  {
    id: 'sakura-sunset',
    name: 'Zen Sanctuary',
    subtitle: 'Cherry Blossom & Red Sunset',
    url: '/wallpapers/sakura-sunset.png',
    credit: 'Eastern Temple Serenity',
  },
  {
    id: 'batman-gotham',
    name: 'Gotham Vigil',
    subtitle: 'The Dark Knight in Winter Snow',
    url: '/wallpapers/batman-gotham.png',
    credit: 'Gotham Skyline Vigil',
  },
  {
    id: 'milky-way-camp',
    name: 'Cosmic Campfire',
    subtitle: 'Stargazer & Galactic Heavens',
    url: '/wallpapers/milky-way-camp.jpg',
    credit: 'Celestial Milky Way',
  },
  {
    id: 'metropolis-twilight',
    name: 'Metropolis Twilight',
    subtitle: 'Illuminated City Grid at Dusk',
    url: '/wallpapers/metropolis-twilight.jpg',
    credit: 'Neon Dusk Vista',
  },
  {
    id: 'lighthouse',
    name: 'Solitary Beacon',
    subtitle: 'Ocean Cliff Lighthouse',
    url: '/wallpapers/lighthouse.png',
    credit: 'Coastal Horizon',
  },
  {
    id: 'mountain-summit',
    name: 'Summit Odyssey',
    subtitle: 'Alpine Rider & Golden Peaks',
    url: '/wallpapers/mountain-summit.jpg',
    credit: 'Mountain Range',
  },
  {
    id: 'crimson-moon',
    name: 'Crimson Night',
    subtitle: 'Full Moon & Wild Meadow',
    url: '/wallpapers/crimson-moon.png',
    credit: 'Lunar Bloom',
  },
  {
    id: 'urban-chill',
    name: 'Urban Sunset',
    subtitle: 'Rooftop Chill Over NYC',
    url: '/wallpapers/urban-chill.png',
    credit: 'Metropolis Skyline',
  },
  {
    id: 'stealth-risk',
    name: 'Stealth Drive',
    subtitle: 'Rich Risk & Night Beast',
    url: '/wallpapers/stealth-risk.png',
    credit: 'No Risk No Story',
  },
];
