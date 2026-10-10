// Univers suivi. Symboles Yahoo Finance.

export const INDEX_DEFS = [
  { id: "cac", name: "CAC 40", label: "CAC 40", symbol: "^FCHI", place: "PARIS" },
  // ^SBF120 est parfois vide chez Yahoo : l'ecran affiche alors un message d'erreur.
  // Remplace le symbole ici si tu trouves une meilleure source.
  { id: "sbf", name: "SBF 120", label: "SBF 120", symbol: "^SBF120", place: "PARIS" },
  { id: "srd", name: "SRD", label: "SRD", symbol: "^FCHI", place: "PARIS", list: true,
    note: "Valeurs eligibles au Service de Reglement Differe" },
  { id: "spx", name: "S&P 500", label: "S&P 500", symbol: "^GSPC", place: "NEW YORK" },
  { id: "ndx", name: "NASDAQ", label: "NASDAQ 100", symbol: "^NDX", place: "NEW YORK" },
  { id: "dji", name: "DOW", label: "DOW JONES", symbol: "^DJI", place: "NEW YORK" },
  { id: "dax", name: "DAX", label: "DAX 40", symbol: "^GDAXI", place: "FRANCFORT" },
  { id: "mib", name: "MIB", label: "FTSE MIB", symbol: "FTSEMIB.MI", place: "MILAN" },
  { id: "nkx", name: "NIKKEI", label: "NIKKEI 225", symbol: "^N225", place: "TOKYO" },
];

// Composants suivis par indice. Limite volontairement a 6-8 par indice
// pour rester raisonnable en nombre de requetes.
export const COMPONENTS = {
  cac: ["MC.PA", "OR.PA", "SU.PA", "AI.PA", "TTE.PA", "SAN.PA", "BNP.PA", "AIR.PA", "DG.PA", "RMS.PA"],
  sbf: ["MC.PA", "DG.PA", "RMS.PA", "CAP.PA", "ORA.PA", "ACA.PA", "STLAP.PA", "EN.PA"],
  srd: ["MC.PA", "TTE.PA", "BNP.PA", "AIR.PA", "STLAP.PA", "RNO.PA", "ACA.PA", "GLE.PA",
        "ALO.PA", "ORA.PA", "SGO.PA", "VIE.PA", "ML.PA", "PUB.PA", "ERF.PA", "UBI.PA"],
  spx: ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "BRK-B", "JPM", "JNJ", "XOM", "V", "WMT"],
  ndx: ["AAPL", "MSFT", "NVDA", "AMZN", "META", "AVGO", "TSLA", "COST"],
  dji: ["AAPL", "MSFT", "JPM", "JNJ", "PG", "KO", "CAT", "MCD"],
  dax: ["SAP.DE", "SIE.DE", "ALV.DE", "SHL.DE", "BAS.DE", "BMW.DE", "SYS.DE", "DTE.DE"],
  mib: ["ENI.MI", "ISP.MI", "UCG.MI", "ENEL.MI", "STLAM.MI", "G.MI", "RACE.MI", "TIT.MI"],
  nkx: ["7203.T", "6758.T", "9984.T", "8306.T", "6861.T", "9432.T", "4063.T", "8035.T"],
};

