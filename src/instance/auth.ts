import { ExpressAuth, Profile, getSession as rawGetSession } from '@auth/express';
import { AuthConfig } from '@auth/core/types';
import DiscordProvider, { DiscordProfile } from '@auth/express/providers/discord';
import OsuProvider, { OsuProfile } from '@auth/express/providers/osu';

import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '#link/instance/database.js';

import { Request } from 'express';
import { PlayStyle } from '#link/util/calls.js';

function getUserFieldsFromDiscordProfile(profile: DiscordProfile): Profile {
	return {
		id: profile.id,
		name: profile.global_name ?? profile.username,
		email: null,
		image: profile.image_url,
	}
}

function getUserFieldsFromOsuProfile(profile: OsuProfile) : Profile {
	let playstyles: PlayStyle[] = [];
	profile.playstyle.forEach((style) => {
		switch(style) {
			case 'keyboard':
				playstyles.push(PlayStyle.Keyboard);
				break;
			case 'mouse':
				playstyles.push(PlayStyle.Mouse);
				break;
			case 'tablet':
				playstyles.push(PlayStyle.Tablet);
				break;
			case 'touch':
				playstyles.push(PlayStyle.Touchscreen);
				break;
		}
	});

	return {
		id: profile.id.toString(),
		email: null,
		name: profile.username,
		image: profile.avatar_url,

		osuUsername: profile.username,
		osuCreationDate: profile.join_date,
		osuGlobalRank: profile.statistics.global_rank,
		osuCountryRank: profile.statistics.country_rank,
		osuTotalPP: profile.statistics.pp,
		osuPlayCount: profile.statistics.play_count,

		osuFavoriteRuleset: profile.playmode,
		osuPlaystyles: JSON.stringify(playstyles),
		osuCountry: profile.country.code
	}
}

let authConfig: Omit<AuthConfig, "raw"> = {
	secret: process.env.LINK_AUTH_SECRET,
	adapter: PrismaAdapter(prisma),
	providers: [
		DiscordProvider({
			clientId: process.env.LINK_DISCORD_CLIENT_ID,
			clientSecret: process.env.LINK_DISCORD_CLIENT_SECRET,
			authorization: 'https://discord.com/api/oauth2/authorize?scope=identify+connections+guilds+role_connections.write&prompt=consent',
			//authorization: 'https://discord.com/api/oauth2/authorize?scope=identify+role_connections.write&prompt=consent',
			checks: ['none'], // For some reason role_connections.write doesn't work with 'PKCE' (and 'state' is broken??)
			// /users/@me/connections
			// /users/@me/guilds
			// TODO! Get guilds and reddit
			profile: getUserFieldsFromDiscordProfile
		}),
		OsuProvider({
			clientId: process.env.LINK_OSU_CLIENT_ID,
			clientSecret: process.env.LINK_OSU_CLIENT_SECRET,
			profile: getUserFieldsFromOsuProfile
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
			if (!profile) {
				console.error('User tried signing in without profile...?');
				return false;
			};
		
			// Get the user's new data
			if (profile.kudosu != undefined) { // osu! profile
				let osuProfile = profile as unknown as OsuProfile;
				if (osuProfile.is_bot || osuProfile.is_deleted)	{
					console.error(`User ${osuProfile.username} is a bot or is deleted, denying`);
				};
				
				user = {
					...getUserFieldsFromOsuProfile(osuProfile),
					id: user.id, name: user.name, email: user.email, image: user.image
				};
			} else if (profile.discriminator != undefined) { // discord profile
				let discordProfile = profile as DiscordProfile;
			
				user = {
					...getUserFieldsFromDiscordProfile(discordProfile),
					id: user.id, name: user.name, email: user.email, image: user.image
				};
			}

			const dbUser = await prisma.user.findUnique({
				where: { id: user.id }
			});
			console.log('id we looking for', user.id);
			console.log('user', dbUser);

			if (dbUser != null) {
				console.log('Meowmeow')
				// If the user already exists, update them in the database
				try {
					await prisma.user.update({
						where: {
							id: user.id
						},
						data: user
					});
					return true;
				} catch(err) {
					console.error('Error updating user that tried to sign in: ' + err);
					return false;
				} 
			} else {
				return true;
			}
		},
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

export { authConfig, auth, getSession, getUserFieldsFromDiscordProfile, getUserFieldsFromOsuProfile };