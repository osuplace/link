// Misc imports
import * as dotenv from 'dotenv';
dotenv.config();

// Server imports
import { default as express, Express, Request, Response, NextFunction } from 'express';
import { default as cors } from 'cors';

// Our imports
import { auth, authConfig, getSession } from './auth.js';
import { prisma } from './database.js';

// Check for environment variables
if (process.env.LINK_PORT == undefined
	|| process.env.LINK_BASEURL == undefined
	|| process.env.LINK_AUTH_SECRET == undefined
	|| process.env.LINK_DISCORD_CLIENT_ID == undefined
	|| process.env.LINK_DISCORD_CLIENT_SECRET == undefined
	|| process.env.LINK_OSU_CLIENT_ID == undefined
	|| process.env.LINK_OSU_CLIENT_SECRET == undefined) {
	console.error('Missing environment variables!');
	process.exit();
}

// Initialize Express
let app = express();
app.set('trust proxy', 'loopback');
app.set('view engine', 'ejs');
app.use('/auth/*', auth); // Get the session with: await getSession(req);

// Pages
app.get('/', (req, res) => res.render('index'));
app.get('/privacy', (req, res) => res.render('privacy'));

// Routes
app.get('/link', (req, res) => {
	// TODO
	// Cases (check from top to bottom!): 
	// - Not logged in -> Send to osu! login
	// - Logged in with osu! but not Discord (do osu! first so that we have the latest player data in case this is a refresh) -> Send to Discord login
	// - Logged in with both Discord (with valid token, get it from the database) and osu! -> send data to Discord and stuff, see https://discord.com/channels/297657542572507137/959453204163199056/1218260546168557650 (and then show "You can close this tab!")
	
});

app.listen(process.env.PORT || 3000, () => {
	console.log('Ready, listening on port ' + (process.env.PORT || 3000));
});