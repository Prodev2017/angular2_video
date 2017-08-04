var async = require('async'),
	keystone = require('keystone');
var fs = require('fs');
var mm = require('musicmetadata');
var zlib = require('zlib');
var Track = keystone.list('Track');
var Artist = keystone.list('Artist');
var Genre = keystone.list('Genre');
var Downloads = keystone.list('Downloads');
var Transactions = keystone.list('Transaction');
var Currency = keystone.list('Currency');
var mongoose = require('mongoose');
var GigTypes = keystone.list('GigType');
var Tags = keystone.list('Tag');
var OriginalWorks = keystone.list('OriginalWorks');
var Release = keystone.list('Release');
var Key = keystone.list('Key');
var probe = require('node-ffprobe');
var ffmpeg = require('fluent-ffmpeg');
var AWS = require('aws-sdk');
var moment = require('moment');
const exec = require('child_process').exec;
var zlib = require('zlib');
var ffmetadata = require('ffmetadata');
var bucketID = keystone.get('s3 config').bucket;
var _ = require('lodash');
var Sequelize = require('sequelize');
var utilities = require('../../../utilities');
var debug = require('debug')('submit');
var slugify = require("slug");
var readChunk = require('read-chunk'); // npm install read-chunk
var fileTypeChecker = require('file-type');
var os = require('os');

AWS.config.update({
	accessKeyId: keystone.get('s3 config').key,
	secretAccessKey: keystone.get('s3 config').secret
});

/**
 * List Tracks
 */
exports.list = function(req, res) {
	var memberId = req.params.memberId;
	Track.model.find().where('user', memberId).exec(function(err, items) {

		if (err) return res.apiError('database error', err);

		res.apiResponse({
			Tracks: items
		});

	});
}

exports.listDrafts = function(req, res) {

	var currencyId = req.query.currencyId;
	var isMigrated = req.query.migrated;
	var isValid = req.query.isValid;

	var TrackQuery = Track.model.find();

	TrackQuery.where('editor', req.user._id).where('currency', currencyId).where('status', 'draft').populate('genres gigTypes originalWorks')

	if (isValid) {

		TrackQuery.where('isTrackValid', true);

	}


	TrackQuery.exec(function(err, items) {

		if (err) return res.apiError('database error', err);

		var formattedResults = [];

		for (var i = 0; i < items.length; i++) {

			formattedResults.push(items[i].toObject());

			formattedResults[i].genres = formattedResults[i].genres.map(function(genre) {

				return genre._id;

			});

		}

		items = formattedResults;

		res.apiResponse({
			Tracks: {
				results: items,
				total: items.length
			}
		});

	});

}



/**
 * Get Track by ID
 */
exports.get = function(req, res) {
	Track.model.findById(req.params.id).populate('genres gigTypes originalWorks').exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		res.apiResponse({
			Track: item
		});

	});
}


/**
 * Create a Track preview
 */
