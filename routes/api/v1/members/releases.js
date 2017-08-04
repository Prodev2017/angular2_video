var async = require('async'),
  keystone = require('keystone');

var Releases = keystone.list('Release');
var Tracks = keystone.list('Track');
var AWS = require('aws-sdk');
var slugify = require("slug");
var archiver = require("archiver");
var _ = require("lodash");
var utilities = require('../../../utilities');
var ffmpeg = require('fluent-ffmpeg');
var readChunk = require('read-chunk'); // npm install read-chunk
var fileTypeChecker = require('file-type');
const exec = require('child_process').exec;
var os = require('os');
var fs = require('fs');

AWS.config.update({
  accessKeyId: keystone.get('s3 config').key,
  secretAccessKey: keystone.get('s3 config').secret
});

/**
 * List Keys
 */
exports.list = function(req, res) {


  var status = req.params.status;
  var logPrefix = '[USER=' + req.user._id + ']';

  async.waterfall([getReleases, getTracks], sendList);

  function getReleases(callback) {

    var query = Releases.paginate({

      page: 1,
      perPage: 50,

    });

    if (req.query && req.query.name) {
      var decodedQuery = {
        name: decodeURIComponent(req.query.name).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'),
      };

      query.find({
        $and: [{
          editor: req.user._id,
          currency: req.query.currencyId
        }, {
          name: new RegExp(decodedQuery.name, "i")
        }, ]

      });

    }
    else {
      query.find({
        editor: req.user._id,
                  currency: req.query.currencyId

      });
    }

    if (status == 'draft') {
      query.where('status').equals('draft');
      query.sort('-createdAt');
    }
    else {
      query.where('status').equals('published');
    }

    query.exec(function(err, items) {
      if (err) return res.apiError('database error', err);
      callback(err, items);
    });

  }

  function getTracks(items, callback) {

    async.map(items.results, function(item, mapCallback) {
      Tracks.model.find({
        releases: item._id
      }).populate('originalWorks').exec(function(err, tracks) {
        if (err) return res.apiError('database error', err);
        var transformedItem = item.toObject();
        transformedItem.tracks = tracks;
        mapCallback(err, transformedItem);
      })
    }, function(err, results) {
      callback(err, results);
    });

  }

  function sendList(err, list) {
    if (err) return res.apiError('database error', err);
    var releases = list.results || list;
    res.apiResponse({
      Releases: releases
    });
  }

}

exports.listTracks = function(req, res) {
  var releaseId = req.params.releaseId;
  async.waterfall([getTracks], sendList);



  function sendList(err, list) {
    console.log(logPrefix, list);
    res.apiResponse({
      Tracks: list
    });
  }


}

/**
 * Get Key by ID
 */
exports.get = function(req, res) {
  Releases.model.findById(req.params.releaseId).exec(function(err, item) {

    if (err) return res.apiError('database error', err);
    if (!item) return res.apiError('not found');


    async.map([item], function(item, mapCallback) {
      Tracks.model.find({
        releases: item._id
      }).populate('originalWorks').exec(function(err, tracks) {
        if (err) return res.apiError('database error', err);
        var transformedItem = item.toObject();
        transformedItem.tracks = tracks;
        mapCallback(err, transformedItem);
      })
    }, function(err, results) {
      res.apiResponse({
        Releases: results[0]
      });
    });
  });
}


/**
 * Create a Key
 */
exports.create = function(req, res) {

  var item = new Releases.model();

  var data = req.body;
  data.editor = req.user._id;

  item.getUpdateHandler(req).process(data, function(err) {

    if (err) return res.apiError('error', err);
    var revisedItem = item.toObject();
    revisedItem.tracks = [];
    res.apiResponse({
      Release: revisedItem
    });

  });
}

/**
 * Create a Key
 */
exports.check = function(req, res) {

  Releases.model.findOne({
    name: req.body.releaseName
  }).exec(function(err, item) {

    if (err) return res.apiError('error', err);

    res.apiResponse({
      Release: item
    });

  });

}

/**
 * Get Key by ID
 */
