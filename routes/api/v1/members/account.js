var async = require('async'),
	keystone = require('keystone');

var User = keystone.list('User');
var Transactions = keystone.list('Transaction');
var TransactionItems = keystone.list('TransactionItem');

var Downloads = keystone.list('Downloads');
var DownloadQueue = keystone.list('DownloadQueue');
var Track = keystone.list('Track');
var moment = require('moment');
var ObjectId = require('mongoose').Types.ObjectId;
var sparkpost = keystone.get('email service');
var AccountingPeriod = keystone.list('AccountingPeriod');
var EditorAccounting = keystone.list('EditorAccounting');
var crypto = require('crypto');
var TrackAccounting = keystone.list('TrackAccounting');
var _ = require('lodash');

const EDITOR_PERCENTAGE_CUT = 0.4;


/**
 * List Track
 */

exports.library = function(req, res) {

	var userId = req.user._id;
	var currencyId = req.params.currencyId;

	var endTime = moment();
	var startTime = moment().subtract(30, 'days');

	TransactionItems.model.count({
		user: userId,
		currency: currencyId,
		startTime: {
			$gte: startTime,
			$lte: endTime
		}
	}).exec(function(err, numberOfValidTransactionItems) {
		if (err) return res.apiError('err checking valid transactions', err);

		if (numberOfValidTransactionItems > 0) {

			Downloads.model.find({
				user: userId,
				currency: currencyId
			}).exec(function(err, downloads) {

				if (err) return res.apiError('error retrieving downloads', err);

				var trackIds = downloads.map((item) => {
					return item.track;
				});

				var releaseIds = downloads.filter((item) => {
					return item.releases && item.releases.length > 0
				}).map((item) => {
					return item.releases[0];
				});

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
				
				if (releaseIds && releaseIds.length > 0) {
					query.where({
						$or: [{
							_id: {
								$in: trackIds
							}
						}, {
							releases: {
								$in: releaseIds
							}
						}]
					});

				}
				else {
					query.where({
						_id: {
							$in: trackIds
						}
					});

				}

				query.where('currency', currencyId);
				query.where('enabled', true);
				query.where('status', 'published');

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

				if (req.query.sortBy) {
					query.sort(req.query.sortBy);
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
			});

		}
		else {

			res.apiResponse({

				Tracks: [],
				restrictions: 'no-valid-transactions'

			});

		}

	});

}


exports.getDownloadQueueForCurrency = function(req, res) {

	var userId = req.user._id;
	var currencyId = req.params.currencyId;

	DownloadQueue.model.findOne({
		user: userId,
		currency: currencyId
	}).exec(function(err, downloadQueue) {

		if (!downloadQueue) {

			var newDownloadQueue = new DownloadQueue.model({
				user: userId,
				currency: currencyId
			});

			newDownloadQueue.save(function(err) {

				if (err) return res.apiError('error saving new downloadQueue');

				res.apiResponse({
					DownloadQueue: newDownloadQueue
				})

			});


		}
		else {

			var query = Track.model.find({
				_id: {
					$in: downloadQueue.tracks
				}
			});

			query.populate('inKey genres tier loopLength versionType outroType introType cleanDirty originalWorks gigTypes assignedCollections');
			query.select('-hiBitRateFile -publishedHiBitRateFile -lowBitRateFile -downloadCount');
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
						$in: req.query.tags
					}
				}, {
					versionType: {
						$in: req.query.tags
					}
				}, {
					introType: {
						$in: req.query.tags
					}
				}, {
					outroType: {
						$in: req.query.tags
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

				async.mapSeries(items, function(item, callback) {
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

					downloadQueue = downloadQueue.toObject();
					downloadQueue.tracks = results;
					res.apiResponse({
						DownloadQueue: downloadQueue
					});

				});





			});

		}

	});

}

exports.getTransactionHistory = function(req, res) {

	Transactions.model.find({
		user: req.user._id
	}).populate('sourcePackage transactionItems').exec(function(err, transactions) {

		if (err) return res.apiError('error retrieving transactions for user ' + req.user._id);

		return res.apiResponse({
			Transactions: transactions
		})

	});

}


exports.addTrackToDownloadQueueForCurrency = function(req, res) {

	var userId = req.user._id;
	var currencyId = req.params.currencyId;
	var trackId = req.body.track;

	DownloadQueue.model.findOne({
		user: userId,
		currency: currencyId
	}).exec(function(err, downloadQueue) {

		if (!downloadQueue) {

			var newDownloadQueue = new DownloadQueue.model({
				user: userId,
				currency: currencyId,
				tracks: [ObjectId(trackId)]
			});
			newDownloadQueue.save(function(err) {

				if (err) return res.apiError('error saving new downloadQueue', err);

				res.apiResponse({
					DownloadQueue: newDownloadQueue
				})

			});


		}
		else {

			if (downloadQueue.tracks.indexOf(trackId) === -1) {
				downloadQueue.tracks.push(trackId);
			}
			else {



			}

			downloadQueue.save(function(err) {

				if (err) return res.apiError('error adding track to download queue', err);

				DownloadQueue.model.populate(downloadQueue, 'tracks', function(err, downloadQueue) {

					async.mapSeries(downloadQueue.tracks, function(item, callback) {
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

						downloadQueue = downloadQueue.toObject();

						downloadQueue.tracks = results;

						return res.apiResponse({
							DownloadQueue: downloadQueue
						});


					});

				});

			});

		}

	});

}

