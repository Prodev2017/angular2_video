var async = require('async'),
	keystone = require('keystone'),
	Track = keystone.list('Track'),
	ObjectId = keystone.mongoose.Types.ObjectId,
	_ = require('lodash');

var Crate = keystone.list('Crate');

/**
 * List Crates
 */
exports.list = function(req, res) {
	Crate.model.find({
		user: {
			$and: [{
				$eq: req.user._id
			}, {
				$ne: undefined
			}]
		},
		type: 'crate',
		softDelete: false
	}).exec(function(err, items) {

		if (err) return res.apiError('database error', err);

		res.apiResponse({
			Currencies: items
		});

	});
}

/**
 * Get Crate by ID
 */
exports.get = function(req, res) {
	Crate.model.findOne({
		user: req.user._id,
		_id: req.params.crateId
	}).exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		res.apiResponse({
			Crate: item
		});

	});
}


/**
 * Create a Crate
 */
exports.create = function(req, res) {

	var item = new Crate.model(),
		data = req.body;

	item.set(data);
	item.set({
		user: req.user.id
	});
	item.set({
		type: 'crate'
	});
	item.set({
		currency: req.params.currencyId
	});

	item.save(function(err) {

		if (err) return res.apiError('error', err);

		res.apiResponse({
			Crate: item
		});

	});
}

/**
 * Get Crate by ID
 */
exports.update = function(req, res) {

	Crate.model.findOne({
		user: req.user._id,
		_id: req.params.crateId,
		softDelete: false
	}).exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		var data = req.body;

		item.set(Object.assign(item, data));

		item.save(function(err) {

			if (err) return res.apiError('update error', err);

			res.apiResponse({
				Crate: item
			});

		});

	});
}

/**
 * Delete Crate by ID
 */
exports.remove = function(req, res) {

	Crate.model.findOne({
		user: req.user._id,
		_id: req.params.crateId
	}).exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		item.remove(function(err) {
			if (err) return res.apiError('database error', err);

			return res.apiResponse({
				success: true
			});
		});

	});
}

exports.listCollections = function(req, res) {

	var editorId = req.params.editorId;
	var currencyId = req.params.currencyId;

	Crate.model.find({
		currency: req.params.currencyId,
		editorOwner: editorId,
		type: 'collection',
		softDelete: {$ne: true }
	}).exec(function(err, collections) {

		if (err) {
			return res.apiError(err, err);
		}

		return res.apiResponse({
			Collections: collections
		});

	});

}

exports.createCollection = function(req, res) {

	var item = new Crate.model(),
		data = req.body;

	item.set(data);

	item.set({
		editorOwner: req.user._id
	});

	item.set({
		currency: req.params.currencyId
	});

	item.set({
		type: 'collection'
	});

	item.save(function(err) {

		if (err) return res.apiError('error', err);
		item.populate({		path: 'tracks',
		model: 'Track',
		populate: [{
			path: 'genres',
			model: 'Genre'
		}, {
			path: 'versionType',
			model: 'Tag'
		}, {
			path: 'introType',
			model: 'Tag'
		}, {
			path: 'outroType',
			model: 'Tag'
		}, {
			path: 'cleanDirty',
			model: 'Tag'
		}, {
			path: 'releases',
			model: 'Release',
		}, {
			path: 'originalWorks',
			model: 'OriginalWorks',
		}, {
			path: 'inKey',
			model: 'Key'
		}]}, function(err, item) {

			if (err) return res.apiError('database error', err);

			return res.apiResponse({

				Collection: item

			});
		})


	});
}

exports.updateCollection = function(req, res) {

	Crate.model.findOne({
		editorOwner: req.user._id,
		_id: req.params.collectionId,
		type: 'collection',
		softDelete: false
	}).exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		var data = req.body;

		item.set({
			name: data.name
		});

		item.set({
			description: data.description
		});

		var trackList = _.uniqBy(data.tracks, (e) => {
			return e;
		});

		item.set({
			tracks: trackList
		});

		item.save(function(err) {

			if (err) return res.apiError('update error', err);

			res.apiResponse({
				Collection: item
			});

		});

	});
}

exports.removeCollection = function(req, res) {

	Crate.model.findOne({
		editorOwner: req.user._id,
		_id: req.params.collectionId,
		type: 'collection'
	}).exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		item.set({
			softDelete: true
		});

		item.save(function(err) {
			if (err) return res.apiError('database error', err);

			return res.apiResponse({
				success: true
			});
		});

	});
}

exports.getCollection = function(req, res) {
	Crate.model.findOne({
		type: 'collection',
		currency: req.params.currencyId,
		_id: req.params.collectionId
	}).populate([{
		path: 'tracks',
		model: 'Track',
		populate: [{
			path: 'genres',
			model: 'Genre'
		}, {
			path: 'versionType',
			model: 'Tag'
		}, {
			path: 'introType',
			model: 'Tag'
		}, {
			path: 'outroType',
			model: 'Tag'
		}, {
			path: 'cleanDirty',
			model: 'Tag'
		}, {
			path: 'releases',
			model: 'Release',
		}, {
			path: 'originalWorks',
			model: 'OriginalWorks',
		}, {
			path: 'inKey',
			model: 'Key'
		}]
	}]).exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		async.mapSeries(item.tracks, function(track, callback) {

			if (track.releases && track.releases.length > 0) {

				Track.model.find({
					releases: {
						$in: track.releases
					}
				}).exec(function(err, relatedTracks) {

					var revisedTrack = track.toObject();

					revisedTrack.tracksInSameReleases = relatedTracks;

					callback(null, revisedTrack);

				});

			}
			else {

				callback(null, track);

			}


		}, function(err, updatedTracksWithReleasesRelatedTracks) {

			var revisedCollection = item.toObject();
			revisedCollection.tracks = updatedTracksWithReleasesRelatedTracks;
			return res.apiResponse({
				Collection: revisedCollection
			})

		});


	});
}