exports.createPreview = function(req, res) {

	var currencyId = req.query.currencyId;

	var logPrefix = '[USER=' + req.user._id + ']';
	console.log(logPrefix, 'creating track for previewing and editing');

	async.waterfall([
			toCreateOrReplace,
			verifyBitRate,
			getWaveform,
			extractMetadataFromTrack,
			getGenres,
			getCleanDirtyTag,
			getVersionTypeTag,
			getIntroTypeTag,
			getOutroTypeTag,
			createPreviewTrack,
		],
		saveHiBitRateVersionToAmazonS3);

	/*
		res.apiResponse({
		TrackMetadata: probeData,
	});*/

	function toCreateOrReplace(callback) {
		console.log(logPrefix, 'toCreateOrReplace');
		if (req.files.file) {
			logPrefix += '[FILENAME=' + req.files.file.name + ']';
			console.log(logPrefix, req.files);
			callback(null, false);
		}
		else if (req.files && req.files.length === 1) {
			logPrefix += '[FILENAME=' + req.files.file.name + ']';
			console.log(logPrefix, req.files);
			callback(null, false);

		}

	}

	function verifyBitRate(replacementTrackID, callback) {
		console.log(logPrefix, 'verifyBitRate');

		var isMp3 = fileTypeChecker(readChunk.sync(req.files.file.path, 0, 10));

		if (isMp3.mime != 'audio/mpeg' || isMp3.ext != 'mp3') {

			return callback({
				title: "File is not a valid MP3 file."
			});

		}

		console.log(logPrefix, 'passed mp3 validation');

		replacementTrackID = replacementTrackID || null;
		probe(req.files.file.path, function(err, trackData) {
			if(err) return callback(err);
			if (trackData.streams[0].bit_rate < 320000 && req.files.file.isMigration !== true) {

				return callback({
					title: "Bit rate is below the 320Kbps minimum."
				});
			}
			else {
				trackData.metadata.hiBitRateFileBitRate = trackData.streams[0].bit_rate / 1000 + "Kbps";
				trackData.metadata.trackLength = Math.round(trackData.format.duration);
				trackData.metadata.fileType = trackData.streams[0].codec_type;
				return callback(null, trackData.metadata);
			}
		});
	}

	function getWaveform(trackData, callback) {

		console.log(logPrefix, 'getWaveform');
		var filenameParts = req.files.file.name.split('.');
		var waveformFileName = filenameParts[0] + '.png';
		var tmpPath = os.tmpdir() + '/' + waveformFileName;

		var waveform = ffmpeg(req.files.file.path)
			.complexFilter([
				'[0:a]aformat=channel_layouts=mono,compand=gain=-6,showwavespic=s=1200x120:colors=white,negate[a],color=black:1200x120[c],[c][a]alphamerge'
			])
			.frames(1)
			.output(tmpPath)
			.on('start', function(commandLine) {})
			.on('end', function() {

				var outStream = fs.createReadStream(tmpPath);

				var s3upload = new AWS.S3({
					params: {
						Bucket: keystone.get('s3 config').bucket,
						Key: 'waveforms/' + waveformFileName
					}
				});


				s3upload.upload({
						Body: outStream
					})
					.send(function(err, data) {


						if (err) {

							console.log('s3 upload', err);
							callback(err);

						}

						trackData.waveformImageFileName = waveformFileName;
						trackData.waveformImageFilePath = data.Key
						trackData.waveformImageFileUrl = data.Location;
						callback(null, trackData);

					});


			})
			.on('error', function(err) {

				console.log('waveform generation error', err);
				return callback(err);

			})
			.run();




	}


	function extractMetadataFromTrack(trackData, callback) {
		console.log(logPrefix, 'extractMetadataFromTrack');
		var parser = mm(fs.createReadStream(req.files.file.path), function(err, trackTags) {
			if (err) console.log(logPrefix, 'parse read error', err);
			if (trackTags) {

				if (trackTags.genre && trackTags.genre.length > 0) {
					trackData.genres = trackTags.genre[0].split(',').map(function(genre) {
						return genre.trim();
					}).slice(0, 3);
				}
				else {
					trackData.genres = [];
				}

				trackData.name = trackTags.title.trim();
				trackData.version = '';

				var titleVersionRegex = /\((.*?)\)/g;
				var titleVersionMatches = titleVersionRegex.exec(trackTags.title);
				if (titleVersionMatches && titleVersionMatches.length > 0) {
					trackData.version = (titleVersionMatches[1]) ? titleVersionMatches[1] : null;
					trackData.name = trackData.name.replace(titleVersionMatches[0], "").trim();
				}

				trackData.tagsToCategorize = [];

				var titleTagsRegex = /\[(.*?)\]/g;
				var tagsMatches = titleTagsRegex.exec(trackTags.title);
				if (tagsMatches && tagsMatches.length > 0) {

					var tagMatches = (tagsMatches[1]) ? tagsMatches[1] : '';
					var trackTagsMatches = tagsMatches[1].split(', ').map((expression) => {
						return new RegExp('^' + expression + '$', 'i');
					});

					trackData.name = trackData.name.replace(tagsMatches[0], '').trim();
					trackData.tagsToCategorize = trackTagsMatches;

				}


				//trackData.cleanDirty = (trackTagsMatches && trackTagsMatches.length > 0 && trackTagsMatches[0]) ? trackTagsMatches[0] : "";
				//	trackData.introType = (trackTagsMatches && trackTagsMatches.length > 0 && trackTagsMatches[1]) ? trackTagsMatches[1] : "";
				//	trackData.outroType = (trackTagsMatches && trackTagsMatches.length > 0 && trackTagsMatches[2]) ? trackTagsMatches[2] : "";
				//	trackData.versionType = (trackTagsMatches && trackTagsMatches.length > 0 && trackTagsMatches[3]) ? trackTagsMatches[3] : "";

				var trackArtistsFeaturedRegex = /(?:feat\.|ft\.|Ft\.|Feat\.|featuring|Featuring)(.*)/ig;
				var trackArtistsFeaturedMatches = trackArtistsFeaturedRegex.exec(trackData.artist);
				if (trackArtistsFeaturedMatches && trackArtistsFeaturedMatches.length > 0) {
					trackData.artistsFeaturedText = trackArtistsFeaturedMatches[1].replace("(", "").replace(")", "").trim();

					trackData.artistText = trackData.artist
						.replace("(", "")
						.replace(")", "")
						.replace(/feat\./i, "")
						.replace(/Feat\./i, "")
						.replace(/Ft\./i, "")
						.replace(/ft\./i, "")
						.replace(/featuring/i, "")
						.replace(/Featuring/i, "")
						.replace(trackData.artistsFeaturedText, "");
				}
				else {
					trackData.artistText = trackData.artist || "";
					trackData.artistsFeaturedText = "";
				}
				trackData.startBpm = trackData.TBPM || trackData.TBP || 0;
				trackData.endBpm = trackData.startBpm;

				if (trackData.startBpm.toString().length == 2) {
					trackData.startBpm = "0" + trackData.startBpm;
				}

				if (trackData.endBpm.toString().length == 2) {
					trackData.endBpm = "0" + trackData.endBpm;
				}

				trackData.releaseYear = (trackData.date && trackData.date.toString().length == 4) ? trackData.date : 0;
				trackData.editor = req.user._id;
				trackData.status = 'draft';
				trackData.gigTypes = [];
				trackData.energyRating = "";
				trackData.popularityRating = "";
				trackData.DJTiming = "";
				trackData.grouping = trackData.TIT1 || trackData.TT1 || "";
				var trackGroupingRegex = /\[([0-9]+)\]/g;

				var trackGroupingMatches = [];
				while ((trackGroupingMatch = trackGroupingRegex.exec(trackData.grouping)) !== null) {
					trackGroupingMatches.push(trackGroupingMatch[1]);
				}

				trackData.energyRating = (trackGroupingMatches[0]) ? trackGroupingMatches[0] : "";
				trackData.popularityRating = (trackGroupingMatches[1]) ? trackGroupingMatches[1] : "";
				trackData.DJTiming = (trackGroupingMatches[2]) ? trackGroupingMatches[2] : "";

				var trackOriginalWorksRegex = /\[([0-9A-Za-z,\-!&*%$#@^.; ]+)\]/g;

				var trackOriginalWorksMatches = [];
				while ((trackOriginalWorksMatch = trackOriginalWorksRegex.exec(trackData.composer)) !== null) {
					var originalWorkObject = trackOriginalWorksMatch[1].split(';');

					originalWorkObject = {
						name: originalWorkObject[0],
						version: originalWorkObject[1],
						artists: originalWorkObject[2],
						artistsFeatured: originalWorkObject[3]
					}

					trackOriginalWorksMatches.push(originalWorkObject);

				}


				trackData.originalWorksDraft = JSON.stringify(trackOriginalWorksMatches);
				trackData.originalFileName = req.files.file.originalname || "no filename";
				trackData.preprocessedForSubmission = true;

				trackData.artist = [];
				/* This is only for dev purposes -- must be changed at some point */
				trackData.currency = currencyId;

				//if(err && req.files.file.isMigration) callback(null, trackData);
				//if(err && !req.files.file.isMigration) callback({message: err}, trackData);

				callback(null, trackData);

			}
			else {

				callback(null, trackData);

			}

		});
	}

	function getGenres(trackData, callback) {
		console.log(logPrefix, 'getGenres');

		if (trackData.genres.length > 0) {
			Genre.model.find({
				name: {
					$in: trackData.genres
				}
			}).exec(function(err, genres) {
				if (genres && genres.length > 0) {
					trackData.genres = genres.map(function(genre) {
						return genre._id;
					});
					callback(err, trackData);
				}
				else {
					trackData.genres = [];
					callback(err, trackData);
				}
			});

		}
		else {
			callback(null, trackData);
		}

	}

	function getCleanDirtyTag(trackData, callback) {

		console.log(logPrefix, 'getCleanDirtyTag');

		Tags.model.findOne({
			name: {
				$in: trackData.tagsToCategorize
			},
			tagField: 'Tag 1'
		}).exec(function(err, tag) {
			if (tag) {
				trackData.cleanDirty = tag._id;
				callback(err, trackData);
			}
			else {
				trackData.cleanDirty = null;

				callback(err, trackData);
			}
		})
	}

	function getVersionTypeTag(trackData, callback) {
		console.log(logPrefix, 'getVersionTypeTag');

		Tags.model.findOne({
			name: {
				$in: trackData.tagsToCategorize
			},
			tagField: 'Tag 2'
		}).exec(function(err, tag) {
			//	console.log(tag);

			if (tag) {
				trackData.versionType = tag._id;
				callback(err, trackData);
			}
			else {
				trackData.versionType = null;
				callback(err, trackData);
			}
		})
	}

	function getIntroTypeTag(trackData, callback) {
		console.log(logPrefix, 'getIntroTypeTag');

		Tags.model.findOne({
			name: {
				$in: trackData.tagsToCategorize
			},
			tagField: 'Tag 3'
		}).exec(function(err, tag) {
			//	console.log(tag);

			if (tag) {
				trackData.introType = tag._id;
				callback(err, trackData);
			}
			else {
				trackData.introType = null;

				callback(err, trackData);
			}
		})
	}

	function getOutroTypeTag(trackData, callback) {
		console.log(logPrefix, 'getOutroTypeTag');

		Tags.model.findOne({
			name: {
				$in: trackData.tagsToCategorize
			},
			tagField: 'Tag 4'
		}).exec(function(err, tag) {

			if (tag) {
				trackData.outroType = tag._id;
				callback(err, trackData);
			}
			else {
				trackData.outroType = null;

				callback(err, trackData);
			}
		})
	}

	function createPreviewTrack(trackData, callback) {
		console.log(logPrefix, 'createPreviewTrack');

		var newTrack = new Track.model(trackData);

		newTrack.save(function(err) {
			logPrefix += '[TRACK=' + newTrack._id + ']';
			console.log(logPrefix, 'track created and saved in database');
			if (err) return callback(err);
			callback(null, newTrack);

		});

	}


	function saveHiBitRateVersionToAmazonS3(err, results) {
		console.log(logPrefix, 'saveHiBitRateVersionToAmazonS3');

		if (err) {
			console.log(logPrefix, 'createPreview track error', err);
			return res.apiResponse({
				error: true,
				message: err,
				originalFileName: req.files.file.originalname
			});
		}
		else {

			//AWS.config.update({accessKeyId: keystone.get('s3 config').key, secretAccessKey: keystone.get('s3 config').secret});

			var outStream = fs.createReadStream(req.files.file.path);

			var s3obj = new AWS.S3.ManagedUpload({
				params: {
					Bucket: keystone.get('s3 config').bucket + '/tracks/draft/hi_bit_rate',
					Key: req.files.file.name,
					Body: outStream
				}
			});

			s3obj.on('httpUploadProgress', function(evt) {

			});

			s3obj.send(function(err, data) {
				if (err) console.log(logPrefix, 'error saving into s3 bucket', err);

				console.log(logPrefix, 'track saved into s3 bucket');

				var hiBitRateFile = {
					filename: data.Key,
					originalname: req.files.file.originalname,
					path: '/tracks/draft/hi_bit_rate',
					filetype: 'audio/mp3',
					url: decodeURIComponent(data.Location.replace('/' + keystone.get('s3 config').bucket, '').replace('https://', '//' + keystone.get('s3 config').bucket + '.'))
				};

				Track.model.update({
					_id: results._id
				}, {
					$set: {
						hiBitRateFile: hiBitRateFile,
						draftTrackUploadedToS3: true
					}
				}, {
					new: true
				}, function(err, track) {

					console.log(logPrefix, 'draftTrackUploadedToS3 changed to true')

				});


			});

			return res.apiResponse({
				Track: results
			});

		}
	}



}

exports.submit = function(req, res) {

	var logPrefix = '[USER=' + req.user._id + '][TRACKID=' + req.body._id + ']';
	console.log(logPrefix, 'submitting track for publishing');

	async.waterfall([
			mapGenres,
			matchTags,
			matchArtist,
			matchFeaturedArtists,
			getHiBitRateTrackToProcess,
			getStandardKeyForTrack,
			getCamelotKeyForTrack,
			matchKey,
			createCombinationKeyForDisplay,
			createID3Tags,
			updateHiBitRateVersionToAmazonS3,
			saveLowBitRateVersionToAmazonS3,
			//	v1CreatePublishedTrack,
			//	v1CreateSampleTrack,
			//	prepareV1CrossListSQLQueries,
			submitTrack
		],
		returnSubmittedTrack);

	/*
	res.apiResponse({
	TrackMetadata: probeData,
});*/

	function updateStatusToProcessing(callback) {

		console.log(logPrefix, 'setting status as processing so any other jobs ignore this track');

		Track.model.update({
			_id: req.body._id,
			status: 'submitted'
		}, {
			$set: {
				status: 'processing'
			}
		}, function(err, track) {

			if (err) return callback(err);

			callback();

		});

	}

	function mapGenres(callback) {
		console.log(logPrefix, 'mapping genres');
		var trackData = req.body;

		Genre.model.find({
			_id: {
				$in: trackData.genres
			}
		}).exec(function(err, genres) {

			trackData.genresForID3 = genres.map(function(item) {
				return item.name;
			});
			callback(null, trackData);

		})

	}

	function matchArtist(trackData, callback) {
		console.log(logPrefix, 'match artists');

		//console.log(trackData);

		Artist.model.findOne({
			name: trackData.artistText.trim()
		}).exec(function(err, artist) {
			if (artist && artist.name && artist.name.length > 0) {
				trackData.artistLabel = trackData.artistText.trim();
				trackData.artist = artist._id;
				callback(err, trackData);
			}
			else {
				var newArtist = new Artist.model({
					name: trackData.artistText
				});
				newArtist.save(function(err, newArtist) {
					trackData.artistLabel = trackData.artistText.trim();
					trackData.artist = newArtist._id;
					callback(err, trackData);
				});

			}
		});

	}

	function matchFeaturedArtists(trackData, callback) {
		console.log(logPrefix, 'match featured artists');

		var artistsFeaturedArray;

		if (trackData.artistsFeaturedText && typeof trackData.artistsFeaturedText != 'undefined') {
			artistsFeaturedArray = trackData.artistsFeaturedText.split(',');
		}
		else {
			artistsFeaturedArray = [];
		}

		async.map(artistsFeaturedArray, function(item, forEachCallback) {

			var trimmedItem = item.trim();

			Artist.model.findOne({
				name: trimmedItem
			}).exec(function(err, artist) {
				//console.log(trimmedItem, artist);

				if (artist && artist.name && artist.name.length > 0) {
					item = artist._id;
					forEachCallback(err, item);
				}
				else {
					var newArtist = new Artist.model({
						name: trimmedItem
					});
					newArtist.save(function(err, newArtist) {
						item = newArtist._id;
						forEachCallback(err, item);
					});

				}
			});

		}, function(err, artistsFeatured) {
			if (err) console.error(err.message);
			// configs is now a map of JSON data
			//console.log(artistsFeatured);
			trackData.artistsFeatured = artistsFeatured;
			callback(err, trackData);
		});

	}

	function matchTags(trackData, callback) {
		console.log(logPrefix, 'match tags');
		var possibleTags = [trackData.cleanDirty, trackData.versionType, trackData.introType, trackData.outroType];
		var tagsToFind = [];
		trackData.tagsToIncludeOnID3 = [];

		for (var i = 0; i < possibleTags.length; i++) {
			if (possibleTags[i]) {
				tagsToFind.push(possibleTags[i]);
			}
		}

		Tags.model.find({
			_id: {
				$in: tagsToFind
			}
		}).exec(function(err, tags) {
			if (err) return callback(err);

			var pissBreakTag = tags.filter((tag) => {

				return tag.name == "DJ Mix / Piss Break";

			});

			if (pissBreakTag[0] && pissBreakTag[0].name == "DJ Mix / Piss Break") {

				trackData.skipKeyFinder = true;

			}
			else {

				trackData.skipKeyFinder = false;

			}

			trackData.tagsToIncludeOnID3 = tags;

			trackData.tagsToIncludeOnID3.sort(function(a, b) {
				return (tagsToFind.indexOf(a._id.toString()) > tagsToFind.indexOf(b._id.toString())) ? 1 : ((tagsToFind.indexOf(b._id.toString()) > tagsToFind.indexOf(a._id.toString())) ? -1 : 0)
			});
			callback(null, trackData);

		});

	}

	function getHiBitRateTrackToProcess(trackData, callback) {
		console.log(logPrefix, 'getHiBitRateTrackToProcess');
		console.log(logPrefix, 'fixing path', trackData.hiBitRateFile.filename);
		var s3download = new AWS.S3({
			params: {
				Bucket: keystone.get('s3 config').bucket,
				Key: 'tracks/draft/hi_bit_rate/' + trackData.hiBitRateFile.filename.replace('tracks/draft/hi_bit_rate/', '')
			}
		});
		trackData.s3download = s3download;


		var mp3FilePath = '/tmp/track_draft_hi_bit_rate_' + slugify(trackData.hiBitRateFile.filename.replace('.mp3','').replace('tracks/draft/hi_bit_rate/', '').replace('crooklynclanv2prod', keystone.get('s3 config').bucket).replace('//' + keystone.get('s3 config').bucket + '.s3.amazonaws.com/', '')) + '.mp3';

		var mp3File = require('fs').createWriteStream(mp3FilePath);

		var fileDownload = trackData.s3download.getObject().createReadStream()
			.on('error', function(err) {

				console.log('error reading from s3', err);
				return callback(err);

			}).pipe(mp3File);
			
		 mp3File.on('error', function (err) {
			console.log(err);
			return callback(err);
		  });

		mp3File.on('finish', function() {

			trackData.mp3FilePath = mp3FilePath;
			return callback(null, trackData);

		});

	}

	function getStandardKeyForTrack(trackData, callback) {
		console.log(logPrefix, 'getStandardKeyForTrack');

		if (!trackData.skipKeyFinder) {

			exec('./bin/keyfinder-cli ' + trackData.mp3FilePath, (err, stdout, stderr) => {
				if (err) {
					console.log(logPrefix, err);
					callback(err);
				}
				else {
					trackData.standardKey = stdout.replace(/\n$/, '');

					callback(null, trackData);
				}
			});

		}
		else {

			callback(null, trackData);

		}
	}

	function getCamelotKeyForTrack(trackData, callback) {

		console.log(logPrefix, 'getCamelotKeyForTrack');

		if (!trackData.skipKeyFinder) {

			exec('./bin/keyfinder-cli -n camelot ' + trackData.mp3FilePath, (err, stdout, stderr) => {
				if (err) {
					console.log(logPrefix, 'error reading key of track', err);
					callback(logPrefix, err);
				}
				else {
					trackData.camelotKey = stdout.replace(/\n$/, '');

					callback(null, trackData);
				}
			});

		}
		else {

			callback(null, trackData);

		}

	}

	function matchKey(trackData, callback) {
		console.log(logPrefix, 'match keys');

		if (!trackData.skipKeyFinder) {

			Key.model.findOne({
				camelotKey: trackData.camelotKey
			}).exec(function(err, key) {
				if (key && key.musicKey.length > 0) {
					trackData.inKeyLabel = key.musicKey + '/' + key.camelotKey;
					trackData.inKey = key._id;
					callback(err, trackData);
				}
				else {
					callback(err, trackData);
				}
			});

		}
		else {

			callback(null, trackData);
		}

	}

	function createCombinationKeyForDisplay(trackData, callback) {
		console.log(logPrefix, 'createCombinationKeyForDisplay');

		trackData.keyPrimaryName = trackData.standardKey + ' / ' + trackData.camelotKey;
		callback(null, trackData);

	}

	function createID3Tags(trackData, callback) {
		console.log(logPrefix, 'update ID3');

		var title = trackData.formattedName || trackData.title;

		var artist = trackData.artistLabel;
		if (trackData.artistsFeaturedLabel && trackData.artistsFeaturedLabel.length > 0) {
			artist += ' (' + trackData.artistsFeaturedLabel + ')';
		}

		var id3Tags = {
			date: trackData.releaseYear,
			'TBPM': parseInt(trackData.startBpm),
			album: "Promo Single",
			album_artist: "Promo Single",
			publisher: "www.crooklynclan.net",
			'TIT1': "CCV 2.0",
			title: title.replace(/\"/g,'\\"'),
			artist: trackData.editor.stageName + ' / ' + artist,
			genre: trackData.genresForID3,
			composer: "CCV 2.0",
			'TKEY': trackData.keyPrimaryName.replace(/\r/g, " / ").replace(/\n/g, "")
		}

		trackData.id3Tags = id3Tags;
		callback(null, trackData);

	}

	function updateHiBitRateVersionToAmazonS3(trackData, callback) {

		console.log(logPrefix, 'update hi bit rate version of file');

		trackData.mp3FileName = slugify(trackData.editor.stageName + '_' + trackData.artistText.trim() + '_' + trackData.id3Tags.title, '_') + '_' + trackData._id + '.mp3';

		//var coverBuffer = fs.readFileSync('path_to_cover.jpg');
		var s3upload = new AWS.S3({
			params: {
				Bucket: keystone.get('s3 config').bucket,
				Key: 'tracks/published/hi_bit_rate/' + trackData.mp3FileName
			}
		});

		ffmetadata.write(trackData.mp3FilePath, trackData.id3Tags, function(err) {

			if (err) {
				console.log(logPrefix, "Error writing metadata", err);
				return callback(err);
			}

			var outStream = fs.createReadStream(trackData.mp3FilePath);

			s3upload.upload({
					Body: outStream
				})
				.send(function(err, data) {

					if (err) return callback(err);

					trackData.publishedHiBitRateFile = {

						filename: data.Key,
						originalname: trackData.hiBitRateFile.filename,
						path: '/tracks/published/hi_bit_rate',
						filetype: 'audio/mp3',
						url: decodeURIComponent(data.Location)

					};
					return callback(null, trackData);

				});

		});

	}

	function saveLowBitRateVersionToAmazonS3(trackData, callback) {
		console.log(logPrefix, 'saveLowBitRateVersionToAmazonS3');

		if (trackData.customDraftSnippetFile && trackData.customDraftSnippetFile.filename) {
			var customSnippetFilename = trackData.customDraftSnippetFile.filename.replace('tracks/draft/previews/', '');
			var s3CopySource = keystone.get('s3 config').bucket + '/' + trackData.customDraftSnippetFile.filename;
			var s3Bucket = keystone.get('s3 config').bucket;

			var publishedSnippetFilename = customSnippetFilename.replace('.mp3', '') + '_' + trackData._id + '_S.mp3';

			var s3copy = new AWS.S3();
			s3copy.copyObject({
				Bucket: s3Bucket,
				Key: 'tracks/published/low_bit_rate/' + publishedSnippetFilename,
				CopySource: s3CopySource
			}, function(err, data) {
				if (err) return console.log(logPrefix, err, err.stack); // an error occurred

				trackData.publishedLowBitRateFile = {

					filename: 'tracks/published/low_bit_rate/' + publishedSnippetFilename,
					originalname: trackData.mp3FileName,
					path: '/tracks/published/low_bit_rate',
					filetype: 'audio/mp3',
					url: 'https://' + s3Bucket + '.s3.amazonaws.com/tracks/published/low_bit_rate/' + publishedSnippetFilename

				};

				return callback(null, trackData);

			});


		}
		else {

			var s3upload = new AWS.S3({
				params: {
					Bucket: keystone.get('s3 config').bucket,
					Key: 'tracks/published/low_bit_rate/' + trackData.hiBitRateFile.filename.replace('tracks/draft/hi_bit_rate/', '')
				}
			});
			console.log(logPrefix, 'mp3 path for creating auto snippet', trackData.mp3FilePath);

			var mp3PreviewFilePath = '/tmp/track_draft_low_bit_rate_' + trackData.hiBitRateFile.filename.replace('tracks/draft/hi_bit_rate/', '');

			ffmpeg(trackData.mp3FilePath)
				.audioCodec('libmp3lame')
				.duration(210)
				.audioBitrate('64k')
				.audioChannels(1)
				.format('mp3')
				.save(mp3PreviewFilePath)
				.on('start', function(cmd) {})
				.on('error', function(err) {
					console.log(logPrefix, 'An error occurred while generating snippet ' + err.message);
				})
				.on('end', function() {
					var outStream = fs.createReadStream(mp3PreviewFilePath);
					s3upload.upload({
							Body: outStream
						})
						.send(function(err, data) {
							if (err) callback(err);

							trackData.publishedLowBitRateFile = {
								filename: data.Key,
								originalname: trackData.mp3FileName,
								path: '/tracks/published/low_bit_rate',
								filetype: 'audio/mp3',
								url: decodeURIComponent(data.Location)
							};

							console.log(logPrefix, 'generate waveform for automatically generated snippet');
							var filenameParts = trackData.mp3FilePath.replace('/tmp/', '').split('.');
							var waveformFileName = filenameParts[0].replace('track_draft_hi_bit_rate_', '') + '_S.png';
							var tmpPath = os.tmpdir() + '/' + waveformFileName;


							var waveform = ffmpeg(mp3PreviewFilePath)
								.complexFilter([
									'[0:a]aformat=channel_layouts=mono,compand=gain=-6,showwavespic=s=1200x120:colors=white,negate[a],color=black:1200x120[c],[c][a]alphamerge'
								])
								.frames(1)
								.output(tmpPath)
								.on('end', function() {
									var waveFormOutStream = fs.createReadStream(tmpPath);

									var s3upload = new AWS.S3({
										params: {
											Bucket: keystone.get('s3 config').bucket,
											Key: 'waveforms/' + waveformFileName
										}
									});


									s3upload.upload({
											Body: waveFormOutStream
										})
										.send(function(err, data) {
											if (err) callback(err);

											trackData.waveformImageSnippetFileName = waveformFileName;
											trackData.waveformImageSnippetFilePath = data.Key;
											trackData.waveformImageSnippetFileUrl = data.Location;
											console.log(logPrefix, 'waveform for auto snippet info');
											callback(null, trackData);

										});


								})
								.on('error', function(err) {

									console.log(logPrefix, 'waveform generation error', err);
									callback(err);

								})
								.run();



						});

				});

		}

	}


	function v1CreatePublishedTrack(trackData, callback) {
		console.log(logPrefix, 'copy v1 publish track');


		if (trackData.releases && trackData.releases.length == 0 && trackData.currency.toString() == process.env.AUDIO_VAULT_CURRENCY_ID.toString() && trackData.editor.crooklynClanV1ArtistID) {


			trackData.mp3FileName = trackData.artistText.trim() + '_' + trackData.id3Tags.title.trim();
			trackData.mp3FileName = slugify(trackData.mp3FileName, '_') + '_' + trackData._id + '.mp3';

			var s3CopySource = keystone.get('s3 config').bucket + '/' + trackData.publishedHiBitRateFile.filename;
			var s3Key = 'Tracks-' + slugify(trackData.editor.stageName, '').replace('-', '') + '/v2_' + trackData.mp3FileName;
			var s3Bucket = keystone.get('v1 s3 config').bucket;
			var s3copy = new AWS.S3();
			s3copy.copyObject({
				Bucket: s3Bucket,
				Key: s3Key,
				CopySource: s3CopySource
			}, function(err, data) {
				if (err) console.log(logPrefix, err, err.stack); // an error occurred
				trackData.crooklynClanv1PublishedTrack = 'Tracks-' + slugify(trackData.editor.stageName, '').replace('-', '') + '/v2_' + trackData.mp3FileName;
				callback(null, trackData);

			});
		}

		else {
			callback(null, trackData);

		}



	}

	function v1CreateSampleTrack(trackData, callback) {

		console.log(logPrefix, 'copy v1 sample track');
		if (trackData.releases && trackData.releases.length == 0 && trackData.currency.toString() == process.env.AUDIO_VAULT_CURRENCY_ID.toString() && trackData.editor.crooklynClanV1ArtistID) {

			trackData.mp3FileName = trackData.artistText.trim() + '_' + trackData.id3Tags.title.trim();
			trackData.mp3FileName = slugify(trackData.mp3FileName, '_') + '_' + trackData._id + '_S.mp3';

			var s3CopySource = keystone.get('s3 config').bucket + '/' + trackData.publishedLowBitRateFile.filename;

			var s3Key = 'Snippets/v2_' + trackData.mp3FileName;
			var s3Bucket = keystone.get('v1 s3 config').bucket;

			var s3copy = new AWS.S3();
			s3copy.copyObject({
				Bucket: s3Bucket,
				Key: s3Key,
				CopySource: s3CopySource
			}, function(err, data) {
				if (err) console.log(logPrefix, err, err.stack); // an error occurred

				trackData.crooklynClanv1SampleTrack = 'Snippets/v2_' + trackData.mp3FileName;
				callback(null, trackData);

			});

		}
		else {

			callback(null, trackData);

		}
	}



	function prepareV1CrossListSQLQueries(trackData, callback) {
		console.log(logPrefix, 'prepareV1CrossListSQLQueries');
		// Make sure we're not submitting a track that was migrated from v1 to avoid duplicate content
		if (trackData.crooklynClanv1ProductID || trackData.crooklynClanv1ProductCode || trackData.releases.length > 0 || trackData.currency.toString() != process.env.AUDIO_VAULT_CURRENCY_ID.toString() || !trackData.editor.crooklynClanV1ArtistID) {

			callback(null, trackData);

		}
		else {

			var updatedTrackData = utilities.prepareTrackOrReleaseForBackwardsV1CrossListing(trackData, trackData.editor, function(data) {

				console.log(logPrefix, 'Made it to the callback on v1 cross list query');

				trackData = Object.assign(trackData, {
					crooklynClanv1ProductID: data.results.track.id,
					crooklynClanv1ProductCode: data.results.productCode
				});

				callback(null, trackData);

			});


		}

	}


	function submitTrack(trackData, callback) {

		console.log(logPrefix, 'submit track in database');

		Track.model.findOne({
			_id: trackData._id,
			editor: trackData.editor._id
		}).exec(function(err, track) {

			if (err) return callback(err);

			track.set({
				status: 'published',
				enabled: true,
				inKey: trackData.inKey,
				keyPrimaryName: trackData.keyPrimaryName,
				artistsFeaturedDisplayName: trackData.artistsFeaturedLabel,
				artist: trackData.artist,
				artistPrimaryName: trackData.artistLabel,
				artistsFeatured: trackData.artistsFeatured,
				publishedHiBitRateFile: trackData.publishedHiBitRateFile,
				publishedLowBitRateFile: trackData.publishedLowBitRateFile,
				crooklynClanv1PublishedTrack: trackData.crooklynClanv1PublishedTrack,
				crooklynClanv1SampleTrack: trackData.crooklynClanv1SampleTrack,
				crooklynClanv1ProductID: trackData.crooklynClanv1ProductID,
				crooklynClanv1ProductCode: trackData.crooklynClanv1ProductCode,
				waveformImageSnippetFileUrl: trackData.waveformImageSnippetFileUrl,
				waveformImageSnippetFilePath: trackData.waveformImageSnippetFilePath,
				waveformImageSnippetFileName: trackData.waveformImageSnippetFileName
			});

			track.save(function(err) {

				if (err) return callback(err);

				Track.model.findById(track._id).populate('originalWorks').exec(function(err, updatedTrack) {

					var originalWorksArray = updatedTrack.originalWorks.map((item) => {
						return item.displayName;
					});

					var joinedOriginalWorksString = originalWorksArray.join(' ');

					if (track.artistsFeaturedDisplayName) {

						joinedOriginalWorksString = track.formattedName + ' ' + track.artistsDisplayName + ' ' + track.artistsFeaturedDisplayName + ' ' + joinedOriginalWorksString;

					}
					else {

						joinedOriginalWorksString = track.formattedName + ' ' + track.artistsDisplayName + ' ' + joinedOriginalWorksString;

					}

					updatedTrack.set({
						textSearchField: joinedOriginalWorksString
					});

					updatedTrack.save(function(err) {
						if (err) return callback(err);
						return callback(null, trackData);

					});


				});


			});

		});

	}

	function returnSubmittedTrack(err, results) {

		if (err) {

			Track.model.update({
				_id: req.body._id
			}, {
				$set: {
					errorMessage: JSON.stringify(err),
					status: 'error'
				}
			}, function(updateErr, track) {

				console.log(logPrefix, 'error publishing track', err);

				if (updateErr) {

					console.log(logPrefix, 'error saving track error message', updateErr);

				}
				req.publishCallback();

			});

		}
		else {
			req.publishCallback();
		}

	}

	/*
	Preserve in case of direct track submission via REST API

	function returnSubmittedTrack(err, results) {
		if(err) { console.log(err); }
		Track.model.findById(results._id).populate('genres gigTypes inKey cleanDirty versionType introType originalWorks outroType').exec(function(err, track) {

			if (err) {
				console.log(err);
				return res.apiError('database error', err);
			}

			var formattedTrack = track.toObject();

				res.apiResponse({
					Track: formattedTrack
				});

		});
	}

	Preserve in case of direct track submission via REST API
	*/

}

exports.updatePreview = function(req, res) {
	var trackId = req.params.id || req.body._id;

	var logPrefix = '[USER=' + req.user._id + '][TRACKID=' + trackId + ']';

	console.log(logPrefix, 'updating track preview');


	if (req.files && req.files.sampleTrack_upload) {
		console.log(logPrefix, 'processing custom preview snippet');

		var isMp3 = fileTypeChecker(readChunk.sync(req.files.sampleTrack_upload.path, 0, 10));
		console.log(logPrefix, 'file type checker output', isMp3);

		if (!isMp3 || isMp3.mime != 'audio/mpeg' || isMp3.ext != 'mp3') {
			return res.apiError(logPrefix + 'snippet not mp3', req.files.sampleTrack_upload.originalname + ' is not a valid MP3 file.');
		}
		console.log(logPrefix, 'passed mp3 validation');

		var sampleDraftFileName = 'processed_preview_draft_' + req.files.sampleTrack_upload.name;
		var sampleDraftFilePath = os.tmpdir() + '/' + sampleDraftFileName;

		var s3obj = new AWS.S3({
			params: {
				Bucket: keystone.get('s3 config').bucket,
				Key: 'tracks/draft/previews/' + req.files.sampleTrack_upload.name
			}
		});

		var ffmpegProcessTrackCommand = 'ffmpeg -i ' + req.files.sampleTrack_upload.path + ' -codec:a libmp3lame -t 210 -b:a 64k -y ' + sampleDraftFilePath;

		console.log(logPrefix, ffmpegProcessTrackCommand);

		exec(ffmpegProcessTrackCommand, (err, stdout, stderr) => {

			if (err) {
				console.log(logPrefix, err);
			}

			var outStream = fs.createReadStream(sampleDraftFilePath);

			s3obj.upload({
					Body: outStream
				})
				.send(function(err, data) {

					if (err) console.log(logPrefix, err);
					Track.model.findOne({
						_id: trackId,
						editor: req.user._id
					}).exec(function(err, track) {
						if (err) {
							console.log(logPrefix, err);
						}

						track.set({
							customDraftSnippetFileStatus: 'processed',
							customDraftSnippetFile: {

								filename: data.Key,
								originalname: req.files.sampleTrack_upload.originalname,
								path: '/tracks/draft/previews',
								filetype: 'audio/mp3',
								url: decodeURIComponent(data.Location)

							}
						});

						console.log(logPrefix, 'getSnippetWaveform');
						var filenameParts = req.files.sampleTrack_upload.name.split('.');
						var waveformFileName = filenameParts[0] + '_S.png';
						var tmpPath = os.tmpdir() + '/' + waveformFileName;

						var waveform = ffmpeg(req.files.sampleTrack_upload.path)
							.complexFilter([
								'[0:a]aformat=channel_layouts=mono,compand=gain=-6,showwavespic=s=1200x120:colors=white,negate[a],color=black:1200x120[c],[c][a]alphamerge'
							])
							.frames(1)
							.output(tmpPath)
							.on('end', function() {
								var outStream = fs.createReadStream(tmpPath);

								var s3upload = new AWS.S3({
									params: {
										Bucket: keystone.get('s3 config').bucket,
										Key: 'waveforms/' + waveformFileName
									}
								});


								s3upload.upload({
										Body: outStream
									})
									.send(function(err, data) {
										if (err) callback(err);
										console.log(logPrefix, 'custom snippet waveform generated and uploaded');

										track.set({
											waveformImageSnippetFileName: waveformFileName
										});
										track.set({
											waveformImageSnippetFilePath: data.Key
										});
										track.set({
											waveformImageSnippetFileUrl: data.Location
										});

										track.save(function(err) {

											if (err) console.log(logPrefix, err);

											res.apiResponse({
												Track: track
											});

										});

									});


							})
							.on('error', function(err) {

								console.log('waveform generation error', err);
								callback(err);

							})
							.run();





					});

				});



		});


	}
	else {


		async.waterfall([
				checkForRedundancyIfI12Inch,
				mapGenres,
				mapGigTypes,
				matchTags,
				matchOriginalWorks,
				updateTrack
			],
			returnUpdatedTrack);

	}

	/*
		res.apiResponse({
		TrackMetadata: probeData,
	});*/

	function checkForRedundancyIfI12Inch(callback) {

		console.log(logPrefix, 'checking for i12 inch redundancy');

		var trackData = req.body;

		if (trackData.currency == process.env.I12INCH_CURRENCY_ID) {

			Track.model.findOne({
				_id: {
					$ne: trackData._id
				},
				currency: process.env.I12INCH_CURRENCY_ID,
				name: trackData.name,
				version: trackData.version,
				artistPrimaryName: trackData.artistText,
				cleanDirty: trackData.cleanDirty,
				versionType: trackData.versionType,
				introType: trackData.introType,
				outroType: trackData.outroType,
				status: 'published'
			}).exec(function(err, duplicateTrack) {

				if (err) return callback(err);

				if (duplicateTrack) {

					console.log(logPrefix, 'existing track found, marking as duplicate');

					trackData.draftFlaggedAsDuplicate = true;

					callback(null, trackData);

				}
				else {
					console.log(logPrefix, 'existing track not found, marking as not duplicate');

					trackData.draftFlaggedAsDuplicate = false;
					callback(null, trackData);

				}



			});


		}
		else {

			callback(null, trackData);

		}

	}

	function mapGenres(trackData, callback) {

		console.log(logPrefix, 'mapping genres');

		var trackData = req.body;

		//console.log(trackData.genres);

		if (trackData.genres && trackData.genres.length > 0) {

			//console.log(trackData.genres);

			for (var i = 0; i < trackData.genres.length; i++) {

				if (typeof trackData.genres[i] === "object" && trackData.genres[i].id) {

					trackData.genres[i] = trackData.genres[i].id;

				}

			}

		}

		callback(null, trackData);

	}

	function mapGigTypes(trackData, callback) {
		console.log(logPrefix, 'mapping gig types');
		var isDuplicate = false;
		if (trackData.gigTypes) {

			//console.log(logPrefix,'this is gigtype entry:', trackData.gigTypeEntry);
			async.map(trackData.gigTypes, function(gigTypeEntry, gigTypeEntryCallback) {

				GigTypes.model.findOne({
						'name': gigTypeEntry.name,
						'djTiming': gigTypeEntry.djTiming + '',
						'energy': gigTypeEntry.energy + '',
						'popularity': gigTypeEntry.popularity + ''
					})
					.exec(function(err, gigType) {
						//console.log(trackData.gigTypes);

						if (err) callback(err);

						if (gigType) {

							gigTypeEntryCallback(null, gigType._id);

						}

					});

			}, function(err, gigTypes) {

				trackData.gigTypes = gigTypes;

				callback(null, trackData);

			});

		}

	}

	function matchTags(trackData, callback) {
		console.log(logPrefix, 'match tags');
		var possibleTags = [trackData.cleanDirty, trackData.versionType, trackData.introType, trackData.outroType];
		var tagsToFind = [];

		if (possibleTags) {
			for (var i = 0; i < possibleTags.length; i++) {
				if (possibleTags[i] && possibleTags[i].length > 0) {
					tagsToFind.push(possibleTags[i]);
				}
			}
		}

		Tags.model.find({
			_id: {
				$in: tagsToFind
			}
		}).exec(function(err, tags) {
			if (err) callback(err);
			trackData.tagsToIncludeOnID3 = tags;
			callback(null, trackData);
		});

	}

	function doesOriginalWorkHaveId(originalWork, eachOriginalWorkCallback) {
		console.log(logPrefix, 'doesOriginalWorkHaveId');

		if (originalWork.id || originalWork._id) {
			eachOriginalWorkCallback(null, originalWork);

		}
		else {
			originalWork.id3Label = '[' + originalWork.name.trim() + ';' + originalWork.version.trim() + ';' + originalWork.artists.trim() + ';' + originalWork.artistsFeatured.trim() + ']';
			OriginalWorks.model.findOne({
				$and: [{
					name: originalWork.name.trim(),
					version: originalWork.version.trim(),
					artistsDisplayName: originalWork.artists.trim(),
					artistsFeaturedDisplayName: originalWork.artistsFeatured.trim()
				}]
			}).exec(function(err, foundOriginalWork) {

				if (foundOriginalWork && foundOriginalWork._id) {
					originalWork = foundOriginalWork;
					console.log(logPrefix, "This original work was found already: ", originalWork);
				}
				else {
					console.log(logPrefix, "Work was not found", {
						name: originalWork.name.trim(),
						version: originalWork.version.trim(),
						artistsDisplayName: originalWork.artists.trim(),
						artistsFeaturedDisplayName: originalWork.artistsFeatured.trim()
					});
					originalWork.name = originalWork.name.trim();
					originalWork.version = originalWork.version.trim();
				}

				eachOriginalWorkCallback(null, originalWork);

			});
		}

	}

	function matchOrCreateArtists(originalWork, eachOriginalWorkCallback) {
		console.log(logPrefix, 'matchOrCreateArtists', originalWork._id, originalWork.id);

		if (originalWork._id) {

			eachOriginalWorkCallback(null, originalWork);

		}
		else {

			var artistsArray = originalWork.artists.split(',');

			async.map(artistsArray, function(item, forEachArtistCallback) {

				var trimmedItem = item.trim();

				Artist.model.findOne({
					name: trimmedItem
				}).exec(function(err, artist) {

					//	console.log("This is the result of the artist query: ",artist);

					if (artist && artist.name && artist.name.length > 0) {

						itemId = artist._id;
						forEachArtistCallback(null, itemId);

					}
					else {

						var newArtist = new Artist.model({
							name: trimmedItem
						});
						newArtist.save(function(err, newArtist) {
							itemId = newArtist._id;
							forEachArtistCallback(null, itemId);
						});

					}
				});

			}, function(err, artists) {
				if (err) console.error(err.message);
				// configs is now a map of JSON data
				originalWork.artists = artists;
				eachOriginalWorkCallback(null, originalWork);

			});

		}
	}

	function matchOrCreateFeaturedArtists(originalWork, eachOriginalWorkCallback) {
		console.log(logPrefix, 'matchOrCreateFeaturedArtists', originalWork._id, originalWork.id);

		if (originalWork._id) {

			eachOriginalWorkCallback(null, originalWork);

		}
		else {

			var artistsFeaturedArray = originalWork.artistsFeatured.split(',');
			if (artistsFeaturedArray.length > 0 && artistsFeaturedArray[0] != "") {


				async.map(artistsFeaturedArray, function(item, forEachFeaturedArtistCallback) {

					var trimmedItem = item.trim();

					Artist.model.findOne({
						name: trimmedItem
					}).exec(function(err, artist) {

						if (artist && artist.name && artist.name.length > 0) {
							item = artist._id;
							forEachFeaturedArtistCallback(err, item);
						}
						else {
							var newArtist = new Artist.model({
								name: trimmedItem
							});
							newArtist.save(function(err, newArtist) {
								item = newArtist._id;
								forEachFeaturedArtistCallback(err, item);
							});

						}
					});


				}, function(err, artistsFeatured) {
					if (err) console.error(err.message);
					// configs is now a map of JSON data
					originalWork.artistsFeatured = artistsFeatured;
					eachOriginalWorkCallback(null, originalWork);

				});

			}
			else {
				originalWork.artistsFeatured = [];
				eachOriginalWorkCallback(null, originalWork);
			}
		}
	}

	function compileOriginalWorksAndSave(originalWork, eachOriginalWorkCallback) {
		console.log(logPrefix, 'compileOriginalWorksAndSave');

		if (originalWork._id) {
			eachOriginalWorkCallback(null, originalWork);
		}
		else {
			var newOriginalWork = new OriginalWorks.model();
			newOriginalWork.set(originalWork);
			if (originalWork.isOriginalWorkEntry) {

				newOriginalWork.set({
					sourceTrack: trackId
				});

			}
			newOriginalWork.save(function(err) {

				if (err) {

					eachOriginalWorkCallback(err);

				}
				else {

					originalWork._id = newOriginalWork._id;
					eachOriginalWorkCallback(null, originalWork);

				}
			});
		}
	}

	function matchOriginalWorks(trackData, callback) {
		console.log(logPrefix, 'match original works');

		//Repeat for each item
		//Step 1: Let's see if there's an id. If there is, then we just need to push that to the original works array.
		//Step 2: If no id, then we know we'll have to create the original works
		//Step 3: Look up each artist. If there's a match, then grab the id. If not, we need to add them.
		//Step 4: Look up each featured artist. If there's a match, then grab the id. IF not, we need to add them.
		//Step 5: Take the ids for artists and ids for featured artists and then we can add the original work. Then push to array of original works.

		trackData.originalWorksID3Label = '';
		async.map(trackData.originalWorks, function(originalWork, itemCallback) {

				async.waterfall([
						async.constant(originalWork),
						doesOriginalWorkHaveId,
						matchOrCreateArtists,
						matchOrCreateFeaturedArtists,
						compileOriginalWorksAndSave
					],
					function(err, processedOriginalWork) {
						if (err) {
							console.log(logPrefix, 'match original works save error');
							return res.apiError('original works save error', err.toString());
						}
						//console.log("The end of applyEachSeries: ", err,processedOriginalWork._id);
						trackData.originalWorksID3Label += processedOriginalWork.id3Label;
						//console.log("this is the item that will be returned: ", processedOriginalWork);
						if (processedOriginalWork._id && typeof processedOriginalWork._id === "ObjectId") {
							console.log(logPrefix, 'is objid');
							itemCallback(null, mongoose.Types.ObjectId(processedOriginalWork._id));
						}

						else {
							console.log(logPrefix, 'is str');
							itemCallback(null, mongoose.Types.ObjectId(processedOriginalWork._id));
						}

					})

			},
			function(err, correctedOriginalWorks) {

				if (err) {

					return res.apiError('error matching original works', err);
				}
				trackData.originalWorks = _.uniqWith(correctedOriginalWorks, _.isEqual);
				callback(null, trackData);
			})

	}

	function addNewReleases(trackData, callback) {
		var revisedReleasesArray = [];

		async.each(trackData.releases, function(release, releaseCallback) {

			if (release._id) {
				revisedReleasesArray.push(release);
				releaseCallback();
			}
			else {
				var newRelease = new Release.model({
					name: release.name,
					editor: req.user._id
				});
				newRelease.save(function(err) {
					revisedReleasesArray.push(newRelease);
					releaseCallback(err);
				});
			}

			// Perform operation on file here.
		}, function(err) {
			// if any of the file processing produced an error, err would equal that error
			if (err) {
				// One of the iterations produced an error.
				// All processing will now stop.
				console.log(logPrefix, err);
			}
			else {

				trackData.releases = revisedReleasesArray;
				callback(null, trackData)

			}
		});


	}

	function resolveReleasesIntoIDs(trackData, callback) {

		trackData.releases = trackData.releases.map(function(release) {
			return release._id;
		});

		callback(null, trackData);

	}

	function updateTrack(trackData, callback) {

		console.log(logPrefix, 'update track in database');
		Track.model.findOne({
			_id: trackData._id,
			editor: req.user._id
		}).exec(function(err, track) {

			console.log(logPrefix, 'this is the results for original works', trackData.formattedName);

			track.set({
				isTrackValid: trackData.validation.isTrackValid
			});

			if (trackData.customDraftSnippetFile == 'remove') {

				trackData.customDraftSnippetFile = null;
				trackData.customDraftSnippetFileStatus = null;

			}
			else {

				delete trackData.customDraftSnippetFile;
				delete trackData.customDraftSnippetFileStatus;

			}


			track.getUpdateHandler(req).process(trackData, function(err) {


				Track.model.findById(track._id).populate('cleanDirty introType outroType versionType').exec(function(err, track) {

					var name = track.name;
					var version = track.version;
					var metaDataBrackets = [];

					if (track.cleanDirty && track.cleanDirty.name) {

						metaDataBrackets.push(track.cleanDirty.name);

					}
					//DEPRECATED 2/16/17 because readability of track name is too hard with additional tags except clean/dirty
					/*	if (track.introType && track.introType.name !== 'Unedited') {

							metaDataBrackets.push(track.introType.name);

						}

						if (track.outroType && track.outroType.name !== 'Unedited') {

							metaDataBrackets.push(track.outroType.name);

						}

						if (track.versionType && track.versionType.name !== 'Full Mix') {

							metaDataBrackets.push(track.versionType.name);

						} */

					metaDataBrackets = metaDataBrackets.join(', ');

					track.formattedName = name + ' (' + version + ')[' + metaDataBrackets + ']';

					track.save(function(err) {

						if (err) return callback(err);
						return callback(null, track);

					});


				});

			});



		});


	}

	function returnUpdatedTrack(err, results) {
		if (err) return res.apiError(logPrefix + ' error', err);

		Track.model.findById(results._id).populate('genres gigTypes originalWorks').exec(function(err, track) {

			if (err) return res.apiError(logPrefix + ' database error', err);

			var formattedTrack = track.toObject();

			formattedTrack.genres = formattedTrack.genres.map(function(genre) {
				return genre._id;
			});

			res.apiResponse({
				Track: formattedTrack
			});

		});
	}

}

exports.downloadHiBitRateTrack = function(req, res) {

	Track.model.findById(req.params.id).exec(function(err, track) {

		var s3download = new AWS.S3();
		var params = {
			Bucket: keystone.get('s3 config').bucket,
			Key: track.hiBitRateFile.filename
		};
		var url = s3download.getSignedUrl('getObject', params);

		res.apiResponse({
			url: url
		});

	});

}

exports.downloadTrack = function(req, res) {

	var downloadId = req.body.downloadId;
	var trackId = req.body.trackId;

	Downloads.model.findOne({
		_id: downloadId,
		user: req.user._id
	}).populate('track').exec(function(err, authorizedDownload) {

		Track.model.find({
			releases: authorizedDownload.track.releases,
			_id: trackId
		}).exec(function(err, relatedTracks) {

			var requestedTrack = relatedTracks.find((item) => {

				return item._id == trackId;

			});

			if (!requestedTrack) {
				requestedTrack = authorizedDownload.track;
			}


			var s3download = new AWS.S3();
			var trackKey;

			if (requestedTrack.fileType == 'audio') {
				trackKey = requestedTrack.publishedHiBitRateFile.filename
			}
			else {
				trackKey = requestedTrack.publishedHiBitRateFile.path.replace(/^\/+/g, '') + '/' + requestedTrack.publishedHiBitRateFile.filename;

			}

			var params = {
				Bucket: keystone.get('s3 config').bucket,
				Key: trackKey,
				ResponseContentDisposition: 'attachment',
				Expires: 20
			};
			var keyName = requestedTrack.hiBitRateFile.filename.split('/');
			var filename = keyName[keyName.length - 1];

			s3download.getSignedUrl('getObject', params, function(err, data) {

				if (err) return res.apiError('error getting download link', err);

				return res.send({
					url: data
				});
			});

		});

	});

}


/**
 * Delete Track by ID
 */
exports.remove = function(req, res) {
	Track.model.findOne({
		_id: req.params.id,
		editor: req.user._id,
		status: 'draft'
	}).exec(function(err, item) {
		if (err) return res.apiError('database error', err);

		if (item) {

			if (req.user._id.toString() == item.editor.toString() && item.status == 'draft' && !item.crooklynClanv1ProductID && !item.crooklynClanv1ProductCode) {

				item.remove(function(err) {

					if (err) return res.apiError('delete error', err);

					return res.apiResponse({
						success: true
					});

				});
			}
			else {
				return res.apiError('item not found or cannot be deleted');
			}

		}
		else {

			return res.apiResponse({
				success: true
			});

		}
	});
}