exports.removeTrackFromDownloadQueueForCurrency = function(req, res) {

	var userId = req.user._id;
	var currencyId = req.params.currencyId;
	var trackId = req.body.track;

	DownloadQueue.model.findOne({
		user: userId,
		currency: currencyId
	}).exec(function(err, downloadQueue) {

		if (!downloadQueue) {

			var newDownloadQueue = new DownloadQueue.model({
				user: userId,
				currency: currencyId,
				tracks: []
			});
			newDownloadQueue.save(function(err) {

				if (err) return res.apiError('error saving new downloadQueue', err);

				res.apiResponse({
					DownloadQueue: newDownloadQueue
				})

			});


		}
		else {

			if (downloadQueue.tracks.indexOf(trackId) !== -1) {

				var updatedTrack = downloadQueue.tracks.filter((track) => {
					return track != trackId;
				});

				downloadQueue.set({
					tracks: updatedTrack
				});

			}
			else {



			}

			downloadQueue.save(function(err) {
				if (err) return res.apiError('error saving added track to download queue', err);

				DownloadQueue.model.findById(downloadQueue._id).populate('tracks').exec(function(err, updatedDownloadQueue) {
					if (err) return res.apiError('error removing track from download queue', err);
					return res.apiResponse({
						DownloadQueue: updatedDownloadQueue
					});
				});

			})

		}

	});

}



exports.getCreditBalance = function(req, res) {

	var memberId = req.user._id;
	var currencyId = req.params.currencyId;

	// #1 Get Total Credits Purchased
	function getTotalCreditsPurchased(callback) {


		Transactions.model.find().where('user', memberId).where('currency', currencyId).exec(function(err, items) {

			if (err) return res.apiError('database error', err);
			var transactions = items;
			var totalCreditsPurchased = 0;

			for (var i = 0; i < items.length; i++) {

				totalCreditsPurchased += items[i].credits;
			}

			callback(null, memberId, transactions, totalCreditsPurchased)

		});

	}

	// #2 Get Total Expired Credits
	function getTotalExpiredCredits(memberId, transactions, totalCreditsPurchased, callback) {

		var totalCreditsExpired = 0;

		for (var i = 0; i < transactions.length; i++) {

			if (moment(transactions[i].expirationDate).isBefore(new Date()) || moment(transactions[i].expirationDate).isSame(new Date())) {

				totalCreditsExpired += transactions[i].credits;

			}

		}

		callback(null, memberId, transactions, totalCreditsPurchased, totalCreditsExpired)

	}

	// #3 Get Credits Spent
	function getCreditsSpent(memberId, transactions, totalCreditsPurchased, totalCreditsExpired, callback) {

		Downloads.model.find().where('user', memberId).where('currency', currencyId).exec(function(err, items) {

			if (err) return res.apiError('database error', err);
			if (!items) return res.apiError('not found');

			var totalCreditsSpent = 0;

			for (var i = 0; i < items.length; i++) {
				totalCreditsSpent += items[i].creditsPaid;
			}

			callback(null, memberId, transactions, totalCreditsPurchased, totalCreditsExpired, totalCreditsSpent);

		});

	}

	//#4 Calculate Credit Balance

	function calculateCreditBalance(memberId, transactions, totalCreditsPurchased, totalCreditsExpired, totalCreditsSpent, callback) {
		var creditBalance = (totalCreditsPurchased - totalCreditsExpired) - totalCreditsSpent;

		callback(null, creditBalance);

	}

	///#5 Send Credit Balance

	function sendCreditBalance(err, creditBalance) {

		res.apiResponse({
			CreditBalance: creditBalance
		});

	}

	async.waterfall([getTotalCreditsPurchased, getTotalExpiredCredits, getCreditsSpent, calculateCreditBalance], sendCreditBalance);

}

/**
 * Get Track by ID
 */
exports.get = function(req, res) {

	if (req.user) {

		var query = User.model.findById(req.user._id).select('-password');

		query.exec(function(err, item) {

			if (err) return res.apiError('database error', err);
			if (!item) return res.apiError('not found');

			var userData = item.toObject();

			if (userData.taxId && userData.taxId.length > 0) {
				userData.taxId = true;
			}
			else {
				userData.taxId = false;
			}

			res.apiResponse({
				User: userData
			});

		});
	}
	else {
		res.apiResponse({
			User: {}
		});
	}

}