// Secteur et description courte. Utilise pour la carte "secteur" de l'ecran detail.
export const PROFILES = {
  "MC.PA": { sector: "Luxe", text: "Premier groupe mondial du luxe : mode, maroquinerie, spiritueux, parfums et horlogerie. Forte exposition a l'Asie, sensible au yuan et au tourisme chinois." },
  "OR.PA": { sector: "Cosmetiques", text: "Numero un mondial de la beaute : soin, maquillage, cheveux, dermo-cosmetique. Demande peu cyclique, croissance tiree par le premium et l'Asie." },
  "SU.PA": { sector: "Electrification", text: "Gestion de l'energie et automatismes industriels. Expose aux centres de donnees et a l'electrification des batiments, sensible aux taux longs." },
  "AI.PA": { sector: "Gaz industriels", text: "Gaz industriels et sante, contrats de long terme largement indexes. Profil defensif, forte visibilite sur les marges." },
  "TTE.PA": { sector: "Energie", text: "Petrole, gaz et electricite bas carbone. Suit le baril et les marges de raffinage." },
  "SAN.PA": { sector: "Sante", text: "Pharmacie et vaccins. Revenus peu cycliques ; le pipeline clinique et le reglementaire dominent la trajectoire." },
  "BNP.PA": { sector: "Banque", text: "Banque universelle europeenne. Sensible aux taux directeurs, a la marge d'interet et au cout du risque." },
  "AIR.PA": { sector: "Aeronautique", text: "Constructeur aeronautique civil et defense. Carnet de commandes long, execution industrielle et chaine d'approvisionnement critiques." },
  "DG.PA": { sector: "Construction", text: "Concessions autoroutieres et aeroportuaires, contracting. Revenus de concession reguliers, indexes sur le trafic." },
  "RMS.PA": { sector: "Luxe", text: "Maroquinerie et soie haut de gamme. Production contrainte volontairement, pouvoir de fixation des prix eleve." },
  "CAP.PA": { sector: "Services numeriques", text: "Conseil et integration informatique. Cycle lie aux budgets IT des grandes entreprises." },
  "ORA.PA": { sector: "Telecoms", text: "Operateur telecom europeen et africain. Revenus recurrents, forte intensite capitalistique." },
  "ACA.PA": { sector: "Banque", text: "Banque de detail et gestion d'actifs. Sensible aux taux et au cout du risque." },
  "STLAP.PA": { sector: "Automobile", text: "Constructeur automobile multimarques. Cyclique, expose aux volumes, aux stocks et a la transition electrique." },
  "EN.PA": { sector: "Construction", text: "Construction, energie et concessions. Carnet de commandes long, expose aux depenses publiques." },
  "RNO.PA": { sector: "Automobile", text: "Constructeur automobile generaliste. Tres cyclique, expose aux volumes europeens, a la transition electrique et a sa participation dans Nissan." },
  "GLE.PA": { sector: "Banque", text: "Banque universelle francaise. Sensible aux taux directeurs, aux marches de capitaux et au cout du risque. Titre a beta eleve." },
  "ALO.PA": { sector: "Ferroviaire", text: "Materiel roulant et signalisation ferroviaire. Carnet de commandes tres long, execution industrielle et tresorerie sous surveillance." },
  "SGO.PA": { sector: "Materiaux", text: "Materiaux de construction et renovation energetique. Cyclique, lie a la construction neuve et aux couts de l'energie." },
  "VIE.PA": { sector: "Environnement", text: "Eau, dechets et energie. Contrats longs largement indexes, profil defensif et regule." },
  "ML.PA": { sector: "Pneumatiques", text: "Premier fabricant mondial de pneumatiques. Marche de remplacement stable, expose aux matieres premieres et au change." },
  "PUB.PA": { sector: "Publicite", text: "Groupe de communication et de donnees marketing. Suit le cycle publicitaire mondial et les budgets numeriques." },
  "ERF.PA": { sector: "Services petroliers", text: "Etudes et services pour l'industrie petroliere. Tres cyclique, corrèle aux investissements d'exploration." },
  "UBI.PA": { sector: "Jeu video", text: "Editeur de jeux video. Resultats concentres sur quelques sorties : volatilite elevee autour du calendrier de publication." },
  AAPL: { sector: "Materiel & services", text: "Smartphones, ordinateurs et services. Cycle de renouvellement iPhone et croissance des services recurrents." },
  MSFT: { sector: "Logiciel & cloud", text: "Logiciels d'entreprise, cloud Azure et licences. Croissance du cloud et investissements en IA dominent les revisions." },
  NVDA: { sector: "Semi-conducteurs", text: "Processeurs graphiques et accelerateurs IA. Tres forte croissance, valorisation elevee, volatilite marquee." },
  AMZN: { sector: "Commerce & cloud", text: "Commerce en ligne, logistique et cloud AWS. Marges tirees par le cloud et la publicite." },
  GOOGL: { sector: "Publicite & cloud", text: "Recherche, publicite en ligne, YouTube et cloud. Sensible au cycle publicitaire et au reglementaire." },
  META: { sector: "Reseaux sociaux", text: "Publicite sur reseaux sociaux. Depenses en infrastructure IA et cycle publicitaire structurent les resultats." },
  AVGO: { sector: "Semi-conducteurs", text: "Semi-conducteurs et logiciels d'infrastructure. Exposition croissante aux reseaux pour l'IA." },
  TSLA: { sector: "Automobile", text: "Vehicules electriques, energie et conduite autonome. Volatilite elevee, sensible aux prix et aux volumes." },
  COST: { sector: "Distribution", text: "Distribution en entrepots par abonnement. Revenus d'adhesion recurrents, defensif." },
  "BRK-B": { sector: "Conglomerat", text: "Holding d'investissement : assurance, chemin de fer, energie et portefeuille d'actions cotees. Profil defensif, tres diversifie." },
  V: { sector: "Paiements", text: "Reseau de paiement par carte. Revenus indexes sur le volume de transactions, marges tres elevees, peu cyclique." },
  WMT: { sector: "Distribution", text: "Premier distributeur mondial. Defensif, marges faibles mais volumes enormes ; croissance tiree par le e-commerce et la publicite." },
  JNJ: { sector: "Sante", text: "Pharmacie et dispositifs medicaux. Peu cyclique, risque principal reglementaire et judiciaire." },
  XOM: { sector: "Energie", text: "Exploration, production et raffinage. Correlation directe au baril." },
  JPM: { sector: "Banque", text: "Banque universelle americaine. Sensible aux taux, aux marches de capitaux et au cout du risque." },
  PG: { sector: "Biens de consommation", text: "Produits d'hygiene et d'entretien. Defensif, pouvoir de fixation des prix." },
  KO: { sector: "Boissons", text: "Boissons non alcoolisees. Revenus tres reguliers, exposition change importante." },
  CAT: { sector: "Machines", text: "Engins de construction et miniers. Cyclique, lie aux depenses d'infrastructure." },
  MCD: { sector: "Restauration", text: "Restauration rapide en franchise. Revenus de redevances reguliers." },
  "SAP.DE": { sector: "Logiciel", text: "Progiciels de gestion d'entreprise. Bascule vers le cloud par abonnement." },
  "SIE.DE": { sector: "Industrie", text: "Automatismes, mobilite et sante. Cycle industriel europeen et allemand." },
  "ALV.DE": { sector: "Assurance", text: "Assurance et gestion d'actifs. Sensible aux taux et a la sinistralite." },
  "SHL.DE": { sector: "Sante", text: "Imagerie medicale et diagnostic. Demande structurelle, cycle d'equipement hospitalier." },
  "BAS.DE": { sector: "Chimie", text: "Chimie de base et specialites. Tres sensible au prix du gaz et au cycle industriel." },
  "BMW.DE": { sector: "Automobile", text: "Automobile premium. Expose a la Chine, aux volumes et a la transition electrique." },
  "SYS.DE": { sector: "Logiciel", text: "Logiciels de conception et simulation. Cycle lie aux depenses d'ingenierie." },
  "DTE.DE": { sector: "Telecoms", text: "Operateur telecom europeen et americain. Revenus recurrents, dette elevee." },
  "ENI.MI": { sector: "Energie", text: "Petrole et gaz integre. Suit le baril et les prix du gaz europeen." },
  "ISP.MI": { sector: "Banque", text: "Premiere banque de detail italienne. Sensible aux taux et au spread souverain." },
  "UCG.MI": { sector: "Banque", text: "Banque paneuropeenne. Sensible aux taux, forte distribution aux actionnaires." },
  "ENEL.MI": { sector: "Services aux collectivites", text: "Production et distribution d'electricite. Revenus regules, sensible aux taux." },
  "STLAM.MI": { sector: "Automobile", text: "Constructeur automobile multimarques. Cyclique, expose aux stocks et a l'electrique." },
  "G.MI": { sector: "Assurance", text: "Assurance vie et dommages. Sensible aux taux et aux marches." },
  "RACE.MI": { sector: "Luxe automobile", text: "Voitures de sport de luxe. Carnet de commandes long, marges tres elevees." },
  "TIT.MI": { sector: "Telecoms", text: "Operateur telecom italien. Dette elevee, restructuration en cours." },
  "7203.T": { sector: "Automobile", text: "Premier constructeur automobile mondial. Expose au yen, aux volumes et a l'hybride." },
  "6758.T": { sector: "Electronique & jeu", text: "Image, jeu video, musique et capteurs. Diversifie, sensible au cycle des consoles." },
  "9984.T": { sector: "Investissement", text: "Holding d'investissement technologique. Tres volatil, valeur liee au portefeuille." },
  "8306.T": { sector: "Banque", text: "Premier groupe bancaire japonais. Sensible a la politique monetaire de la BoJ." },
  "6861.T": { sector: "Instruments de mesure", text: "Capteurs et instruments de mesure industriels. Marges tres elevees, cycle industriel." },
  "9432.T": { sector: "Telecoms", text: "Operateur telecom japonais historique. Revenus reguliers, defensif." },
  "4063.T": { sector: "Chimie", text: "Silicones et materiaux pour semi-conducteurs. Lie au cycle des puces." },
  "8035.T": { sector: "Equipements semi-conducteurs", text: "Equipements de production de semi-conducteurs. Tres cyclique, lie aux investissements des fondeurs." },
};

