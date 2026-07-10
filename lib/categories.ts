export const ALLOWED_CATEGORIES = [
	"FOOD",
	"TRANSPORT",
	"SUBSCRIPTION",
	"STATIONARY",
	"PERSONAL",
	"OTHERS",
	"POCKET_MONEY",
] as const;

export type AllowedCategory = (typeof ALLOWED_CATEGORIES)[number];

export const CATEGORY_ABBREVIATIONS: Record<AllowedCategory, string> = {
	FOOD: "FOOD",
	TRANSPORT: "TRN",
	SUBSCRIPTION: "SUB",
	STATIONARY: "STN",
	PERSONAL: "PERS",
	OTHERS: "OTH",
	POCKET_MONEY: "PKT",
};

export function isValidCategory(value: string): value is AllowedCategory {
	return ALLOWED_CATEGORIES.includes(value as AllowedCategory);
}

export function sanitizeCategory(value: string): string {
	return value.trim().toUpperCase();
}

export function getCategoryAbbreviation(category: string): string {
	if (isValidCategory(category)) {
		return CATEGORY_ABBREVIATIONS[category];
	}
	return category.slice(0, 3).toUpperCase();
}