/**
 * Get Track by ID
 */
exports.getEditorProfile = function(req, res) {
	User.model.findById(req.user._id).select('-password').exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		res.apiResponse({
			User: item
		});

	});
}


/**
 * Create a User account
 */
exports.create = function(req, res) {
	console.log('attempting to create a new user')
	User.model.findOne({
		email: req.body.email
	}).exec(function(err, user) {
		console.log('this is what we found in the database', err, user);
		if (err) {
			console.log(err);
			return res.apiError('user lookup error', err);
		}
		else if (user && user.emailVerified && !user.emailConfirmationKey) {

			console.log('found user verified and enabled', user);

			return res.apiError('User account already exists with that email address', {
				err: 'user-found-with-email'
			});

		}
		else if (user && !user.enabled && user.emailConfirmationKey) {

			console.log('found user without email verify and not enabled', user);

			user.set({
				emailConfirmationKey: crypto.randomBytes(32).toString('hex'),
				emailConfirmationExpiration: moment().add(1, 'h'),
				remoteAddr: req.header('x-forwarded-for').split(',')[0] || req.connection.remoteAddress

			});

			user.save(function(err) {

				if (err) return res.apiError('error creating new member user', err);

				res.render('emails/email-confirm-member-signup', {
					name: user.name,
					email: encodeURIComponent(user.email),
					confirmationKey: encodeURIComponent(user.emailConfirmationKey),
					siteurl: keystone.get('email siteurl'),
					layout: keystone.get('email layout')
				}, function(err, memberEmailVerificationHtml) {

					sparkpost.transmissions.send({
							options: {},
							content: {
								from: '"' + keystone.get('email from name') + '" <' + keystone.get('email from email') + '>',
								subject: keystone.get('email subject prefix') + ' ' + 'Verify Your Email To Complete Account Setup',
								html: memberEmailVerificationHtml
							},
							recipients: [{
								address: req.body.email
							}]
						})
						.then(data => {
							console.log('Woohoo! You just sent your first mailing!');
							console.log(data);
						})
						.catch(err => {
							console.log('Whoops! Something went wrong');
							console.log(err);
						});

					res.apiResponse({
						status: 'created',
						emailToVerify: user.email
					});

				});

			});


		}
		else {

			req.body.userRole = 'member';
			req.body.enabled = false;
			req.body.emailVerified = false;
			req.body.remoteAddr = req.header('x-forwarded-for').split(',')[0] || req.connection.remoteAddress;
			var tempPassword = crypto.randomBytes(32).toString('hex');
			req.body.password = tempPassword;
			req.body.password_confirm = tempPassword;

			if (req.body.firstName || req.body.lastName) {

				req.body.name = {
					first: req.body.firstName,
					last: req.body.lastName
				};
				delete req.body.firstName;
				delete req.body.lastName;

			}

			var newUser = new User.model();

			req.body.emailConfirmationKey = crypto.randomBytes(32).toString('hex');
			req.body.emailConfirmationExpiration = moment().add(1, 'h');

			newUser.getUpdateHandler(req).process(req.body, function(err) {

				if (err) return res.apiError('error', err);

				res.render('emails/email-confirm-member-signup', {
					name: newUser.name,
					email: encodeURIComponent(newUser.email),
					confirmationKey: encodeURIComponent(newUser.emailConfirmationKey),
					siteurl: keystone.get('email siteurl'),
					layout: keystone.get('email layout')
				}, function(err, memberEmailVerificationHtml) {

					sparkpost.transmissions.send({
							options: {},
							content: {
								from: '"' + keystone.get('email from name') + '" <' + keystone.get('email from email') + '>',
								subject: keystone.get('email subject prefix') + ' ' + 'Verify Your Email To Complete Account Setup',
								html: memberEmailVerificationHtml
							},
							recipients: [{
								address: req.body.email
							}]
						})
						.then(data => {
							console.log(data);
						})
						.catch(err => {
							console.log('Whoops! Something went wrong');
							console.log(err);
						});

					res.apiResponse({
						status: 'created',
						emailToVerify: newUser.email
					});

				});

			});

		}
	});

};

