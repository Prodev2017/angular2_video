var async = require('async'),
	keystone = require('keystone'),
	_ = require('lodash');

var Genre = keystone.list('Genre');

/**
 * List Genres
 */
exports.list = function(req, res) {
	Genre.model.find().sort('name').exec(function(err, genres) {

			res.apiResponse({
				Genres: genres
			});

	});
}

/**
 * Get Genre by ID
 */
exports.get = function(req, res) {
	Genre.model.findById(req.params.GenreId).populate('editors','name').exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		res.apiResponse({
			Genre: item
		});

	});
}


/**
 * Create a Genre
 */
exports.create = function(req, res) {

	var item = new Genre.model(),
		data = (req.method == 'Genre') ? req.body : req.query;

	item.getUpdateHandler(req).process(data, function(err) {

		if (err) return res.apiError('error', err);

		res.apiResponse({
			Genre: item
		});

	});
}

/**
 * Get Genre by ID
 */
exports.update = function(req, res) {
	Genre.model.findById(req.params.id).exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		var data = (req.method == 'Genre') ? req.body : req.query;

		item.getUpdateHandler(req).process(data, function(err) {

			if (err) return res.apiError('create error', err);

			res.apiResponse({
				Genre: item
			});

		});

	});
}

/**
 * Delete Genre by ID
 */
exports.remove = function(req, res) {
	Genre.model.findById(req.params.id).exec(function (err, item) {

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
