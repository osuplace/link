import '@auth/express';

declare module '@auth/express' {
	interface User {
		isInOsuPlace: boolean | null;
		redditUsername: string | null;

		osuCreationDate: Date | null;
		osuGlobalRank: number | null;
		osuCountryRank: number | null;
		osuTotalPP: number | null;
		osuPlayCount: number | null;

		osuFavoriteRuleset: string | null;
		osuPlaystyles: string | null;
		osuCountry: string | null;
	}
}