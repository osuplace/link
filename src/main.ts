// Set up environment variables
import * as dotenv from 'dotenv';
dotenv.config();

// Check for environment variables
import checkEnv from '#link/util/check-env.js';
checkEnv();

// Server imports
import { default as express, Express, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';

// Our imports
import { auth, authConfig, getSession } from '#link/instance/auth.js';
import { OAuthConfig } from '@auth/express/providers';
import { OsuProfile } from '@auth/express/providers/osu';
import { DiscordProfile } from '@auth/express/providers/discord';
import { prisma } from '#link/instance/database.js';
import commonProps from '#link/util/common-props.js';
import { PlayStyle, discordProvider, getDiscordInfo, getOsuInfo, oAuthGet, osuProvider, pushRoleMetadataForUser, refreshAccessToken } from '#link/util/calls.js';
import { Account } from '@prisma/client';

// Initialize Express
let app = express();
app.set('trust proxy', 'loopback');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	limit: 25,
	// TODO: Could put Redis here I guess..?
}));
app.use('/auth/*', auth); // Get the session with: await getSession(req);

// Pages
let installLink = new URL('https://discord.com/oauth2/authorize');
installLink.searchParams.set('client_id', process.env.LINK_DISCORD_CLIENT_ID);
installLink.searchParams.set('scope', 'applications.commands bot');
installLink.searchParams.set('permissions', '0');

app.get('/', async (req, res) => res.render('index', { installLink, userCount: await prisma.user.count(), ...commonProps }));
app.get('/privacy', (req, res) => res.render('privacy', commonProps));

// Routes
function getErrorString(errorCode: string) {
	// List of error codes: https://authjs.dev/guides/basics/pages#error-codes

	switch(errorCode) {
		case 'AccessDenied':
			return `Sorry, you\'re not allowed to do this. (${errorCode} error)`;
		
		case 'OAuthSignin':
		case 'OAuthCallback':
		case 'Callback':
			return `An error occurred trying to sign in. Please try again later and get in touch if this keeps happening. (${errorCode} error)`;
		
		case 'OAuthCreateAccount':
		case 'EmailCreateAccount':
			return `An error occurred accessing the database. Please try again later and get in touch if this keeps happening. (${errorCode} error)`;
		
		case 'OAuthAccountNotLinked':
		case 'EmailSignin':
		case 'CredentialsSignin':
		case 'Verification':
			return `A really weird error occurred. This shouldn't ever happen, so please contact us if this keeps happening. (${errorCode} error)`;
		
		case '':
			return 'An unknown error occurred. Please try again later and get in touch if this keeps happening.';
		
		case 'SessionRequired':
		case 'Configuration':
		case 'Default':
		default:
			return `An unknown error occurred. Please try again later and get in touch if this keeps happening. (${errorCode} error)`;
	}
}

app.get('/error', (req, res) => {
	return res.render('link/error', { error: getErrorString(req.query.error as string ?? ''), ...commonProps });
});

