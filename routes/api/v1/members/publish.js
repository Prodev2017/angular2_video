var async = require('async'),
keystone = require('keystone');
var trackController = require('./track');
var trackVideoController = require('./trackVideo');

var releaseController = require('./releases');
var Track = keystone.list('Track');
var Release = keystone.list('Release');

// Publish: This is the controller for the route that will process all tracks and releases as a batch

exports.publishTracksAndReleases  = function(req,res) {
     console.log(logPrefix, 'PUBLISH EVENT');

 var tracks = req.body.tracks;
 var releases = req.body.releases;
 var logPrefix = "[USER=" + req.user._id + "]";
 
 for(var i = 0; i < releases.length; i++) {
  
  tracks = tracks.concat(releases[i].tracks);

 }

 function updateTrackStatusAsSubmitted (track, updateStatusCallback) {
  
           console.log(logPrefix, 'updateTrackStatusAsSubmitted');

     Track.model.update({_id: track._id, editor: req.user._id}, { $set: { status: 'submitted' }}, updateStatusCallback);

 }

 function updateTracksStatusesAsSubmitted (callback) {
     
    console.log(logPrefix, 'updateTracksStatusesAsSubmitted');

    async.each(tracks, updateTrackStatusAsSubmitted, callback)
     
 }
 
 function updateReleaseStatusAsSubmitted (release, updateStatusCallback) {
              console.log(logPrefix, 'updateReleaseStatusAsSubmitted');

     Release.model.update({_id: release._id, editor: req.user._id}, { $set: { status: 'submitted' }}, updateStatusCallback);

 }
  
 function returnResponseToClient (callback) {
                   console.log(logPrefix, 'returnResponseToClient');

    res.apiResponse({
        status: 'published'
    });
    
    callback(null);
     
 }

 
 function updateReleasesStatusesAsSubmitted (callback) {
                        console.log(logPrefix, 'updateReleasesStatusesAsSubmitted');

    async.each(releases, updateReleaseStatusAsSubmitted, callback)

 }
 
 async.series([
    updateTracksStatusesAsSubmitted,
    updateReleasesStatusesAsSubmitted,
    returnResponseToClient
 ], function(err) {
  
    console.log('batch submit process completed');
    
 });
 
  //1. Mark each track and release as status submitted
 //2. Loop through each track ID and perform submit function
 //3. After tracks complete, loop through releases and perform submit function
    
}