exports.createEditor = function(req, res) {

	User.model.findOne({
		email: req.body.email
	}).exec(function(err, user) {
		if (err) {
			console.log(err);
			return res.apiError('user lookup error', err);
		}

		if (user) {

			return res.apiError('user already exists with that email address', {
				err: 'user-found-with-email'
			});

		}
		else {

			req.body.userRole = 'editor';
			req.body.enabled = false;
			req.body.emailVerified = false;
			req.body.remoteAddr = req.header('x-forwarded-for').split(',')[0] || req.connection.remoteAddress;
			req.body.password = req.body.passwords.password;
			req.body.password_confirm = req.body.passwords.repeatPassword;

			var newUser = new User.model();

			req.body.emailConfirmationKey = crypto.randomBytes(32).toString('hex');
			req.body.emailConfirmationExpiration = moment().add(1, 'h');

			newUser.getUpdateHandler(req).process(req.body, function(err) {

				if (err) return res.apiError('error creating new editor user', err);

				res.render('emails/email-confirm-editor-signup', {
					name: newUser.name,
					email: encodeURIComponent(newUser.email),
					confirmationKey: encodeURIComponent(newUser.emailConfirmationKey),
					siteurl: keystone.get('email siteurl'),
					layout: keystone.get('email layout')
				}, function(err, editorHtml) {
					res.render('emails/admin-email-confirm-editor-signup', {
						name: req.body.name,
						email: req.body.email,
						userId: newUser._id,
						sample1: newUser.editorApplicationSampleLink1,
						sample2: newUser.editorApplicationSampleLink2,
						siteurl: keystone.get('email siteurl'),
						layout: keystone.get('email layout')
					}, function(err, adminHtml) {

						sparkpost.transmissions.send({
								options: {},
								content: {
									from: '"' + keystone.get('email from name') + '" <' + keystone.get('email from email') + '>',
									subject: keystone.get('email subject prefix') + ' ' + 'CONFIRM EMAIL - Thanks for applying to become an editor!',
									html: editorHtml
								},
								recipients: [{
									address: req.body.email
								}]
							})
							.then(data => {
								console.log(data);
							})
							.catch(err => {
								console.log('Whoops! Something went wrong');
								console.log(err);
							});

						sparkpost.transmissions.send({
								options: {},
								content: {
									from: '"' + keystone.get('email from name') + '" <' + keystone.get('email from email') + '>',
									subject: keystone.get('email subject prefix') + ' ' + 'New editor signup!',
									html: adminHtml
								},
								recipients: [{
									address: 'store@crooklynclan.net'
								}]
							})
							.then(data => {
								console.log(data);
							})
							.catch(err => {
								console.log('Whoops! Something went wrong');
								console.log(err);
							});


						res.apiResponse({
							status: 'created',
							emailToVerify: newUser.email
						});

					});

				});


			});

		}
	});


};

/**
 * Login user
 */
exports.signin = function(req, res) {

	if (!req.body.email || !req.body.password) return res.json({
		success: false
	});

	keystone.list('User').model.findOne({
		email: req.body.email.toLowerCase(),
		enabled: true
	}).exec(function(err, user) {

		if (err || !user) {
			return res.json({
				success: false,
				session: false,
				message: (err && err.message ? err.message : false) || 'Sorry, there was an issue signing you in, please try again.'
			});
		}

		keystone.session.signin({
			email: user.email,
			password: req.body.password
		}, req, res, function(user) {

			var modifiedUser = user.toObject();
			delete modifiedUser.password;

			if (modifiedUser.userRole == 'editor' && modifiedUser.taxId) {
				modifiedUser.taxId = true;
			}
			else {
				modifiedUser.taxId = false;
			}



			return res.json({
				success: true,
				session: true,
				date: new Date().getTime(),
				userId: user.id,
				profileData: modifiedUser
			});

		}, function(err) {

			return res.json({
				success: false,
				session: false,
				message: (err && err.message ? err.message : false) || 'Sorry, there was an issue signing you in, please try again.'
			});

		});

	});
}

exports.signout = function(req, res) {
	keystone.session.signout(req, res, function() {
		res.json({
			'signedout': true,
			'session': false
		});
	});
};

exports.checkAuth = function(req, res) {
	// you could check user permissions here too
	if (req.user) {

		var user = req.user.toObject();

		delete user.password;

		if (user.userRole == 'editor' && user.taxId) {
			user.taxId = true;
		}
		else {
			user.taxId = false;
		}

		return res.json({
			session: true,
			date: new Date().getTime(),
			userId: req.user.id,
			profileData: user
		});
	}
	else {
		return res.json({
			session: false
		});
	}
}


/**
 * Get Track by ID
 */
