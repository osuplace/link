// Set up environment variables
import * as dotenv from 'dotenv';
dotenv.config();

// Discord imports
import { APIApplicationRoleConnectionMetadata as RoleMetadata, ApplicationRoleConnectionMetadataType as MetadataType } from "discord-api-types/v10";

// Check for environment variables
import checkEnv from '#link/util/check-env.js';
checkEnv();

const metadata: RoleMetadata[] = [
	{
		key: 'creationdate',
		name: 'Account creation date',
		description: 'days since account created',
		type: MetadataType.DatetimeLessThanOrEqual
	},
	{
		key: 'globalrank',
		name: 'Global rank',
		description: 'or better (lower) rank',
		type: MetadataType.IntegerLessThanOrEqual
	},
	{
		key: 'countryrank',
		name: 'Country rank',
		description: 'or better (lower) rank',
		type: MetadataType.IntegerLessThanOrEqual
	},
	{
		key: 'totalpp',
		name: 'Total PP',
		description: 'or more PP',
		type: MetadataType.IntegerGreaterThanOrEqual
	},
	{
		key: 'playcount',
		name: 'Play count',
		description: 'or more plays',
		type: MetadataType.IntegerGreaterThanOrEqual
	}
]

const response = await fetch(`https://discord.com/api/v10/applications/${process.env.LINK_DISCORD_CLIENT_ID}/role-connections/metadata`, {
	method: 'PUT',
	body: JSON.stringify(metadata),
	headers: {
		'Content-Type': 'application/json',
		Authorization: `Bot ${process.env.LINK_DISCORD_BOT_TOKEN}`
	}
});

if (response.ok) {
	const data = await response.json();
	console.log('Role metadata registered! New metadata:');
	console.log(data);
} else {
	const data = await response.text();
	throw new Error(`Error registering role metadata: [${response.status}] ${response.statusText}: ${data}`);
}