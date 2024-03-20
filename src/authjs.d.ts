import '@auth/express';

declare module '@auth/express' {
	interface User {
		osuInfo: string; // OsuInfo JSON
		discordInfo: string; // DiscordInfo JSON
	}
}