exports.update = function(req, res) {

	User.model.findById(req.user._id).exec(function(err, user) {

		if (err) return res.apiError('database error', err);

		if (!user) return res.apiError('not found');

		if (req.body.logoLong) {
			delete req.body.logoLong;
		}

		if (req.body.photo) {
			delete req.body.photo;
		}

		if (req.body.logoSquare) {
			delete req.body.logoSquare;
		}

		if (req.body.backgroundImage) {
			delete req.body.backgroundImage;
		}

		var data = Object.assign(req.body, req.files);

		if (data.firstName || data.lastName) {

			data.name = {
				first: data.firstName,
				last: data.lastName
			};

		}

		delete data.firstName;
		delete data.lastName;
		delete data.userRole;
		delete data.enabled;
		delete data.passwordResetExpiration;
		delete data.emailVerified;

		if (data.taxInformation) {

			data.address = data.taxInformation.address;
			data.addressText = data.taxInformation.addressText;

			if (data.taxInformation.taxId && data.taxInformation.taxId !== true && data.taxInformation.taxId.length > 0) {

				data.taxId = data.taxInformation.taxId;

			}

		}

		delete data.taxInformation;

		if (data.passwords && data.passwords.password && data.passwords.repeatPassword && data.passwords.password.length > 0 && data.passwords.repeatPassword.length > 0) {

			data.password = data.passwords.password;
			data.password_confirm = data.passwords.repeatPassword;

			delete data.passwords;

		}
		else {
			delete data.passwords;

		}

		var fields = Object.keys(data).map((item) => {
			return item.replace('_upload', '');
		}).filter((item) => {
			return item.indexOf('password_confirm') === -1;
		}).join(',');


		console.log('account update data', fields);
		user.getUpdateHandler(req).process(data, {
			fields: fields
		}, function(err) {

			if (err) return res.apiError('update error', err);

			var userOutput = user.toObject();

			if (userOutput.userRole == 'editor' && userOutput.taxId) {
				userOutput.taxId = true;
			}
			else {
				userOutput.taxId = false;
			}

			delete userOutput.emailConfirmationKey;
			delete userOutput.password;
			delete userOutput.emailConfirmationExpiration;
			delete userOutput.passwordResetKey;
			delete userOutput.passwordResetExpiration;

			res.apiResponse({
				User: userOutput
			});

		});


	});
}

exports.activate = function(req, res) {

	var query = {};
	var uid = req.body.uid;
	var cid = req.body.cid;

	User.model.findOne({
		_id: uid,
		emailConfirmationKey: cid,
		enabled: false,
		emailVerified: true,
		userRole: 'member'
	}).exec(function(err, user) {

		if (err) return res.apiError('database error', err);

		if (!user) return res.apiError('not found');

		var data = req.body;

		//Customer account activation process
		if (data.firstName || data.lastName) {

			data.name = {
				first: data.firstName,
				last: data.lastName
			};

		}

		delete data.firstName;
		delete data.lastName;
		delete data.userRole;
		delete data.enabled;
		delete data.passwordResetExpiration;
		delete data.emailVerified;

		if (data.passwords && data.passwords.password && data.passwords.repeatPassword && data.passwords.password.length > 0 && data.passwords.repeatPassword.length > 0) {

			data.password = data.passwords.password;
			data.password_confirm = data.passwords.repeatPassword;

			delete data.passwords;

		}
		else {
			delete data.passwords;

		}

		delete data.uid;
		delete data.cid;

		var fields = Object.keys(data).map((item) => {
			return item.replace('_upload', '');
		}).filter((item) => {
			return item.indexOf('password_confirm') === -1;
		}).join(',');

		user.getUpdateHandler(req).process(data, {
			fields: fields
		}, function(err) {

			if (err) return res.apiError('update error', err);
			user.set({
				enabled: true,
				emailConfirmationKey: null
			});

			user.save(function(err, user) {

				var userOutput = user.toObject();

				delete userOutput.emailConfirmationKey;
				delete userOutput.password;
				delete userOutput.emailConfirmationExpiration;
				delete userOutput.passwordResetKey;
				delete userOutput.passwordResetExpiration;

				res.apiResponse({
					User: userOutput
				});

			});

		});
	});
}

exports.verifyEmail = function(req, res) {

	var confirmCode = req.query.confirmation;
	var email = req.query.email;

	User.model.findOne({
		email: email,
		emailConfirmationKey: confirmCode,
	}).exec(function(err, user) {
		if (err) console.log(err);

		if (user) {

			user.set({
				emailVerified: true
			});

			user.save(function(err) {

				if (!user.enabled && user.userRole == 'member') {

					return res.redirect('/#/register/customer?uid=' + user._id + '&cid=' + confirmCode)

				}
				else {

					return res.redirect('/#/login?confirmation=success')

				}

			});

		}
		else {

			return res.redirect('/#/login?confirmation=failure')

		}


	});

}


