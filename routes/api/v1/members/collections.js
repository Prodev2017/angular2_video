var async = require('async'),
	keystone = require('keystone');

var Collection = keystone.list('Collection');
var Track = keystone.list('Track');

/**
 * List Collections
 */
exports.list = function(req, res) {
	Collection.model.find(function(err, items) {

		if (err) return res.apiError('database error', err);

		res.apiResponse({
			Currencies: items
		});

	});
}

exports.tracks = function(req, res) {
	var CollectionId = req.params.CollectionId;
	var currentPage = req.params.pageNumber;
	Track.paginate({
		page: currentPage || 1,
		perPage: 50
	}).where('Collection',CollectionId).where('enabled', 1).populate('inKey mainGenre subGenreA subGenreB tier loopLength tags originalWorks gigType assignedCollections ').populate('editor','name').exec(function(err, items) {

		if (err) return res.apiError('database error', err);

		res.apiResponse({
			Tracks: items
		});

	});
}



/**
 * Get Collection by ID
 */
exports.get = function(req, res) {
	Collection.model.findById(req.params.CollectionId).populate('editors','name').exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		res.apiResponse({
			Collection: item
		});

	});
}


/**
 * Create a Collection
 */
exports.create = function(req, res) {

	var item = new Collection.model(),
		data = (req.method == 'Collection') ? req.body : req.query;

	item.getUpdateHandler(req).process(data, function(err) {

		if (err) return res.apiError('error', err);

		res.apiResponse({
			Collection: item
		});

	});
}

/**
 * Get Collection by ID
 */
exports.update = function(req, res) {
	Collection.model.findById(req.params.id).exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		var data = (req.method == 'Collection') ? req.body : req.query;

		item.getUpdateHandler(req).process(data, function(err) {

			if (err) return res.apiError('create error', err);

			res.apiResponse({
				Collection: item
			});

		});

	});
}

/**
 * Delete Collection by ID
 */
exports.remove = function(req, res) {
	Collection.model.findById(req.params.id).exec(function (err, item) {

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
