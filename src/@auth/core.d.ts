import '@auth/express';

declare module '@auth/express' {
	interface User {
		isInOsuPlace?: boolean;
		redditUsername?: string;

		osuCreationDate?: Date;
		osuGlobalRank?: number;
		osuCountryRank?: number;
		osuTotalPP?: number;
		osuPlayCount?: number;

		osuFavoriteRuleset?: string;
		osuPlaystyles?: string;
		osuCountry?: string;
	}
}