exports.passwordResetRequest = function(req, res) {

	var email = req.query.email;

	User.model.findOne({

		email: email,

		emailVerified: true,

		enabled: true

	}).exec(function(err, user) {

		if (err) console.log(err);

		if (user) {

			var passwordResetKey = crypto.randomBytes(32).toString('hex');
			var passwordResetExpiration = moment().add(15, 'm');

			user.set({
				passwordResetKey: passwordResetKey
			});

			user.set({
				passwordResetExpiration: passwordResetExpiration
			});

			user.save(function(err) {

				res.render('emails/email-password-reset-link', {
					email: encodeURIComponent(user.email),
					confirmationKey: encodeURIComponent(user.passwordResetKey),
					siteurl: keystone.get('email siteurl'),
					layout: keystone.get('email layout')
				}, function(err, editorHtml) {

					sparkpost.transmissions.send({
							options: {},
							content: {
								from: '"' + keystone.get('email from name') + '" <' + keystone.get('email from email') + '>',
								subject: keystone.get('email subject prefix') + ' ' + '[Crooklyn Clan v2] Password Reset Link',
								html: editorHtml
							},
							recipients: [{
								address: user.email
							}]
						})
						.then(data => {
							console.log('Woohoo! You just sent your first mailing!');
							res.apiResponse({
								status: 'sent',
							});
							console.log(data);
						})
						.catch(err => {
							console.log('Whoops! Something went wrong');
							console.log(err);
						});



				});

			});

		}
		else {

			return res.apiError('Email address is either not registered, not verified or the account associated with it is in review.', {
				status: 'error'
			});

		}


	});

}

exports.resetPassword = function(req, res) {

	var email = req.body.email;
	var confirmationKey = req.body.confirmationKey;

	User.model.findOne({
		email: email,
		enabled: true,
		emailVerified: true,
		passwordResetKey: confirmationKey,
		passwordResetExpiration: {
			$gte: new Date()
		}
	}).exec(function(err, user) {

		if (err) console.log(err);

		if (user) {

			req.body.password_confirm = req.body.repeatPassword;
			req.body.passwordResetKey = null;
			req.body.passwordResetExpiration = null;
			if (req.body.password == req.body.repeatPassword) {
				user.set({
					password: req.body.password
				});
			}
			user.set({
				passwordResetKey: null
			});
			user.set({
				passwordResetExpiration: new Date()
			});

			user.save(function(err) {

				if (err) return res.apiError('error', err);

				res.render('emails/email-password-reset-success', {
					email: encodeURIComponent(user.email),
					siteurl: keystone.get('email siteurl'),
					layout: keystone.get('email layout')
				}, function(err, editorHtml) {

					sparkpost.transmissions.send({
							options: {},
							content: {
								from: '"' + keystone.get('email from name') + '" <' + keystone.get('email from email') + '>',
								subject: keystone.get('email subject prefix') + ' ' + '[Crooklyn Clan v2] Password Reset',
								html: editorHtml
							},
							recipients: [{
								address: user.email
							}]
						})
						.then(data => {
							console.log('Woohoo! You just sent your first mailing!');
							res.apiResponse({
								status: 'sent',
							});
							console.log(data);
						})
						.catch(err => {
							console.log('Whoops! Something went wrong');
							console.log(err);
							res.apiError({
								status: 'error',
							});
						});



				});

			});

		}
		else {

			return res.apiError('Either we cannot find your email or your reset request has expired. Please request a new password reset email.', {
				status: 'error'
			});

		}


	});

}

exports.getAuthenticationToken = function(req, res) {


	var algorithm = 'aes-256-ctr',
		timestamp = moment(),
		timestampCreation = timestamp.unix(),
		timeExpiration = timestamp.add(1, 'm').unix(),
		signingKey = process.env.V2_AUTHENTICATION_SIGNING_KEY,
		password = crypto.createHmac('md5', signingKey).update(process.env.V2_AUTHENTICATION_KEY).digest('hex');

	function encrypt(text) {
		var iv = process.env.V2_AUTHENTICATION_KEY.substr(0, 16);

		var cipher = crypto.createCipheriv(algorithm, password, iv);
		var crypted = cipher.update(text, 'utf8', 'base64')
		crypted += cipher.final('base64');

		return iv + crypted;
	}

	function decrypt(text) {

		var iv = text.substr(0, 16);
		text = text.substr(16);
		var decipher = crypto.createDecipheriv(algorithm, password, iv)
		var dec = decipher.update(text, 'base64', 'utf8')
		dec += decipher.final('utf8');
		var payload = JSON.parse(dec);
		if (moment().unix() < payload.expires) {
			console.log('valid');
		}
		else {
			console.log('invalid');
		}
		return dec;
	}

	var hash = crypto.createHmac('sha256', signingKey);

	var userData = {
		cat_id: 26,
		email: 'DJStitchNYC@aol.com',
		expires: timeExpiration
	};
	var payloadString = JSON.stringify(userData);
	var encryptedPayload = encrypt(payloadString);
	hash.update(encryptedPayload);
	var dataHash = hash.digest('base64');
	var decryptedPayload = JSON.parse(decrypt(encryptedPayload));
	var decryptedPayloadString = decrypt(encryptedPayload);
	var decryptedHash = crypto.createHmac('sha256', signingKey);
	var decryptedPayloadStringHash = decryptedHash.update(encryptedPayload).digest('base64');

	return res.apiResponse({
		payload: userData,
		payloadString: payloadString,
		hash: dataHash,
		encryptedPayload: encryptedPayload,
		decryptedPayloadString: decryptedPayload,
		decryptedPayloadStringHash: decryptedPayloadStringHash
	});

}

