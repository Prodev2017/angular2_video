var async = require('async'),
	keystone = require('keystone'),
	ObjectId = keystone.mongoose.Types.ObjectId,
	ISODate = keystone.mongoose.Types.Date;

var Currency = keystone.list('Currency');
var Track = keystone.list('Track');
var Collection = keystone.list('Collection');
var Crate = keystone.list('Crate');
var Chart = keystone.list('Chart');
var User = keystone.list('User');
var account = require('./account');
var AccountingPeriod = keystone.list('AccountingPeriod');
var Transactions = keystone.list('Transaction');
var Downloads = keystone.list('Downloads');
var Package = keystone.list('Package');
var moment = require('moment');
var utilities = require('../../../utilities');
var paypal = require('paypal-rest-sdk');
paypal.configure({

	'mode': keystone.get('paypal env'), //sandbox or live
	'client_id': keystone.get('paypal client id'),
	'client_secret': keystone.get('paypal client secret')

});

/**
 * List Currencys
 */

exports.list = function(req, res) {

	Currency.model.find().sort('sortOrder').exec(function(err, items) {

		if (err) return res.apiError('database error', err);
		if (req.user && req.user._id) {
			var user = req.user;

			async.map(
				items,
				function(item, eachCallback) {

					item = item.toObject();

					utilities.getCurrencyCreditBalanceAndPurchasedTracks(item, user, eachCallback);

				},
				function(err, results) {
					res.apiResponse({
						Currencies: results
					});

				})

		}
		else {
			res.apiResponse({
				Currencies: items
			});

		}


	});
}

exports.editors = function(req, res) {
	var currencyId = req.params.currencyId;

	User.model.find({
		userRole: 'editor',
		currencies: currencyId,
		enabled: true
	}).select('stageName').sort({
		stageName: 1
	}).exec(function(err, items) {

		if (err) return res.apiError(err);

		return res.apiResponse({
			CurrencyEditors: items
		});

	});

}

