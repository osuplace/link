import { ExpressAuth, getSession as rawGetSession } from '@auth/express';
import { AuthConfig } from '@auth/core/types';
import DiscordProvider, { DiscordProfile } from '@auth/express/providers/discord';
import OsuProvider, { OsuProfile } from '@auth/express/providers/osu';

import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '#link/instance/database.js';

import { Request } from 'express';

let authConfig: Omit<AuthConfig, "raw"> = {
	adapter: PrismaAdapter(prisma),
	providers: [
		DiscordProvider({
			clientId: process.env.LINK_DISCORD_CLIENT_ID,
			clientSecret: process.env.LINK_DISCORD_CLIENT_SECRET,
			authorization: {
				params: {
					scope: 'identify role_connections.write guilds connections'
					// /users/@me/connections
					// /users/@me/guilds
				}
			}
		}),
		OsuProvider({
			clientId: process.env.LINK_OSU_CLIENT_ID,
			clientSecret: process.env.LINK_OSU_CLIENT_SECRET
		})
	],
	session: {
		strategy: 'database'
	},
	pages: {
		signIn: '/link'
	},
	callbacks: {
		async signIn({ user, profile }) {
			if (profile.kudosu != undefined) {
				let osuProfile = profile as OsuProfile;
				if (osuProfile.is_bot || osuProfile.is_deleted || osuProfile.is_restricted)	{
					return false;
				}
				
				user.osuCreationDate = osuProfile.join_date,
				user.osuGlobalRank = osuProfile.statistics.global_rank,
				user.osuCountryRank = osuProfile.statistics.country_rank,
				user.osuTotalPP = osuProfile.statistics.pp,
				user.osuPlayCount = osuProfile.statistics.play_count,

				user.osuFavoriteRuleset = osuProfile.playmode,
				user.osuPlaystyles = JSON.stringify(osuProfile.playstyle),
				user.osuCountry = osuProfile.country.code
				// TODO
				// Ok April! Here's what you Gotta Do! 
				// schema.prisma → update user to add fields for the stuff we want from osu
				// Then use prisma here to update user to fill those fields
				// You have the Profile in /data
			} else if (profile.discriminator != undefined) {
				let discordProfile = profile as DiscordProfile;
				// schema.prisma → also add fields for the stuff we want from discord (and add them below)
				// You want to use the endpoints above in the "scope" to get them
			}
			return true;
		}
	},
	secret: process.env.LINK_AUTH_SECRET
}

let auth = ExpressAuth(authConfig);

function getSession(req: Request) {
	return rawGetSession(req, authConfig);
}

export { authConfig, auth, getSession };