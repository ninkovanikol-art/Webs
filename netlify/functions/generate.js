// Luxy AI — Secure backend proxy for Anthropic API
// Keeps API key server-side; adds scoring, rate limiting, validation, logging

const RATE_LIMIT = new Map(); // ip -> {count, resetAt}
const MAX_RPM = 10;

// ── Input validation ────────────────────────────────────────────────────────
const VALID_TRIP_TYPES = new Set(['romantic','wellness','adventure','cultural','celebration','detox']);
const VALID_BUDGETS = new Set(['comfort','luxury','ultra']);
const VALID_EXP_TYPES = new Set(['5star','wellness','immersive','adventure','cultural','villa']);
// Maps frontend region keys (lowercase) → canonical region strings used in dest.regions[]
const REGION_MAP = {
  spain: ['Spain','Mediterranean'],
  italy: ['Italy','Mediterranean'],
  france: ['France','Mediterranean'],
  greece: ['Greece','Turkey','Mediterranean'],
  portugal: ['Portugal'],
  alps: ['Switzerland','Ireland','Europe'],
  // Also accept canonical names directly
  spain_c: ['Spain'], france_c: ['France'], italy_c: ['Italy'],
  portugal_c: ['Portugal'], greece_c: ['Greece'], switzerland_c: ['Switzerland'],
};

