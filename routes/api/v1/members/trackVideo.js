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
 * Create a video track preview
 */
exports.createPreview = function(req, res) {

	var currencyId = req.query.currencyId;
	var logPrefix = '[USER=' + req.user._id + ']';

	async.waterfall([
			verifyBitRate,
			extractMetadataFromTrack,
			getGenres,
			getCleanDirtyTag,
			getVersionTypeTag,
			getIntroTypeTag,
			getOutroTypeTag,
			createPreviewTrack,
			getWaveform
		],
		saveHiBitRateVersionToAmazonS3
	);

	function verifyBitRate(callback) {
		console.log(logPrefix, 'verifyBitRate');

		var isMP4 = fileTypeChecker(readChunk.sync(req.files.file.path, 0, 4100));

		if (isMP4.mime != 'video/mp4' || isMP4.ext != 'mp4') {

			callback({
				title: "File is not a valid MP4 video."
			});

		}

		console.log(logPrefix, 'passed mp4 validation');

		probe(req.files.file.path, function(err, trackData) {

			if (trackData.streams[0].bit_rate < 300000) {

				callback({
					title: "Bit rate is below the 320Kbps minimum."
				});

			}
			else if (trackData.streams.length < 2 && req.files.file.isMigration !== true) {

				callback({
					title: "Video track is missing an audio track."
				});

			}
			else {
				var audioStream;
				var videoStream;
				for (var i = 0; i < trackData.streams.length; i++) {

					if (trackData.streams[i].codec_type == 'audio') {
						audioStream = trackData.streams[i];
					}

					if (trackData.streams[i].codec_type == 'video') {
						videoStream = trackData.streams[i];
					}

				}

				trackData.metadata.hiBitRateFileBitRate = audioStream.bit_rate / 1000 + "Kbps";
				trackData.metadata.videoHiBitRateFileBitRate = videoStream.bit_rate / 1000 + "Kbps";
				trackData.metadata.trackLength = Math.round(trackData.format.duration);
				trackData.metadata.rawLength = trackData.format.duration;
				trackData.metadata.fileType = videoStream.codec_type;
				trackData.metadata.videoWidth = videoStream.width;
				trackData.metadata.videoHeight = videoStream.height;
				callback(null, trackData.metadata);
			}
		});
	}

	function getWaveform(trackData, callback) {

		console.log(logPrefix, 'Generating waveform image');
		var filenameParts = req.files.file.name.split('.');
		var waveformFileName = filenameParts[0] + '.png';
		var tmpPath = os.tmpdir() + '/' + waveformFileName;

		var waveform = ffmpeg(req.files.file.path)
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

						trackData.waveformImageFileName = waveformFileName;

						trackData.waveformImageFilePath = data.Key
						trackData.waveformImageFileUrl = data.Location;
						callback(null, trackData);

					});


			})
			.on('error', function(err) {

				console.log(logPrefix, 'waveform generation error', err);
				callback(err);

			})
			.run();




	}

	function extractMetadataFromTrack(trackData, callback) {
		console.log(logPrefix, 'extractMetadataFromTrack');

		var fileStream = fs.createReadStream(req.files.file.path);

		var parser = mm(fileStream, function(err, trackTags) {
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
				fileStream.close();
				callback(null, trackData);

			}
			else {
				fileStream.close();
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


		})

	}


	function saveHiBitRateVersionToAmazonS3(err, results) {
		console.log(logPrefix, 'saveHiBitRateVersionToAmazonS3');

		if (err) {
			console.log(logPrefix, 'this was the final callback error', err);
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
					Bucket: keystone.get('s3 config').bucket + '/videos/draft/hi_bit_rate',
					Key: req.files.file.name,
					Body: outStream
				}
			});

			s3obj.on('httpUploadProgress', function(evt) {

			});

			s3obj.send(function(err, data) {

				if (err) console.log(logPrefix, err);

				var hiBitRateFile = {
					filename: data.Key,
					originalname: req.files.file.originalname,
					path: '/videos/draft/hi_bit_rate',
					filetype: 'video/mp4',
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
			})

		}
	}



}

