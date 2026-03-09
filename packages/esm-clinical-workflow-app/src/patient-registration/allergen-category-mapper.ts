/**
 * Allergen Category Mapper
 *
 * This module provides intelligent mapping from allergen names (strings) to
 * FHIR R4 AllergyIntolerance categories. Used primarily for persisting allergies
 * from Health ID lookups to OpenMRS.
 */

export type AllergenCategory = 'food' | 'medication' | 'environment' | 'biologic';

/**
 * Common food allergens
 */
const FOOD_ALLERGENS = [
  // Grains
  'WHEAT',
  'GLUTEN',
  'CORN',
  'RYE',
  'BARLEY',
  'OAT',
  'RICE',
  // Nuts and seeds
  'PEANUTS',
  'PEANUT',
  'TREE_NUTS',
  'NUTS',
  'ALMOND',
  'CASHEW',
  'WALNUT',
  'PISTACHIO',
  'HAZELNUT',
  'SESAME',
  'SUNFLOWER',
  'MUSTARD',
  // Dairy
  'MILK',
  'DAIRY',
  'CHEESE',
  'BUTTER',
  'YOGURT',
  'LACTOSE',
  // Proteins
  'EGGS',
  'EGG',
  'SOY',
  'SOYA',
  'FISH',
  'SHELLFISH',
  'SEAFOOD',
  'SHRIMP',
  'CRAB',
  'LOBSTER',
  'OYSTER',
  'CLAM',
  'MUSSEL',
  // Meats
  'MEAT',
  'CHICKEN',
  'BEEF',
  'PORK',
  'LAMB',
  'TURKEY',
  // Fruits and vegetables
  'TOMATO',
  'STRAWBERRY',
  'KIWI',
  'BANANA',
  'AVOCADO',
  'CELERY',
  'CARROT',
  // Others
  'CHOCOLATE',
  'COCOA',
  'HONEY',
  'GARLIC',
  'ONION',
];

/**
 * Common medication allergens
 */
const MEDICATION_ALLERGENS = [
  // Antibiotics
  'PENICILLIN',
  'AMOXICILLIN',
  'AMPICILLIN',
  'SULFA',
  'SULFAMETHOXAZOLE',
  'TRIMETHOPRIM',
  'TETRACYCLINE',
  'DOXYCYCLINE',
  'ERYTHROMYCIN',
  'AZITHROMYCIN',
  'CIPROFLOXACIN',
  'CEPHALOSPORIN',
  'CEFAZOLIN',
  'VANCOMYCIN',
  // Pain relievers
  'ASPIRIN',
  'IBUPROFEN',
  'ACETAMINOPHEN',
  'PARACETAMOL',
  'NAPROXEN',
  'DICLOFENAC',
  // Opioids
  'CODEINE',
  'MORPHINE',
  'OXYCODONE',
  'HYDROCODONE',
  'FENTANYL',
  'TRAMADOL',
  // Anesthetics
  'LIDOCAINE',
  'NOVOCAINE',
  'PROCAINE',
  'BUPIVACAINE',
  // Other medications
  'INSULIN',
  'CONTRAST',
  'DYE',
  'IODINE',
  'WARFARIN',
  'HEPARIN',
  'METFORMIN',
  'STATIN',
  'ACE_INHIBITOR',
  'BETA_BLOCKER',
];

/**
 * Common environmental allergens
 */
const ENVIRONMENT_ALLERGENS = [
  // Airborne
  'POLLEN',
  'DUST',
  'DUST_MITES',
  'MOLD',
  'MOULD',
  'SPORES',
  'FUNGUS',
  // Animal-related
  'PET_DANDER',
  'DANDER',
  'DOG',
  'CAT',
  'HORSE',
  'BIRD',
  'FEATHER',
  // Plants
  'GRASS',
  'RAGWEED',
  'TREE',
  'PINE',
  'OAK',
  'BIRCH',
  'WEED',
  // Insects
  'BEE_STING',
  'BEE',
  'WASP',
  'HORNET',
  'MOSQUITO',
  'ANT',
  'FIRE_ANT',
  // Materials
  'LATEX',
  'RUBBER',
  'NICKEL',
  'PERFUME',
  'FRAGRANCE',
  'SMOKE',
  'FORMALDEHYDE',
  'CHEMICAL',
];

/**
 * Common biologic allergens
 */
const BIOLOGIC_ALLERGENS = [
  'VENOM',
  'SERUM',
  'VACCINE',
  'BLOOD_PRODUCT',
  'IMMUNOGLOBULIN',
  'MONOCLONAL_ANTIBODY',
  'BIOLOGIC_AGENT',
  'ENZYME',
];

/**
 * Maps an allergen name to its appropriate FHIR R4 category.
 *
 * Categories are defined by FHIR R4 spec:
 * - food: Food allergens
 * - medication: Drug/medication allergens
 * - environment: Environmental allergens (pollen, dust, etc.)
 * - biologic: Biologic allergens (vaccines, sera, etc.)
 *
 * @param allergenName - The name of the allergen (e.g., "EGGS", "PENICILLIN")
 * @returns The appropriate category, defaulting to 'environment' if unknown
 *
 * @example
 * mapAllergenToCategory("EGGS") // returns "food"
 * mapAllergenToCategory("Penicillin") // returns "medication"
 * mapAllergenToCategory("dust_mites") // returns "environment"
 * mapAllergenToCategory("UNKNOWN") // returns "environment" (default)
 */
export function mapAllergenToCategory(allergenName: string): AllergenCategory {
  const normalized = allergenName.toUpperCase().trim();

  // Check each category in priority order
  // Note: Order matters for allergens that could be in multiple categories (e.g., LATEX)

  // Check biologic first (most specific)
  if (BIOLOGIC_ALLERGENS.some((allergen) => normalized.includes(allergen))) {
    return 'biologic';
  }

  // Check medication second
  if (MEDICATION_ALLERGENS.some((allergen) => normalized.includes(allergen))) {
    return 'medication';
  }

  // Check food third
  if (FOOD_ALLERGENS.some((allergen) => normalized.includes(allergen))) {
    return 'food';
  }

  // Check environment fourth
  if (ENVIRONMENT_ALLERGENS.some((allergen) => normalized.includes(allergen))) {
    return 'environment';
  }

  // Default to environment for unknown allergens
  // Environment is the most general category
  return 'environment';
}

/**
 * Returns the coding system URI used for allergen codes.
 * OpenMRS uses CIEL (Columbia International eHealth Laboratory) concepts.
 *
 * @returns The CIEL coding system URI
 */
export function getAllergenCodingSystem(): string {
  return 'http://ciel.org';
}