exports.authenticate = function(req, res) {

	var crypto = require('crypto'),
		algorithm = 'aes-256-ctr',
		signingKey = process.env.V2_AUTHENTICATION_SIGNING_KEY,
		password = crypto.createHash('md5').update(process.env.V2_AUTHENTICATION_KEY).digest('hex');

	function decrypt(text) {

		var iv = text.substr(0, 16);
		text = text.substr(16);
		var decipher = crypto.createDecipheriv(algorithm, password, iv)
		var dec = decipher.update(text, 'base64', 'utf8')
		dec += decipher.final('utf8');
		console.log(iv, text);
		console.log(dec);
		var payload = JSON.parse(dec);
		if (moment().unix() < payload.expires) {
			console.log('valid');
		}
		else {
			console.log('invalid');
		}
		return dec;

	}

	function getHash(text) {
		try {

			var hash = crypto.createHmac('sha256', signingKey);
			hash.update(text);
			return hash.digest('hex');
		}
		catch (ex) {
			console.log(ex);
			return false;
		}

	}

	function isExpired(expirationTimestamp) {
		console.log(moment().unix());
		return (moment().unix() > expirationTimestamp);

	}

	function isHashValid(hmac, encryptedPayloadString) {

		var hash = getHash(encryptedPayloadString);
		console.log('hash from is hash valid', hash);
		return hash === hmac;

	}

	console.log('got post data');

	var payload = req.body.payload.trim();
	var hmac = req.body.hmac.trim();

	console.log(payload);
	console.log(hmac);

	var hashValid = isHashValid(hmac, payload);
	console.log('is hash valid', hashValid);

	var decryptedPayloadString = decrypt(payload);
	console.log('decrypted payload string', decryptedPayloadString);
	var decryptedPayload = JSON.parse(decryptedPayloadString);
	console.log('decrypted payload', decryptedPayload);

	var expired = isExpired(decryptedPayload.expires);
	console.log('is expired', expired);

	if (!expired && hashValid) {

		User.model.findOne({
			email: decryptedPayload.email,
			crooklynClanV1ArtistID: decryptedPayload.cat_id
		}).exec(function(err, matchedUser) {

			if (err) return res.redirect('http://www.crooklynclan.net');

			if (matchedUser) {

				keystone.session.signinWithUser(matchedUser, req, res, function(user) {

					console.log('successfully signed in', user);

					return res.redirect('/');

				});

			}
			else {

				console.log('User not found');

				return res.redirect('/');

			}

		})


	}
	else {

		return res.redirect('http://www.crooklynclan.net');

	}

}

