import { ExpressAuth, getSession as rawGetSession } from '@auth/express';
import { AuthConfig } from '@auth/core/types';
import DiscordProvider from '@auth/express/providers/discord';
import OsuProvider from '@auth/express/providers/osu';

import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '#link/instance/database.js';

import { Request } from 'express';

let authConfig: Omit<AuthConfig, "raw"> = {
	secret: process.env.LINK_AUTH_SECRET,
	adapter: PrismaAdapter(prisma),
	providers: [
		DiscordProvider({
			clientId: process.env.LINK_DISCORD_CLIENT_ID,
			clientSecret: process.env.LINK_DISCORD_CLIENT_SECRET,
			authorization: 'https://discord.com/api/oauth2/authorize?scope=identify+connections+guilds+role_connections.write&prompt=consent',
			checks: ['state'], // PKCE is not allowed with role_connections.write -- see https://github.com/discord/discord-api-docs/issues/5751

		}),
		OsuProvider({
			clientId: process.env.LINK_OSU_CLIENT_ID,
			clientSecret: process.env.LINK_OSU_CLIENT_SECRET,
		})
	],
	session: {
		strategy: 'database'
	},
	pages: {
		signIn: '/link'
	},
	callbacks: {
		async session({ session, user }) {
			if (session?.user) {
				session.user.id = user.id;
			}
			return session;
		}
	}
}

let auth = ExpressAuth(authConfig);

function getSession(req: Request) {
	return rawGetSession(req, authConfig);
}

export { authConfig, auth, getSession };