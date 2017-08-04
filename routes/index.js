/**
 * This file is where you define your application routes and controllers.
 *
 * Start by including the middleware you want to run for every request;
 * you can attach middleware to the pre('routes') and pre('render') events.
 *
 * For simplicity, the default setup for route controllers is for each to be
 * in its own file, and we import all the files in the /routes/views directory.
 *
 * Each of these files is a route controller, and is responsible for all the
 * processing that needs to happen for the route (e.g. loading data, handling
 * form submissions, rendering the view template, etc).
 *
 * Bind each route pattern your application should respond to in the function
 * that is exported from this module, following the examples below.
 *
 * See the Express application routing documentation for more information:
 * http://expressjs.com/api.html#app.VERB
 */

var keystone = require('keystone');
var middleware = require('./middleware');
var importRoutes = keystone.importer(__dirname);
var bodyParser = require('body-parser');
var path = require('path');

// Common Middleware
keystone.pre('routes', middleware.initLocals);
keystone.pre('render', middleware.flashMessages);

// Import Route Controllers
var routes = {
	views: importRoutes('./views'),
	api: importRoutes('./api'),
	migration: importRoutes('./migration')
};

// Setup Route Bindings

	exports = module.exports = function(app) {
app.set('x-powered-by', false)
	//API routes


	//Member-level User Routes

	//Currencies
	app.get('/api/v1/members/currency/list', [keystone.middleware.api, keystone.middleware.cors], routes.api.v1.members.currency.list);
	app.get('/api/v1/members/currency/:currencyId/get', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.currency.get);
	app.get('/api/v1/members/currency/:currencyId/tracks/list/:pageNumber?', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.currency.tracks);
	app.get('/api/v1/members/currency/:currencyId/collections/list', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.currency.collections);
	app.get('/api/v1/members/currency/:currencyId/crates/list', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.currency.crates);
	app.get('/api/v1/members/currency/:currencyId/editors/list', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.currency.editors);
	app.get('/api/v1/members/currency/:currencyId/charts/list', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.currency.charts);
	app.get('/api/v1/members/currency/packages/list', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.currency.packageList);
	app.post('/api/v1/members/package/:packageId/purchase', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.currency.packagePurchase);
	app.post('/api/v1/members/currency/:currencyId/purchase', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.currency.purchaseTracks);
	app.post('/api/v1/members/package/:packageId/createPayment', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.currency.createPayment);
	app.post('/api/v1/members/package/:packageId/executePayment', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.currency.packagePurchase);
	app.get('/api/v1/members/currency/:currencyId/accountingPeriods/list', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.currency.getAvailableAccountingPeriods);
	
	app.get('/api/v1/members/currency/:currencyId/top/list/:pageNumber?', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.currency.getTopTracksList);
	
	app.get('/api/v1/members/currency/:currencyId/top/this-month/list/:pageNumber?', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.currency.getTopTracksCurrentMonthList);
	app.get('/api/v1/members/currency/:currencyId/top/last-month/list/:pageNumber?', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.currency.getTopTracksLastMonthList);

	//Keys
	app.get('/api/v1/members/keys/list', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.keys.list);

	//Tags
	app.get('/api/v1/members/tags/list', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.tags.list);

	//Genres
	app.get('/api/v1/members/genres/list', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.genres.list);

	//Crates
	app.get('/api/v1/members/currency/:currencyId/crates/:crateId/get', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.crate.get);
	app.post('/api/v1/members/currency/:currencyId/crates/:crateId/update', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.crate.update);
	app.get('/api/v1/members/currency/:currencyId/crates/:crateId/remove', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.crate.remove);
	app.post('/api/v1/members/currency/:currencyId/crates/create', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.crate.create);

	//Collections (Editor End)
	app.get('/api/v1/members/currency/:currencyId/collections/:editorId/list', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.crate.listCollections);
	app.get('/api/v1/members/currency/:currencyId/collections/:collectionId/get', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.crate.getCollection);
	app.post('/api/v1/members/currency/:currencyId/collections/:collectionId/update', [keystone.middleware.api, keystone.middleware.cors, middleware.requireEditor], routes.api.v1.members.crate.updateCollection);
	app.get('/api/v1/members/currency/:currencyId/collections/:collectionId/remove', [keystone.middleware.api, keystone.middleware.cors, middleware.requireEditor], routes.api.v1.members.crate.removeCollection);
	app.post('/api/v1/members/currency/:currencyId/collections/create', [keystone.middleware.api, keystone.middleware.cors, middleware.requireEditor], routes.api.v1.members.crate.createCollection);


	//Track
	app.get('/api/v1/members/track/list/drafts', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.track.listDrafts);

	app.get('/api/v1/members/track/:id/get', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.track.get);
	app.post('/api/v1/members/track/createPreview', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.track.createPreview);
	app.post('/api/v1/members/track/updatePreview', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.track.updatePreview);
	app.post('/api/v1/members/track/:id/update', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.track.updatePreview);
	app.post('/api/v1/members/track/submit', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.track.submit);
	//Moved to currency app.post('/api/v1/members/track/download', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.track.download);

	//Video Tracks
	app.post('/api/v1/members/track/createVideoPreview', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.trackVideo.createPreview);
	app.post('/api/v1/members/track/updateVideoPreview', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.trackVideo.updatePreview);
	app.post('/api/v1/members/track/:id/updateVideoPreview', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.trackVideo.updatePreview);
	app.post('/api/v1/members/track/submitVideo', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.trackVideo.submit);


	app.get('/api/v1/members/track/:id/remove', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.track.remove);
	app.post('/api/v1/members/download/get', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.track.downloadTrack);

	//Charts

	//Account
	app.get('/api/v1/members/account/getCreditBalance/currency/:currencyId', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.account.getCreditBalance);
	app.post('/api/v1/members/account/create', [keystone.middleware.api, keystone.middleware.cors], routes.api.v1.members.account.create);
	app.post('/api/v1/members/account/create/editor', [keystone.middleware.api, keystone.middleware.cors], routes.api.v1.members.account.createEditor);
	app.post('/api/v1/members/account/login', [keystone.middleware.api, keystone.middleware.cors], routes.api.v1.members.account.signin);
	app.get('/api/v1/members/account/logout', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.account.signout);
	app.get('/api/v1/members/account/check', [keystone.middleware.api, keystone.middleware.cors], routes.api.v1.members.account.checkAuth);
	app.get('/api/v1/members/account/get', [keystone.middleware.api, keystone.middleware.cors], routes.api.v1.members.account.get);
	app.get('/api/v1/members/account/library/currency/:currencyId/list/:pageNumber?', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.account.library);
	app.post('/api/v1/members/account/update', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.account.update);
	app.post('/api/v1/members/account/activate', [keystone.middleware.api, keystone.middleware.cors], routes.api.v1.members.account.activate);

	app.get('/api/v1/members/account/downloadQueue/currency/:currencyId', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.account.getDownloadQueueForCurrency);
	app.post('/api/v1/members/account/downloadQueue/currency/:currencyId/add', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.account.addTrackToDownloadQueueForCurrency);
	app.post('/api/v1/members/account/downloadQueue/currency/:currencyId/remove', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.account.removeTrackFromDownloadQueueForCurrency);
	app.get('/api/v1/members/account/verifyEmail', [keystone.middleware.api, keystone.middleware.cors], routes.api.v1.members.account.verifyEmail);
	app.get('/api/v1/members/account/passwordResetRequest', [keystone.middleware.api, keystone.middleware.cors], routes.api.v1.members.account.passwordResetRequest);
	app.post('/api/v1/members/account/resetPassword', [keystone.middleware.api, keystone.middleware.cors], routes.api.v1.members.account.resetPassword);
	app.post('/api/v1/members/webhooks/receive', [keystone.middleware.api, keystone.middleware.cors], routes.api.v1.webhooks.paymentCaptureNotification);
	app.post('/api/v1/members/account/collections/add', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.account.addCollection);
	app.post('/api/v1/members/account/collections/remove', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.account.removeCollection);
	app.get('/api/v1/members/account/transactions/list', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.account.getTransactionHistory);

	//Editor Account Routes
	app.get('/api/v1/members/account/tracks/:currencyId/list/:pageNumber?', [keystone.middleware.api, keystone.middleware.cors, middleware.requireEditor], routes.api.v1.members.account.getUploadedTracks);

	//v1 Authentication
	app.get('/api/v1/members/account/get-authentication-token',[keystone.middleware.api, keystone.middleware.cors], routes.api.v1.members.account.getAuthenticationToken);
	app.post('/api/v1/members/account/authenticate', [keystone.middleware.api, keystone.middleware.cors], routes.api.v1.members.account.authenticate )

	//Collections
	//app.get('/api/v1/members/collections/list', keystone.middleware.api, routes.api.v1.members.currency.list);

	//Artist
	app.get('/api/v1/members/artists/list', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.artists.list);

	//Playlists
//	app.get('/api/v1/members/:memberId/playlists/list', keystone.middleware.api, routes.api.v1.members.playlists.list);

	//Editors
	app.get('/api/v1/members/editors/:editorId/get', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.editors.get);

  //Gig Types
	app.get('/api/v1/members/gigtypes/list', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.gigtypes.list);

  //Original Works
	app.get('/api/v1/members/originalworks/list', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.originalWorks.list);
	app.post('/api/v1/members/originalworks/remove', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.originalWorks.remove);


	//Releases
	app.get('/api/v1/members/releases/list/:status?', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.releases.list);
	app.get('/api/v1/members/releases/:releaseId/tracks', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.releases.listTracks);
	app.post('/api/v1/members/releases/publish', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.releases.publish);
	app.post('/api/v1/members/releases/:releaseId/update', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.releases.update);
	app.post('/api/v1/members/releases/check', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.releases.check);
	app.post('/api/v1/members/releases/create', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.releases.create);
	app.get('/api/v1/members/releases/:releaseId/remove', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.releases.remove);
	app.get('/api/v1/members/releases/:releaseId/get', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.releases.get);


	//Publishing Tracks and Releases
	app.post('/api/v1/members/publish', [keystone.middleware.api, keystone.middleware.cors, middleware.requireUser], routes.api.v1.members.publish.publishTracksAndReleases);

	// Views

	//Migration
	app.get('/migration/tracks-releases', [keystone.middleware.api, keystone.middleware.cors, middleware.requireAdmin], routes.migration.tracksAndReleases);
	app.get('/migration/users', [keystone.middleware.api, keystone.middleware.cors, middleware.requireAdmin], routes.migration.users);

	// NOTE: To protect a route so that only admins can see it, use the requireUser middleware:
	// app.get('/protected', middleware.requireUser, routes.views.protected);

};