exports.getUploadedTracks = function(req, res) {

	var currencyId = req.params.currencyId;
	var currentPage = req.params.pageNumber;
	var rowsPerPage = req.query.rows;
	var sortCriteria = {};
	var matchCriteria = {

		currency: new ObjectId(currencyId),
		editor: new ObjectId(req.user._id),
		status: {
			$in: ['published', 'submitted', 'error']
		}

	};

	if (req.query.startBpm && req.query.endBpm) {

		matchCriteria = Object.assign(matchCriteria, {
			startBpm: {
				$lte: parseInt(req.query.endBpm),
				$gte: parseInt(req.query.startBpm)
			}
		});

	}

	if (req.query.startBpm && !req.query.endBpm) {
		matchCriteria = Object.assign(matchCriteria, {
			startBpm: {
				$gte: parseInt(req.query.startBpm)
			}
		});
	}

	if (!req.query.startBpm && req.query.endBpm) {
		matchCriteria = Object.assign(matchCriteria, {
			startBpm: {
				$lte: parseInt(req.query.endBpm)
			}
		});
	}

	if (req.query.minYear && req.query.maxYear) {
		matchCriteria = Object.assign(matchCriteria, {
			releaseYear: {
				$lte: parseInt(req.query.maxYear),
				$gte: parseInt(req.query.minYear)
			}
		});
	}

	if (req.query.minYear && !req.query.maxYear) {

		matchCriteria = Object.assign(matchCriteria, {
			releaseYear: {
				$gte: parseInt(req.query.minYear)
			}
		});

	}

	if (!req.query.minYear && req.query.maxYear) {

		matchCriteria = Object.assign(matchCriteria, {
			releaseYear: {
				$gte: parseInt(req.query.maxYear)
			}
		});

	}

	if (req.query.artistName) {

		var artistNameArray = req.query.artistName.split(',').map((artistName) => {

			return new RegExp(artistName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");

		});

		matchCriteria = Object.assign(matchCriteria, {

			$or: [{
				artistPrimaryName: {
					$in: artistNameArray
				}

			}, {

				artistsFeaturedDisplayName: {
					$in: artistNameArray
				}

			}]

		});

	}

	if (req.query.trackName) {

		var trackNameArray = req.query.trackName.split(',').map((trackName) => {

			return new RegExp(trackName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");

		});

		matchCriteria = Object.assign(matchCriteria, {
			formattedName: {
				$in: trackNameArray
			}
		});

	}

	if (req.query.keys) {
		matchCriteria = Object.assign(matchCriteria, {
			inKey: {
				$in: req.query.keys.map((item) => {
					return new ObjectId(item);
				}) || []
			}

		});

	}

	if (req.query.genres) {
		matchCriteria = Object.assign(matchCriteria, {
			genres: {
				$in: req.query.genres.map((item) => {
					return new ObjectId(item);
				}) || []
			}
		});

	}

	if (req.query.tags) {

		matchCriteria = Object.assign(matchCriteria, {
			$or: [{
				cleanDirty: {
					$in: req.query.tags.map((item) => {
						return new ObjectId(item);
					}) || []
				}
			}, {
				versionType: {
					$in: req.query.tags.map((item) => {
						return new ObjectId(item);
					}) || []
				}
			}, {
				introType: {
					$in: req.query.tags.map((item) => {
						return new ObjectId(item);
					}) || []
				}
			}, {
				outroType: {
					$in: req.query.tags.map((item) => {
						return new ObjectId(item);
					}) || []
				}

			}]

		})
	}

	if (req.query.sortField) {

		sortCriteria[req.query.sortField] = (req.query.sortOrder == -1) ? -1 : 1;

	}

	var accountingPeriodQueryParam = req.query.accountingPeriod;

	var trackQuery = Track.model.aggregate([{
			$match: matchCriteria
		}, {
			$lookup: {
				from: 'downloads',
				localField: '_id',
				foreignField: 'track',
				as: 'downloads'
			}
		}, {
			$project: {
				_id: 1,
				publishDate: 1,
				createdAt: 1,
				name: 1,
				artist: 1,
				artistPrimaryName: 1,
				artistsFeaturedDisplayName: 1,
				artistText: 1,
				artistsFeaturedText: 1,
				editorPrimaryName: 1,
				releaseYear: 1,
				releases: 1,
				artistsFeatured: 1,
				genres: 1,
				startBpm: 1,
				cleanDirty: 1,
				trackLength: 1,
				outroType: 1,
				introType: 1,
				gigTypes: 1,
				inKey: 1,
				versionType: 1,
				fileType: 1,
				originalWorks: 1,
				downloadCount: 1,
				version: 1,
				status: 1,
				publishedLowBitRateFile: 1,
				waveformImageSnippetFileName: 1,
				waveformImageSnippetFilePath: 1,
				waveformImageSnippetFileUrl: 1,
				formattedName: 1,
				downloadCountForPeriod: {
					$size: {
						$filter: {
							input: "$downloads",
							as: "downloadInstance",
							cond: {
								$eq: [ObjectId(accountingPeriodQueryParam), "$$downloadInstance.accountingPeriod"]
							}
						}
					}
				}
			}
		}, {
			$sort: sortCriteria
		}

	]);

	var aggregateQuery = Track.model.aggregatePaginate(trackQuery, {
		page: currentPage || 1,
		limit: rowsPerPage
	}, function(err, results, pageCount, count) {

		if (err) {

			console.error(err);
			return res.apiError(err);

		}
		else {

			Track.model.populate(results, {
				path: 'artist releases artistsFeatured inKey genres tier loopLength versionType outroType introType cleanDirty originalWorks gigTypes'
			}, function(err, populatedTrackResults) {

				if (err) return res.apiError('editor track list query error', err);

				EditorAccounting.model.findOne({
					editor: req.user._id,
					accountingPeriod: accountingPeriodQueryParam
				}).exec(function(err, editorAccounting) {

					if (err) return res.apiError('editor track list query error', err);

					return res.apiResponse({
						Accounting: editorAccounting,
						Tracks: {
							currentPage: currentPage,
							total: count,
							totalPages: pageCount,
							results: populatedTrackResults
						}
					});

				});


			});


		}

	});


}

exports.addCollection = function(req, res) {

	User.model.findByIdAndUpdate(req.user._id, {
		$addToSet: {
			collections: req.body._id
		}
	}, {
		new: true
	}, function(err, updatedUser) {

		if (err) return res.apiError('create error', err);

		res.apiResponse({
			User: {
				_id: updatedUser._id,
				collections: updatedUser.collections
			}
		});

	});


}

exports.removeCollection = function(req, res) {

	User.model.findByIdAndUpdate(req.user._id, {
		$pull: {
			collections: req.body._id
		}
	}, {
		new: true
	}, function(err, updatedUser) {

		if (err) return res.apiError('create error', err);

		res.apiResponse({
			User: {
				_id: updatedUser._id,
				collections: updatedUser.collections
			}
		});

	});


}