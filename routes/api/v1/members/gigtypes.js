var async = require('async'),
	keystone = require('keystone');

var GigType = keystone.list('GigType');

/**
 * List Keys
 */
exports.list = function(req, res) {
	GigType.model.find().sort({name: 1}).exec(function(err, items) {

		if (err) return res.apiError('database error', err);
		var flags = [], distinct = [], l = items.length, i;
for( i=0; i<l; i++) {
    if( flags[items[i].name]) continue;
    flags[items[i].name] = true;
    distinct.push(items[i].name);
}
		res.apiResponse({
			GigTypes: items,
			DistinctGigTypes: distinct
		});

	});
}

/**
 * Get Key by ID
 */
exports.get = function(req, res) {
	GigType.model.findById(req.params.KeyId).populate('editors','name').exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		res.apiResponse({
			GigType: item
		});

	});
}


/**
 * Create a Key
 */
exports.create = function(req, res) {

	var item = new GigType.model(),
		data = (req.method == 'GigType') ? req.body : req.query;

	item.getUpdateHandler(req).process(data, function(err) {

		if (err) return res.apiError('error', err);

		res.apiResponse({
			GigType: item
		});

	});
}

/**
 * Get Key by ID
 */
exports.update = function(req, res) {
	GigType.model.findById(req.params.id).exec(function(err, item) {

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
