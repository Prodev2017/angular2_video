var async = require('async'),
	keystone = require('keystone'),
	_ = require('lodash');

var Artist = keystone.list('Artist');

/**
 * List Artists
 */
exports.list = function(req, res) {
	Artist.model.find().where('parentArtist',null).sort('name').exec(function(err, artists) {
			if (err) return res.apiError('database error', err);
			res.apiResponse({
				Artists: artists
			});

	});
}

/**
 * Get Artist by ID
 */
exports.get = function(req, res) {
	Artist.model.findById(req.params.ArtistId).populate('editors','name').exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		res.apiResponse({
			Artist: item
		});

	});
}


/**
 * Create a Artist
 */
exports.create = function(req, res) {

	var item = new Artist.model(),
		data = (req.method == 'Artist') ? req.body : req.query;

	item.getUpdateHandler(req).process(data, function(err) {

		if (err) return res.apiError('error', err);

		res.apiResponse({
			Artist: item
		});

	});
}

/**
 * Get Artist by ID
 */
exports.update = function(req, res) {
	Artist.model.findById(req.params.id).exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		var data = (req.method == 'Artist') ? req.body : req.query;

		item.getUpdateHandler(req).process(data, function(err) {

			if (err) return res.apiError('create error', err);

			res.apiResponse({
				Artist: item
			});

		});

	});
}

/**
 * Delete Artist by ID
 */
exports.remove = function(req, res) {
	Artist.model.findById(req.params.id).exec(function (err, item) {

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
