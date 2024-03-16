// Set up environment variables
import * as dotenv from 'dotenv';
dotenv.config();

// Check for environment variables
import checkEnv from '#link/util/check-env.js';
checkEnv();

// Server imports
import { default as express, Express, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';

// Our imports
import { auth, authConfig, getSession } from '#link/instance/auth.js';
import { prisma } from '#link/instance/database.js';
import commonProps from './util/common-props.js';

// Initialize Express
let app = express();
app.set('trust proxy', 'loopback');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/auth/*', auth); // Get the session with: await getSession(req);


// Pages
app.get('/', (req, res) => res.render('index', commonProps));
app.get('/privacy', (req, res) => res.render('privacy', commonProps));

// Routes
app.get('/link', cookieParser(), async (req, res) => {
	// TODO
	// Cases (check from top to bottom!): 
	// - Not logged in -> Send to osu! login
	// - Logged in with osu! but not Discord (do osu! first so that we have the latest player data in case this is a refresh) -> Send to Discord login
	// - Logged in with both Discord (with valid token, get it from the database) and osu! -> send data to Discord and stuff, see https://discord.com/channels/297657542572507137/959453204163199056/1218260546168557650 (and then show "You can close this tab!")
	// POST /auth/signin

	// If the user isn't signed in, send them to sign in with osu!
	const session = await getSession(req);
	if (!session || !session.user) {
		// If the user doesn't have a CSRF token, send them to get one
		// FIXME: This is a dumb workaround because right now there's no way for me to get a CSRF token serverside, because @auth/express doesn't expose a function for it.
		if (!req.cookies['authjs.csrf-token']) {
			return res.render('link/set-csrf', commonProps);
		} else {
			// If they do, send them to sign in
			return res.render('link/signin', {
				providerFriendlyName: 'osu!',
				providerId: 'osu',
				providerLogo: process.env.LINK_BASEURL + '/assets/images/osu-singlecolor.png',
				csrfToken: req.cookies['authjs.csrf-token'].split('|')[0],
				...commonProps
			});
		}
	} else {
		return res.render('link/done', commonProps)
	}
});

app.listen(process.env.PORT || 3000, () => {
	console.log('Ready, listening on port ' + (process.env.PORT || 3000));
});