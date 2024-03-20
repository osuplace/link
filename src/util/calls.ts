import { authConfig } from "#link/instance/auth.js";
import { OAuthConfig, Provider } from "@auth/core/providers";
import { OsuProfile } from "@auth/express/providers/osu";
import { Snowflake } from "discord-api-types/globals";
import { RESTPutAPICurrentUserApplicationRoleConnectionJSONBody } from "discord-api-types/v10";
import * as oAuth from 'oauth4webapi';

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
	return await response.json();
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

export async function getDiscordInfo(accessToken: string, refreshToken: string) {
	throw Error('not implemented >.<');
}

export async function getOsuInfo(accessToken: string, refreshToken: string) {
	// TODO: Add token refreshing (see link in other TODO)
	const osuProvider = authConfig.providers.find((p: OAuthConfig<any>) => p.id == 'osu');
	const osuProfile = await oAuthGet(osuProvider as OAuthConfig<OsuProfile>, accessToken, process.env.LINK_OSU_CLIENT_ID, process.env.LINK_OSU_CLIENT_SECRET);

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
	// TODO: Add token refreshing https://github.com/discord/linked-roles-sample/blob/f491c22307b4da3d7df8371eeffbd63b1905f1bf/src/discord.js#L67

	if (info.favoriteRuleset == 'osu') info.favoriteRuleset = '';
	if (info.favoriteRuleset == 'fruits') info.favoriteRuleset = 'catch';

	return await fetch(`https://discord.com/api/v10/users/@me/applications/${process.env.LINK_DISCORD_CLIENT_ID}/role-connection`, {
		method: 'PUT',
		body: JSON.stringify({
			platform_name: `osu!${info.favoriteRuleset}`,
			platform_username: `@${info.username} (${getFlagEmoji(info.country)} ${getPlaystyleEmojis(info.playStyles)})`,
			metadata: {
				creationdate: info.creationDate.toDateString(),
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
}