exports.submit = function(req, res) {

	var logPrefix = '[USER=' + req.user._id + '][TRACKID=' + req.body._id + ']';
	console.log(logPrefix, 'submitting video for publishing');

	async.waterfall([
			mapGenres,
			matchArtist,
			matchFeaturedArtists,
			matchTags,
			getHiBitRateTrackToProcess,
			getStandardKeyForTrack,
			getCamelotKeyForTrack,
			matchKey,
			createCombinationKeyForDisplay,
			createID3Tags,
			updateHiBitRateVersionToAmazonS3,
			saveLowBitRateVersionToAmazonS3,
			submitTrack
		],
		returnSubmittedTrack);

	/*
	res.apiResponse({
	TrackMetadata: probeData,
});*/

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

		var artistsFeaturedArray = trackData.artistsFeaturedText.split(',');

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
			if (err) callback(err);

			trackData.tagsToIncludeOnID3 = tags;

			trackData.tagsToIncludeOnID3.sort(function(a, b) {
				return (tagsToFind.indexOf(a._id.toString()) > tagsToFind.indexOf(b._id.toString())) ? 1 : ((tagsToFind.indexOf(b._id.toString()) > tagsToFind.indexOf(a._id.toString())) ? -1 : 0)
			});
			callback(null, trackData);

		});

	}

	function getHiBitRateTrackToProcess(trackData, callback) {

		var s3download = new AWS.S3({
			params: {
				Bucket: keystone.get('s3 config').bucket,
				Key: 'videos/draft/hi_bit_rate/' + trackData.hiBitRateFile.filename.replace('videos/draft/hi_bit_rate/', '')
			}
		});
		trackData.s3download = s3download;
		var mp4FilePath = '/tmp/video_draft_hi_bit_rate_' + trackData.hiBitRateFile.filename.replace('videos/draft/hi_bit_rate/', '');
		var mp4File = require('fs').createWriteStream(mp4FilePath);
		var fileDownload = trackData.s3download.getObject().createReadStream()
			.on('error', function(err) {

				console.log('error reading from s3', err);
				return callback(err);

			}).pipe(mp4File);

		mp4File.on('finish', function() {

			trackData.mp4FilePath = mp4FilePath;
			return callback(null, trackData);

		});

	}

	function getStandardKeyForTrack(trackData, callback) {
		console.log(logPrefix, 'getStandardKeyForTrack');
		probe(trackData.mp4FilePath, function(err, trackDetails) {

			var codecType = trackDetails.streams[0].codec_type;

			if (codecType == 'audio') {

				exec('./bin/keyfinder-cli ' + trackData.mp4FilePath, (err, stdout, stderr) => {
					if (err) {

						console.log(logPrefix, 'error reading key of track', err, stdout);
						return callback(err);

					}
					else if (stderr) {

						console.log(logPrefix, 'error reading key of track', stderr, stdout);
						return callback(stderr);

					}
					else {
						trackData.standardKey = stdout.replace(/\n$/, '');
						return callback(null, trackData, codecType);
					}

				});


			}
			else {

				return callback(null, trackData, codecType);

			}

		});

	}

	function getCamelotKeyForTrack(trackData, codecType, callback) {

		console.log(logPrefix, 'getCamelotKeyForTrack');

		if (codecType == 'audio') {


			exec('./bin/keyfinder-cli -n camelot ' + trackData.mp4FilePath, (err, stdout, stderr) => {
				if (err) {

					console.log(logPrefix, 'error reading key of track', err, stdout);
					return callback(logPrefix, err);

				}
				else if (stderr) {

					console.log(logPrefix, 'error reading key of track', stderr, stdout);
					return callback(stderr);

				}
				else {

					trackData.camelotKey = stdout.replace(/\n$/, '');
					return callback(null, trackData);

				}
			});

		}
		else {

			return callback(null, trackData);


		}

	}

	function matchKey(trackData, callback) {
		console.log(logPrefix, 'match keys');
		if (trackData.camelotKey) {

			Key.model.findOne({
				camelotKey: trackData.camelotKey
			}).exec(function(err, key) {
				if (key && key.musicKey.length > 0) {
					trackData.inKeyLabel = key.musicKey + '/' + key.camelotKey;
					trackData.inKey = key._id;
					return callback(err, trackData);
				}
				else {
					return callback(err, trackData);
				}
			});
		}
		else {
			return callback(null, trackData);

		}

	}

	function createCombinationKeyForDisplay(trackData, callback) {
		console.log(logPrefix, 'createCombinationKeyForDisplay');
		if (trackData.standardKey) {

			trackData.keyPrimaryName = trackData.standardKey + ' / ' + trackData.camelotKey;
			return callback(null, trackData);

		}
		else {

			return callback(null, trackData);

		}

	}

	function createID3Tags(trackData, callback) {
		console.log(logPrefix, 'update ID3');

		var title = trackData.formattedName.trim();

		var artist = trackData.artistLabel;
		if (trackData.artistsFeaturedLabel && trackData.artistsFeaturedLabel.length > 0) {
			artist += ' (' + trackData.artistsFeaturedLabel + ')';
		}

		var keyPrimaryName;

		if (!trackData.keyPrimaryName) {
			keyPrimaryName = null;
		}
		else {
			keyPrimaryName = trackData.keyPrimaryName;

		}

		var id3Tags = {
			date: trackData.releaseYear,
			TBPM: parseInt(trackData.startBpm),
			album: "Promo Single",
			album_artist: "Promo Single",
			publisher: "www.crooklynclan.net",
			title: title.replace(/\"/g,'\\"'),
			artist: trackData.editor.stageName + ' / ' + artist,
			genre: trackData.genresForID3,
			composer: "CCV 2.0",
			TKEY: keyPrimaryName
		}
		trackData.id3Tags = id3Tags;
		return callback(null, trackData);

	}

	function updateHiBitRateVersionToAmazonS3(trackData, callback) {

		console.log(logPrefix, 'update hi bit rate version of file - video');

		var ffmpegMetaData = [];

		var keyname;

		for (keyname in trackData.id3Tags) {
			ffmpegMetaData.push('-metadata ' + keyname + '="' + trackData.id3Tags[keyname] + '"');
		}

		var publishFilePath = os.tmpdir() + '/' + slugify(trackData.editor.stageName + '_' + trackData.artistText.trim() + '_' + trackData.id3Tags.title.trim(), '_') + '_' + trackData._id + '.mp4';

		var ffmpegId3WriteCommand = 'ffmpeg -i ' + trackData.mp4FilePath + ' ' + ffmpegMetaData.join(' ') + ' -c:a copy -c:v copy -y ' + publishFilePath;

		exec(ffmpegId3WriteCommand, (err, stdout, stderr) => {

			if (err) {
				return callback(err);
			}

			trackData.mp4FilePath = publishFilePath;
			var outStream = fs.createReadStream(trackData.mp4FilePath);

			var s3upload = new AWS.S3.ManagedUpload({
				params: {
					Bucket: keystone.get('s3 config').bucket,
					Key: 'videos/published/hi_bit_rate/' + trackData.mp4FilePath.replace('/tmp/', ''),
					Body: outStream
				}
			});



			s3upload.on('httpUploadProgress', function(evt) {

			});

			s3upload.send(function(err, data) {

				if (err) return callback(err);

				trackData.publishedHiBitRateFile = {

					filename: data.Key.replace('videos/published/hi_bit_rate/', ''),
					originalname: trackData.hiBitRateFile.filename,
					path: '/videos/published/hi_bit_rate',
					filetype: 'video/mp4',
					url: decodeURIComponent(data.Location)

				};

				return callback(null, trackData);

			});

		});

	}

	function saveLowBitRateVersionToAmazonS3(trackData, callback) {

		console.log(logPrefix, 'saveLowBitRateVersionToAmazonS3 - Video');

		if (trackData.customDraftSnippetFile && trackData.customDraftSnippetFile.filename) {

			var s3CopySource = keystone.get('s3 config').bucket + '/' + trackData.customDraftSnippetFile.filename;
			var s3Bucket = keystone.get('s3 config').bucket;

			var s3copy = new AWS.S3();
			s3copy.copyObject({
				Bucket: s3Bucket,
				Key: 'videos/published/low_bit_rate/' + trackData.customDraftSnippetFile.filename.replace('/videos/draft/previews', ''),
				CopySource: s3CopySource
			}, function(err, data) {
				if (err) console.log(logPrefix, err, err.stack); // an error occurred

				trackData.publishedLowBitRateFile = {
					filename: trackData.publishedHiBitRateFile.filename.replace('.mp4', '_S.mp4'),
					originalname: trackData.customDraftSnippetFile.originalname,
					path: '/videos/published/low_bit_rate',
					filetype: 'video/mp4',
					url: trackData.customDraftSnippetFile.url.replace('/videos/draft/previews', '/videos/published/low_bit_rate')
				};
				return callback(null, trackData);

			});


		}
		else {



			var mp4FilePathLowBitRateTemp = trackData.mp4FilePath.replace('.mp4', '_S.mp4');

			exec('ffmpeg -i ' + trackData.mp4FilePath + ' -c:v libx264 -b:v 1000k -minrate 1000k -maxrate 1000k -t 210 -bufsize 500k -filter:v scale=640:-1 -c:a aac -b:a 64k -y ' + mp4FilePathLowBitRateTemp, (err, stdout, stderr) => {

				var outStream = fs.createReadStream(mp4FilePathLowBitRateTemp);
				var s3upload = new AWS.S3.ManagedUpload({
					params: {
						Bucket: keystone.get('s3 config').bucket,
						Key: 'videos/published/low_bit_rate/' + trackData.mp4FilePath.replace('/tmp/', ''),
						Body: outStream
					}
				});

				if (err) {
					return callback(err);
				}

				s3upload.on('httpUploadProgress', function(evt) {

				});

				s3upload.send((err, data) => {
					if (err) return callback(err);

					trackData.publishedLowBitRateFile = {
						filename: data.Key.replace('videos/published/low_bit_rate/', ''),
						originalname: trackData.mp4FileName,
						path: '/videos/published/low_bit_rate',
						filetype: 'video/mp4',
						url: decodeURIComponent(data.Location)
					};

					var filenameParts = trackData.mp4FilePath.replace('/tmp/', '').split('.');
					var waveformFileName = filenameParts[0] + '_S.png';
					var tmpPath = os.tmpdir() + '/' + waveformFileName;


					var waveform = ffmpeg(mp4FilePathLowBitRateTemp)
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
									if (err) return callback(err);
									console.log(logPrefix, 'automatic generated snippet waveform generated and uploaded');

									trackData.waveformImageSnippetFileName = waveformFileName;
									trackData.waveformImageSnippetFilePath = data.Key;
									trackData.waveformImageSnippetFileUrl = data.Location;

									return callback(null, trackData);


								});


						})
						.on('error', function(err) {

							console.log('waveform generation error', err);
							return callback(err);

						})
						.run();


					//	fs.unlink(mp4FilePathLowBitRateTemp);

				});

			});

		}
	}

	function submitTrack(trackData, callback) {

		console.log(logPrefix, 'submit track in database');

		Track.model.findOne({
			_id: trackData._id,
			editor: trackData.editor._id,
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

	if (req.files && req.files.sampleTrack_upload) {

		Track.model.findOne({
			_id: trackId,
			editor: req.user._id
		}).exec(function(err, track) {
			if (err) {
				console.log(logPrefix, err);
			}

			console.log(logPrefix, 'processing custom preview snippet');

			var isMp4 = fileTypeChecker(readChunk.sync(req.files.sampleTrack_upload.path, 0, 100));
			console.log(logPrefix, 'file type checker output', isMp4);

			if (!isMp4 || isMp4.mime != 'video/mp4' || isMp4.ext != 'mp4') {
				return res.apiError(logPrefix + 'snippet not mp4', req.files.sampleTrack_upload.originalname + ' is not a valid MP4 file.');
			}
			console.log(logPrefix, 'passed mp4 validation');

			var sampleDraftFileName = 'processed_preview_draft_' + req.files.sampleTrack_upload.name;
			var sampleDraftFilePath = os.tmpdir() + '/' + sampleDraftFileName;

			var s3obj = new AWS.S3({
				params: {
					Bucket: keystone.get('s3 config').bucket,
					Key: 'videos/draft/previews/' + req.files.sampleTrack_upload.name
				}
			});

			var ffmpegProcessTrackCommand = 'ffmpeg -i ' + req.files.sampleTrack_upload.path + ' -c:v libx264 -b:v 1000k -minrate 1000k -maxrate 1000k -bufsize 500k -filter:v scale=640:-1 -t 210 -c:a aac -b:a 64k -y ' + sampleDraftFilePath;

			track.set({
				customDraftSnippetFileStatus: 'processing',
				customDraftSnippetFile: null

			});

			track.save(function(err) {

				res.apiResponse({
					Track: track
				});

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

							track.set({
								customDraftSnippetFile: {

									filename: data.Key,
									originalname: req.files.sampleTrack_upload.originalname,
									path: '/videos/draft/previews',
									filetype: 'video/mp4',
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
											track.set({
												customDraftSnippetFileStatus: 'processed'
											});

											track.save(function(err) {

												if (err) console.log(logPrefix, err);

											});

										});


								})
								.on('error', function(err) {

									console.log('waveform generation error', err);
									return callback(err);

								})
								.run();

						});

				});



			});

		});

	}
	else {

		async.waterfall([
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

	function mapGenres(callback) {
		console.log('mapping genres');
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

		return callback(null, trackData);

	}

	function mapGigTypes(trackData, callback) {
		console.log('mapping gig types');
		var isDuplicate = false;
		if (trackData.gigTypes) {

			//console.log('this is gigtype entry:', trackData.gigTypeEntry);
			async.map(trackData.gigTypes, function(gigTypeEntry, gigTypeEntryCallback) {

				GigTypes.model.findOne({
						'name': gigTypeEntry.name,
						'djTiming': gigTypeEntry.djTiming + '',
						'energy': gigTypeEntry.energy + '',
						'popularity': gigTypeEntry.popularity + ''
					})
					.exec(function(err, gigType) {
						//console.log(trackData.gigTypes);

						if (err) return callback(err);

						if (gigType) {

							gigTypeEntryCallback(null, gigType._id);

						}

					});

			}, function(err, gigTypes) {

				if (err) return callback(err);

				trackData.gigTypes = gigTypes;

				callback(null, trackData);

			});

		}

	}

	function matchTags(trackData, callback) {
		console.log('match tags');
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
			if (err) return callback(err);
			trackData.tagsToIncludeOnID3 = tags;
			return callback(null, trackData);
		});

	}

	function doesOriginalWorkHaveId(originalWork, eachOriginalWorkCallback) {
		console.log('doesOriginalWorkHaveId');

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

				if (err) return eachOriginalWorkCallback(err);

				if (foundOriginalWork && foundOriginalWork._id) {
					originalWork = foundOriginalWork;
				}
				else {

					originalWork.name = originalWork.name.trim();
					originalWork.version = originalWork.version.trim();
				}

				eachOriginalWorkCallback(null, originalWork);

			});
		}

	}

	function matchOrCreateArtists(originalWork, eachOriginalWorkCallback) {
		console.log('matchOrCreateArtists', originalWork._id, originalWork.id);

		if (originalWork._id) {

			return eachOriginalWorkCallback(null, originalWork);

		}
		else {

			var artistsArray = originalWork.artists.split(',');

			async.map(artistsArray, function(item, forEachArtistCallback) {

				var trimmedItem = item.trim();

				Artist.model.findOne({
					name: trimmedItem
				}).exec(function(err, artist) {

					if (err) return forEachArtistCallback(err);

					//	console.log("This is the result of the artist query: ",artist);

					if (artist && artist.name && artist.name.length > 0) {

						var itemId = artist._id;
						return forEachArtistCallback(null, itemId);

					}
					else {

						var newArtist = new Artist.model({
							name: trimmedItem
						});
						newArtist.save(function(err, newArtist) {

							if (err) return forEachArtistCallback(err);

							var itemId = newArtist._id;
							return forEachArtistCallback(null, itemId);
						});

					}
				});

			}, function(err, artists) {
				if (err) return console.error(err.message);
				// configs is now a map of JSON data
				originalWork.artists = artists;
				eachOriginalWorkCallback(null, originalWork);

			});

		}
	}

	function matchOrCreateFeaturedArtists(originalWork, eachOriginalWorkCallback) {
		console.log('matchOrCreateFeaturedArtists');

		if (originalWork._id) {

			return eachOriginalWorkCallback(null, originalWork);

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
		console.log('compileOriginalWorksAndSave');

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
				if (err) eachOriginalWorkCallback(err);
				originalWork._id = newOriginalWork._id;
				console.log("this is the saved original work: ", originalWork);
				eachOriginalWorkCallback(null, originalWork);
			});
		}
	}

	function matchOriginalWorks(trackData, callback) {
		console.log('match original works');

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
							console.log('error processing original work', err);
							return res.apiError('error', err);
						}
						//console.log("The end of applyEachSeries: ", err,processedOriginalWork._id);
						trackData.originalWorksID3Label += processedOriginalWork.id3Label;
						//console.log("this is the item that will be returned: ", processedOriginalWork);
						if (processedOriginalWork._id && typeof processedOriginalWork._id === "ObjectId") {
							itemCallback(null, mongoose.Types.ObjectId(processedOriginalWork._id));
						}
						else {
							itemCallback(null, mongoose.Types.ObjectId(processedOriginalWork._id));
						}

					})

			},
			function(err, correctedOriginalWorks) {
				//	console.log("The end of map: ", err,correctedOriginalWorks);
				console.log("this is the array that will be returned: ", correctedOriginalWorks);
				if (err) {
					console.log(err);
					return res.apiError('error', err);
				}
				trackData.originalWorks = _.uniqWith(correctedOriginalWorks, _.isEqual);
				console.log(_.uniqWith(correctedOriginalWorks, _.isEqual), correctedOriginalWorks, trackData.originalWorks);
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
				console.log(logPrefix, 'error adding release', err);
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

		console.log('update track in database');
		Track.model.findOne({
			_id: trackData._id,
			editor: req.user._id
		}).exec(function(err, track) {

			console.log(logPrefix, 'this is the results for original works');
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

					if (track.introType && track.introType.name !== 'Unedited') {

						metaDataBrackets.push(track.introType.name);

					}

					if (track.outroType && track.outroType.name !== 'Unedited') {

						metaDataBrackets.push(track.outroType.name);

					}

					if (track.versionType && track.versionType.name !== 'Full Mix') {

						metaDataBrackets.push(track.versionType.name);

					}

					metaDataBrackets = metaDataBrackets.join(', ');

					track.formattedName = name + ' (' + version + ')[' + metaDataBrackets + ']';

					track.save(function(err) {

						if (err) callback(err);
						callback(null, track);

					});


				});

			});



		});


	}

	function returnUpdatedTrack(err, results) {
		if (err) return res.apiError('error', err);

		Track.model.findById(results._id).populate('genres gigTypes originalWorks').exec(function(err, track) {

			if (err) return res.apiError('database error', err);

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


/**
 * Get Track by ID
 */
exports.update = function(req, res) {

	Track.model.findById(req.params.id).exec(function(err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');

		var data = req.body;

		item.getUpdateHandler(req).process(data, function(err) {

			if (err) return res.apiError('create error', err);

			res.apiResponse({
				success: true,
				Track: item
			});

		});

	});
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
	Downloads.model.findOne({
		_id: downloadId,
		user: req.user._id
	}).populate('track').exec(function(err, authorizedDownload) {

		var s3download = new AWS.S3();
		var params = {
			Bucket: keystone.get('s3 config').bucket,
			Key: authorizedDownload.track.hiBitRateFile.filename
		};
		var keyName = authorizedDownload.track.hiBitRateFile.filename.split('/');
		var filename = keyName[keyName.length - 1];

		var fileUrl = s3download.getObject(params, function(err, data) {
			res.attachment(filename);
			res.send(data['Body']);
		});

	});

}