exports.update = function(req, res) {

  //Helps us determine if we're uploading the sample track for v1 purposes or if this is a general release data update from the release editor
  var releaseId = req.params.releaseId || req.body._id;
  var logPrefix = '[USER=' + req.user._id + '][RELEASEID=' + releaseId + ']';

  console.log(logPrefix, 'updateRelease');

  Releases.model.findOne({
    editor: req.user._id,
    _id: releaseId
  }).populate('editor').exec(function(err, item) {

    if (err) return res.apiError('database error', err);
    if (!item) return res.apiError('not found');

    var updatedRelease = req.body;
    delete updatedRelease.editor;
    if (req.files && req.files.sampleTrack_upload) {
      var isMp3 = fileTypeChecker(readChunk.sync(req.files.sampleTrack_upload.path, 0, 10));
      console.log(logPrefix, 'file type checker output', isMp3);
      if (!isMp3 || isMp3.mime != 'audio/mpeg' || isMp3.ext != 'mp3') {
        return res.apiError(logPrefix + 'snippet not mp3', req.files.sampleTrack_upload.originalname + ' is not a valid MP3 file.');
      }
      console.log(logPrefix, 'passed mp3 validation');
      var sampleFileName = 'v2_' + slugify(item.editor.stageName, '_') + '_' + slugify(item.name, '_') + '_' + item._id + '_S.mp3';

      var sampleFilePath = os.tmpdir() + '/' + sampleFileName;

      var s3obj = new AWS.S3({
        params: {
          Bucket: keystone.get('s3 config').bucket,
          Key: 'v1_Snippets/' + sampleFileName
        }
      });

      var ffmpegProcessTrackCommand = 'ffmpeg -i ' + req.files.sampleTrack_upload.path + ' -codec:a libmp3lame -t 210 -b:a 64k -y ' + sampleFilePath;

      console.log(logPrefix, ffmpegProcessTrackCommand);

      exec(ffmpegProcessTrackCommand, (err, stdout, stderr) => {

        console.log(logPrefix, stdout, stderr);

        if (err) {
          console.log(logPrefix, err);
        }

        var outStream = fs.createReadStream(sampleFilePath);

        s3obj.upload({
            Body: outStream
          })
          .send(function(err, data) {

            if (err) console.log(logPrefix, err);
            console.log(logPrefix, 'response from S3', data);
            console.log(logPrefix, 'generate waveform for automatically generated snippet');
            var filenameParts = req.files.sampleTrack_upload.path.replace('/tmp/', '').split('.');
            console.log(filenameParts);
            var waveformFileName = filenameParts[0] + '_S.png';
            var waveFormTmpPath = os.tmpdir() + '/' + waveformFileName;

            var waveform = ffmpeg(sampleFilePath)
              .complexFilter([
                '[0:a]aformat=channel_layouts=mono,compand=gain=-6,showwavespic=s=1200x120:colors=white,negate[a],color=black:1200x120[c],[c][a]alphamerge'
              ])
              .frames(1)
              .output(waveFormTmpPath)
              .on('end', function() {
                console.log('Processing finished !');
                var waveFormOutStream = fs.createReadStream(waveFormTmpPath);

                var s3upload = new AWS.S3({
                  params: {
                    Bucket: keystone.get('s3 config').bucket,
                    Key: 'waveforms/' + waveformFileName
                  }
                });

                s3upload.upload({
                    Body: waveFormOutStream
                  })
                  .send(function(err, waveformData) {
                    if (err) console.log(logPrefix, err);
                    console.log(waveformData);
                    item.getUpdateHandler(req).process(updatedRelease, function(err) {

                      if (err) return res.apiError('update error', err);

                      item.set({
                        crooklynClanv1SampleTrackFileName: sampleFileName
                      });
                      item.set({
                        crooklynClanv1SampleTrackOriginalFileName: req.files.sampleTrack_upload.originalname
                      });
                      item.set({
                        crooklynClanv1SampleTrackUrl: data.Location
                      });
                      item.set({
                        waveformImageSnippetFileName: waveformData.Key
                      });
                      item.set({
                        waveformImageSnippetFilePath: req.files.sampleTrack_upload.originalname
                      });
                      item.set({
                        waveformImageSnippetFileUrl: waveformData.Location
                      });

                      item.save(function(err) {

                        if (err) return res.apiError('update error', err);
                        Tracks.model.find({
                          releases: item._id
                        }).exec(function(err, tracks) {

                          var modifiedItem = item.toObject();

                          modifiedItem.tracks = tracks;
                          modifiedItem.editor = modifiedItem.editor._id;

                          res.apiResponse({
                            Release: modifiedItem
                          });

                        });

                      });

                    });


                  });

              }).run();

          });
      });

    }
    else if (req.files && req.files.sampleTrack_upload && item.mediaType == 'video') {
      var isMp4 = fileTypeChecker(readChunk.sync(req.files.sampleTrack_upload.path, 0, 4100));
      console.log('file type checker output', isMp4);
      if (!isMp4 || isMp4.mime != 'video/mp4' || isMp4.ext != 'mp4') {
        return res.apiError('snippet not mp4', req.files.sampleTrack_upload.originalname + ' is not a valid MP4 file.');
      }
      console.log('passed mp4 validation');
      var sampleFileName = 'v2_' + slugify(item.editor.stageName, '_') + '_' + slugify(item.name, '_') + '_' + item._id + '_S.mp4';

      var sampleFilePath = os.tmpdir() + '/' + sampleFileName;

      var s3obj = new AWS.S3({
        params: {
          Bucket: keystone.get('s3 config').bucket,
          Key: 'v1_Snippets/' + sampleFileName
        }
      });
      var s3upload = new AWS.S3({
        params: {
          Bucket: keystone.get('v1 s3 config').video_bucket,
          Key: sampleFilePath
        }
      });
      var snippetPath = os.tmpdir() + '/' + sampleFileName;
      exec('ffmpeg -i ' + req.files.sampleTrack_upload.path + ' -c:v libx264 -b:v 1000k -minrate 1000k -maxrate 1000k -bufsize 500k -filter:v scale=640:-1 -c:a aac -b:a 64k -y ' + snippetPath, (err, stdout, stderr) => {
        console.log(stdout, stderr);
        if (err) return res.apiError('update error', err);

        var outStream = fs.createReadStream(snippetPath);

        s3upload.upload({
            Body: outStream
          })
          .send((err, data) => {
            if (err) return res.apiError('update error', err);

            if (err) callback(err);

            console.log(logPrefix, 'generate waveform for automatically generated snippet');
            var filenameParts = req.files.sampleTrack_upload.path.replace('/tmp/', '').split('.');
            var waveformFileName = filenameParts[0] + '_S.png';
            var tmpPath = os.tmpdir() + '/' + waveformFileName;

            var waveform = ffmpeg(req.files.sampleTrack_upload.path)
              .complexFilter([
                '[0:a]aformat=channel_layouts=mono,compand=gain=-6,showwavespic=s=1200x120:colors=white,negate[a],color=black:1200x120[c],[c][a]alphamerge'
              ])
              .frames(1)
              .output(tmpPath)
              .on('end', function() {
                console.log('Processing finished !');
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
                  .send(function(err, waveformData) {
                    if (err) callback(err);
                    console.log(waveformData);
                    item.getUpdateHandler(req).process(updatedRelease, function(err) {

                      if (err) return res.apiError('update error', err);

                      item.set({
                        crooklynClanv1SampleTrackFileName: sampleFileName
                      });
                      item.set({
                        crooklynClanv1SampleTrackOriginalFileName: req.files.sampleTrack_upload.originalname
                      });
                      item.set({
                        crooklynClanv1SampleTrackUrl: data.Location
                      });
                      item.set({
                        waveformImageSnippetFileName: waveformData.Key
                      });
                      item.set({
                        waveformImageSnippetFilePath: req.files.sampleTrack_upload.originalname
                      });
                      item.set({
                        waveformImageSnippetFileUrl: waveformData.Location
                      });

                      item.save(function(err) {

                        if (err) return res.apiError('update error', err);
                        Tracks.model.find({
                          releases: item._id
                        }).exec(function(err, tracks) {

                          var modifiedItem = item.toObject();

                          modifiedItem.tracks = tracks;
                          modifiedItem.editor = modifiedItem.editor._id;

                          res.apiResponse({
                            Release: modifiedItem
                          });

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

      item.getUpdateHandler(req).process(updatedRelease, function(err) {

        if (err) return res.apiError('create error', err);

        Tracks.model.find({
          releases: item._id
        }).populate('originalWorks').exec(function(err, tracks) {

          var modifiedItem = item.toObject();

          modifiedItem.tracks = tracks;
          modifiedItem.editor = modifiedItem.editor._id;

          res.apiResponse({
            Release: modifiedItem
          });

        });

      });

    }



  });

}

exports.publish = function(req, res) {

  var logPrefix = '[USER=' + req.user._id + '][RELEASEID=' + req.body._id + ']';

  console.log(logPrefix, 'releasePublish');

  async.waterfall([getRelease, getTracksForRelease, setupS3FileStreamsForEachTrack, uploadZipToS3, copySnippetToV1, prepareV1CrossListSQLQueries, markReleaseAsPublished, getUpdatedDraftReleases], sendResponse)

  function getRelease(callback) {
    console.log(logPrefix, 'getRelease');

    Releases.model.findOne({
      _id: req.body._id,
      editor: req.user._id,
      status: 'submitted'
    }).populate('genres editor').exec(function(err, release) {

      callback(err, release);

    });

  }

  function getTracksForRelease(release, callback) {
    console.log(logPrefix, 'getTracksForRelease');
    console.log(logPrefix, release);
    Tracks.model.find({
      releases: release._id
    }).populate('originalWorks').exec(function(err, tracks) {

      if (err) return res.apiError('database error', err);
      console.log(logPrefix, tracks);
      release.set({
        crooklynClanv1TrackCount: tracks.length
      });
      callback(null, tracks, release);

    });

  }

  function setupS3FileStreamsForEachTrack(tracks, release, callback) {
    console.log(logPrefix, 'setupS3FileStreamsForEachTrack');

    var zipSlug = 'v2_' + slugify(release.editor.stageName, '_') + '_' + slugify(release.name, '_') + '/';

    async.map(tracks,
      function(track, s3FileStreamCallback) {

        var fileStream = new AWS.S3({
          params: {
            Bucket: keystone.get('s3 config').bucket,
            Key: track.publishedHiBitRateFile.filename
          }
        });

        s3FileStreamCallback(null, {
          fileStream: fileStream,
          fileName: track.publishedHiBitRateFile.filename.replace('tracks/published/hi_bit_rate/', zipSlug)
        })

      },
      function(err, fileStreams) {
        callback(err, fileStreams, release);

      });

  }

  function uploadZipToS3(fileStreams, release, callback) {
    console.log(logPrefix, 'uploadZipToS3');

    var zip = archiver('zip');


    _.each(fileStreams, function(fileStream) {

      zip.append(fileStream.fileStream.getObject().createReadStream(), {
        name: fileStream.fileName
      });

    });

    var s3upload = new AWS.S3.ManagedUpload({
      params: {
        Body: zip,
        Bucket: keystone.get('v1 s3 config').bucket,
        Key: 'Tracks-' + utilities.ucwords(slugify(release.editor.stageName, '').replace('-', '')) + '/v2_' + slugify(release.editor.stageName, '_') + '_' + slugify(release.name, '_') + '_' + release._id + '.zip'
      }
    });

    s3upload.on('httpUploadProgress', function(evt) {
      console.log(logPrefix, evt);
    });

    s3upload.send(function(err, zipUploadConfirmation) {

      if (err) {

        console.log(logPrefix + 'zip upload error', err);
        callback(err);

      }

      console.log(logPrefix + ' zip upload complete', zipUploadConfirmation);

      release.crooklynClanv1ZIPCreatedAndPublished = zipUploadConfirmation.Key;

      callback(null, release);

    });

    zip.finalize();

  }

  function copySnippetToV1(release, callback) {
    console.log(logPrefix, 'copySnippetToV1', release);

    var s3CopySource = keystone.get('s3 config').bucket + '/v1_Snippets/' + release.crooklynClanv1SampleTrackFileName;
    var s3Bucket = keystone.get('v1 s3 config').bucket;
    console.log(logPrefix, s3CopySource);

    var s3copy = new AWS.S3();
    s3copy.copyObject({
      Bucket: s3Bucket,
      Key: 'Snippets/v2_' + slugify(release.editor.stageName, '_') + '_' + slugify(release.name, '_') + '_' + release._id + '_S.mp3',
      CopySource: s3CopySource
    }, function(err, data) {
      if (err) console.log(logPrefix, err, err.stack); // an error occurred
      console.log(logPrefix, 'response from S3 on snippet copy', data);
      release.set({
        crooklynClanv1SampleTrackOriginalFileName: release.crooklynClanv1SampleTrackOriginalFileName.replace('v1_Snippets', 'Snippets')
      });

      callback(null, release);

    });


  }

  function prepareV1CrossListSQLQueries(release, callback) {

    console.log(logPrefix, 'prepareV1CrossListSQLQueries');

    var updatedTrackData = utilities.prepareTrackOrReleaseForBackwardsV1CrossListing(release, req.user, function(data) {

      console.log(logPrefix, 'Made it to the callback', data);

      release = Object.assign(release, {
        crooklynClanv1ProductID: data.results.track.id,
        crooklynClanv1ProductCode: data.results.productCode
      });

      callback(null, release);

    });

  }

  function markReleaseAsPublished(release, callback) {
    console.log(logPrefix, 'markReleaseAsPublished');

    release.set({
      status: 'published'
    });
    release.save(function(err) {
      callback(err, release);
    });


  }

  function getUpdatedDraftReleases(release, callback) {
    console.log(logPrefix, 'getUpdatedDraftReleases');

    Releases.model.find().where('editor', req.user._id).where('status', 'draft').exec(function(err, items) {

      async.map(items, function(item, mapCallback) {
        Tracks.model.find({
          releases: item._id
        }).exec(function(err, tracks) {
          if (err) return res.apiError('database error', err);
          var transformedItem = item.toObject();
          transformedItem.tracks = tracks;
          mapCallback(err, transformedItem);
        })
      }, function(err, results) {

        var modifiedRelease = release.toObject();

        modifiedRelease.genres = modifiedRelease.genres.map(function(genre) {
          return genre.name;
        });

        var response = {
          Releases: results,
          PublishedRelease: modifiedRelease
        }

        callback(err, response);

      });

    });


  }



  function sendResponse(err, response) {
    console.log(logPrefix, 'sendResponse');

    req.publishCallback();

  }

  /*
  Preserve in case of direct release submission via REST API


    function sendResponse(err, response) {

  		 if (err) return res.apiError('database error', err);
       res.apiResponse(response);

    }


  Preserve in case of direct track submission via REST API
  */
  /*Releases.model.findById(req.body._id).exec(function(err, release) {

		if (err) return res.apiError('database error', err);
		if (!release) return res.apiError('not found');
    release.set({'status':'published'});
		release.save(function(err) {

			if (err) return res.apiError('create error', err);
    Releases.model.find().where('editor').equals(req.user._id).where('status').equals('draft').exec(function(err,items){
           async.map(items, function(item, mapCallback){
              Tracks.model.find({releases: item._id}).exec(function(err,tracks) {
      if (err) return res.apiError('database error', err);
            var transformedItem = item.toObject();
                transformedItem.tracks = tracks;
                mapCallback(err,transformedItem);
       }) }, function(err,results) {
           res.apiResponse({
                  Releases: results,
                  PublishedRelease: release
                });
           });

    })


		});

	});*/
}

/**
 * Delete Key by ID
 */
exports.remove = function(req, res) {

  Releases.model.findOne({
    _id: req.params.releaseId,
    editor: req.user._id,
    status: 'draft'
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
