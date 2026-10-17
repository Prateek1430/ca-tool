interface CategoryRule {
  category: string;
  keywords: string[];
}

// Ordered — first match wins, so more specific rules go first.
const RULES: CategoryRule[] = [
  { category: "Subscriptions & OTT", keywords: ["netflix", "spotify", "hotstar", "prime video", "youtube premium", "sonyliv", "zee5", "apple music"] },
  { category: "Fitness & Wellness", keywords: ["gym", "cult.fit", "cultfit", "fitness", "yoga"] },
  { category: "Food & Dining", keywords: ["swiggy", "zomato", "restaurant", "cafe", "food", "dominos", "mcdonald", "starbucks", "eatsure"] },
  { category: "Groceries", keywords: ["bigbasket", "blinkit", "zepto", "grofers", "dmart", "grocery", "supermarket"] },
  { category: "Transport & Fuel", keywords: ["uber", "ola", "rapido", "petrol", "fuel", "irctc", "indianoil", "hpcl", "bpcl", "metro"] },
  { category: "Shopping", keywords: ["amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa"] },
  { category: "Utilities & Bills", keywords: ["electricity", "water bill", "broadband", "wifi", "airtel", "jio", "vodafone", "vi ", "gas bill", "dth"] },
  { category: "Rent & Housing", keywords: ["rent", "landlord", "housing society", "maintenance charge"] },
  { category: "Healthcare", keywords: ["pharmacy", "hospital", "clinic", "apollo", "medplus", "diagnostic", "medical"] },
  { category: "Insurance", keywords: ["insurance", "lic ", "policybazaar", "premium payment"] },
  { category: "Investments & Savings", keywords: ["mutual fund", "sip", "zerodha", "groww", "upstox", "nps", "ppf"] },
  { category: "Loan & EMI", keywords: ["emi", "loan", "credit card payment", "cc payment"] },
  { category: "Education", keywords: ["tuition", "course", "udemy", "coursera", "school fee", "college fee"] },
  { category: "Entertainment", keywords: ["bookmyshow", "pvr", "inox", "movie"] },
  { category: "Transfers & Withdrawals", keywords: ["atm", "cash withdrawal", "self transfer", "neft", "imps", "rtgs"] },
  { category: "Income & Credits", keywords: ["salary", "refund", "cashback", "interest credit", "dividend"] },
];

const FALLBACK_CATEGORY = "Uncategorized";

export function categorizeTransaction(description: string, merchant: string): string {
  const haystack = `${description} ${merchant}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => haystack.includes(k))) {
      return rule.category;
    }
  }
  return FALLBACK_CATEGORY;
}