app.get(['/link', '/auth/link'], cookieParser(), async (req, res) => {
	// If we got a 'error' query, show an error
	if (req.query.error) {
		return res.render('link/error', { error: getErrorString(req.query.error as string), ...commonProps });
	}
	
	let csrfCookie = req.cookies['__Host-authjs.csrf-token'] ?? req.cookies['authjs.csrf-token'];

	// If the user isn't signed in, send them to sign in with osu!
	const session = await getSession(req);
	if (!session || !session.user || !session.user.id) {
		// If the user doesn't have a CSRF token, send them to get one
		// FIXME: This is a dumb workaround because right now there's no way for me to get a CSRF token serverside, because @auth/express doesn't expose a function for it.
		if (!csrfCookie) {
			return res.render('link/set-csrf', commonProps);
		} else {
			// If they do, send them to sign in
			return res.render('link/signin', {
				providerFriendlyName: 'osu!',
				providerId: 'osu',
				providerLogo: process.env.LINK_BASEURL + '/assets/images/osu-singlecolor.png',
				csrfToken: csrfCookie.split('|')[0],
				...commonProps
			});
		}
	} else {
		// If the user is signed in, get them from the database
		const user = await prisma.user.findUnique({
			where: { id: session.user.id }
		});
		if (user == null) { return res.render('link/error', { error: 'An error occurred accessing the database. Please try again later and get in touch if this keeps happening. (user == null)', ...commonProps }); }; // This should never happen because if the User gets deleted, the session would too... 

		let osuAccount: Account = await prisma.account.findFirst({
			where: {
				provider: 'osu',
				userId: user.id
			}
		});
		let discordAccount: Account = await prisma.account.findFirst({
			where: {
				provider: 'discord',
				userId: user.id
			}
		});

		if (osuAccount == null) { // If the user has no linked osu! account, send them to sign in with osu!
			if (!csrfCookie) { // Can we somehow check if the csrf token is actually valid...?
				return res.render('link/set-csrf', commonProps);
			} else {
				return res.render('link/signin', {
					providerFriendlyName: 'osu!',
					providerId: 'osu',
					providerLogo: process.env.LINK_BASEURL + '/assets/images/osu-singlecolor.png',
					csrfToken: csrfCookie.split('|')[0],
					...commonProps
				});
			}
		} else if (discordAccount == null) { // If the user has no linked Discord account, send them to sign in with Discord
			if (!csrfCookie) {
				return res.render('link/set-csrf', commonProps);
			} else {
				return res.render('link/signin', {
					providerFriendlyName: 'Discord',
					providerId: 'discord',
					providerLogo: process.env.LINK_BASEURL + '/assets/images/discord-with-margin.svg',
					csrfToken: csrfCookie.split('|')[0],
					...commonProps
				});
			}
		} else {
			// If the user has both an osu! and Discord account, send their role data to Discord

			// But first, refresh their tokens:
			try {
				osuAccount = await refreshAccessToken(
					osuProvider, 
					osuAccount,
					process.env.LINK_OSU_CLIENT_ID, process.env.LINK_OSU_CLIENT_SECRET
				);
				
				discordAccount = await refreshAccessToken(
					discordProvider,
					discordAccount,
					process.env.LINK_DISCORD_CLIENT_ID, process.env.LINK_DISCORD_CLIENT_SECRET
				);
			} catch(err) {
				if (err.name == 'AccountUnlinkedError') {
					return res.render('link/error', { error: 'Your account has been unlinked — if this was a mistake, try linking it again.', ...commonProps });
				} else {
					console.error('Error refreshing tokens: ', err);
				}
			}

			// Okay, time for the real deal!
			try {
				const [ discordInfo, osuInfo ] = await Promise.all([
					getDiscordInfo(discordAccount.access_token), 
					getOsuInfo(osuAccount.access_token)
				]);

				await prisma.user.update({
					where: {
						id: user.id
					}, 
					data: {
						discordInfo: JSON.stringify(discordInfo),
						osuInfo: JSON.stringify(osuInfo)
					}
				})
				
				await pushRoleMetadataForUser(
					(discordAccount as Account).providerAccountId,
					(discordAccount as Account).access_token,
					osuInfo
				).then(() => {
					return res.render('link/done', commonProps);
				});
			} catch (err) {
				if (err.name == 'AccountUnauthorizedError') {
					try {
						await refreshAccessToken(
							osuProvider, 
							osuAccount,
							process.env.LINK_OSU_CLIENT_ID, process.env.LINK_OSU_CLIENT_SECRET,
							true // force
						);
						
						await refreshAccessToken(
							discordProvider,
							discordAccount,
							process.env.LINK_DISCORD_CLIENT_ID, process.env.LINK_DISCORD_CLIENT_SECRET,
							true // force
						);
					} catch(err) {
						if (err.name == 'AccountUnlinkedError') {
							return res.render('link/error', { error: 'Your account has been unlinked — if this was a mistake, try linking it again.', ...commonProps });
						} else {
							console.error('Error refreshing tokens: ', err);
						}
					}
					
					if (req.query.is_retry_after_refresh == '1') {
						return res.render('link/error', { error: 'Sorry, it seems like either osu! or Discord is down right now. Please try again later, or get in touch if this keeps happening.', ...commonProps });
					} else {
						return res.redirect('/link?is_retry_after_refresh=1');
					}
				} else {
					console.error('Error pushing role metadata to Discord: ', err);
					return res.render('link/error', { error: 'An error occurred sending data to Discord: ' + err.message, ...commonProps });
				}
			}
		}
	}
});

app.listen(process.env.LINK_PORT || 3000, () => {
	console.log('Ready, listening on port ' + (process.env.LINK_PORT || 3000));
});