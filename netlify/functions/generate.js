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
    {id:'aman-venice',name:'Aman Venice',chain:'Aman Resorts',loc:'Venice, Italy',dest:'Venice',type:'Palace Hotel',tags:['romantic','cultural','5star'],regions:['Italy','Mediterranean','Europe'],price_base:1800,desc:'A 16th-century palazzo on the Grand Canal. Murano glass chandeliers, private gondola, 24 intimate rooms.',dest_img:'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.aman.com/hotels/aman-venice',booking_url:'https://www.booking.com/hotel/it/aman-venice.html'},
    {id:'fs-george-v',name:'Four Seasons Hotel George V',chain:'Four Seasons',loc:'Paris, France',dest:'Paris',type:'Palace Hotel',tags:['romantic','celebration','5star','cultural'],regions:['France','Europe'],price_base:1500,desc:'The iconic address on Avenue George V. Three Michelin stars. Legendary flower arrangements by Jeff Leatham.',dest_img:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',book:'https://www.fourseasons.com/paris/',booking_url:'https://www.booking.com/hotel/fr/four-seasons-george-v.html'},
    {id:'le-bristol',name:'Le Bristol Paris',chain:'Oetker Collection',loc:'Paris, France',dest:'Paris',type:'Palace Hotel',tags:['romantic','5star','cultural'],regions:['France','Europe'],price_base:1400,desc:'On Rue du Faubourg Saint-Honoré. Épicure by Eric Frechon: 3 Michelin stars. The largest hotel pool in Paris.',dest_img:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.oetkercollection.com/hotels/le-bristol-paris/',booking_url:'https://www.booking.com/hotel/fr/le-bristol.html'},
    {id:'hotel-arts',name:'Hotel Arts Barcelona',chain:'Ritz-Carlton',loc:'Barcelona, Spain',dest:'Barcelona',type:'Urban Luxury Hotel',tags:['5star','cultural'],regions:['Spain','Mediterranean','Europe'],price_base:650,desc:"44-storey tower over Barceloneta beach. Rooftop pool. Frank Gehry's golden fish sculpture below.",dest_img:'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.hotelartsbarcelona.com/',booking_url:'https://www.booking.com/hotel/es/arts-barcelona.html'},
    {id:'hotel-de-russie',name:'Hotel de Russie',chain:'Rocco Forte Hotels',loc:'Rome, Italy',dest:'Rome',type:'City Palace',tags:['romantic','cultural','5star'],regions:['Italy','Mediterranean','Europe'],price_base:900,desc:'Near Piazza del Popolo. The legendary Jardin Russe secret garden. La Stravinskij bar.',dest_img:'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.roccofortehotels.com/hotels-and-resorts/hotel-de-russie/',booking_url:'https://www.booking.com/hotel/it/hotel-de-russie.html'},
    {id:'badrutts',name:"Badrutt's Palace Hotel",chain:'Independent',loc:'St. Moritz, Switzerland',dest:'St. Moritz',type:'Alpine Palace',tags:['adventure','5star','celebration'],regions:['Switzerland','Europe'],price_base:1200,desc:"Alpine institution since 1896. Ski-in/ski-out access. The legendary King's Club. Quintessential St. Moritz.",dest_img:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',book:'https://www.badruttspalace.com/',booking_url:'https://www.booking.com/hotel/ch/badrutt-s-palace-st-moritz.html'},
    {id:'capri-palace',name:'Capri Palace Jumeirah',chain:'Jumeirah Hotels',loc:'Capri, Italy',dest:'Capri',type:'Island Luxury Hotel',tags:['romantic','5star','cultural'],regions:['Italy','Mediterranean','Europe'],price_base:1300,desc:"White Mediterranean palace at 300m above sea level. L'Olivo: 2 Michelin stars. The Mediterranean Clinic spa.",dest_img:'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.jumeirah.com/en/stay/capri/capri-palace-jumeirah',booking_url:'https://www.booking.com/hotel/it/capri-palace.html'},
    {id:'du-cap',name:'Hotel du Cap-Eden-Roc',chain:'Oetker Collection',loc:"Cap d'Antibes, French Riviera",dest:'French Riviera',type:'Riviera Legend',tags:['romantic','5star','celebration'],regions:['France','Mediterranean','Europe'],price_base:2200,desc:"The ultimate Riviera legend since 1870. Cliff-edge pool carved from rock. The favorite of Picasso and Fitzgerald.",dest_img:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',book:'https://www.oetkercollection.com/hotels/hotel-du-cap-eden-roc/',booking_url:'https://www.booking.com/hotel/fr/hotel-du-cap-eden-roc.html'},
    {id:'belmond-cipriani',name:'Belmond Hotel Cipriani',chain:'Belmond',loc:'Venice, Italy',dest:'Venice',type:'Island Hotel',tags:['romantic','5star','celebration'],regions:['Italy','Mediterranean','Europe'],price_base:1600,desc:"On its own island in the Venetian lagoon. Olympic pool. The legendary Cip's Club on the water.",dest_img:'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.belmond.com/hotels/europe/italy/venice/belmond-hotel-cipriani/',booking_url:'https://www.booking.com/hotel/it/belmond-hotel-cipriani.html'},
    {id:'rosewood-madrid',name:'Rosewood Villa Magna',chain:'Rosewood Hotels',loc:'Madrid, Spain',dest:'Madrid',type:'Urban Palace',tags:['5star','cultural','celebration'],regions:['Spain','Europe'],price_base:950,desc:'On Paseo de la Castellana, heart of luxury Madrid. Bibo Madrid by Dani García. World-class art collection.',dest_img:'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.rosewoodhotels.com/en/villa-magna',booking_url:'https://www.booking.com/hotel/es/villa-magna.html'},
    // Expanded 5star properties
    {id:'borgo-egnazia',name:'Borgo Egnazia',chain:'Independent',loc:'Fasano, Puglia, Italy',dest:'Puglia',type:'Masseria Resort',tags:['romantic','cultural','5star','wellness'],regions:['Italy','Mediterranean','Europe'],price_base:1100,desc:'A reimagined trulli village in the Valle d\'Itria. Vair spa. Don Mimi restaurant with regional Apulian cuisine and a 1 Michelin star.',dest_img:'https://images.unsplash.com/photo-1559386484-97dfc0e15539?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',book:'https://www.borgoegnazia.com/',booking_url:'https://www.booking.com/hotel/it/borgo-egnazia.html'},
    {id:'rosewood-castiglion',name:'Rosewood Castiglion del Bosco',chain:'Rosewood Hotels',loc:'Montalcino, Tuscany, Italy',dest:'Tuscany',type:'Medieval Wine Estate',tags:['romantic','cultural','5star','immersive'],regions:['Italy','Mediterranean','Europe'],price_base:1350,desc:'A 5,000-acre medieval estate in the heart of Brunello di Montalcino country. Private winery, golf course, and a Romanesque chapel dating to 1100.',dest_img:'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',book:'https://www.rosewoodhotels.com/en/castiglion-del-bosco',booking_url:'https://www.booking.com/hotel/it/castiglion-del-bosco.html'},
    {id:'il-pellicano',name:'Il Pellicano',chain:'Pellicano Hotels',loc:'Porto Ercole, Tuscany, Italy',dest:'Tuscany',type:'Coastal Boutique Hotel',tags:['romantic','5star','cultural'],regions:['Italy','Mediterranean','Europe'],price_base:1200,desc:'The original hideaway of celebrities and old money on the Argentario coast since 1965. Cliff-edge saltwater pool. Il Pellicanetto beach restaurant.',dest_img:'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.pellicanohotels.com/il-pellicano/',booking_url:'https://www.booking.com/hotel/it/il-pellicano.html'},
    {id:'tschuggen-arosa',name:'Hotel Tschuggen Grand',chain:'Tschuggen Collection',loc:'Arosa, Switzerland',dest:'Arosa',type:'Alpine Spa Hotel',tags:['wellness','adventure','5star'],regions:['Switzerland','Europe'],price_base:1050,desc:'A landmark alpine hotel with the Tschuggen Bergoase spa — a 5,500m² subterranean wellness world designed by Mario Botta. Direct gondola link to 225km of ski slopes.',dest_img:'https://images.unsplash.com/photo-1587502537745-84b86da1204f?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',book:'https://www.tschuggen.ch/',booking_url:'https://www.booking.com/hotel/ch/tschuggen-grand.html'},
    {id:'palazzo-margherita',name:'Palazzo Margherita',chain:'Independent',loc:'Bernalda, Basilicata, Italy',dest:'Basilicata',type:'Noble Palace Hotel',tags:['cultural','romantic','5star','immersive'],regions:['Italy','Mediterranean','Europe'],price_base:700,desc:'A 19th-century palazzo in a hilltop village in Basilicata, restored by Francis Ford Coppola. Nine suites. Garden pool. Local cuisine from family recipes.',dest_img:'https://images.unsplash.com/photo-1559386484-97dfc0e15539?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.palazzomargherita.com/',booking_url:'https://www.booking.com/hotel/it/palazzo-margherita.html'},
    {id:'grand-tremezzo',name:'Grand Hotel Tremezzo',chain:'Independent',loc:'Lake Como, Italy',dest:'Lake Como',type:'Belle Epoque Lake Hotel',tags:['romantic','5star','cultural'],regions:['Italy','Mediterranean','Europe'],price_base:1150,desc:'The Art Nouveau landmark on Lake Como since 1910. Three floating pools on the lake. T Restaurant with sweeping Como views and seasonal Larian cuisine.',dest_img:'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',book:'https://www.grandhoteltremezzo.com/',booking_url:'https://www.booking.com/hotel/it/grand-hotel-tremezzo.html'},
    {id:'brenners',name:'Brenners Park-Hotel & Spa',chain:'Oetker Collection',loc:'Baden-Baden, Germany',dest:'Baden-Baden',type:'Historic Grand Hotel',tags:['wellness','5star','romantic'],regions:['Germany','Europe'],price_base:900,desc:"Germany's most celebrated grand hotel since 1872 on the banks of the Oos River. The Brenners Villa. 7,000m² spa with original Roman-Irish baths.",dest_img:'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.oetkercollection.com/hotels/brenners-park-hotel-spa/',booking_url:'https://www.booking.com/hotel/de/brenners-park-hotel-und-spa.html'},
    {id:'hotel-sacher',name:'Hotel Sacher Wien',chain:'Sacher Hotels',loc:'Vienna, Austria',dest:'Vienna',type:'Imperial Grand Hotel',tags:['cultural','5star','celebration'],regions:['Austria','Europe'],price_base:750,desc:'Behind the Vienna State Opera since 1876. The birthplace of the Original Sacher-Torte. Red Sacher Bar and Anna Sacher restaurant with imperial Viennese cuisine.',dest_img:'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',book:'https://www.sacher.com/hotels/hotel-sacher-wien/',booking_url:'https://www.booking.com/hotel/at/sacher-wien.html'},
    {id:'amanzoe',name:'Amanzoe',chain:'Aman Resorts',loc:'Porto Heli, Peloponnese, Greece',dest:'Peloponnese',type:'Hilltop Sanctuary',tags:['romantic','5star','cultural','wellness'],regions:['Greece','Mediterranean','Europe'],price_base:2100,desc:'A Doric-columned sanctuary on a hillside above the Argolic Gulf. 38 pavilions and pool villas. Private beach club accessible by vintage beach buggy.',dest_img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.aman.com/hotels/amanzoe',booking_url:'https://www.booking.com/hotel/gr/amanzoe.html'},
    {id:'abadia-retuerta',name:'Abadía Retuerta LeDomaine',chain:'Independent',loc:'Sardón de Duero, Castilla y León, Spain',dest:'Ribera del Duero',type:'Abbey Wine Estate',tags:['cultural','5star','wellness','romantic'],regions:['Spain','Europe'],price_base:950,desc:'A 12th-century Romanesque abbey transformed into a wine estate and luxury hotel in the heart of Ribera del Duero. Refectorio restaurant: 1 Michelin star. Santuario spa.',dest_img:'https://images.unsplash.com/photo-1601918774946-25832a4be0d6?w=800&q=80',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.ledomaine.es/',booking_url:'https://www.booking.com/hotel/es/abadia-retuerta-ledomaine.html'},
    {id:'finca-cortesín',name:'Finca Cortesín Hotel & Golf Resort',chain:'Independent',loc:'Casares, Marbella, Spain',dest:'Costa del Sol',type:'Andalusian Golf & Spa Resort',tags:['5star','wellness','adventure','romantic'],regions:['Spain','Mediterranean','Europe'],price_base:950,desc:"One of Europe's top golf resorts — ranked No.1 in Spain — on 215 hectares between the Sierra Bermeja mountains and the Mediterranean. Kabuki Raw restaurant: 1 Michelin star.",dest_img:'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',book:'https://www.fincacortesín.com/',booking_url:'https://www.booking.com/hotel/es/finca-cortesín.html'},
    {id:'rincón-de-pepe',name:'NH Collection Murcia Conde de Floridablanca',chain:'NH Hotels',loc:'Murcia, Spain',dest:'Murcia',type:'Boutique City Hotel',tags:['cultural','5star'],regions:['Spain','Mediterranean','Europe'],price_base:280,desc:"Murcia's finest address in a converted 19th-century convent palace. Extraordinary local dining and access to the city's underrated Baroque cathedral and art museums.",dest_img:'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.nhcollection.com/hotel/nh-collection-murcia-conde-de-floridablanca',booking_url:'https://www.booking.com/hotel/es/nh-collection-murcia-conde-de-floridablanca.html'},
    {id:'palacio-de-luces',name:'Palacio de Luces',chain:'Small Luxury Hotels',loc:'Llanes, Asturias, Spain',dest:'Asturias',type:'Coastal Palace Hotel',tags:['romantic','5star','cultural'],regions:['Spain','Europe'],price_base:450,desc:"A restored 18th-century palace on Asturias's wild Atlantic coast. Clifftop terrace over the Cantabrian Sea. Sidra and exceptional Asturian seafood cuisine.",dest_img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.palaciodelluces.com/',booking_url:'https://www.booking.com/hotel/es/palacio-de-luces.html'},
    {id:'ritz-paris',name:'The Ritz Paris',chain:'Independent',loc:'Paris, France',dest:'Paris',type:'Palace Hotel',tags:['romantic','5star','celebration','cultural'],regions:['France','Europe'],price_base:2000,desc:'The original luxury hotel on Place Vendôme since 1898. L\'Espadon: 2 Michelin stars. The Ritz Bar where Hemingway held court. Ritz Club and 15m indoor pool.',dest_img:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.ritzparis.com/',booking_url:'https://www.booking.com/hotel/fr/ritz-paris.html'},
    {id:'villa-deste',name:"Villa d'Este",chain:'Independent',loc:'Cernobbio, Lake Como, Italy',dest:'Lake Como',type:'Renaissance Villa Hotel',tags:['romantic','5star','cultural','celebration'],regions:['Italy','Mediterranean','Europe'],price_base:1400,desc:"A 16th-century cardinal's villa on the shores of Lake Como. Mosaic pool floating on the lake. Veranda restaurant with Como views. A private experience unchanged in elegance for five centuries.",dest_img:'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.villadeste.com/',booking_url:'https://www.booking.com/hotel/it/villa-deste-cernobbio.html'},
    {id:'gh-cap-ferrat',name:'Grand-Hôtel du Cap-Ferrat',chain:'Four Seasons',loc:'Saint-Jean-Cap-Ferrat, French Riviera',dest:'French Riviera',type:'Belle Epoque Riviera Hotel',tags:['romantic','5star','celebration','wellness'],regions:['France','Mediterranean','Europe'],price_base:1900,desc:"On the tip of Cap Ferrat since 1908. The legendary Club Dauphin seawater pool carved into the rocks. Le Cap restaurant with 1 Michelin star.",dest_img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',book:'https://www.fourseasons.com/capferrat/',booking_url:'https://www.booking.com/hotel/fr/grand-hotel-du-cap-ferrat.html'},
  ],
  wellness: [
    {id:'six-senses-ibiza',name:'Six Senses Ibiza',chain:'Six Senses',loc:'Ibiza, Spain',dest:'Ibiza',type:'Wellness Resort',tags:['wellness','detox','immersive'],regions:['Spain','Mediterranean','Europe'],price_base:1100,desc:'North Ibiza cliffside. Adults and families. Holistic wellness, organic farm-to-table, sleep programme.',dest_img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',book:'https://www.sixsenses.com/en/resorts/ibiza',booking_url:'https://www.booking.com/hotel/es/six-senses-ibiza.html'},
    {id:'six-senses-rome',name:'Six Senses Rome',chain:'Six Senses',loc:'Rome, Italy',dest:'Rome',type:'Urban Wellness Hotel',tags:['wellness','cultural'],regions:['Italy','Mediterranean','Europe'],price_base:1000,desc:'A neoclassical palace in the Ludovisi district. Underground spa. Noûs rooftop bar with Forum views.',dest_img:'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.sixsenses.com/en/resorts/rome',booking_url:'https://www.booking.com/hotel/it/six-senses-rome.html'},
    {id:'anantara-marbella',name:'Anantara Villa Padierna Palace',chain:'Anantara Hotels',loc:'Marbella, Spain',dest:'Marbella',type:'Palace Resort',tags:['wellness','romantic','5star'],regions:['Spain','Mediterranean','Europe'],price_base:850,desc:'An Italianate palace in the Benahavís hills. Three championship golf courses. Thalgó Thalasso spa.',dest_img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.anantara.com/en/villa-padierna-marbella',booking_url:'https://www.booking.com/hotel/es/anantara-villa-padierna-marbella.html'},
    // Expanded wellness properties
    {id:'sha-wellness',name:'SHA Wellness Clinic',chain:'SHA',loc:'Altea, Alicante, Spain',dest:'Alicante',type:'Medical Wellness Clinic',tags:['wellness','detox'],regions:['Spain','Mediterranean','Europe'],price_base:1200,desc:"Europe's most awarded medical wellness clinic perched above the Mediterranean. SHA method blends macrobiotic nutrition with cutting-edge longevity medicine. Minimum 5-night transformative programmes.",dest_img:'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',book:'https://shawellness.com/',booking_url:'https://www.booking.com/hotel/es/sha-wellness-clinic.html'},
    {id:'euphoria-retreat',name:'Euphoria Retreat',chain:'Independent',loc:'Mystras, Peloponnese, Greece',dest:'Peloponnese',type:'Holistic Wellness Retreat',tags:['wellness','detox','cultural'],regions:['Greece','Mediterranean','Europe'],price_base:900,desc:'A Byzantine-inspired sanctuary in the hills above the ancient city of Mystras, UNESCO World Heritage Site. Greek holistic therapies rooted in Hellenic healing philosophy. Private thermal pools.',dest_img:'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',book:'https://www.euphoriaretreat.com/',booking_url:'https://www.booking.com/hotel/gr/euphoria-retreat.html'},
    {id:'bürgenstock',name:'Bürgenstock Resort Lake Lucerne',chain:'Bürgenstock Hotels & Resorts',loc:'Bürgenstock, Switzerland',dest:'Lake Lucerne',type:'Alpine Wellness Resort',tags:['wellness','adventure','5star'],regions:['Switzerland','Europe'],price_base:1300,desc:'A private mountain plateau 500m above Lake Lucerne. Alpine Spa at 1,900m² with Europe\'s first outdoor cliff pool. Michelin-starred Ritzcoffier restaurant. Funicular from the lakeside.',dest_img:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.buergenstock.ch/',booking_url:'https://www.booking.com/hotel/ch/buergenstock-resort-lake-lucerne.html'},
    {id:'lefay-garda',name:'Lefay Resort & SPA Lago di Garda',chain:'Lefay Resorts',loc:'Gargnano, Lake Garda, Italy',dest:'Lake Garda',type:'Lakeside Wellness Resort',tags:['wellness','romantic','detox'],regions:['Italy','Mediterranean','Europe'],price_base:700,desc:'A clifftop wellness sanctuary above Lake Garda in a private olive grove. The acclaimed Lefay SPA: 3,600m² of Italian spa culture. Gourmet restaurant with 1 Michelin star.',dest_img:'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',book:'https://www.lefayresorts.com/en/garda',booking_url:'https://www.booking.com/hotel/it/lefay-resort-and-spa-lago-di-garda.html'},
    {id:'palazzo-fiuggi',name:'Palazzo Fiuggi Thermal Medical Spa',chain:'Independent',loc:'Fiuggi, Lazio, Italy',dest:'Lazio',type:'Thermal Medical Spa',tags:['wellness','detox'],regions:['Italy','Mediterranean','Europe'],price_base:1800,desc:'The most exclusive medical retreat in Italy in a Liberty-style palazzo. Three- to four-week longevity programmes designed by Heinz Beck and a team of 150 specialists. Italy\'s legendary thermal waters.',dest_img:'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',book:'https://www.palazzofiuggi.com/',booking_url:'https://www.booking.com/hotel/it/palazzo-fiuggi.html'},
    {id:'preidlhof',name:'Preidlhof Luxury DolceVita Resort',chain:'Independent',loc:'Naturno, South Tyrol, Italy',dest:'South Tyrol',type:'Alpine Wellness Resort',tags:['wellness','adventure','romantic'],regions:['Italy','Europe'],price_base:650,desc:"A DolceVita resort on 30,000m² of landscaped gardens in the Venosta Valley. Five outdoor pools. Award-winning Vitalis Spa. South Tyrol's wine and hiking culture on the doorstep.",dest_img:'https://images.unsplash.com/photo-1587502537745-84b86da1204f?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',book:'https://www.preidlhof.it/',booking_url:'https://www.booking.com/hotel/it/preidlhof-luxury-dolcevita-resort.html'},
    {id:'longevity-alvor',name:'Longevity Medical Spa & Wellness Resort',chain:'Longevity Wellness Worldwide',loc:'Alvor, Algarve, Portugal',dest:'Algarve',type:'Medical Wellness Resort',tags:['wellness','detox'],regions:['Portugal','Europe'],price_base:500,desc:"Portugal's leading longevity and medical wellness resort on the Atlantic coast of the Algarve. Personalised anti-ageing medicine and integrative therapies. Minimum 7-night programmes.",dest_img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',book:'https://longevitywellnessresort.com/',booking_url:'https://www.booking.com/hotel/pt/longevity-medical-spa.html'},
    {id:'terme-di-saturnia',name:'Terme di Saturnia Spa & Golf Resort',chain:'Independent',loc:'Saturnia, Tuscany, Italy',dest:'Tuscany',type:'Thermal Spa Resort',tags:['wellness','romantic','5star'],regions:['Italy','Mediterranean','Europe'],price_base:600,desc:"A Roman thermal resort around Europe's most legendary natural hot springs. The 37.5°C sulphurous waters have been therapeutic for 3,000 years. Championship golf course through Etruscan countryside.",dest_img:'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.termedisaturnia.it/',booking_url:'https://www.booking.com/hotel/it/terme-di-saturnia.html'},
  ],
  immersive: [
    {id:'natur-lux',name:'Natur-Lux Hideaway',chain:'Luxy Signature',loc:'Finestrat, Alicante, Spain',dest:'Alicante',type:'Immersive Natural Resort',tags:['immersive','detox','wellness','romantic'],regions:['Spain','Mediterranean','Europe'],price_base:346,featured:true,desc:'The first AI-powered eco-resort on the Mediterranean coast. Geodesic domes, sky bubbles, infinity pool villas. Only Adults.',dest_img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1601918774946-25832a4be0d6?w=800&q=80',book:'https://natur-lux-hideaway.com',booking_url:'https://www.booking.com/hotel/es/natur-lux-hideaway.html',airbnb_url:'https://www.airbnb.com/rooms/natur-lux-hideaway'},
    {id:'whitepod',name:'Whitepod Eco Luxury Resort',chain:'Whitepod',loc:'Swiss Alps, Switzerland',dest:'Swiss Alps',type:'Immersive Natural Resort',tags:['immersive','adventure','detox'],regions:['Switzerland','Europe'],price_base:550,desc:'15 geodesic pods on a private ski slope at 1,400m altitude. Fine dining igloo. Zero-carbon skiing.',dest_img:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1504474000021-d4b7e83f5481?w=800&q=80',book:'https://www.whitepod.com/',booking_url:'https://www.booking.com/hotel/ch/whitepod.html',airbnb_url:'https://www.airbnb.com/rooms/whitepod-swiss-alps'},
    {id:'casas-areia',name:'Casas na Areia',chain:'Relais & Châteaux',loc:'Comporta, Portugal',dest:'Portugal',type:'Immersive Natural Resort',tags:['immersive','detox','romantic'],regions:['Portugal','Europe'],price_base:480,desc:'Stilted whitewashed casas among the rice paddies and dunes of Comporta. Absolute silence. Wild horses.',dest_img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1601918774946-25832a4be0d6?w=800&q=80',book:'https://www.casasnaareia.com/',booking_url:'https://www.booking.com/hotel/pt/casas-na-areia.html',airbnb_url:'https://www.airbnb.com/rooms/casas-na-areia-comporta'},
    {id:'elounda-villas',name:'Elounda Gulf Villas',chain:'Small Luxury Hotels',loc:'Crete, Greece',dest:'Crete',type:'Private Villa Complex',tags:['immersive','romantic','5star'],regions:['Greece','Mediterranean','Europe'],price_base:1800,desc:'21 private villas on Mirabello Bay. The largest spans 700m². Private beach and helipad. Total privacy.',dest_img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.eloundagulfvillas.com/',booking_url:'https://www.booking.com/hotel/gr/elounda-gulf-villas.html',airbnb_url:'https://www.airbnb.com/rooms/elounda-gulf-villas-crete'},
    {id:'can-lluc',name:'Can Lluc Boutique Hotel & Villas',chain:'Small Luxury Hotels',loc:'Ibiza, Spain',dest:'Ibiza',type:'Adults-Only Villa Hotel',tags:['immersive','detox','romantic'],regions:['Spain','Mediterranean','Europe'],price_base:480,desc:"Rural adults-only estate in the Ibiza countryside. Organic vegetable gardens. Intimate farm-to-table dining.",dest_img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.canlluc.com/',booking_url:'https://www.booking.com/hotel/es/can-lluc-ibiza.html',airbnb_url:'https://www.airbnb.com/rooms/can-lluc-ibiza'},
    // Expanded immersive properties
    {id:'beldroega',name:'Beldroega',chain:'Independent',loc:'Alentejo, Portugal',dest:'Alentejo',type:'Organic Farm Retreat',tags:['immersive','detox','wellness','romantic'],regions:['Portugal','Europe'],price_base:380,desc:'A remote organic farm retreat among the cork oaks and lavender plains of Alentejo. Eight handcrafted cottages. Biodynamic vineyard dinners. Slow travel at its most elemental.',dest_img:'https://images.unsplash.com/photo-1601918774946-25832a4be0d6?w=800&q=80',hotel_img:'https://images.unsplash.com/photo-1504474000021-d4b7e83f5481?w=800&q=80',book:'https://www.beldroega.pt/',booking_url:'https://www.booking.com/hotel/pt/beldroega.html',airbnb_url:'https://www.airbnb.com/rooms/beldroega-alentejo'},
    {id:'torre-de-palma',name:'Torre de Palma Wine Hotel',chain:'Independent',loc:'Monforte d\'Alentejo, Portugal',dest:'Alentejo',type:'Wine Estate Hotel',tags:['immersive','cultural','romantic'],regions:['Portugal','Europe'],price_base:340,desc:'A 14th-century estate with ancient olive trees and a working winery producing award-winning Alentejo wines. Swimming pool among 1,200 acres of dehesa. Cooking classes with the estate chef.',dest_img:'https://images.unsplash.com/photo-1559386484-97dfc0e15539?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1601918774946-25832a4be0d6?w=800&q=80',book:'https://www.torredepalma.com/',booking_url:'https://www.booking.com/hotel/pt/torre-de-palma-wine-hotel.html',airbnb_url:'https://www.airbnb.com/rooms/torre-de-palma-alentejo'},
    {id:'masseria-frantoio',name:'Masseria Il Frantoio',chain:'Independent',loc:'Ostuni, Puglia, Italy',dest:'Puglia',type:'Trulli Masseria',tags:['immersive','cultural','romantic','wellness'],regions:['Italy','Mediterranean','Europe'],price_base:320,desc:"A working Puglian masseria among 3,000 ancient olive trees. The Zanzara restaurant serves zero-kilometre cuisine. Sunset aperitivo in the olive grove. 1,200-year-old olive oil pressed on site.",dest_img:'https://images.unsplash.com/photo-1559386484-97dfc0e15539?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',book:'https://www.masseriailfrantoio.it/',booking_url:'https://www.booking.com/hotel/it/masseria-il-frantoio.html',airbnb_url:'https://www.airbnb.com/rooms/masseria-il-frantoio-ostuni'},
    {id:'les-cabanes-provence',name:'Les Cabanes dans les Arbres',chain:'Independent',loc:'Luberon, Provence, France',dest:'Provence',type:'Treehouse Retreat',tags:['immersive','adventure','romantic','detox'],regions:['France','Mediterranean','Europe'],price_base:290,desc:'Six handcrafted treehouses suspended in centennial oaks deep in the Luberon forest. Private outdoor bathtub. Table d\'hôte dinner under the stars with Provençal produce.',dest_img:'https://images.unsplash.com/photo-1601918774946-25832a4be0d6?w=800&q=80',hotel_img:'https://images.unsplash.com/photo-1504474000021-d4b7e83f5481?w=800&q=80',book:'https://www.treehouse-provence.com/',booking_url:'https://www.booking.com/hotel/fr/cabanes-dans-les-arbres-luberon.html',airbnb_url:'https://www.airbnb.com/rooms/cabanes-arbres-luberon-provence'},
    {id:'lime-wood',name:'Lime Wood Hotel',chain:'Lime Wood Group',loc:'New Forest, Hampshire, UK',dest:'Hampshire',type:'Country House Hotel',tags:['immersive','wellness','adventure','romantic'],regions:['UK','Europe'],price_base:650,desc:"A Regency manor in the ancient New Forest. Luke Holder and Angela Hartnett's Hartnett Holder & Co. restaurant. The Herb House spa. Wild swimming and deer stalking.",dest_img:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',book:'https://www.limewood.co.uk/',booking_url:'https://www.booking.com/hotel/gb/lime-wood.html'},
    {id:'domaine-des-etangs',name:'Domaine des Étangs',chain:'Auberge Resorts Collection',loc:'Massignac, Charente, France',dest:'Cognac Country',type:'Lakeside Estate',tags:['immersive','cultural','romantic','wellness'],regions:['France','Europe'],price_base:550,desc:'A 2,500-acre estate of lakes, forests and truffle oaks around a medieval fortified manor in Cognac country. Sole Mio restaurant. Foraging, mushroom hunting and cognac cellar visits.',dest_img:'https://images.unsplash.com/photo-1601918774946-25832a4be0d6?w=800&q=80',hotel_img:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',book:'https://www.domainedesetangs.com/',booking_url:'https://www.booking.com/hotel/fr/domaine-des-etangs.html',airbnb_url:'https://www.airbnb.com/rooms/domaine-des-etangs-charente'},
  ],
  adventure: [
    {id:'ashford-castle',name:'The Ashford Castle',chain:'Red Carnation Hotels',loc:'County Mayo, Ireland',dest:'Ireland',type:'Medieval Castle Hotel',tags:['adventure','cultural','5star'],regions:['Ireland','Europe'],price_base:900,desc:"A 13th-century castle on the shores of Lough Corrib. Falconry school. George V dining room.",dest_img:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',book:'https://www.ashfordcastle.com/',booking_url:'https://www.booking.com/hotel/ie/ashford-castle.html'},
    {id:'belmond-timeo',name:'Belmond Grand Hotel Timeo',chain:'Belmond',loc:'Taormina, Sicily',dest:'Sicily',type:'Clifftop Hotel',tags:['adventure','cultural','5star'],regions:['Italy','Mediterranean','Europe'],price_base:900,desc:'Perched above Taormina with views of Etna and the Ionian Sea. Otto Geleng restaurant. 1873.',dest_img:'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',book:'https://www.belmond.com/hotels/europe/italy/sicily/taormina/belmond-grand-hotel-timeo/',booking_url:'https://www.booking.com/hotel/it/belmond-grand-hotel-timeo.html'},
    {id:'mo-bodrum',name:'Mandarin Oriental Bodrum',chain:'Mandarin Oriental',loc:'Bodrum, Turkey',dest:'Bodrum',type:'Seaside Resort',tags:['adventure','romantic','5star'],regions:['Turkey','Mediterranean','Europe'],price_base:1100,desc:"Perched on a peninsula in the Aegean. Private beach. Award-winning spa. Sensational Aegean vistas.",dest_img:'https://images.unsplash.com/photo-1469796466635-455ede028aca?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.mandarinoriental.com/en/bodrum',booking_url:'https://www.booking.com/hotel/tr/mandarin-oriental-bodrum.html'},
    // Expanded adventure properties
    {id:'vigilius',name:'Vigilius Mountain Resort',chain:'Independent',loc:'Lana, South Tyrol, Italy',dest:'South Tyrol',type:'Alpine Eco Resort',tags:['adventure','wellness','detox'],regions:['Italy','Europe'],price_base:520,desc:"Accessible only by cable car at 1,500m above the Etschtal valley. Matthias Unterfrauner's Stube restaurant. No-car, no-wifi-in-rooms policy. Alpine wellness in Matteo Thun-designed architecture.",dest_img:'https://images.unsplash.com/photo-1587502537745-84b86da1204f?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',book:'https://www.vigilius.it/',booking_url:'https://www.booking.com/hotel/it/vigilius-mountain-resort.html'},
    {id:'forsthofgut',name:'Forsthofgut Alpenresort',chain:'Independent',loc:'Leogang, Salzburg, Austria',dest:'Salzburg',type:'Alpine Biosphere Resort',tags:['adventure','wellness','detox'],regions:['Austria','Europe'],price_base:580,desc:'Set in 6,000m² of Alpine forests in the UNESCO Biosphere Reserve Salzburg Alps. 1,700m² wellness world with outdoor forest pool. Electric mountain bike fleet. Zero-waste farm cuisine.',dest_img:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',book:'https://www.forsthofgut.at/',booking_url:'https://www.booking.com/hotel/at/forsthofgut.html'},
    {id:'schloss-elmau',name:'Schloss Elmau Luxury Spa Retreat',chain:'Schloss Elmau',loc:'Elmau, Bavaria, Germany',dest:'Bavaria',type:'Alpine Castle Retreat',tags:['adventure','wellness','5star','cultural'],regions:['Germany','Europe'],price_base:1100,desc:"A mountain sanctuary at 1,000m in the Bavarian Alps founded by the philosopher Ernst Müller-Elmau. Seven restaurants including Luce d'Oro: 2 Michelin stars. World-class classical music programme.",dest_img:'https://images.unsplash.com/photo-1587502537745-84b86da1204f?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',book:'https://www.schloss-elmau.de/',booking_url:'https://www.booking.com/hotel/de/schloss-elmau.html'},
    {id:'niwa-andorra',name:'Niwa Mountain Resort',chain:'Independent',loc:'Ordino, Andorra',dest:'Andorra',type:'Mountain Boutique Resort',tags:['adventure','wellness','romantic'],regions:['Andorra','Europe'],price_base:420,desc:'A pioneering mountain retreat in the Ordino Arcalís ski area with an architecture that dissolves into the Pyrenean landscape. Access to 320km of ski runs. Forest bathing and off-piste snowshoeing programmes.',dest_img:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1587502537745-84b86da1204f?w=800&q=80',book:'https://www.niwa.ad/',booking_url:'https://www.booking.com/hotel/ad/niwa-mountain-resort.html'},
    {id:'chateau-les-merles',name:'Château Les Merles',chain:'Independent',loc:'Mouleydier, Périgord, France',dest:'Périgord',type:'Château & Golf Estate',tags:['adventure','cultural','romantic'],regions:['France','Europe'],price_base:350,desc:"A 17th-century château and private golf course in the Dordogne wine country. Private fly-fishing on the Dordogne river. Truffle and foie gras tastings. Stone-walled spa with salt-water pool.",dest_img:'https://images.unsplash.com/photo-1601918774946-25832a4be0d6?w=800&q=80',hotel_img:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',book:'https://www.lesmerles.com/',booking_url:'https://www.booking.com/hotel/fr/chateau-les-merles.html'},
    {id:'le-manoir',name:'Le Manoir aux Quat\'Saisons',chain:'Belmond',loc:'Great Milton, Oxfordshire, UK',dest:'Cotswolds',type:'Country House Hotel',tags:['adventure','cultural','5star'],regions:['UK','Europe'],price_base:1200,desc:"Raymond Blanc's legendary manor: 2 Michelin stars since 1984, never lost. The garden holds 90 varieties of vegetables, 70 of herbs. Cookery school. Manor house with 32 individually designed rooms.",dest_img:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',book:'https://www.belmond.com/hotels/europe/uk/oxfordshire/belmond-le-manoir-aux-quat-saisons/',booking_url:'https://www.booking.com/hotel/gb/le-manoir-aux-quat-saisons.html'},
    {id:'inverlochy-castle',name:'Inverlochy Castle Hotel',chain:'Relais & Châteaux',loc:'Fort William, Scottish Highlands, UK',dest:'Scottish Highlands',type:'Highland Castle Hotel',tags:['adventure','cultural','5star'],regions:['UK','Europe'],price_base:750,desc:"A 19th-century Victorian castle in the shadow of Ben Nevis. Queen Victoria stayed here in 1873 and declared it the finest spot she had ever seen. Deer stalking, salmon fishing and Highland whisky trails.",dest_img:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',book:'https://www.inverlochycastlehotel.com/',booking_url:'https://www.booking.com/hotel/gb/inverlochy-castle.html'},
  ],
  cultural: [
    {id:'mo-barcelona',name:'Mandarin Oriental Barcelona',chain:'Mandarin Oriental',loc:'Barcelona, Spain',dest:'Barcelona',type:'Urban Luxury Hotel',tags:['cultural','romantic','5star'],regions:['Spain','Mediterranean','Europe'],price_base:800,desc:'On Passeig de Gràcia, the most elegant boulevard in Spain. Blanc restaurant by Carme Ruscalleda.',dest_img:'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',book:'https://www.mandarinoriental.com/en/barcelona/passeig-de-gracia',booking_url:'https://www.booking.com/hotel/es/mandarin-oriental-barcelona.html'},
    {id:'villa-astor',name:'Villa Astor',chain:'Private Estate',loc:'Sorrento, Amalfi Coast, Italy',dest:'Amalfi Coast',type:'Historic Private Villa',tags:['cultural','romantic','5star'],regions:['Italy','Mediterranean','Europe'],price_base:2200,desc:"Former residence of the Duke of Astor overlooking the Bay of Naples. Infinity pool, private chef.",dest_img:'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://villaastor.com/',booking_url:'https://www.booking.com/hotel/it/villa-astor-sorrento.html'},
    {id:'melia-palacio',name:'Melia Palacio de Los Duques',chain:'Meliá Hotels',loc:'Madrid, Spain',dest:'Madrid',type:'Historic Palace Hotel',tags:['cultural','5star','celebration'],regions:['Spain','Europe'],price_base:550,desc:"19th-century ducal palace near the Royal Palace of Madrid. Iconic Level THE ONLY ONE. Roof Garden.",dest_img:'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.melia.com/en/hotels/spain/madrid/melia-palacio-de-los-duques',booking_url:'https://www.booking.com/hotel/es/palacio-de-los-duques.html'},
    // Expanded cultural properties
    {id:'hospes-valencia',name:'Hospes Palau de la Mar',chain:'Hospes Hotels',loc:'Valencia, Spain',dest:'Valencia',type:'Historic Palace Hotel',tags:['cultural','romantic','5star'],regions:['Spain','Mediterranean','Europe'],price_base:380,desc:'Two 19th-century noble mansions transformed into a boutique hotel in Valencia\'s historic Ensanche district. Sense Spa with rooftop pool. Walking distance to Ciudad de las Artes.',dest_img:'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.hospes.com/en/hospes-palau-de-la-mar/',booking_url:'https://www.booking.com/hotel/es/hospes-palau-de-la-mar.html'},
    {id:'bairro-alto',name:'Bairro Alto Hotel',chain:'Independent',loc:'Lisbon, Portugal',dest:'Lisbon',type:'Boutique Design Hotel',tags:['cultural','romantic','5star'],regions:['Portugal','Europe'],price_base:650,desc:"Lisbon's most design-conscious address since 2005 in an 18th-century palace in the Chiado quarter. Bar Alto and the rooftop terrace with views over the Tagus. The gold standard of Lisbon boutique hospitality.",dest_img:'https://images.unsplash.com/photo-1513735492246-483525079686?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.bairroaltohotel.com/',booking_url:'https://www.booking.com/hotel/pt/bairro-alto.html'},
    {id:'altis-belem',name:'Altis Belém Hotel & Spa',chain:'Altis Hotels',loc:'Belém, Lisbon, Portugal',dest:'Lisbon',type:'Contemporary Riverside Hotel',tags:['cultural','romantic','5star'],regions:['Portugal','Europe'],price_base:500,desc:'A contemporary riverside hotel on the Tagus in front of the Tower of Belém and the Jerónimos Monastery. Feitoria restaurant: 1 Michelin star, celebrating Portuguese culinary heritage.',dest_img:'https://images.unsplash.com/photo-1513735492246-483525079686?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',book:'https://www.altishotels.com/EN/hotel-belem/',booking_url:'https://www.booking.com/hotel/pt/altis-belem.html'},
    {id:'torel-1884',name:'Torel 1884 Suites & Snack Bar',chain:'Torel Boutique',loc:'Porto, Portugal',dest:'Porto',type:'Belle Epoque Boutique Hotel',tags:['cultural','romantic','5star'],regions:['Portugal','Europe'],price_base:420,desc:"Perched on the hillside of Bonfim with panoramic views over Porto's historic centre. A 19th-century Belle Epoque manor with 12 suites and a garden pool. Footsteps from the city's legendary wine cellars.",dest_img:'https://images.unsplash.com/photo-1513735492246-483525079686?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.torel1884.com/',booking_url:'https://www.booking.com/hotel/pt/torel-1884.html'},
    {id:'le-sirenuse',name:'Le Sirenuse',chain:'Independent',loc:'Positano, Amalfi Coast, Italy',dest:'Amalfi Coast',type:'Family Villa Hotel',tags:['cultural','romantic','5star','celebration'],regions:['Italy','Mediterranean','Europe'],price_base:1500,desc:"The Amalfi Coast's most storied hotel since 1951 in the Sersale family's 18th-century villa. Terrazza Luigia for sunset Spritz. La Sponda dining room with 300 candles by night.",dest_img:'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.sirenuse.it/',booking_url:'https://www.booking.com/hotel/it/le-sirenuse.html'},
    {id:'il-san-pietro',name:'Il San Pietro di Positano',chain:'Independent',loc:'Positano, Amalfi Coast, Italy',dest:'Amalfi Coast',type:'Clifftop Hotel',tags:['cultural','romantic','5star','celebration'],regions:['Italy','Mediterranean','Europe'],price_base:1400,desc:'Carved into the cliffs 60m above the sea, accessible only by elevator through the rock. Private beach club. Il Principe restaurant. The most spectacular view on the Amalfi Coast.',dest_img:'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.ilsanpietro.it/',booking_url:'https://www.booking.com/hotel/it/il-san-pietro-di-positano.html'},
    {id:'palazzo-vecchietti',name:'Palazzo Vecchietti',chain:'Independent',loc:'Florence, Italy',dest:'Florence',type:'Renaissance Palazzo',tags:['cultural','romantic','5star'],regions:['Italy','Mediterranean','Europe'],price_base:700,desc:'An all-suite 16th-century Renaissance palazzo in the heart of medieval Florence, 100m from the Piazza della Repubblica. Frescoed ceilings, private courtyard, butler service. The ultimate Florentine private-house experience.',dest_img:'https://images.unsplash.com/photo-1483450388369-9ed95738483c?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.palazzovecchietti.com/',booking_url:'https://www.booking.com/hotel/it/palazzo-vecchietti.html'},
    {id:'rf-hotel-de-rome',name:'Hotel de Rome',chain:'Rocco Forte Hotels',loc:'Berlin, Germany',dest:'Berlin',type:'Historic Bank Hotel',tags:['cultural','5star','celebration'],regions:['Germany','Europe'],price_base:620,desc:"The former Dresdner Bank headquarters on Bebelplatz, now Berlin's grandest hotel. Rooftop bar with Berliner Dom views. Parioli restaurant. The original bank vault transformed into a luxury spa.",dest_img:'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',book:'https://www.roccofortehotels.com/hotels-and-resorts/hotel-de-rome/',booking_url:'https://www.booking.com/hotel/de/de-rome.html'},
    {id:'hotel-amigo',name:'Hotel Amigo',chain:'Rocco Forte Hotels',loc:'Brussels, Belgium',dest:'Brussels',type:'Historic City Hotel',tags:['cultural','5star','celebration'],regions:['Belgium','Europe'],price_base:550,desc:"Adjacent to the Grand Place — the most beautiful square in Europe. A converted 16th-century prison reimagined with Belgian Art Nouveau details. Ristorante Bocconi: 1 Michelin star.",dest_img:'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.roccofortehotels.com/hotels-and-resorts/hotel-amigo/',booking_url:'https://www.booking.com/hotel/be/hotel-amigo.html'},
    {id:'hotel-particulier',name:'Hôtel Particulier Montmartre',chain:'Independent',loc:'Montmartre, Paris, France',dest:'Paris',type:'Bohemian Boutique Hotel',tags:['cultural','romantic','5star'],regions:['France','Europe'],price_base:650,desc:"Hidden behind a gate in a quiet Montmartre lane, a secret Directoire-style mansion with five intimate suites each conceived by a different French artist. The most romantic and literary hotel in Paris.",dest_img:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',book:'https://www.hotel-particulier-montmartre.com/',booking_url:'https://www.booking.com/hotel/fr/particulier-montmartre.html'},
    {id:'casa-maria-luigia',name:'Casa Maria Luigia',chain:'Independent',loc:'Modena, Emilia-Romagna, Italy',dest:'Modena',type:'Chef\'s Country House',tags:['cultural','5star','celebration','romantic'],regions:['Italy','Mediterranean','Europe'],price_base:1100,desc:"Massimo Bottura's personal country house outside Modena: 12 suites where guests eat a bespoke dinner designed by the world's most celebrated chef. Osteria Francescana is minutes away.",dest_img:'https://images.unsplash.com/photo-1483450388369-9ed95738483c?w=1200&q=85',hotel_img:'https://images.unsplash.com/photo-1578774296842-c45e472b3028?w=800&q=80',book:'https://www.casamarialuigia.com/',booking_url:'https://www.booking.com/hotel/it/casa-maria-luigia.html'},
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

// ── selectTop3: returns the top 3 scoring destinations for comparison view ──
function selectTop3(profile) {
  const scored = ALL_DESTINATIONS.map(d => ({ dest: d, score: scoreDest(d, profile) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map(({ dest, score }) => ({ ...dest, _score: Math.round(score) }));
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
1. Use REAL names for ALL restaurants (with exact Michelin star count in format "X Michelin star(s)" or "no Michelin stars"), experiences (with real provider/company names), and suppliers within 30 minutes of ${dest.loc}. Research accurately.
2. The itinerary must feel personally designed for THIS traveler's specific profile, not generic.
3. ai_insight must mention at least 2 specific details from their profile answers and explain precisely why this destination is the perfect match.
4. If a special occasion is stated, weave it naturally into Day 1 evening or a key moment.
5. Prices in included and experience_packages should be realistic and specific (EUR amounts).
6. The itinerary must contain exactly 6 items covering arrival, 2+ dining moments, 1+ experience/activity, 1 afternoon/leisure, and departure.
7. Each dining itinerary entry must name the specific restaurant with its Michelin star status and one signature dish.
8. Each experience/activity entry must name the real provider company or guide service.
9. local_gems must be 3 authentic, non-touristy recommendations a local would share — a specific bar, market stall, artisan shop, or hidden viewpoint with address or neighbourhood.
10. experience_packages are 3 add-on packages Luxy has designed with specific prices, each combining 2-3 activities into a named themed experience.

REFERENCE EXAMPLE (quality bar — for a romantic Paris couple, 5 nights, ultra-luxury budget, cultural focus):
{
  "title": "Paris: The Art of Slowing Down",
  "subtitle": "A curated journey for two through the city's most intimate rooms and rarest tables, where every moment is designed to be remembered for decades.",
  "destination_name": "Four Seasons Hotel George V",
  "destination_location": "Paris, France",
  "itinerary": [
    {"time":"Day 1 · 15:00","activity":"Private arrival at George V with in-room champagne setup (Krug Grande Cuvée, 2008 vintage) and bespoke flower arrangement by hotel artist-in-residence Jeff Leatham. Your butler has pre-arranged a custom fragrance from Maison Francis Kurkdjian based on a fragrance profile form sent to you 10 days prior.","category":"arrival"},
    {"time":"Day 1 · 20:00","activity":"Le Cinq (3 Michelin stars, Chef Christian Le Squer) — grand tasting menu with sommelier-led wine pairing. Reserve the semi-private alcove table 14 overlooking the courtyard. Signature dish: the langoustine royale in saffron bisque with Oscietra caviar.","category":"dining"},
    {"time":"Day 2 · 09:00","activity":"Private morning at Musée de l'Orangerie before public opening hours — Monet's Nymphéas in complete silence with an art historian guide from Context Travel (Paris) who specialises in Impressionism. The silence inside the oval rooms at 9am is unlike anything in public life.","category":"experience"},
    {"time":"Day 2 · 13:00","activity":"Lunch at Taillevent (2 Michelin stars, Chef David Bizet) on Rue Lamennais — the sole de Douvres meunière aux câpres is the defining classic. Request the private dining alcove for full intimacy.","category":"dining"},
    {"time":"Day 2 · 17:00","activity":"Private Seine river cruise at golden hour aboard a 1928 mahogany Riva launch arranged through Yachts de Paris. Champagne (Blanc de Blancs, Billecart-Salmon) and seasonal canapés as the city lights appear. 90 minutes.","category":"afternoon"},
    {"time":"Day 5 · 11:00","activity":"Late check-out at noon followed by private transfer to CDG in a Mercedes S580 through Chauffeur Service Paris. Chilled Evian, French press coffee, and next-day newspapers in the vehicle.","category":"departure"}
  ],
  "price_per_night": 1500,
  "included": ["Daily breakfast at Le Cinq (full à la carte, no limits)","Private Mercedes S-Class airport transfers both ways","Luxy concierge 24/7 with pre-arrival preference survey","VIP access and priority restaurant reservations via hotel concierge","Complimentary Nespresso and Evian minibar replenished twice daily"],
  "experience_packages": [
    {"name":"The Versailles Immersion","price":1850,"description":"Private helicopter transfer CDG → Versailles (25 min), guided access to the Hall of Mirrors before public opening, lunch at Alain Ducasse au Grand Contrôle (2 Michelin stars) with a curated Château de Versailles wine, and return by vintage car through the Bois de Boulogne."},
    {"name":"The Palais Royal Night","price":620,"description":"In-suite couples massage by Sisley Paris therapist (90 min), followed by a private candlelit dinner on your terrace with a menu designed by Le Cinq sous chef specifically for your evening, and a nightcap at Bar Hemingway (the George V's legendary cocktail bar)."},
    {"name":"The Atelier Haute Couture","price":980,"description":"Private fashion archive tour at the Galliera Museum with curator Miren Arzalluz, followed by a personal styling session at Dior Avenue Montaigne with a boutique host, and afternoon tea at Café de Flore in the Saint-Germain-des-Prés where Sartre wrote Being and Nothingness."}
  ],
  "local_gems": [
    {"name":"Au Passage","type":"Natural wine bar","description":"A legendary cave à manger on Passage Saint-Sébastien (11th arr.) where Paris's best chefs go on their days off. No reservations for the bar seats. Order the charcuterie board and whatever natural wine the sommelier recommends from the Jura."},
    {"name":"Marché d'Aligre","type":"Local market","description":"The most authentic Parisian market (Place d'Aligre, 12th arr.) open every morning except Monday. Arrive at 9am for the truffle vendors, aged cheese from Fromages de France, and the outdoor flea market where locals sell grandfather's silverware."},
    {"name":"Le Coupe-Chou","type":"Hidden restaurant","description":"A 16th-century candle-lit cellar restaurant at 11 Rue de Lanneau in the Latin Quarter, beloved by Parisians for three generations. Order the magret de canard and a carafe of Cahors. One of the last truly timeless places in Paris."}
  ],
  "ai_insight": "Your romantic profile combined with a cultural focus and ultra-luxury budget led Luxy to Four Seasons George V: the only Paris palace hotel where you will encounter three Michelin-starred restaurants under one roof, meaning every meal is a private celebration without ever leaving the building. For a couple who values the rare over the recognizable, the private Orangerie access before opening transforms an iconic landmark into an intimate moment made only for you — no other guests, no queues, just Monet and silence. The 5-night duration gives us the pace to go deep rather than wide: you will leave knowing one Paris, not every Paris.",
  "is_natur_lux": false
}

Respond ONLY in ${isES ? 'Spanish' : 'English'}. Return valid JSON matching the structure above exactly (with local_gems and experience_packages arrays). No backticks, no markdown, no commentary outside the JSON.`;
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
        max_tokens: 2000,
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
        booking_url: dest.booking_url || null,
        airbnb_url: dest.airbnb_url || null,
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
        experience_packages: lang === 'es'
          ? [
              {name:'Velada Romántica Privada',price:250,description:'Cena romántica privada en terraza con menú diseñado por el chef, velas y champán de bienvenida.'},
              {name:'Experiencia de Bienestar',price:320,description:'Masaje en pareja de 90 minutos, acceso al spa privado y ritual aromático con productos locales.'},
              {name:'Aventura Cultural Exclusiva',price:480,description:'Visita privada guiada a lugar histórico exclusivo con experto local y almuerzo maridado.'},
            ]
          : [
              {name:'Private Romantic Evening',price:250,description:'Candlelit private terrace dinner with a chef-designed seasonal menu, champagne welcome and petal turndown.'},
              {name:'Wellness Immersion',price:320,description:'90-minute couples massage, private spa access, and aromatic ritual with locally sourced botanicals.'},
              {name:'Exclusive Cultural Journey',price:480,description:'Private guided access to a historic site with a specialist local expert, followed by a paired lunch.'},
            ],
        add_ons: lang === 'es'
          ? ['Cena romántica privada (+250€)','Masaje en pareja (+180€)','Experiencia privada exclusiva (+320€)']
          : ['Private romantic dinner (+€250)','Couples massage (+€180)','Exclusive bespoke experience (+€320)'],
        local_gems: lang === 'es'
          ? [
              {name:'Mercado local auténtico',type:'Mercado',description:'El mercado más auténtico de la zona, frecuentado por locales y chefs de la región cada mañana.'},
              {name:'Bar de vinos naturales',type:'Bar de vinos',description:'Un bar de vinos escondido en el casco antiguo donde los sumilleres de los mejores restaurantes pasan sus días libres.'},
              {name:'Mirador secreto',type:'Mirador',description:'Un punto de vista poco conocido con vistas espectaculares, a apenas 10 minutos a pie del hotel.'},
            ]
          : [
              {name:'Authentic local market',type:'Market',description:'The most authentic market in the area, frequented by locals and regional chefs every morning.'},
              {name:'Natural wine bar',type:'Wine bar',description:'A hidden natural wine bar in the old town where the best restaurant sommeliers spend their days off.'},
              {name:'Secret viewpoint',type:'Viewpoint',description:'A little-known vantage point with spectacular views, just 10 minutes on foot from the hotel.'},
            ],
        ai_insight: lang === 'es'
          ? `Luxy seleccionó ${dest.name} porque encaja con tu perfil de forma excepcional. ${dest.desc} Esta experiencia ha sido diseñada específicamente para ti.`
          : `Luxy selected ${dest.name} as your exceptional match. ${dest.desc} This experience was designed specifically for your profile.`,
        dest, dest_img: dest.dest_img, hotel_img: dest.hotel_img, hotel_name: dest.name, book_url: dest.book,
        booking_url: dest.booking_url || null,
        airbnb_url: dest.airbnb_url || null,
        is_natur_lux: dest.featured || false,
        _scoring_score: score,
      }),
    };
  }
};

// Export selectTop3 for external use (comparison view, testing)
exports.selectTop3 = selectTop3;
exports.scoreDest = scoreDest;
exports.CATALOGUE = CATALOGUE;
exports.ALL_DESTINATIONS = ALL_DESTINATIONS;
