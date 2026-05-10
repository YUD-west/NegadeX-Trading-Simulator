/**
 * Initial stock universe used to seed the simulator.
 *
 * NegadeX models the **Ethiopian market** — every symbol below is a major
 * Ethiopian listed (or near-to-list) company across banking, telecom,
 * insurance, manufacturing, transport, energy and fintech.
 *
 * Prices are quoted in **Ethiopian Birr (ETB / Br)**.  Volatility & drift
 * values mirror the realistic risk profile of each sector — banks are
 * stable, telcos are growth-leaning, manufacturing is mid-vol, fintech &
 * mining are higher-vol.
 */
module.exports = [
  // ── Banking ──────────────────────────────────────────────────────────
  { symbol: 'CBE',   name: 'Commercial Bank of Ethiopia',  sector: 'Banking',          price: 1850.00, volatility: 0.011, drift: 0.0005 },
  { symbol: 'AWASH', name: 'Awash Bank',                   sector: 'Banking',          price:  920.50, volatility: 0.012, drift: 0.0004 },
  { symbol: 'DASH',  name: 'Dashen Bank',                  sector: 'Banking',          price:  745.20, volatility: 0.013, drift: 0.0004 },
  { symbol: 'ABYS',  name: 'Bank of Abyssinia',            sector: 'Banking',          price:  610.40, volatility: 0.013, drift: 0.0003 },
  { symbol: 'OROM',  name: 'Oromia Bank',                  sector: 'Banking',          price:  482.10, volatility: 0.014, drift: 0.0004 },
  { symbol: 'SIIN',  name: 'Siinqee Bank',                 sector: 'Banking',          price:  395.75, volatility: 0.016, drift: 0.0006 },
  { symbol: 'COOP',  name: 'Cooperative Bank of Oromia',   sector: 'Banking',          price:  528.30, volatility: 0.013, drift: 0.0004 },
  { symbol: 'WGGN',  name: 'Wegagen Bank',                 sector: 'Banking',          price:  342.85, volatility: 0.015, drift: 0.0003 },
  { symbol: 'ZMB',   name: 'Zemen Bank',                   sector: 'Banking',          price:  288.60, volatility: 0.015, drift: 0.0003 },
  { symbol: 'NIB',   name: 'Nib International Bank',       sector: 'Banking',          price:  254.40, volatility: 0.014, drift: 0.0002 },

  // ── Telecom & Fintech ────────────────────────────────────────────────
  { symbol: 'ETHTEL',name: 'Ethio Telecom',                sector: 'Telecom',          price: 2120.75, volatility: 0.014, drift: 0.0006 },
  { symbol: 'TBIRR', name: 'Tele-Birr (Mobile Money)',     sector: 'Fintech',          price:  168.40, volatility: 0.022, drift: 0.0010 },
  { symbol: 'SAFCM', name: 'Safaricom Ethiopia',           sector: 'Telecom',          price:  745.30, volatility: 0.020, drift: 0.0008 },
  { symbol: 'MPESA', name: 'M-PESA Ethiopia',              sector: 'Fintech',          price:  124.65, volatility: 0.024, drift: 0.0009 },

  // ── Aviation & Transport ─────────────────────────────────────────────
  { symbol: 'ETHA',  name: 'Ethiopian Airlines Group',     sector: 'Aviation',         price: 3480.20, volatility: 0.016, drift: 0.0006 },
  { symbol: 'ESLSE', name: 'Ethiopian Shipping & Logistics',sector: 'Logistics',       price:  610.55, volatility: 0.015, drift: 0.0003 },
  { symbol: 'ADRTL', name: 'Addis Railway Transport',      sector: 'Transport',        price:  198.40, volatility: 0.014, drift: 0.0002 },

  // ── Energy & Utilities ───────────────────────────────────────────────
  { symbol: 'EEP',   name: 'Ethiopian Electric Power',     sector: 'Energy',           price:  892.10, volatility: 0.012, drift: 0.0003 },
  { symbol: 'NOC',   name: 'National Oil Company (NOC)',   sector: 'Energy',           price:  468.25, volatility: 0.018, drift: 0.0002 },
  { symbol: 'GERD',  name: 'GERD Hydropower Authority',    sector: 'Energy',           price: 1240.00, volatility: 0.011, drift: 0.0005 },

  // ── Manufacturing & Beverages ────────────────────────────────────────
  { symbol: 'BGI',   name: 'BGI Ethiopia (St. George)',    sector: 'Beverages',        price:  385.70, volatility: 0.013, drift: 0.0003 },
  { symbol: 'HBSC',  name: 'Habesha Breweries',            sector: 'Beverages',        price:  245.90, volatility: 0.015, drift: 0.0002 },
  { symbol: 'MOHA',  name: 'MOHA Soft Drinks Industry',    sector: 'Beverages',        price:  312.40, volatility: 0.014, drift: 0.0003 },
  { symbol: 'DASNG', name: 'Dashen Brewery',               sector: 'Beverages',        price:  198.85, volatility: 0.014, drift: 0.0002 },
  { symbol: 'AYAT',  name: 'Ayat Real Estate',             sector: 'Real Estate',      price:  564.20, volatility: 0.015, drift: 0.0003 },
  { symbol: 'MIDR',  name: 'Midroc Ethiopia',              sector: 'Conglomerate',     price:  812.55, volatility: 0.017, drift: 0.0004 },
  { symbol: 'EAGRO', name: 'Ethio Agri-CEFT',              sector: 'Agriculture',      price:  142.30, volatility: 0.019, drift: 0.0003 },
  { symbol: 'EMETL', name: 'Ethiopian Metals Corp.',       sector: 'Manufacturing',    price:  268.75, volatility: 0.020, drift: 0.0002 },

  // ── Insurance ────────────────────────────────────────────────────────
  { symbol: 'EIC',   name: 'Ethiopian Insurance Corp.',    sector: 'Insurance',        price:  428.10, volatility: 0.011, drift: 0.0003 },
  { symbol: 'AWINS', name: 'Awash Insurance',              sector: 'Insurance',        price:  235.65, volatility: 0.012, drift: 0.0003 },

  // ── Coffee & Commodities ─────────────────────────────────────────────
  { symbol: 'ECX',   name: 'Ethiopia Commodity Exchange',  sector: 'Commodities',      price:  712.40, volatility: 0.018, drift: 0.0005 },
  { symbol: 'YIRGA', name: 'Yirgacheffe Coffee Union',     sector: 'Commodities',      price:  328.90, volatility: 0.022, drift: 0.0004 },
];