export function nameOf(symbol, fallback) {
  return fallback || symbol;
}

// Nom en clair utilise pour chercher les actualites francaises.
export const NEWS_NAMES = {
  "MC.PA": "LVMH", "OR.PA": "L'Oreal", "SU.PA": "Schneider Electric", "AI.PA": "Air Liquide",
  "TTE.PA": "TotalEnergies", "SAN.PA": "Sanofi", "BNP.PA": "BNP Paribas", "AIR.PA": "Airbus",
  "DG.PA": "Vinci", "RMS.PA": "Hermes", "CAP.PA": "Capgemini", "ORA.PA": "Orange",
  "ACA.PA": "Credit Agricole", "STLAP.PA": "Stellantis", "EN.PA": "Bouygues",
  "RNO.PA": "Renault", "GLE.PA": "Societe Generale", "ALO.PA": "Alstom",
  "SGO.PA": "Saint-Gobain", "VIE.PA": "Veolia", "ML.PA": "Michelin",
  "PUB.PA": "Publicis", "ERF.PA": "Eurofins", "UBI.PA": "Ubisoft",
  AAPL: "Apple", MSFT: "Microsoft", NVDA: "Nvidia", AMZN: "Amazon", GOOGL: "Google Alphabet",
  META: "Meta Facebook", AVGO: "Broadcom", TSLA: "Tesla", COST: "Costco",
  JNJ: "Johnson & Johnson", XOM: "ExxonMobil", JPM: "JPMorgan", PG: "Procter & Gamble",
  "BRK-B": "Berkshire Hathaway", V: "Visa", WMT: "Walmart",
  KO: "Coca-Cola", CAT: "Caterpillar", MCD: "McDonald's",
  "SAP.DE": "SAP", "SIE.DE": "Siemens", "ALV.DE": "Allianz", "SHL.DE": "Siemens Healthineers",
  "BAS.DE": "BASF", "BMW.DE": "BMW", "SYS.DE": "Software AG", "DTE.DE": "Deutsche Telekom",
  "ENI.MI": "Eni", "ISP.MI": "Intesa Sanpaolo", "UCG.MI": "UniCredit", "ENEL.MI": "Enel",
  "STLAM.MI": "Stellantis", "G.MI": "Generali", "RACE.MI": "Ferrari", "TIT.MI": "Telecom Italia",
  "7203.T": "Toyota", "6758.T": "Sony", "9984.T": "SoftBank", "8306.T": "Mitsubishi UFJ",
  "6861.T": "Keyence", "9432.T": "NTT", "4063.T": "Shin-Etsu", "8035.T": "Tokyo Electron",
};

// Requete d'actualites pour un indice.
export const INDEX_QUERY = {
  cac: "CAC 40 Bourse Paris",
  sbf: "SBF 120 Bourse Paris",
  srd: "SRD bourse Paris actions francaises",
  spx: "S&P 500 Wall Street Bourse",
  ndx: "Nasdaq Bourse",
  dji: "Dow Jones Bourse",
  dax: "DAX Bourse Francfort",
  mib: "FTSE MIB Bourse Milan",
  nkx: "Nikkei Bourse Tokyo",
};

export function newsQuery(symbol) {
  var n = NEWS_NAMES[symbol];
  return n ? n + " action bourse" : symbol + " bourse";
}
