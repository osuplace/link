import { Snowflake } from "discord-api-types/globals";
import { RESTPutAPICurrentUserApplicationRoleConnectionJSONBody } from "discord-api-types/v10";

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
	userId: Snowflake, userAccessToken: string, 
	{ creationDate, globalRank, countryRank, totalPP, playCount }: {
		creationDate: Date, 
		globalRank: number, 
		countryRank: number, 
		totalPP: number, 
		playCount: number
	},
	username: string, favoriteRuleset: string, playStyles: PlayStyle[], country: string
) {
	// TODO: Add token refreshing https://github.com/discord/linked-roles-sample/blob/f491c22307b4da3d7df8371eeffbd63b1905f1bf/src/discord.js#L67

	if (favoriteRuleset == 'osu') favoriteRuleset = '';
	if (favoriteRuleset == 'fruits') favoriteRuleset = 'catch';

	const response = await fetch(`https://discord.com/api/v10/users/@me/applications/${process.env.LINK_DISCORD_CLIENT_ID}/role-connection`, {
		method: 'PUT',
		body: JSON.stringify({
			platform_name: `osu!${favoriteRuleset}`,
			platform_username: `@${username} (${getFlagEmoji(country)} ${getPlaystyleEmojis(playStyles)})`,
			metadata: {
				creationdate: creationDate.toDateString(),
				globalrank: globalRank,
				countryrank: countryRank,
				totalpp: Math.floor(totalPP),
				playcount: playCount
			}
		} as RESTPutAPICurrentUserApplicationRoleConnectionJSONBody),
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${userAccessToken}`
		}
	});
	console.log('username sent: ', username)
	console.log(await JSON.stringify(await response.json(), null, 2));
}