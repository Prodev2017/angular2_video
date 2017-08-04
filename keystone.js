if(process.env.NODE_ENV == 'production' || process.env.IS_STAGING == true ) {
	require('newrelic');
}

// Simulate config options from your production environment by
// customising the .env file in your project's root folder.
require('dotenv').load();

// Require keystone
var keystone = require('keystone');
var mongoose = require('mongoose');
keystone.set('mongoose', mongoose);
var handlebars = require('express-handlebars');
var sparkpost = require('sparkpost');

var crons = require('./routes/crons.js');

// Initialise Keystone with your project's configuration.
// See http://keystonejs.com/guide/config for available options
// and documentation.

keystone.init({

	'name': 'Crooklyn Clan',
	'brand': 'Crooklyn Clan',

	'sass': 'public',
	'static': 'public',
	'favicon': 'public/favicon.ico',
	'views': 'templates',
	'view engine': 'hbs',

	'custom engine': handlebars.create({
		layoutsDir: 'templates/views/layouts',
		partialsDir: 'templates/views/partials',
		defaultLayout: 'default',
		helpers: new require('./templates/views/helpers')(),
		extname: '.hbs'
	}).engine,
	'email layout': 'email-default',
	'email siteurl': process.env.EMAIL_SITE_URL,
	'email service': new sparkpost(process.env.SPARKPOST_API_KEY),
	'file limit': '100mb',
	'emails': 'templates/emails',
	'cors allow origin': process.env.CORS_ALLOW_ORIGIN || 'https://v2-beta.crooklynclan.net',
	'cors allow headers': 'Content-Type, Authorization, Origin, X-Requested-With',
	'auto update': true,
	'session': true,
	'session store': 'mongo',
	'auth': true,
	'user model': 'User',
	'email from name': (process.env.EMAIL_ENV == 'test') ? 'Crooklyn Clan v2 DEVELOPMENT' : 'Crooklyn Clan',
	'email from email': (process.env.EMAIL_ENV == 'test') ? 'no-reply@crooklynclan.net' : 'no-reply@crooklynclan.net',
	'email subject prefix': (process.env.EMAIL_ENV == 'test') ? '[TEST/DEV]' : '[Crooklyn v2 Beta]',
	'paypal env': process.env.PAYPAL_ENV,
	'paypal client id': process.env.PAYPAL_CLIENT_ID,
	'paypal client secret': process.env.PAYPAL_CLIENT_SECRET,
	'paypal webhook id': process.env.PAYPAL_WEBHOOK_ID,
	'webflow api token': process.env.WEBFLOW_API_TOKEN,
	'webflow api site id': process.env.WEBFLOW_API_SITE_ID,
	'webflow api editor collection id': process.env.WEBFLOW_API_EDITOR_COLLECTION_ID,
	'accounting batch job interval': process.env.ACCOUNTING_BATCH_INTERVAL || 1800000,
	'track processing batch job interval': process.env.TRACK_BATCH_INTERVAL || 300000,
	'editor chart update interval': process.env.EDITOR_CHARTS_BATCH_INTERVAL || 1800000,
	's3 config': { bucket: process.env.S3_BUCKET, key: process.env.S3_KEY, secret: process.env.S3_SECRET},
	'v1 s3 config': { bucket: process.env.V1_S3_BUCKET, key: process.env.V1_S3_KEY, secret: process.env.V1_S3_SECRET, video_bucket: process.env.V1_VIDEO_S3_BUCKET }
	
});

// Load your project's Models

keystone.import('models');

// Setup common locals for your templates. The following are required for the
// bundled templates and layouts. Any runtime locals (that should be set uniquely
// for each request) should be added to ./routes/middleware.js

keystone.set('locals', {
	_: require('underscore'),
	env: keystone.get('env'),
	utils: keystone.utils,
	editable: keystone.content.editable
});

// Load your project's Routes

keystone.set('routes', require('./routes'));


// Setup common locals for your emails. The following are required by Keystone's
// default email templates, you may remove them if you're using your own.

keystone.set('email locals', {
	logo_src: '/images/logo-email.gif',
	logo_width: 194,
	logo_height: 76,
	theme: {
		email_bg: '#f9f9f9',
		link_color: '#2697de',
		buttons: {
			color: '#fff',
			background_color: '#2697de',
			border_color: '#1a7cb7'
		}
	}
});

// Setup replacement rules for emails, to automate the handling of differences
// between development a production.

// Be sure to update this rule to include your site's actual domain, and add
// other rules your email templates require.

keystone.set('email rules', [{
	find: '/images/',
	replace: (keystone.get('env') == 'production') ? 'http://www.your-server.com/images/' : 'http://localhost:3000/images/'
}, {
	find: '/keystone/',
	replace: (keystone.get('env') == 'production') ? 'http://www.your-server.com/keystone/' : 'http://localhost:3000/keystone/'
}]);

// Load your project's email test routes

keystone.set('email tests', require('./routes/emails'));

// Configure the navigation bar in Keystone's Admin UI

keystone.set('nav', {
  'users': ['User','DownloadQueue'],
  'stores': ['Currency'],
  'inventory': ['Track','Release'],
  'accounting': ['Package','PackageItem','Transaction','TransactionItem','Downloads','AccountingPeriod','EditorAccounting','TrackAccounting','Payout'],
  'charts': ['Chart','AllTimeTopTracksChart','CurrentMonthTopTracksChart','LastMonthTopTracksChart'],
  'categories': ['Genre','Key','Tag','GigType','Artist','OriginalWorks' ],
});

// Start Keystone to connect to your database and initialise the web server

keystone.start({onStart: crons.run});