exports.tracks = function(req, res) {

	var currencyId = req.params.currencyId;
	var currentPage = req.params.pageNumber;
	var rowsPerPage = req.query.rows;

	//console.log(query);

	var query = Track.paginate({
		page: currentPage || 1,
		perPage: rowsPerPage,
	});
	query.populate('inKey genres tier loopLength versionType outroType introType cleanDirty originalWorks gigTypes assignedCollections');
	query.select('-hiBitRateFile -publishedHiBitRateFile -lowBitRateFile');
	query.where('currency', currencyId);
	query.where('enabled', true);

	if (req.query.genres) {
		query.where('genres').in(req.query.genres);
	}

	if (req.query.keys) {
		query.where('inKey').in(req.query.keys);
	}

	if (req.query.editors) {
		query.where('editor').in(req.query.editors);
	}

	if (req.query.tags) {
		query.or([{
			cleanDirty: {
				$in: req.query.tags.map((item) => {
					return new ObjectId(item)
				})
			}
		}, {
			versionType: {
				$in: req.query.tags.map((item) => {
					return new ObjectId(item)
				})
			}
		}, {
			introType: {
				$in: req.query.tags.map((item) => {
					return new ObjectId(item)
				})
			}
		}, {
			outroType: {
				$in: req.query.tags.map((item) => {
					return new ObjectId(item)
				})
			}
		}]);

	}

	if (req.query.collections) {
		query.where('assignedCollections').in(req.query.collections);
	}

	if (req.query.sortField) {

		var sortClause = (req.query.sortOrder == -1) ? '-' + req.query.sortField : req.query.sortField;
		query.sort(sortClause);

	}

	if (req.query.startBpm && req.query.endBpm) {
		query.where('startBpm').lte(req.query.endBpm).gte(req.query.startBpm);
	}

	if (req.query.startBpm && !req.query.endBpm) {
		query.where('startBpm').gte(req.query.startBpm);
	}

	if (!req.query.startBpm && req.query.endBpm) {
		query.where('startBpm').lte(req.query.endBpm);
	}

	if (req.query.minYear && req.query.maxYear) {
		query.where('releaseYear').lte(req.query.maxYear).gte(req.query.minYear);
	}

	if (req.query.minYear && !req.query.maxYear) {
		query.where('releaseYear').gte(req.query.minYear);
	}

	if (!req.query.minYear && req.query.maxYear) {
		query.where('releaseYear').lte(req.query.maxYear);
	}

	if (req.query.artistName) {

		var artistNameArray = req.query.artistName.split(',').map((artistName) => {

			return new RegExp(artistName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");

		});

		query.or([{
			artistPrimaryName: {
				$in: artistNameArray
			}
		}, {
			artistsFeaturedDisplayName: {
				$in: artistNameArray
			}
		}]);

	}

	if (req.query.trackName) {

		var trackNameArray = req.query.trackName.split(',').map((trackName) => {

			return new RegExp(trackName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");

		});

		query.where('formattedName').in(trackNameArray);

	}


	if (req.query.release) {
		query.where('release', req.query.release);
	}

	if (req.query.sortBy) {
		query.sort(req.query.sortBy);
	}

	if (req.query.autocompleteQuery) {
		var decodedQuery = decodeURIComponent(req.query.autocompleteQuery).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		query.find({
			$or: [{
				name: new RegExp(decodedQuery, "i")
			}, {
				artistPrimaryName: new RegExp(decodedQuery, "i")
			}, {
				editorPrimaryName: new RegExp(decodedQuery, "i")
			}]
		});
	}

	query.exec(function(err, items) {
		if (err) return res.apiError('database error', err);

		async.mapSeries(items.results, function(item, callback) {
			if (err) return res.apiError('database error', err);
			if (item.releases && item.releases.length > 0) {

				Track.model.find({
					$and: [{
						_id: {
							$ne: item._id
						}
					}, {
						releases: {
							$in: item.releases
						}
					}]
				}).exec(function(err, affiliatedTracks) {
					if (err) return res.apiError('database error', err);

					if (affiliatedTracks && affiliatedTracks.length > 0) {
						var transformedItem = item.toObject()
						transformedItem.tracksInSameReleases = affiliatedTracks;

						callback(null, transformedItem);
					}
					else {

						callback(null, item);

					}

				});


			}
			else {

				callback(null, item);

			}

		}, function(err, results) {
			if (err) return res.apiError('database error', err);
			items.results = results;
			res.apiResponse({
				Tracks: items
			});

		});



	});

}



exports.crates = function(req, res) {

	var memberId = req.query.memberId;
	var currencyId = req.params.currencyId;
	/* .where('user',memberId) will be needed when we get to this point */
	Crate.model.find({
		currency: currencyId,
		user: req.user._id,
		type: 'crate',
		softDelete: false
	}).exec(function(err, items) {

		if (err) return res.apiError('database error', err);

		items = items || [];

		User.model.findById(req.user._id).select('collections').populate({
			path: 'collections',
			populate: {
				path: 'editorOwner',
				select: 'stageName'
			}
		}).exec(function(err, user) {

			items = items.concat(user.collections.filter((item) => {
				return !item.softDelete && item.currency == currencyId;
			}));

			res.apiResponse({

				Crates: items

			});

		});


	});
}

exports.charts = function(req, res) {
	var currencyId = req.params.currencyId;
	/* .where('user',memberId) will be needed when we get to this point */
	Chart.model.find({
		currency: currencyId
	}).populate({
		path: 'editor',
		select: 'stageName'
	}).exec(function(err, items) {

		if (err) return res.apiError('database error', err);
		if (items) {



			return res.apiResponse({
				Charts: items
			});

		}
		else {
			return res.apiResponse({
				Charts: []
			});

		}


	});
}


exports.collections = function(req, res) {

	var currencyId = req.params.currencyId;

	Crate.model.aggregate([{
		$match: {
			type: 'collection',
			currency: new ObjectId(currencyId),
			softDelete: {$ne: true}
		}
	}, {
		$lookup: {

			from: 'users',
			localField: '_id',
			foreignField: 'collections',
			as: 'followers'

		}
	}, {
		$project: {
			_id: 1,
			name: 1,
			editorOwner: 1,
			type: 1,
			description: 1,
			currency: 1,
			updatedAt: 1,
			followers: {
				$size: '$followers'
			}
		}
	}, {
		$sort: {
			followers: -1
		}
	}]).exec(function(err, collections) {
		if (err) return res.apiError('error getting collections', err);

		Crate.model.populate(collections, {
			path: 'editorOwner',
			select: 'stageName'
		}, function(err, collections) {
			if (err) return res.apiError('error getting collections', err);

			return res.apiResponse({
				Collections: collections
			});
		});


	})

}

exports.getTopTracksList = function(req, res) {

	var currencyId = req.params.currencyId;
	var currentPage = 1;
	var rowsPerPage = 25;
	var sortCriteria = {};

	var AllTimeTopTracksChart = keystone.list('AllTimeTopTracksChart');

	AllTimeTopTracksChart.model.find({currency: currencyId}).populate({
		path: 'track',
		populate: {path: 'artist releases artistsFeatured inKey genres tier loopLength versionType outroType introType cleanDirty originalWorks gigTypes' }
	}).sort({lastMonthRanking: 1}).exec(function(err, populatedTrackResults) {

		async.mapSeries(populatedTrackResults, function(item, callback) {
			if (err) return res.apiError('database error', err);
			delete item.downloadCountForPeriod;
			if(item.editor.name) { delete item.editor.name; }

			if (item.releases && item.releases.length > 0) {

				Track.model.find({
					$and: [{
						_id: {
							$ne: item._id
						}
					}, {
						releases: {
							$in: item.releases
						}
					}]
				}).select('-hiBitRateFile -publishedHiBitRateFile -lowBitRateFile -downloadCount').exec(function(err, affiliatedTracks) {
					if (err) return res.apiError('database error', err);

					if (affiliatedTracks && affiliatedTracks.length > 0) {
						var transformedItem = item;
						transformedItem.tracksInSameReleases = affiliatedTracks;

						return callback(null, transformedItem);
					}
					else {

						return callback(null, item);

					}

				});


			}
			else {

				return callback(null, item);

			}

		}, function(err, results) {
			if (err) return res.apiError('database error', err);
			if(populatedTrackResults && populatedTrackResults.length > 0) {
				
				populatedTrackResults = populatedTrackResults.map( (item) => {
				
					return item.track;
					
				});
				
			}
			return res.apiResponse({
				Collection: {
					currentPage: currentPage,
					total: 25,
					totalPages: 1,
					tracks: populatedTrackResults
				}
			});

		});





	});



}

exports.getTopTracksCurrentMonthList = function(req, res) {

	var currencyId = req.params.currencyId;
	var currentPage = 1;
	var rowsPerPage = 25;
	var sortCriteria = {};

	var CurrentMonthTopTracksChart = keystone.list('CurrentMonthTopTracksChart');

	CurrentMonthTopTracksChart.model.find({currency: currencyId}).populate({
		path: 'track',
		populate: {path: 'artist releases artistsFeatured inKey genres tier loopLength versionType outroType introType cleanDirty originalWorks gigTypes' }
	}).sort({lastMonthRanking: 1}).exec(function(err, populatedTrackResults) {

		async.mapSeries(populatedTrackResults, function(item, callback) {
			if (err) return res.apiError('database error', err);
			delete item.downloadCountForPeriod;
			if(item.editor.name) { delete item.editor.name; }

			if (item.releases && item.releases.length > 0) {

				Track.model.find({
					$and: [{
						_id: {
							$ne: item._id
						}
					}, {
						releases: {
							$in: item.releases
						}
					}]
				}).select('-hiBitRateFile -publishedHiBitRateFile -lowBitRateFile -downloadCount').exec(function(err, affiliatedTracks) {
					if (err) return res.apiError('database error', err);

					if (affiliatedTracks && affiliatedTracks.length > 0) {
						var transformedItem = item;
						transformedItem.tracksInSameReleases = affiliatedTracks;

						return callback(null, transformedItem);
					}
					else {

						return callback(null, item);

					}

				});


			}
			else {

				return callback(null, item);

			}

		}, function(err, results) {
			if (err) return res.apiError('database error', err);
			if(populatedTrackResults && populatedTrackResults.length > 0) {
				
				populatedTrackResults = populatedTrackResults.map( (item) => {
				
					return item.track;
					
				});
				
			}
			return res.apiResponse({
				Collection: {
					currentPage: currentPage,
					total: 25,
					totalPages: 1,
					tracks: populatedTrackResults
				}
			});

		});





	});


}

exports.getTopTracksLastMonthList = function(req, res) {

	var currencyId = req.params.currencyId;
	var currentPage = 1;
	var rowsPerPage = 25;
	var sortCriteria = {};

	var LastMonthTopTracksChart = keystone.list('LastMonthTopTracksChart');

	LastMonthTopTracksChart.model.find({currency: currencyId}).populate({
		path: 'track',
		populate: {path: 'artist releases artistsFeatured inKey genres tier loopLength versionType outroType introType cleanDirty originalWorks gigTypes' }
	}).sort({lastMonthRanking: 1}).exec(function(err, populatedTrackResults) {

		async.mapSeries(populatedTrackResults, function(item, callback) {
			if (err) return res.apiError('database error', err);
			delete item.downloadCountForPeriod;
			if(item.editor.name) { delete item.editor.name; }
			if (item.releases && item.releases.length > 0) {

				Track.model.find({
					$and: [{
						_id: {
							$ne: item._id
						}
					}, {
						releases: {
							$in: item.releases
						}
					}]
				}).select('-hiBitRateFile -publishedHiBitRateFile -lowBitRateFile -downloadCount').exec(function(err, affiliatedTracks) {
					if (err) return res.apiError('database error', err);

					if (affiliatedTracks && affiliatedTracks.length > 0) {
						var transformedItem = item;
						transformedItem.tracksInSameReleases = affiliatedTracks;

						return callback(null, transformedItem);
					}
					else {

						return callback(null, item);

					}

				});


			}
			else {

				return callback(null, item);

			}

		}, function(err, results) {
			if (err) return res.apiError('database error', err);
			if(populatedTrackResults && populatedTrackResults.length > 0) {
				
				populatedTrackResults = populatedTrackResults.map( (item) => {
				
					return item.track;
					
				});
				
			}
			return res.apiResponse({
				Collection: {
					currentPage: currentPage,
					total: 25,
					totalPages: 1,
					tracks: populatedTrackResults
				}
			});

		});





	});



}


exports.packageList = function(req, res) {

	Transactions.model.count({
		user: req.user._id,
		basis: 'recurring',
		endTime: {
			$gt: new Date()
		}
	}).exec(function(err, transactionsCount) {

		var query;

		if (transactionsCount > 0) {

			query = {
				enabled: true,
				basis: 'one-time'
			};

		}
		else {

			query = {
				enabled: true
			};

		}

		Package.model.find(query).populate('packageItems').exec(function(err, items) {

			if (err) return res.apiError('database error', err);

			res.apiResponse({
				Packages: items
			});

		});

	});



}

exports.createPayment = function(req, res) {

	var paypal = require('paypal-rest-sdk');
	var packageId = req.params.packageId;

	Package.model.findById(packageId).exec(function(err, selectedPackage) {


		if (selectedPackage.basis == 'one-time') {


			var create_payment_json = {
				"intent": "sale",
				"payer": {
					"payment_method": "paypal"
				},
				"redirect_urls": {
					"return_url": "http://return.url",
					"cancel_url": "http://cancel.url"
				},
				"transactions": [{
					"item_list": {
						"items": [{
							"name": selectedPackage.name,
							"sku": "item",
							"price": selectedPackage.price,
							"currency": "USD",
							"quantity": 1
						}]
					},
					"amount": {
						"currency": "USD",
						"total": selectedPackage.price
					},
					"description": selectedPackage.name
				}]
			};

			paypal.payment.create(create_payment_json, function(error, payment) {
				if (error) {
					return res.apiError('paypal payment error created one time', error);

				}
				else {
					console.log("Create Payment Response");
					console.log(payment);
					return res.apiResponse(payment);
				}
			});
		}

		if (selectedPackage.basis == 'recurring') {


			var billingPlan = selectedPackage.payPalBillingPlanId;
			var billingAgreementAttributes;

			var isoDate = moment().add(selectedPackage.term, 'days').startOf('day').toISOString();

			billingAgreementAttributes = {
				name: selectedPackage.name,
				description: selectedPackage.description,
				start_date: isoDate,
				plan: {
					id: billingPlan
				},
				payer: {
					payment_method: 'paypal'
				}
			};

			var links = {};


			// Use activated billing plan to create agreement
			paypal.billingAgreement.create(billingAgreementAttributes, function(error, billingAgreement) {
				if (error) {
					return res.apiError('paypal payment error created on recurring', error);
				}
				else {

					billingAgreement.links.forEach(function(linkObj) {
						links[linkObj.rel] = {
							href: linkObj.href,
							method: linkObj.method
						};
					});

					var linkWithToken = links['approval_url'].href;
					var linkWithTokenQueryParams = linkWithToken.split('?');
					var queryParams = linkWithTokenQueryParams[1];
					var queryParamsArray = queryParams.split('&');
					var queryParamsKeyValue = [];
					queryParamsArray.forEach(function(param, index) {
						var splitParam = param.split('=');
						var keyName = splitParam[0];
						var value = splitParam[1];

						queryParamsKeyValue[keyName] = value;

					});

					billingAgreement.id = queryParamsKeyValue['token'];

					return res.apiResponse(billingAgreement);

				}
			});



		}

	})

}

exports.packagePurchase = function(req, res) {

	var execute_payment_json = {

		"payer_id": req.body.payerID

	};
	var packageId = req.params.packageId;
	var agreementId = req.body.agreementID;

	var paymentId = req.body.paymentID;
	Package.model.findById(packageId).exec(function(err, purchasedPackage) {

		if (purchasedPackage.basis == 'one-time') {
			console.log('this is a one-time package');

			paypal.payment.execute(paymentId, execute_payment_json, function(error, payment) {
				if (error) {

					console.log(error.response);
					return res.apiError(error.response);

				}
				else {

					console.log("Get Payment Response");
					console.log(JSON.stringify(payment));

					if (err) return res.apiError('database error', err);

					var newTransaction = new Transactions.model();

					newTransaction.set('user', req.user._id);
					newTransaction.set('sourcePackage', packageId);
					newTransaction.set('price', purchasedPackage.price);
					newTransaction.set('basis', purchasedPackage.basis);
					newTransaction.set('paypalPaymentId', paymentId);
					newTransaction.set('status', 'completed');

					newTransaction.save(function(err) {
						newTransaction = newTransaction.toObject();
						newTransaction.success = true;
						res.apiResponse({
							Purchase: newTransaction
						});
					});



				}
			});
		}

		if (purchasedPackage.basis == 'recurring') {
			console.log('this is a recurring package');
			paypal.billingAgreement.execute(agreementId, {}, function(error, billingAgreement) {
				if (error) {

					console.error(JSON.stringify(error));
					return res.apiError(error.response);

				}
				else {
					console.log('Billing Agreement Created Successfully', JSON.stringify(billingAgreement));
					if (err) return res.apiError('database error', err);

					var newTransaction = new Transactions.model();

					newTransaction.set('user', req.user._id);
					newTransaction.set('sourcePackage', packageId);
					newTransaction.set('price', purchasedPackage.price);
					newTransaction.set('basis', purchasedPackage.basis);
					newTransaction.set('paypalBillingAgreementId', billingAgreement.id);
					if (billingAgreement.agreement_details.last_payment_amount && billingAgreement.agreement_details.last_payment_amount.value > 0) {
						newTransaction.set('status', 'completed');
					}
					else {
						newTransaction.set('status', 'pending');
					}

					newTransaction.save(function(err) {
						newTransaction = newTransaction.toObject();
						newTransaction.success = true;
						res.apiResponse({
							Purchase: newTransaction
						});
					});

				}
			});

		}

	});



}

/**
 * Get Currency by ID
 */
exports.get = function(req, res) {

	var memberId = req.user._id;
	var currencyId = req.params.currencyId;

	Currency.model.findById(currencyId).exec(function(err, currency) {
		if (err) console.log(err);
		if (currency) {
			var currencyObject = currency.toObject();
			utilities.getCurrencyCreditBalanceAndPurchasedTracks(currencyObject, {
				_id: memberId
			}, function(err, currencyWithCredits) {

				res.apiResponse({
					Currency: currencyWithCredits
				});
			});
		}
		else {

		}


	});

}



/**
 * Create a Currency
 */
exports.create = function(req, res) {

	var item = new Currency.model(),
		data = (req.method == 'Currency') ? req.body : req.query;

	item.getUpdateHandler(req).process(data, function(err) {

		if (err) return res.apiError('error', err);

		res.apiResponse({
			Currency: item
		});

	});
}

/**
 * Get Currency by ID
 */

exports.getAvailableAccountingPeriods = function(req, res) {


	AccountingPeriod.model.find({
		currency: req.params.currencyId
	}).select('id name periodMonthText startDate endDate').sort({
		startDate: -1
	}).exec(function(err, accountingPeriods) {

		if (err) {
			return res.apiError(err, err);
		}

		return res.apiResponse({
			AccountingPeriods: accountingPeriods
		});

	});


}

exports.purchaseTracks = function(req, res) {

	var userId = req.user._id;
	var currencyId = req.params.currencyId;

	var trackId = req.body.map((track) => {

		return track._id;

	});

	var userIP = req.ip;

	utilities.purchaseTrack(trackId, userId, currencyId, userIP, function(err, response) {
		var DownloadQueue = keystone.list('DownloadQueue');

		if (err && err.err && err.err == "already-purchased") {

			DownloadQueue.model.findOne({
				user: userId,
				currency: currencyId
			}).exec(function(downloadQueueErr, downloadQueue) {
				if (downloadQueueErr) console.log(downloadQueueErr);

				console.log('download queue found');
				downloadQueue.tracks.pull(new ObjectId(trackId.toString()).toString());
				console.log('download queue modified');
				downloadQueue.save(function(saveErr) {

					if (saveErr) return res.apiError({
						status: saveErr,
						track: trackId,
						download: err.download._id
					});

					return res.apiResponse({
						status: err.err,
						track: trackId,
						download: err.download._id
					});

				});

			});
		}
		else if (err && err.err) {
			return res.apiResponse(err);
		}
		else {
			return res.apiResponse({
				purchasedTracks: response.purchasedTracks,
				download: response.downloadEntitlementId,
				track: trackId,
				creditsDeducted: response.creditsDeducted,
				creditBalance: response.creditBalance
			});
		}

	})


}
