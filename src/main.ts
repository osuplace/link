// Set up environment variables
import * as dotenv from 'dotenv';
dotenv.config();

// Server imports
import { default as express, Express, Request, Response, NextFunction } from 'express';

// Our imports
import { auth, authConfig, getSession } from '#link/instance/auth.js';
import { prisma } from '#link/instance/database.js';

// Check for environment variables
import checkEnv from '#link/util/check-env.js';
checkEnv();

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
	// POST /auth/signin

	// TODO
	// GO FIND THE DOCS FOR WHAT TO SEND TO /auth/signin DUMMY 
});

app.listen(process.env.PORT || 3000, () => {
	console.log('Ready, listening on port ' + (process.env.PORT || 3000));
});