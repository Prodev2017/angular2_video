var keystone = require('keystone');
var fs = require('fs');
var parse = require('csv-parse');
var readline = require('readline');
var stream = require('stream');
var outstream = new stream;
var async = require('async'),
	keystone = require('keystone');
var mm = require('musicmetadata');
var zlib = require('zlib');
var Track = keystone.list('Track');
var Artist = keystone.list('Artist');
var Genre = keystone.list('Genre');
var GigTypes = keystone.list('GigType');
var Tags = keystone.list('Tag');
var User = keystone.list('User');
var Release = keystone.list('Release');
var os = require('os');

var OriginalWorks = keystone.list('OriginalWorks');
var Currency = keystone.list('Currency');

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
var bucketID = "Crooklyn_Clan";
var unzip = require('unzipper');
var Sequelize = require('sequelize');
var slugify = require("slug");
var uuid = require('node-uuid');

exports = module.exports = function(req, res) {

	if (parseInt(req.query.id) > 0) {

		var v1EditorID = parseInt(req.query.id);

	}
	else {

		return res.apiError('id not a number');

	}

	if (process.env.QUOTAGUARDSTATIC_URL) {
		var sequelize = new Sequelize(process.env.V1_DB_DATABASE_PRODUCTION, process.env.V1_DB_DATABASE_PRODUCTION_USER, process.env.V1_DB_DATABASE_PRODUCTION_PASS);
	}
	else {
		var sequelize = new Sequelize(process.env.V1_DB_DATABASE_PRODUCTION, process.env.V1_DB_DATABASE_PRODUCTION_USER, process.env.V1_DB_DATABASE_PRODUCTION_PASS, {
			host: process.env.V1_DB_HOST
		});
	}

	sequelize.authenticate()
		.then(function() {

			console.log('Connection has been established successfully.');

			migrateTracks();
			res.apiResponse({
				status: 'started'
			});

		})
		.catch(function(err) {
			console.log('Unable to connect to the database:', err);
		});

	function migrateTracks() {

		getEditorsFromV1();

	}

	function getEditorsFromV1() {

		sequelize.query('SELECT * FROM `CubeCart_category` where `cat_id` = ' + v1EditorID, {
				type: sequelize.QueryTypes.SELECT
			})
			.then(function(editors) {
				console.log('this is the number of editors found: ', editors.length);

				async.eachSeries(editors, getTracksAndReleasesForV1Editor, function(err) {
					if (err) console.log(err);
					console.log('Completed Migration of Editor Tracks from v1');

				});

			});

	}


	function getTracksAndReleasesForV1Editor(editor, getTracksAndReleasesCallback) {

		sequelize.query('SELECT * FROM `CubeCart_inventory` where `video` = "0" AND `cat_id` = ' + editor.cat_id, {
				type: sequelize.QueryTypes.SELECT
			})
			.then(function(tracks) {

				console.log('MIGRATION: Track count for ' + editor.cat_id + ' is ' + tracks.length);

				User.model.findOne({
					crooklynClanV1ArtistID: editor.cat_id
				}).exec(function(err, editor) {

					console.log('Finding user account associated with cat_id: ', editor._id);

					if (!editor) {

						getTracksAndReleasesCallback('no editor found!!!! please resync users/editors from v1');

					}
					else {

						Track.model.find({
							crooklynClanv1CatId: editor.crooklynClanV1ArtistID,
							crooklynClanv1ProductID: {
								$ne: null
							}
						}).select({
							crooklynClanv1AutoMigrated: 1,
							crooklynClanv1ProductID: 1,
							crooklynClanv1AddedDate: 1,
							publishDate: 1,
							releaseYear: 1
						}).exec(function(err, v2Tracks) {

							async.eachSeries(v2Tracks, function(v2track, updateReleaseYearAndPublishDateCallback) {
								console.log('currently evaluating dates on track', v2track);
								if (v2track.crooklynClanv1AutoMigrated) {

									var indexOfRelatedMigratedTrackInformation = tracks.findIndex((item) => {

										return item.productId == v2track.crooklynClanv1ProductID;

									});

									v2track.set({
										crooklynClanv1AddedDate: new Date(tracks[indexOfRelatedMigratedTrackInformation].added * 1000)
									});
									v2track.set({
										releaseYear: new Date(tracks[indexOfRelatedMigratedTrackInformation].added * 1000).getFullYear()
									});
									v2track.set({
										publishDate: new Date(tracks[indexOfRelatedMigratedTrackInformation].added * 1000)
									});


									v2track.save(function(err) {

										if (err) return updateReleaseYearAndPublishDateCallback(err);
									console.log('this is with updated dates', v2track);

										updateReleaseYearAndPublishDateCallback();

									});

								}

							}, function(err) {

								if (err) {
									console.log('error on updating added date as release year and publish date', err);
								}

								console.log('Finding tracks associated with editor that already have a v1 product id: ', editor._id);

								v2Tracks = v2Tracks.map(function(v2track) {
									return v2track.crooklynClanv1ProductID;
								});
								console.log('existing tracks found', v2Tracks);

								tracks = tracks.filter(function(trackData) {

									if (v2Tracks && v2Tracks.length > 0) {

										return v2Tracks.indexOf(trackData.productId.toString()) === -1;

									}
									else {

										return true;

									}

								});

								Release.model.find({
									editor: editor._id,
									crooklynClanv1ProductID: {
										$ne: null
									}
								}).select({
									_id: 0,
									crooklynClanv1ProductID: 1
								}).exec(function(err, releases) {

									console.log('Finding releases associated with editor that already have a v1 product id: ', editor._id);
									releases = releases.map(function(release) {
										return release.crooklynClanv1ProductID;
									});

									console.log('existing releases', releases);

									tracks = tracks.filter(function(trackData) {

										if (releases && releases.length > 0) {

											return releases.indexOf(trackData.productId.toString()) === -1;

										}
										else {

											return true;

										}

									});

									console.log('track filtered results', tracks);

									//Make sure digital dir field has a value, if not remove it because it cannot be imported in. why it's blank, dunno

									tracks = tracks.filter(function(filteredTrack) {

										return filteredTrack.digitalDir != '' && filteredTrack.digitalDir.length > 0;

									});

									tracks = tracks.map(function(track) {

										track.v2EditorId = editor._id;
										return track;

									});

									async.eachSeries(tracks, migrateSingleTrackOrRelease, function(err) {
										if (err) getTracksAndReleasesCallback(err);
										getTracksAndReleasesCallback(null);
									});


								});



							});


						});

					}

				})


			});

	}

	function migrateSingleTrackOrRelease(track, migrateCallback) {

		async.waterfall([async.constant(track), isMP3OrZIP, downloadFile, createRelease, unzipFilesAndAddToTracksToImport, processTrack], function(err, migratedTrack) {

			if (err) {
				console.log('migrateSingleTrackOrRelease error', err);
				migrateCallback(null);

			}
			else {

				if (migratedTrack.tracksToPush) {
					for (var i = 0; i < migratedTrack.tracksToPush.length; i++) {

						fs.unlink(migratedTrack.tracksToPush[i], function(err) {
							if (err) {
								console.log('error deleting temp mp3s', err);
							}

						});

					}
				}
				if (migratedTrack.waveformTempPaths) {

					for (var i = 0; i < migratedTrack.waveformTempPaths.length; i++) {

						fs.unlink(migratedTrack.waveformTempPaths[i], function(err) {
							if (err) {
								console.log('error deleting temp waveforms', err);
							}

						});

					}

				}

				if (migratedTrack.isZip) {

					fs.unlink(migratedTrack.zipFilePath, function(err) {
						if (err) {
							console.log('error deleting temp zip', err);
						}

					});

				}


				migrateCallback(null);

			}

		});

	}


	function isMP3OrZIP(track, isMP3OrZIPCallback) {

		var migratedTrack = track || {};

		console.log('isMP3OrZip', migratedTrack.cat_id + ':' + migratedTrack.productId);

		migratedTrack.extension = migratedTrack.digitalDir.substring(migratedTrack.digitalDir.length - 3, migratedTrack.digitalDir.length);

		if (migratedTrack.extension === "zip") {

			migratedTrack.isZip = true;
			isMP3OrZIPCallback(null, migratedTrack);

		}
		else {

			isMP3OrZIPCallback(null, migratedTrack);

		}

	}

	function downloadFile(migratedTrack, downloadFileCallback) {

		console.log('downloadFile', migratedTrack.cat_id + ':' + migratedTrack.productId);

		var bucketID = "Crooklyn_Clan";

		migratedTrack.s3FilePath = migratedTrack.digitalDir.replace('/home/crooklyn/public_html/ClanVault/', '');
		var fileSegments = migratedTrack.digitalDir.split('/');
		var fileName = fileSegments[fileSegments.length - 1];
		var fileNameWithoutExtension = fileName.split('.')[0];
		migratedTrack.fileNameWithoutExtension = fileNameWithoutExtension;

		if (migratedTrack.isZip) {

			var s3download = new AWS.S3({
				params: {
					Bucket: bucketID,
					Key: migratedTrack.s3FilePath
				}
			});

			migratedTrack.zipFilePath = '/tmp/migration_' + migratedTrack.cat_id + '_' + migratedTrack.productId + '.zip';

			migratedTrack.zipFile = require('fs').createWriteStream(migratedTrack.zipFilePath);

			migratedTrack.fileDownload = s3download.getObject().createReadStream()
				.on('error', function(err) {
					console.log('error caught in s3 stream');
					console.log(err);
					downloadFileCallback(err);
				}).pipe(migratedTrack.zipFile);

			migratedTrack.zipFile.on('error', function(err) {
				console.log('error caught in file stream');

				console.log(err);
				downloadFileCallback(err);
			}).on('finish', function() {

				downloadFileCallback(null, migratedTrack);

			});

		}
		else {

			var s3download = new AWS.S3({
				params: {
					Bucket: bucketID,
					Key: migratedTrack.s3FilePath
				}
			});

			var fileSegments = migratedTrack.digitalDir.split('/');
			var fileName = fileSegments[fileSegments.length - 1];
			var fileNameWithoutExtension = fileName.split('.')[0];
			migratedTrack.fileNameWithoutExtension = fileNameWithoutExtension;

			migratedTrack.localFilePath = '/tmp/' + fileNameWithoutExtension + '_' + migratedTrack.cat_id + '_' + migratedTrack.productId + '.mp3';

			migratedTrack.mp3File = require('fs').createWriteStream(migratedTrack.localFilePath);

			migratedTrack.fileDownload = s3download.getObject().createReadStream()
				.on('error', function(err) {
					console.log('error caught in s3 stream');
					console.log(err);
					downloadFileCallback(err);
				}).pipe(migratedTrack.mp3File)


			migratedTrack.mp3File.on('error', function(err) {
				console.log('error caught in file stream');

				console.log(err);
				downloadFileCallback(err);
			}).on('finish', function() {
				downloadFileCallback(null, migratedTrack);
			});

		}

	}

	function createRelease(migratedTrack, createReleaseCallback) {
		console.log('createRelease', migratedTrack.cat_id + ':' + migratedTrack.productId);

		if (migratedTrack.isZip) {

			var release = new Release.model({

				crooklynClanv1ProductID: migratedTrack.productId,
				crooklynClanv1ProductCode: migratedTrack.productCode,
				name: migratedTrack.fileNameWithoutExtension,
				description: migratedTrack.description,
				mediaType: 'audio',
				editor: migratedTrack.v2EditorId,
				status: 'published',
				crooklynClanv1AutoMigrated: true
			});

			release.save(function(err) {

				if (err) console.log(err);

				migratedTrack.release = release;

				createReleaseCallback(null, migratedTrack);

			});



		}
		else {

			createReleaseCallback(null, migratedTrack);

		}

	}

	function unzipFilesAndAddToTracksToImport(migratedTrack, unZipCallback) {
		console.log('unzipFiles', migratedTrack.cat_id + ':' + migratedTrack.productId);
		var newTracksToPush = [];

		if (migratedTrack.isZip) {

			var zipToUnzip = fs.createReadStream(migratedTrack.zipFilePath)

			.pipe(unzip.Parse()).on('entry', function(entry) {

					var entryPathSegments = entry.path.split('/');
					var lastIndex = entryPathSegments.length - 1;

					if (entry.type === "File" && entryPathSegments[lastIndex].indexOf('.') !== 0 && entryPathSegments[lastIndex].toLowerCase().indexOf('mp3') !== -1) {
						var fileNameWithoutExtension = entryPathSegments[lastIndex].split('.')[0];

						var localFilePath = '/tmp/' + fileNameWithoutExtension + '_' + migratedTrack.cat_id + '_' + migratedTrack.productId + '.mp3';

						var localFileName = fileNameWithoutExtension + '_' + migratedTrack.cat_id + '_' + migratedTrack.productId + '.mp3';

						entry.pipe(fs.createWriteStream(localFilePath)
							.on('error', function(err) {

								console.log('error in piping while unzipping', err);
								throw err;

							})
							.on('finish', function() {
								newTracksToPush.push(localFilePath);
								migratedTrack.tracksToPush = newTracksToPush;
								console.log('WROTE MP3: ', localFileName);
								entry.autodrain();
							}));

					}

				}).on('error', function(err) {
					console.log('error in unzipping', err);
					unZipCallback(err);
				})
				.on('finish', function() {

					console.log('done reading zip and running callback');
					unZipCallback(null, migratedTrack);

				});

		}
		else {
			console.log('is not zip so adding to tracks array', migratedTrack.cat_id + ':' + migratedTrack.productId);
			migratedTrack.tracksToPush = [migratedTrack.localFilePath];
			unZipCallback(null, migratedTrack);

		}

	}

	function importTrack(migratedTrack, importCallback) {

		console.log('importTrack', migratedTrack.cat_id + ':' + migratedTrack.productId);
		Currency.model.findOne({
			name: 'Audio Vault'
		}).exec(function(err, currency) {

			if (err) importCallback(err)
			if (!currency) importCallback('no currency found that matches audio vault');

			var newMigratedTrack = new Track.model({

				name: migratedTrack.localFilePath.replace('/tmp/', ''),
				description: migratedTrack.description,
				crooklynClanv1ProductCode: migratedTrack.productCode,
				crooklynClanv1ProductID: migratedTrack.productId,
				crooklynClanv1Active: migratedTrack.active,
				crooklynClanv1AutoMigrated: true,
				crooklynClanv1CatId: migratedTrack.cat_id,
				crooklynClanv1Popularity: parseInt(migratedTrack.popularity),
				crooklynClanv1AddedDate: new Date(migratedTrack.added * 1000),
				publishDate: new Date(migratedTrack.added * 1000),
				releaseYear: new Date(migratedTrack.added * 1000).getFullYear(),
				draftTrackUploadedToS3: true,
				status: 'draft',
				currency: currency,
				crooklynClanv1Disabled: migratedTrack.disabled,
				fileType: 'audio',
				trackLength: migratedTrack['length'],
				releases: [migratedTrack.release],
				editor: migratedTrack.v2EditorId

			});

			probe(migratedTrack.localFilePath, function(err, trackData) {
				if (err) return console.log(err);

				var trackLength = Math.round(trackData.format.duration);

				newMigratedTrack.set({
					trackLength: trackLength
				})

				newMigratedTrack.save(function(err) {
					console.log('this is saved track with id:', newMigratedTrack._id);
					saveWaveformAndUploadTrack(migratedTrack, function(err, updatedMigratedTrack) {

						newMigratedTrack.set({
							waveformImageFileName: updatedMigratedTrack.waveformImageFileName
						});
						newMigratedTrack.set({
							waveformImageFilePath: updatedMigratedTrack.waveformImageFilePath
						});
						newMigratedTrack.set({
							waveformImageFileUrl: updatedMigratedTrack.waveformImageFileUrl
						});
						newMigratedTrack.set({
							hiBitRateFile: updatedMigratedTrack.hiBitRateFile
						});

						newMigratedTrack.save(function(err) {

							if (err) importCallback(err);
							importCallback(null, newMigratedTrack);

						});

					});

				})
			});

		});

	}

	function saveWaveformAndUploadTrack(migratedTrack, saveCallback) {

		console.log('getWaveform', migratedTrack.cat_id + ':' + migratedTrack.productId);
		var filenameParts = migratedTrack.localFilePath.replace('/tmp/', '').split('.');
		var waveformFileName = filenameParts[0] + '.png';
		var tmpPath = os.tmpdir() + '/' + waveformFileName;
		console.log(filenameParts, tmpPath, migratedTrack.localFilePath);

		var waveform = ffmpeg(migratedTrack.localFilePath)
			.complexFilter([
				'[0:a]aformat=channel_layouts=mono,compand=gain=-6,showwavespic=s=1200x120:colors=white,negate[a],color=black:1200x120[c],[c][a]alphamerge'
			])
			.frames(1)
			.output(tmpPath)
			.on('error', function(err) {
				console.log(err);
				throw err;

				saveCallback(null, migratedTrack);

			})
			.on('end', function() {
				console.log('Processing finished !');
				var outStream = fs.createReadStream(tmpPath);

				var s3upload = new AWS.S3({
					params: {
						Bucket: keystone.get('s3 config').bucket,
						Key: 'waveforms/' + waveformFileName
					}
				});
				migratedTrack.waveformTempPaths.push(tmpPath);
				var trackUpload = fs.createReadStream(tmpPath);


				s3upload.upload({
						Body: outStream
					})
					.send(function(err, data) {
						if (err) saveCallback(err);

						migratedTrack.waveformImageFileName = waveformFileName;
						console.log(data);
						migratedTrack.waveformImageFilePath = data.Key
						migratedTrack.waveformImageFileUrl = data.Location;
						//Upload source track to crooklyn clan v2 bucket

						var trackStream = fs.createReadStream(migratedTrack.localFilePath);

						var s3uploadTrack = new AWS.S3({
							params: {
								Bucket: keystone.get('s3 config').bucket,
								Key: 'tracks/draft/hi_bit_rate/' + migratedTrack.localFilePath.replace('/tmp/', '')
							}
						});

						s3uploadTrack.upload({
								Body: trackStream
							})
							.send(function(err, trackUploadData) {
								if (err) saveCallback(err);

								migratedTrack.hiBitRateFile = {
									filename: trackUploadData.Key,
									originalname: migratedTrack.localFileName,
									path: '/tracks/draft/hi_bit_rate',
									filetype: 'audio/mp3',
									url: trackUploadData.Location

								};

								console.log('track has been uploaded to S3');

								saveCallback(null, migratedTrack);
							});



					});

			})
			.on('error', function(err) {

				console.log('waveform generation error', err);
				saveCallback(err);

			})
			.run();


	}


	function processTrack(migratedTrack, processTracksCallback) {
		console.log('processTrack', migratedTrack.cat_id + ':' + migratedTrack.productId);

		migratedTrack.waveformTempPaths = [];

		async.eachOfSeries(migratedTrack.tracksToPush, function(track, index, processCallback) {

			var mergedTrack = migratedTrack;
			mergedTrack.localFilePath = mergedTrack.tracksToPush[index];

			importTrack(mergedTrack, function(err, results) {

				console.log('importing track', migratedTrack.cat_id + ':' + migratedTrack.productId + ':' + index);
				processCallback(null);

			})


		}, function(err, results) {

			if (err) processTracksCallback(err);

			console.log('completed import');
			processTracksCallback(null, migratedTrack);
		})


	}
}
