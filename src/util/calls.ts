import { authConfig } from "#link/instance/auth.js";
import { prisma } from "#link/instance/database.js";
import { OAuthConfig, Provider } from "@auth/core/providers";
import { DiscordProfile } from "@auth/express/providers/discord";
import { OsuProfile } from "@auth/express/providers/osu";
import { Account } from "@prisma/client";
import { Snowflake } from "discord-api-types/globals";
import { APIConnection, ConnectionService, RESTAPIPartialCurrentUserGuild, RESTGetAPICurrentUserConnectionsResult, RESTGetAPICurrentUserGuildsResult, RESTPutAPICurrentUserApplicationRoleConnectionJSONBody } from "discord-api-types/v10";
import * as oAuth from 'oauth4webapi';

export class AccountUnlinkedError extends Error {
	name: 'AccountUnlinkedError';

	constructor(message: string = 'This account has been unlinked.') {
		super(message);
		this.name = 'AccountUnlinkedError';
	}
}

export class AccountUnauthorizedError extends Error {
	name: 'AccountUnauthorizedError';

	constructor(message: string = 'This account has been unlinked.') {
		super(message);
		this.name = 'AccountUnauthorizedError';
	}
}

export async function refreshAccessToken(provider: OAuthConfig<any>, account: Account, clientId: string, clientSecret: string, force: boolean = false) {
	let now = Date.now() / 1000;
	if (!force && account.expires_at > now) return account; else console.log(`Refreshing access token for ${account.id}...`) // No need to refresh
	
	const authorizationServer: oAuth.AuthorizationServer = {
		issuer: 'authjs.dev',
		token_endpoint: provider.token as string,
		authorization_endpoint: provider.authorization as string,
		userinfo_endpoint: provider.userinfo as string
	};
	const client: oAuth.Client = {
		client_id: clientId,
		client_secret: clientSecret
	};

	const response = await oAuth.refreshTokenGrantRequest(authorizationServer, client, account.refresh_token);
	const processed = await oAuth.processRefreshTokenResponse(authorizationServer, client, response);

	if (response.status == 401 || (provider.id == 'discord' && response.status == 400)) {
		// We're not authorized anymore, delete the user
		await prisma.user.delete({ where: { id: account.userId } });
		throw new AccountUnlinkedError(); 
	} else if (oAuth.isOAuth2Error(processed)) {
		throw processed;
	} else {
		return await prisma.account.update({
			where: { id: account.id },
			data: {
				access_token: processed.access_token,
				expires_at: now + processed.expires_in,
				refresh_token: processed.refresh_token
			}
		});
	}
}

export async function oAuthGet(provider: OAuthConfig<any>, accessToken: string, clientId: string, clientSecret: string, endpoint: string = provider.userinfo as string) {
	const authorizationServer: oAuth.AuthorizationServer = {
		issuer: 'authjs.dev',
		token_endpoint: provider.token as string,
		authorization_endpoint: provider.authorization as string,
		userinfo_endpoint: endpoint
	};
	const client: oAuth.Client = {
		client_id: clientId,
		client_secret: clientSecret
	};

	const response = await oAuth.userInfoRequest(authorizationServer, client, accessToken);
	if (response.ok) return await response.json();
	else if (response.status == 401) throw new AccountUnauthorizedError()
	else throw new Error(`Error getting info: [${response.status}] ${response.statusText}`);
}

export interface DiscordInfo {
	isInOsuPlace: boolean;
	redditUsername?: string;
}

export const discordProvider = (authConfig.providers.find((p: OAuthConfig<any>) => p.id == 'discord')) as OAuthConfig<DiscordProfile>;

export async function getDiscordInfo(accessToken: string) {
	const guilds: RESTGetAPICurrentUserGuildsResult = await oAuthGet(discordProvider, accessToken, process.env.LINK_DISCORD_CLIENT_ID, process.env.LINK_DISCORD_CLIENT_SECRET, 'https://discord.com/api/v10/users/@me/guilds');

	if (guilds.find((guild: RESTAPIPartialCurrentUserGuild) => guild.id == process.env.LINK_DISCORD_RPLACE_SERVER_ID) != undefined) {
		// User is in osu! Logo Builders server
		const connections: RESTGetAPICurrentUserConnectionsResult = await oAuthGet(discordProvider, accessToken, process.env.LINK_DISCORD_CLIENT_ID, process.env.LINK_DISCORD_CLIENT_SECRET, 'https://discord.com/api/v10/users/@me/connections');
		const reddit = connections.find((connection: APIConnection) => connection.type == ConnectionService.Reddit);
		if (reddit != undefined) {
			return {
				isInOsuPlace: true,
				redditUsername: reddit.name
			} as DiscordInfo;
		} else {
			return {
				isInOsuPlace: true
			} as DiscordInfo;
		}
	} else {
		return {
			isInOsuPlace: false
		} as DiscordInfo;
	}
}

