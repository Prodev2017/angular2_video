var async = require('async'),
	keystone = require('keystone');

var Key = keystone.list('Key');

/**
 * List Keys
 */
exports.list = function(req, res) {
	Key.model.find().sort({musicKey: 1}).exec(function(err, items) {

		if (err) return res.apiError('database error', err);

		res.apiResponse({
			Keys: items
		});

	});
}

/**
 * Get Key by ID
 */
exports.get = function(req, res) {
	Key.model.findById(req.params.KeyId).populate('editors','name').exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		res.apiResponse({
			Key: item
		});

	});
}


/**
 * Create a Key
 */
exports.create = function(req, res) {

	var item = new Key.model(),
		data = (req.method == 'Key') ? req.body : req.query;

	item.getUpdateHandler(req).process(data, function(err) {

		if (err) return res.apiError('error', err);

		res.apiResponse({
			Key: item
		});

	});
}

/**
 * Get Key by ID
 */
exports.update = function(req, res) {
	Key.model.findById(req.params.id).exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		var data = (req.method == 'Key') ? req.body : req.query;

		item.getUpdateHandler(req).process(data, function(err) {

			if (err) return res.apiError('create error', err);

			res.apiResponse({
				Key: item
			});

		});

	});
}

/**
 * Delete Key by ID
 */
exports.remove = function(req, res) {
	Key.model.findById(req.params.id).exec(function (err, item) {

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
