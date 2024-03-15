// Misc imports
import * as dotenv from 'dotenv';
dotenv.config();

// Server imports
import { default as express, Express, Request, Response, NextFunction } from 'express';
import { default as cors } from 'cors';

// Auth imports
import { ExpressAuth, getSession } from '@auth/express';
import { AuthConfig } from '@auth/core';
import DiscordProvider from '@auth/express/providers/discord';
import OsuProvider from '@auth/express/providers/osu';

// Our imports
/* ... */

// Check for environment variables
if (process.env.LINK_PORT == undefined
	|| process.env.LINK_BASEURL == undefined) {
	console.error('Missing environment variables!');
}

// Initialize Express
let app = express();
app.use('trust proxy');
app.set('view engine', 'ejs');

// Configure auth
// Get the session with: await getSession(req, authConfig);
let authConfig: Omit<AuthConfig, "raw"> = {
	providers: [
		DiscordProvider,
		OsuProvider
	],
	secret: process.env.LINK_AUTH_SECRET
}

let auth = ExpressAuth(authConfig);
app.use('/auth/*', auth);

// Pages
app.get('/', (req, res) => res.render('index'));
app.get('/privacy', (req, res) => res.render('privacy'));

// Routes
app.get('/link/start', (req, res) => {

});

app.listen(process.env.PORT || 3000, () => {
	console.log('Ready, listening on port ' + (process.env.PORT || 3000));
});