function sanitizeString(val, maxLen = 200) {
  if (typeof val !== 'string') return '';
  return val.slice(0, maxLen).replace(/[<>"'`]/g, '');
}

function normalizeRegions(rawRegions) {
  const out = new Set();
  rawRegions.filter(Boolean).slice(0, 3).forEach(r => {
    const key = r.toLowerCase().replace(/[^a-z]/g,'');
    const mapped = REGION_MAP[key];
    if (mapped) { mapped.forEach(m => out.add(m)); }
    else { out.add(r); } // pass through canonical names
  });
  return [...out];
}

function validateProfile(profile) {
  const p = {};
  p.tripType = VALID_TRIP_TYPES.has(profile.tripType) ? profile.tripType : 'romantic';
  p.budget = VALID_BUDGETS.has(profile.budget) ? profile.budget : 'luxury';
  const rawExp = Array.isArray(profile.expType) ? profile.expType : [profile.expType];
  p.expType = rawExp.filter(e => VALID_EXP_TYPES.has(e)).slice(0, 3);
  const rawRegion = Array.isArray(profile.region) ? profile.region : [profile.region];
  p.region = normalizeRegions(rawRegion);
  const nights = parseInt(profile.nights, 10);
  p.nights = (nights >= 1 && nights <= 30) ? nights : 4;
  const travelers = parseInt(profile.travelers, 10);
  p.travelers = (travelers >= 1 && travelers <= 20) ? travelers : 2;
  p.special = sanitizeString(profile.special || '', 300);
  return p;
}

// ── Structured logging (Day 8: eval dataset) ────────────────────────────────
function logGeneration({ ip, profile, dest, score, latencyMs, success, tokenUsage, error }) {
  const entry = {
    ts: new Date().toISOString(),
    ip: ip?.slice(0, 15), // partial IP for privacy
    profile_trip: profile.tripType,
    profile_budget: profile.budget,
    profile_exp: profile.expType,
    profile_region: profile.region,
    dest_id: dest?.id,
    dest_name: dest?.name,
    score,
    latency_ms: latencyMs,
    success,
    tokens_in: tokenUsage?.input_tokens,
    tokens_out: tokenUsage?.output_tokens,
    error: error?.slice(0, 200),
  };
  // Netlify captures console.log as structured function logs — queryable in dashboard
  console.log(JSON.stringify({ type: 'luxy_generation', ...entry }));
}

// ── Destination catalogue (server-side authoritative copy) ──
const CATALOGUE = {
  '5star': [
    {id:'aman-venice',name:'Aman Venice',chain:'Aman Resorts',loc:'Venice, Italy',dest:'Venice',type:'Palace Hotel',tags:['romantic','cultural','5star'],regions:['Italy','Mediterranean','Europe'],price_base:1800,desc:'A 16th-century palazzo on the Grand Canal. Murano glass chandeliers, private gondola, 24 intimate rooms.',dest_img:'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.aman.com/hotels/aman-venice'},
    {id:'fs-george-v',name:'Four Seasons Hotel George V',chain:'Four Seasons',loc:'Paris, France',dest:'Paris',type:'Palace Hotel',tags:['romantic','celebration','5star','cultural'],regions:['France','Europe'],price_base:1500,desc:'The iconic address on Avenue George V. Three Michelin stars. Legendary flower arrangements by Jeff Leatham.',dest_img:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',book:'https://www.fourseasons.com/paris/'},
    {id:'le-bristol',name:'Le Bristol Paris',chain:'Oetker Collection',loc:'Paris, France',dest:'Paris',type:'Palace Hotel',tags:['romantic','5star','cultural'],regions:['France','Europe'],price_base:1400,desc:'On Rue du Faubourg Saint-Honoré. Épicure by Eric Frechon: 3 Michelin stars. The largest hotel pool in Paris.',dest_img:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.oetkercollection.com/hotels/le-bristol-paris/'},
    {id:'hotel-arts',name:'Hotel Arts Barcelona',chain:'Ritz-Carlton',loc:'Barcelona, Spain',dest:'Barcelona',type:'Urban Luxury Hotel',tags:['5star','cultural'],regions:['Spain','Mediterranean','Europe'],price_base:650,desc:"44-storey tower over Barceloneta beach. Rooftop pool. Frank Gehry's golden fish sculpture below.",dest_img:'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.hotelartsbarcelona.com/'},
    {id:'hotel-de-russie',name:'Hotel de Russie',chain:'Rocco Forte Hotels',loc:'Rome, Italy',dest:'Rome',type:'City Palace',tags:['romantic','cultural','5star'],regions:['Italy','Mediterranean','Europe'],price_base:900,desc:'Near Piazza del Popolo. The legendary Jardin Russe secret garden. La Stravinskij bar.',dest_img:'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.roccofortehotels.com/hotels-and-resorts/hotel-de-russie/'},
    {id:'badrutts',name:"Badrutt's Palace Hotel",chain:'Independent',loc:'St. Moritz, Switzerland',dest:'St. Moritz',type:'Alpine Palace',tags:['adventure','5star','celebration'],regions:['Switzerland','Europe'],price_base:1200,desc:"Alpine institution since 1896. Ski-in/ski-out access. The legendary King's Club. Quintessential St. Moritz.",dest_img:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',book:'https://www.badruttspalace.com/'},
    {id:'capri-palace',name:'Capri Palace Jumeirah',chain:'Jumeirah Hotels',loc:'Capri, Italy',dest:'Capri',type:'Island Luxury Hotel',tags:['romantic','5star','cultural'],regions:['Italy','Mediterranean','Europe'],price_base:1300,desc:"White Mediterranean palace at 300m above sea level. L'Olivo: 2 Michelin stars. The Mediterranean Clinic spa.",dest_img:'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.jumeirah.com/en/stay/capri/capri-palace-jumeirah'},
    {id:'du-cap',name:'Hotel du Cap-Eden-Roc',chain:'Oetker Collection',loc:"Cap d'Antibes, French Riviera",dest:'French Riviera',type:'Riviera Legend',tags:['romantic','5star','celebration'],regions:['France','Mediterranean','Europe'],price_base:2200,desc:"The ultimate Riviera legend since 1870. Cliff-edge pool carved from rock. The favorite of Picasso and Fitzgerald.",dest_img:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',book:'https://www.oetkercollection.com/hotels/hotel-du-cap-eden-roc/'},
    {id:'belmond-cipriani',name:'Belmond Hotel Cipriani',chain:'Belmond',loc:'Venice, Italy',dest:'Venice',type:'Island Hotel',tags:['romantic','5star','celebration'],regions:['Italy','Mediterranean','Europe'],price_base:1600,desc:"On its own island in the Venetian lagoon. Olympic pool. The legendary Cip's Club on the water.",dest_img:'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.belmond.com/hotels/europe/italy/venice/belmond-hotel-cipriani/'},
    {id:'rosewood-madrid',name:'Rosewood Villa Magna',chain:'Rosewood Hotels',loc:'Madrid, Spain',dest:'Madrid',type:'Urban Palace',tags:['5star','cultural','celebration'],regions:['Spain','Europe'],price_base:950,desc:'On Paseo de la Castellana, heart of luxury Madrid. Bibo Madrid by Dani García. World-class art collection.',dest_img:'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.rosewoodhotels.com/en/villa-magna'},
  ],
  wellness: [
    {id:'six-senses-ibiza',name:'Six Senses Ibiza',chain:'Six Senses',loc:'Ibiza, Spain',dest:'Ibiza',type:'Wellness Resort',tags:['wellness','detox','immersive'],regions:['Spain','Mediterranean','Europe'],price_base:1100,desc:'North Ibiza cliffside. Adults and families. Holistic wellness, organic farm-to-table, sleep programme.',dest_img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',book:'https://www.sixsenses.com/en/resorts/ibiza'},
    {id:'six-senses-rome',name:'Six Senses Rome',chain:'Six Senses',loc:'Rome, Italy',dest:'Rome',type:'Urban Wellness Hotel',tags:['wellness','cultural'],regions:['Italy','Mediterranean','Europe'],price_base:1000,desc:'A neoclassical palace in the Ludovisi district. Underground spa. Noûs rooftop bar with Forum views.',dest_img:'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.sixsenses.com/en/resorts/rome'},
    {id:'anantara-marbella',name:'Anantara Villa Padierna Palace',chain:'Anantara Hotels',loc:'Marbella, Spain',dest:'Marbella',type:'Palace Resort',tags:['wellness','romantic','5star'],regions:['Spain','Mediterranean','Europe'],price_base:850,desc:'An Italianate palace in the Benahavís hills. Three championship golf courses. Thalgó Thalasso spa.',dest_img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.anantara.com/en/villa-padierna-marbella'},
  ],
  immersive: [
    {id:'natur-lux',name:'Natur-Lux Hideaway',chain:'Luxy Signature',loc:'Finestrat, Alicante, Spain',dest:'Alicante',type:'Immersive Natural Resort',tags:['immersive','detox','wellness','romantic'],regions:['Spain','Mediterranean','Europe'],price_base:346,featured:true,desc:'The first AI-powered eco-resort on the Mediterranean coast. Geodesic domes, sky bubbles, infinity pool villas. Only Adults.',dest_img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1601918774946-25832a4be0d6?w=800&q=80',book:'https://natur-lux-hideaway.com'},
    {id:'whitepod',name:'Whitepod Eco Luxury Resort',chain:'Whitepod',loc:'Swiss Alps, Switzerland',dest:'Swiss Alps',type:'Immersive Natural Resort',tags:['immersive','adventure','detox'],regions:['Switzerland','Europe'],price_base:550,desc:'15 geodesic pods on a private ski slope at 1,400m altitude. Fine dining igloo. Zero-carbon skiing.',dest_img:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1504474000021-d4b7e83f5481?w=800&q=80',book:'https://www.whitepod.com/'},
    {id:'casas-areia',name:'Casas na Areia',chain:'Relais & Châteaux',loc:'Comporta, Portugal',dest:'Portugal',type:'Immersive Natural Resort',tags:['immersive','detox','romantic'],regions:['Portugal','Europe'],price_base:480,desc:'Stilted whitewashed casas among the rice paddies and dunes of Comporta. Absolute silence. Wild horses.',dest_img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1601918774946-25832a4be0d6?w=800&q=80',book:'https://www.casasnaareia.com/'},
    {id:'elounda-villas',name:'Elounda Gulf Villas',chain:'Small Luxury Hotels',loc:'Crete, Greece',dest:'Crete',type:'Private Villa Complex',tags:['immersive','romantic','5star'],regions:['Greece','Mediterranean','Europe'],price_base:1800,desc:'21 private villas on Mirabello Bay. The largest spans 700m². Private beach and helipad. Total privacy.',dest_img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.eloundagulfvillas.com/'},
    {id:'can-lluc',name:'Can Lluc Boutique Hotel & Villas',chain:'Small Luxury Hotels',loc:'Ibiza, Spain',dest:'Ibiza',type:'Adults-Only Villa Hotel',tags:['immersive','detox','romantic'],regions:['Spain','Mediterranean','Europe'],price_base:480,desc:"Rural adults-only estate in the Ibiza countryside. Organic vegetable gardens. Intimate farm-to-table dining.",dest_img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.canlluc.com/'},
  ],
  adventure: [
    {id:'ashford-castle',name:'The Ashford Castle',chain:'Red Carnation Hotels',loc:'County Mayo, Ireland',dest:'Ireland',type:'Medieval Castle Hotel',tags:['adventure','cultural','5star'],regions:['Ireland','Europe'],price_base:900,desc:"A 13th-century castle on the shores of Lough Corrib. Falconry school. George V dining room.",dest_img:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',book:'https://www.ashfordcastle.com/'},
    {id:'belmond-timeo',name:'Belmond Grand Hotel Timeo',chain:'Belmond',loc:'Taormina, Sicily',dest:'Sicily',type:'Clifftop Hotel',tags:['adventure','cultural','5star'],regions:['Italy','Mediterranean','Europe'],price_base:900,desc:'Perched above Taormina with views of Etna and the Ionian Sea. Otto Geleng restaurant. 1873.',dest_img:'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',book:'https://www.belmond.com/hotels/europe/italy/sicily/taormina/belmond-grand-hotel-timeo/'},
    {id:'mo-bodrum',name:'Mandarin Oriental Bodrum',chain:'Mandarin Oriental',loc:'Bodrum, Turkey',dest:'Bodrum',type:'Seaside Resort',tags:['adventure','romantic','5star'],regions:['Turkey','Mediterranean','Europe'],price_base:1100,desc:"Perched on a peninsula in the Aegean. Private beach. Award-winning spa. Sensational Aegean vistas.",dest_img:'https://images.unsplash.com/photo-1469796466635-455ede028aca?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.mandarinoriental.com/en/bodrum'},
  ],
  cultural: [
    {id:'mo-barcelona',name:'Mandarin Oriental Barcelona',chain:'Mandarin Oriental',loc:'Barcelona, Spain',dest:'Barcelona',type:'Urban Luxury Hotel',tags:['cultural','romantic','5star'],regions:['Spain','Mediterranean','Europe'],price_base:800,desc:'On Passeig de Gràcia, the most elegant boulevard in Spain. Blanc restaurant by Carme Ruscalleda.',dest_img:'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',book:'https://www.mandarinoriental.com/en/barcelona/passeig-de-gracia'},
    {id:'villa-astor',name:'Villa Astor',chain:'Private Estate',loc:'Sorrento, Amalfi Coast, Italy',dest:'Amalfi Coast',type:'Historic Private Villa',tags:['cultural','romantic','5star'],regions:['Italy','Mediterranean','Europe'],price_base:2200,desc:"Former residence of the Duke of Astor overlooking the Bay of Naples. Infinity pool, private chef.",dest_img:'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://villaastor.com/'},
    {id:'melia-palacio',name:'Melia Palacio de Los Duques',chain:'Meliá Hotels',loc:'Madrid, Spain',dest:'Madrid',type:'Historic Palace Hotel',tags:['cultural','5star','celebration'],regions:['Spain','Europe'],price_base:550,desc:"19th-century ducal palace near the Royal Palace of Madrid. Iconic Level THE ONLY ONE. Roof Garden.",dest_img:'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.melia.com/en/hotels/spain/madrid/melia-palacio-de-los-duques'},
  ],
};

// Flatten all destinations
const ALL_DESTINATIONS = Object.values(CATALOGUE).flat();

// ── Scoring engine ──────────────────────────────────────────────────────────
function scoreDest(dest, profile) {
  let score = 50; // base
  const expTypes = Array.isArray(profile.expType) ? profile.expType : [profile.expType].filter(Boolean);
  const regions = Array.isArray(profile.region) ? profile.region : [profile.region].filter(Boolean);
  const budget = profile.budget || 'luxury';
  const tripType = profile.tripType || '';

  // Budget fit (0–25 pts)
  const budgetRanges = { comfort: [0, 700], luxury: [200, 1800], ultra: [800, 99999] };
  const [minB, maxB] = budgetRanges[budget] || [0, 99999];
  if (dest.price_base >= minB && dest.price_base <= maxB) {
    // Bonus for being in middle of range (sweet spot)
    const mid = (minB + maxB) / 2;
    const spread = (maxB - minB) || 1;
    score += 25 - Math.abs(dest.price_base - mid) / spread * 15;
  } else {
    score -= 20; // out of budget
  }

  // Experience type match (0–30 pts) — 'villa' maps to 'immersive' tags
  const expTagMap = { villa: ['immersive', 'romantic', '5star'] };
  expTypes.forEach(exp => {
    const checkTags = expTagMap[exp] ? [exp, ...expTagMap[exp]] : [exp];
    if (checkTags.some(t => dest.tags.includes(t))) score += 15;
  });

  // Trip type → tag affinity map (0–20 pts)
  const tripTagMap = {
    romantic: ['romantic'],
    wellness: ['wellness', 'detox'],
    adventure: ['adventure'],
    cultural: ['cultural'],
    celebration: ['celebration', 'romantic', '5star'],
    detox: ['detox', 'immersive', 'wellness'],
  };
  const relevantTags = tripTagMap[tripType] || [];
  relevantTags.forEach(tag => {
    if (dest.tags.includes(tag)) score += 7;
  });

  // Region match (0–15 pts)
  if (regions.length) {
    const regionMatch = regions.some(r =>
      dest.regions.some(dr => dr.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(dr.toLowerCase()))
    );
    if (regionMatch) score += 15;
  } else {
    score += 5; // no preference = neutral
  }

  // Natur-Lux boost when immersive requested (signature property)
  if (dest.featured && expTypes.includes('immersive')) score += 20;

  // Penalise if explicitly not matching any exp type
  const anyTagMatch = expTypes.some(exp => dest.tags.includes(exp));
  if (expTypes.length > 0 && !anyTagMatch) score -= 15;

  return Math.min(100, Math.max(0, score));
}

function selectDestination(profile) {
  const scored = ALL_DESTINATIONS.map(d => ({ dest: d, score: scoreDest(d, profile) }));
  scored.sort((a, b) => b.score - a.score);

  // Pick top 3 then weighted random to add variety
  const top3 = scored.slice(0, 3);
  const totalScore = top3.reduce((s, d) => s + d.score, 0);
  let rand = Math.random() * totalScore;
  for (const { dest, score } of top3) {
    rand -= score;
    if (rand <= 0) return dest;
  }
  return top3[0].dest;
}

// ── Prompt builder ──────────────────────────────────────────────────────────
function buildPrompt(profile, dest, lang) {
  const isES = lang === 'es';
  const tripMap = {
    romantic: isES ? 'escapada romántica para pareja' : 'romantic escape for a couple',
    wellness: isES ? 'bienestar y transformación personal' : 'wellness and personal transformation',
    adventure: isES ? 'aventura premium' : 'premium adventure',
    cultural: isES ? 'inmersión cultural y gastronómica' : 'cultural and gastronomic immersion',
    celebration: isES ? 'celebración privada (aniversario/cumpleaños/hito)' : 'private celebration (anniversary/birthday/milestone)',
    detox: isES ? 'detox digital completo e inmersión en la naturaleza' : 'complete digital detox and nature immersion',
  };
  const budgetMap = {
    comfort: isES ? 'premium (200-500 EUR/noche)' : 'premium (200-500 EUR/night)',
    luxury: isES ? 'lujo (500-1500 EUR/noche)' : 'luxury (500-1500 EUR/night)',
    ultra: isES ? 'ultra-lujo (1500+ EUR/noche)' : 'ultra-luxury (1500+ EUR/night)',
  };

  return `You are Luxy, an elite AI Experience Agent. You curate extraordinary European journeys with the depth and intelligence of a seasoned luxury travel consultant.

TRAVELER PROFILE:
- Trip type: ${tripMap[profile.tripType] || 'premium journey'}
- Travelers: ${profile.travelers || '2'}
- Nights: ${profile.nights || 4}
- Stay preference: ${[profile.expType].flat().filter(Boolean).join(', ') || 'luxury hotel'}
- Region preference: ${[profile.region].flat().filter(Boolean).join(', ') || 'Europe'}
- Budget tier: ${budgetMap[profile.budget] || 'luxury (500-1500 EUR/night)'}
- Special occasion: ${profile.special || 'none stated'}

SELECTED PROPERTY (AI-scored best match for this profile): ${dest.name} (${dest.chain})
Location: ${dest.loc}
Property description: ${dest.desc}

TASK: Design an extraordinary, fully personalized experience at ${dest.name}.

CRITICAL REQUIREMENTS:
1. Use REAL names for ALL restaurants (with actual Michelin star count), experiences (with real provider names) and suppliers within 30 minutes of ${dest.loc}. Research accurately.
2. The itinerary must feel personally designed for THIS traveler's specific profile, not generic.
3. ai_insight must mention at least 2 specific details from their profile answers and explain precisely why this destination is the perfect match.
4. If a special occasion is stated, weave it naturally into Day 1 evening or a key moment.
5. Prices in included and add_ons should be realistic and specific.

REFERENCE EXAMPLE (quality bar — for a romantic Paris couple):
{
  "title": "Paris: The Art of Slowing Down",
  "subtitle": "A curated journey for two through the city's most intimate rooms and rarest tables. Designed by Luxy with a depth no algorithm has matched before.",
  "destination_name": "Four Seasons Hotel George V",
  "destination_location": "Paris, France",
  "itinerary": [
    {"time":"Day 1 · 15:00","activity":"Private arrival at George V with in-room champagne setup (Krug Grande Cuvée) and bespoke flower arrangement by Jeff Leatham","category":"arrival"},
    {"time":"Day 1 · 20:00","activity":"Le Cinq (3 Michelin stars, Chef Christian Le Squer) — tasting menu with wine pairing. Reserve the semi-private alcove table.","category":"dining"},
    {"time":"Day 2 · 09:30","activity":"Private morning at Musée de l'Orangerie before opening hours — Monet's Nymphéas in complete silence, arranged via hotel concierge","category":"experience"},
    {"time":"Day 2 · 13:00","activity":"Lunch at Taillevent (2 Michelin stars) on Rue Lamennais — the sole de Douvres meunière is essential","category":"dining"},
    {"time":"Day 2 · 17:00","activity":"Private seine river cruise on a 1920s mahogany boat (Yachts de Paris) with Champagne at golden hour","category":"afternoon"},
    {"time":"Day 4 · 11:00","activity":"Late check-out at noon, private transfer to CDG in a Mercedes S-Class","category":"departure"}
  ],
  "price_per_night": 1500,
  "included": ["Daily breakfast at Le Cinq included","Private Mercedes S-Class airport transfers","Luxy concierge 24h with pre-arrival preferences","VIP access and priority reservations via hotel"],
  "add_ons": ["Private Louvre after-hours tour (Chanel Foundation access, +480€)","In-suite couples massage by Sisley Paris therapist (+340€)","Helicopter transfer CDG → Versailles for day trip (+1,200€)"],
  "ai_insight": "Your romantic profile combined with a cultural affinity led Luxy to George V: the only Paris palace hotel with three Michelin-starred restaurants under one roof, meaning every meal is a celebration without leaving. For a couple who values the rare over the recognizable, the private Orangerie access before opening transforms an iconic landmark into an intimate moment made only for you.",
  "is_natur_lux": false
}

Respond ONLY in ${isES ? 'Spanish' : 'English'}. Return valid JSON matching the structure above. No backticks, no markdown, no commentary.`;
}

// ── Rate limiter ────────────────────────────────────────────────────────────
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = RATE_LIMIT.get(ip);
  if (!entry || now > entry.resetAt) {
    RATE_LIMIT.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= MAX_RPM) return false;
  entry.count++;
  return true;
}

// ── Netlify Function handler ────────────────────────────────────────────────
exports.handler = async (event) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://ask-luxy.com';
  const origin = event.headers['origin'] || '';
  const corsOrigin = (origin === allowedOrigin || origin.endsWith('.netlify.app')) ? origin : allowedOrigin;

  const headers = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const ip = event.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  if (!checkRateLimit(ip)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Rate limit exceeded. Please wait a minute.' }) };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Service temporarily unavailable.' }) };
  }

  let rawProfile, lang;
  try {
    const body = JSON.parse(event.body || '{}');
    rawProfile = body.profile;
    lang = body.lang === 'es' ? 'es' : 'en';
    if (!rawProfile || typeof rawProfile !== 'object') throw new Error('Missing profile');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const profile = validateProfile(rawProfile);
  const dest = selectDestination(profile);
  const score = Math.round(scoreDest(dest, profile));
  const prompt = buildPrompt(profile, dest, lang);
  const t0 = Date.now();

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: 'You are Luxy, an elite AI luxury travel curator. You respond only with valid JSON, never with markdown or commentary.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const text = (data?.content || []).find(c => c.type === 'text')?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    logGeneration({ ip, profile, dest, score, latencyMs: Date.now() - t0, success: true, tokenUsage: data.usage });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...parsed,
        dest,
        dest_img: dest.dest_img,
        hotel_img: dest.hotel_img,
        hotel_name: dest.name,
        book_url: dest.book,
        is_natur_lux: dest.featured || false,
        _scoring_score: score,
      }),
    };
  } catch (err) {
    logGeneration({ ip, profile, dest, score, latencyMs: Date.now() - t0, success: false, error: err.message });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        _fallback: true,
        title: lang === 'es' ? `${dest.loc.split(',')[0]}: Irrepetible` : `${dest.loc.split(',')[0]}: Unrepeatable`,
        subtitle: lang === 'es'
          ? `Una experiencia diseñada por Luxy en ${dest.loc} para tu perfil exacto.`
          : `An experience designed by Luxy in ${dest.loc} for your exact profile.`,
        destination_name: dest.name,
        destination_location: dest.loc,
        itinerary: [
          {time: lang==='es'?'Día 1 · 15:00':'Day 1 · 15:00', activity: lang==='es'?`Llegada y bienvenida privada en ${dest.name}`:`Private arrival and welcome at ${dest.name}`, category:'arrival'},
          {time: lang==='es'?'Día 1 · 20:00':'Day 1 · 20:00', activity: lang==='es'?'Cena degustación con el mejor chef local':'Signature tasting menu at the destination\'s finest table', category:'dining'},
          {time: lang==='es'?'Día 2 · 09:00':'Day 2 · 09:00', activity: lang==='es'?'Experiencia matinal exclusiva curada por Luxy':'Exclusive morning experience curated by Luxy', category:'experience'},
          {time: lang==='es'?'Día 2 · 14:00':'Day 2 · 14:00', activity: lang==='es'?'Almuerzo privado con vistas panorámicas':'Private lunch with panoramic views', category:'dining'},
          {time: lang==='es'?'Día 2 · 17:00':'Day 2 · 17:00', activity: lang==='es'?'Tarde de actividad exclusiva bajo petición':'Exclusive afternoon experience on request', category:'afternoon'},
          {time: lang==='es'?`Día ${profile.nights} · 11:00`:`Day ${profile.nights} · 11:00`, activity: lang==='es'?'Check-out tardío y traslado privado al aeropuerto':'Late check-out and private airport transfer', category:'departure'},
        ],
        price_per_night: dest.price_base,
        included: lang === 'es'
          ? ['Desayuno gourmet incluido','Traslado privado aeropuerto','Concierge Luxy 24h','Acceso VIP instalaciones']
          : ['Gourmet breakfast included','Private airport transfer','Luxy concierge 24/7','VIP facility access'],
        add_ons: lang === 'es'
          ? ['Cena romántica privada (+250€)','Masaje en pareja (+180€)','Experiencia privada exclusiva (+320€)']
          : ['Private romantic dinner (+€250)','Couples massage (+€180)','Exclusive bespoke experience (+€320)'],
        ai_insight: lang === 'es'
          ? `Luxy seleccionó ${dest.name} porque encaja con tu perfil de forma excepcional. ${dest.desc} Esta experiencia ha sido diseñada específicamente para ti.`
          : `Luxy selected ${dest.name} as your exceptional match. ${dest.desc} This experience was designed specifically for your profile.`,
        dest, dest_img: dest.dest_img, hotel_img: dest.hotel_img, hotel_name: dest.name, book_url: dest.book,
        is_natur_lux: dest.featured || false,
        _scoring_score: score,
      }),
    };
  }
};
