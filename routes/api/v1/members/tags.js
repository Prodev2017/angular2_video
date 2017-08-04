var async = require('async'),
	keystone = require('keystone');

var Tag = keystone.list('Tag');

/**
 * List Keys
 */
exports.list = function(req, res) {
	Tag.model.find().sort('name').exec(function(err, items) {

		if (err) return res.apiError('database error', err);

		res.apiResponse({
			Tags: items
		});

	});
}

/**
 * Get Key by ID
 */
exports.get = function(req, res) {
	Tag.model.findById(req.params.KeyId).populate('editors','name').exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		res.apiResponse({
			Tag: item
		});

	});
}


/**
 * Create a Key
 */
exports.create = function(req, res) {

	var item = new Tag.model(),
		data = (req.method == 'Tag') ? req.body : req.query;

	item.getUpdateHandler(req).process(data, function(err) {

		if (err) return res.apiError('error', err);

		res.apiResponse({
			Tag: item
		});

	});
}

/**
 * Get Key by ID
 */
exports.update = function(req, res) {
	Tag.model.findById(req.params.id).exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		var data = (req.method == 'Tag') ? req.body : req.query;

		item.getUpdateHandler(req).process(data, function(err) {

			if (err) return res.apiError('create error', err);

			res.apiResponse({
				Tag: item
			});

		});

	});
}

/**
 * Delete Key by ID
 */
exports.remove = function(req, res) {
	Tag.model.findById(req.params.id).exec(function (err, item) {

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