export interface OsuInfo {
	username: string;
	favoriteRuleset: string;
	playStyles: PlayStyle[];
	country: string;

	creationDate: Date;
	globalRank: number;
	countryRank: number;
	totalPP: number;
	playCount: number;
}

export const osuProvider = (authConfig.providers.find((p: OAuthConfig<any>) => p.id == 'osu')) as OAuthConfig<OsuProfile>;

export async function getOsuInfo(accessToken: string) {
	const osuProfile = await oAuthGet(osuProvider, accessToken, process.env.LINK_OSU_CLIENT_ID, process.env.LINK_OSU_CLIENT_SECRET);

	// Parse
	try {
		if (osuProfile.is_bot || osuProfile.is_deleted) {
			throw new Error('Sorry, bots and deleted users aren\'t allowed.');
		}

		let playstyles: PlayStyle[] = [];
		osuProfile.playstyle.forEach((style: string) => {
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
			username: osuProfile.username,
			favoriteRuleset: osuProfile.playmode,
			playStyles: playstyles,
			country: osuProfile.country.code,

			creationDate: new Date(osuProfile.join_date),
			globalRank: osuProfile.statistics.global_rank,
			countryRank: osuProfile.statistics.country_rank,
			totalPP: osuProfile.statistics.pp,
			playCount: osuProfile.statistics.play_count
		} as OsuInfo;
	} catch (err) {
		if (['TypeError', 'SyntaxError'].includes(err.name)) {
			throw new Error(`Got invalid information from osu!, please try again later and get in touch if this keeps happening. (${err.name}: ${err.message})`);
		} else {
			throw err;
		}
	}
}

export enum PlayStyle {
	Keyboard = 0,
	Mouse = 1,
	Tablet = 2,
	Touchscreen = 3
}

function getPlaystyleEmojis(playStyles: PlayStyle[]) {
	let emojis: string[] = [];
	playStyles.forEach((playStyle: PlayStyle) => {
		switch(playStyle) {
			case PlayStyle.Keyboard:
				emojis.push('⌨️');
				break;
			case PlayStyle.Mouse:
				emojis.push('🖱️');
				break;
			case PlayStyle.Tablet:
				emojis.push('🖊️');
				break;
			case PlayStyle.Touchscreen:
				emojis.push('💻');
				break;
		}
	});

	return emojis.join(' ');
}

function getFlagEmoji(countryCode: string) {
	// Thanks Jorik! https://dev.to/jorik/country-code-to-flag-emoji-a21
	const codePoints = countryCode
		.toUpperCase()
		.split('')
		.map((char: string) => 127397 + char.charCodeAt(0));
	
	return String.fromCodePoint(...codePoints);
}

export async function pushRoleMetadataForUser(
	userId: Snowflake, userAccessToken: string, info: OsuInfo
) {
	if (info.favoriteRuleset == 'osu') info.favoriteRuleset = '';
	if (info.favoriteRuleset == 'fruits') info.favoriteRuleset = 'catch';

	// Format for Discord's stupid dumb date format because if we just toDateString it doesn't work but looks like it works until you actually try it
	var mm = ("0" + (info.creationDate.getMonth() + 1)).slice(-2);
	var dd = ("0" + (info.creationDate.getDate())).slice(-2);
	var yy = info.creationDate.getFullYear();
	var dateString = yy + '-' + mm + '-' + dd;

	const response = await fetch(`https://discord.com/api/v10/users/@me/applications/${process.env.LINK_DISCORD_CLIENT_ID}/role-connection`, {
		method: 'PUT',
		body: JSON.stringify({
			platform_name: `osu!${info.favoriteRuleset}`,
			platform_username: `@${info.username} — ${getFlagEmoji(info.country)} ${getPlaystyleEmojis(info.playStyles)}`,
			metadata: {
				creationdate: dateString,
				globalrank: info.globalRank,
				countryrank: info.countryRank,
				totalpp: Math.floor(info.totalPP),
				playcount: info.playCount
			}
		} as RESTPutAPICurrentUserApplicationRoleConnectionJSONBody),
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${userAccessToken}`
		}
	});
	if (response.ok) return response;
	else {
		const data = await response.text();
		if (response.status == 401) throw new AccountUnauthorizedError(response.statusText + ': ' + data);
		else throw new Error(`Error pushing role metadata: [${response.status}] ${response.statusText}: ${data}`);
	}
}