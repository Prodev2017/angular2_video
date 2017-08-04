var async = require('async'),
	keystone = require('keystone');

var OriginalWorks = keystone.list('OriginalWorks');

/**
 * List Keys
 */
exports.list = function(req, res) {

	async.waterfall([getOriginalWorks],sendList);

	function getOriginalWorks(callback) {

		var query = OriginalWorks.paginate({

      page: 1,
      perPage: 3,

    });

    if(req.query) {
console.log(req.query);
      var decodedQuery = {
				name: decodeURIComponent(req.query.name).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'),
				version: decodeURIComponent(req.query.version).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'),
				artists: decodeURIComponent(req.query.artists).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'),
				artistsFeatured: decodeURIComponent(req.query.artistsFeatured).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
			};

			console.log(decodedQuery);

      query.find({$and: [
				{name: new RegExp(decodedQuery.name, "i")},
				{version: new RegExp(decodedQuery.version, "i")},
				{artistsDisplayName: new RegExp(decodedQuery.artists, "i")},
				{artistsFeaturedDisplayName: new RegExp(decodedQuery.artistsFeatured, "i")}
			]

			});

    }
    query.sort('name');
		query.populate('artists artistsFeatured')

    query.exec(function(err, items) {

      if (err) return res.apiError('database error', err);
        callback(err,items);
    	});

	}


	function sendList(err, list) {
		console.log(list);
		res.apiResponse({
			OriginalWorks: list
		});
	}

}

/**
 * Get Key by ID
 */
exports.get = function(req, res) {
	OriginalWorks.model.findById(req.params.KeyId).populate('editors','name').exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		res.apiResponse({
			OriginalWorks: item
		});

	});
}


/**
 * Create a Key
 */
exports.create = function(req, res) {

	var item = new OriginalWorks.model(),
		data = (req.method == 'OriginalWorks') ? req.body : req.query;

	item.getUpdateHandler(req).process(data, function(err) {

		if (err) return res.apiError('error', err);

		res.apiResponse({
			OriginalWorks: item
		});

	});
}

/**
 * Get Key by ID
 */
exports.update = function(req, res) {
	OriginalWorks.model.findById(req.params.id).exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		var data = (req.method == 'OriginalWorks') ? req.body : req.query;

		item.getUpdateHandler(req).process(data, function(err) {

			if (err) return res.apiError('create error', err);

			res.apiResponse({
				OriginalWorks: item
			});

		});

	});
}

/**
 * Delete Key by ID
 */
exports.remove = function(req, res) {

  if(req.body.trackId) {
    	OriginalWorks.model.findOne({sourceTrack: req.body.trackId}).exec(function (err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		item.remove(function (err) {
			if (err) return res.apiError('database error', err);

			return res.apiResponse({
				success: true
			});
		});

	});
  } else {
    	return res.apiResponse({
				success: false
			});
  }

}
