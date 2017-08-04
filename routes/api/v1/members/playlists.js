var async = require('async'),
	keystone = require('keystone');

var Playlist = keystone.list('Playlist');
var Track = keystone.list('Track');

/**
 * List Playlists
 */
exports.list = function(req, res) {
  var memberId = req.params.memberId;
	Playlist.model.find().where('user',memberId).exec(function(err, items) {

		if (err) return res.apiError('database error', err);

		res.apiResponse({
			Playlists: items
		});

	});
}

/**
 * Get Playlist by ID
 */
exports.get = function(req, res) {
	Playlist.model.findById(req.params.PlaylistId).populate('editors','name').exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		res.apiResponse({
			Playlist: item
		});

	});
}


/**
 * Create a Playlist
 */
exports.create = function(req, res) {

	var item = new Playlist.model(),
		data = (req.method == 'Playlist') ? req.body : req.query;

	item.getUpdateHandler(req).process(data, function(err) {

		if (err) return res.apiError('error', err);

		res.apiResponse({
			Playlist: item
		});

	});
}

/**
 * Get Playlist by ID
 */
exports.update = function(req, res) {
	Playlist.model.findById(req.params.id).exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		var data = (req.method == 'Playlist') ? req.body : req.query;

		item.getUpdateHandler(req).process(data, function(err) {

			if (err) return res.apiError('create error', err);

			res.apiResponse({
				Playlist: item
			});

		});

	});
}

/**
 * Delete Playlist by ID
 */
exports.remove = function(req, res) {
	Playlist.model.findById(req.params.id).exec(function (err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		item.remove(function (err) {
			if (err) return res.apiError('database error', err);

			return res.apiResponse({
				success: true
			});
		});

	});
}
