var keystone = require('keystone');
var Types = keystone.Field.Types;
var async = require('async');
var AWS = require('aws-sdk');
var slugify = require("slug");
var archiver = require("archiver");
var _ = require("lodash");
var utilities = require('../routes/utilities');
var ffmpeg = require('fluent-ffmpeg');
var readChunk = require('read-chunk'); // npm install read-chunk 
var fileTypeChecker = require('file-type');
const exec = require('child_process').exec;
var os = require('os');
var fs = require('fs');

/**
 * Release Model
 * ==========
 */

var Release = new keystone.List('Release', { track: true });

Release.add({

  name: { type: Types.Text, index: true, initial: true, required: true, trim: true},

  editor: { type: Types.Relationship, ref: 'User', filters: { userRole: 'editor' }, index: true,  initial: true, required: true},
  
  currency: { type: Types.Relationship, ref: 'Currency', index: true },

	status: { type: Types.Select, options: ['draft', 'submitted', 'processing', 'published', 'error'], index: true, default: 'draft'},
	
	publishDate: { type: Types.Date, index: true },

	mediaType: { type: Types.Select, options: [{ value: 'audio', label: 'Audio' }, { value: 'video', label: 'Video' }], index: true },

  description: { type: Types.Textarea },

  genres: { type: Types.Relationship, ref: 'Genre', many: true, index: true },

  crooklynClanv1ProductID: { type: Types.Text },

  crooklynClanv1ProductCode: { type: Types.Text },

  crooklynClanv1ZIPCreatedAndPublished: { type: Types.Url },

	crooklynClanv1AutoMigrated: { type: Types.Boolean, index: true },

  crooklynClanv1TrackCount: { type: Types.Number },

  crooklynClanv1SampleTrackFileName: { type: Types.Text },

  crooklynClanv1SampleTrackOriginalFileName: { type: Types.Text },
  
  crooklynClanv1SampleTrackUrl: { type: Types.Url },
  
  waveformImageSnippetFileName: { type: Types.Text, noedit: true, default: ''},
	
	waveformImageSnippetFilePath: { type: Types.Text, noedit: true, default: '' },
	
	waveformImageSnippetFileUrl: { type: Types.Text, noedit: true, default: '' },

  actions: { type: Types.Select, options: [{ label: 'Select Action', value: null}, {label: 'Regenerate ZIP for v1', value: 'regenerate-v1-zip'} ] },
  
  confirmAction: { type: Types.Boolean, default: false },
  
  doubleConfirmAction: { type: Types.Boolean, default: false },

  lastActionTransaction: { type: Types.Textarea, noedit: true }
  

});


Release.schema.pre('save', function(next) {
  
  var preSavedRelease = this;
  
  if(this.actions && this.confirmAction && this.doubleConfirmAction) {
    
    if(this.actions == 'regenerate-v1-zip') {
      
      regenerateV1Zip(preSavedRelease, function(logResponse) {
        
        preSavedRelease.lastActionTransaction = logResponse;
        preSavedRelease.actions = null;
        preSavedRelease.confirmAction = false;
        preSavedRelease.doubleConfirmAction = false;
        next();
        
      })
      
    }
    
    
  } else {
    next();
  }

  
});

Release.schema.pre('save', function(next) {
  
  var self = this;
  
  Release.model.findById(this._id).exec( function(err, release) {
    
    		if(err) console.log(err);
    		
		if(release) {

    if(self.status == 'published' && release.status != 'published' && !self.publishDate && !release.publishDate) {
      
      self.publishDate = new Date();
      next();
      
    } else {
      next();
    }
		} else {
		  next();
		}
    
  });
  
  
});

function regenerateV1Zip (release, actionCallback) {
  
  var Releases = keystone.list('Release');
  var Tracks = keystone.list('Track');
  var logPrefix = '[RELEASE=' + release._id + ']';
  var transactionLog = '';

  function getTracksForRelease(callback) {
    
    console.log(logPrefix,'getTracksForRelease');
    console.log(logPrefix,release);
    
    Releases.model.findById(release._id).populate('editor').exec( function(err, release) {
      
      Tracks.model.find({releases: release._id}).populate('originalWorks').exec(function(err, tracks) {
  
  		  if (err) actionCallback(err);
        console.log(logPrefix,tracks);
        callback(null, tracks, release);
  
      });
    
    });

  }

  function setupS3FileStreamsForEachTrack (tracks, release, callback) {
    console.log(logPrefix,'setupS3FileStreamsForEachTrack');
    
    var zipSlug = 'v2_' + slugify(release.editor.stageName, '_') + '_' + slugify(release.name, '_') + '/';

    async.map(tracks, function(track, s3FileStreamCallback) {

                  var fileStream = new AWS.S3({params: { Bucket: keystone.get('s3 config').bucket, Key: track.publishedHiBitRateFile.filename}});

                  s3FileStreamCallback(null,{fileStream: fileStream, fileName: track.publishedHiBitRateFile.filename.replace('tracks/published/hi_bit_rate/',zipSlug)})

               },
               function(err, fileStreams) {
                 
                  if(err) actionCallback(err);
                 
                  callback(err, fileStreams, release);

               });

  }

  function uploadZipToS3 (fileStreams, release, callback) {
    
    console.log(logPrefix,'uploadZipToS3');

	  var zip = archiver('zip');

    _.each(fileStreams, function(fileStream) {
      zip.append(fileStream.fileStream.getObject().createReadStream(), {name: fileStream.fileName});
    });
    
    zip.on('error', function(err) {
      console.log(err);
      callback(err);
      
    });
    
    var s3upload = new AWS.S3.ManagedUpload({params: { Body: zip, Bucket: keystone.get('v1 s3 config').bucket, Key: 'Tracks-' + utilities.ucwords(slugify(release.editor.stageName, '').replace('-','')) + '/v2_' + slugify(release.editor.stageName, '_') + '_' + slugify(release.name, '_') + '_' + release._id + '.zip'}});
    s3upload.on('httpUploadProgress', function(evt) { 
      
      transactionLog += JSON.stringify(evt);
      
      console.log(logPrefix,evt); 
      
    });
    
    s3upload.send(function(err, zipUploadConfirmation) {
        
        if(err) callback(err);
        if(zipUploadConfirmation) {
          
            transactionLog += JSON.stringify(zipUploadConfirmation);

            console.log(logPrefix, zipUploadConfirmation.Key);
            callback(null,release);
        }
        

      });

    zip.finalize();

  }
  
  function copySnippetToV1 (release, callback) {
    console.log(logPrefix,'copySnippetToV1', release);

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
        
        transactionLog += 'response from S3 on snippet ' + JSON.stringify(data);

				callback(null, release);

			});

  }
  
  function returnLogResponse (err, results) {
    if(err) console.log(err);
    
    actionCallback(transactionLog);
    
  }
  
  async.waterfall([getTracksForRelease, setupS3FileStreamsForEachTrack, uploadZipToS3, copySnippetToV1], returnLogResponse);
  
}

/**
 * Registration
 */

Release.defaultColumns = 'name';
Release.relationship({path: 'name', ref: 'Track', refPath: 'release'});
Release.register();
