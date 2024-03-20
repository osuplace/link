export default function checkEnv(vars: string[] = [
	'LINK_BRAND_NAME',
	'LINK_PORT', 'LINK_BASEURL', 
	
	'LINK_AUTH_SECRET',
	
	'LINK_DISCORD_BOT_TOKEN', 
	
	'LINK_DISCORD_CLIENT_ID', 'LINK_DISCORD_CLIENT_SECRET',
	'LINK_OSU_CLIENT_ID', 'LINK_OSU_CLIENT_SECRET',

	'LINK_DISCORD_RPLACE_SERVER_ID'
]) {
	vars.forEach((variable) => {
		if (process.env[variable] == undefined) {
			throw new Error(`Missing environment variable: ${variable}`);
		}
	});
	return true;
}

