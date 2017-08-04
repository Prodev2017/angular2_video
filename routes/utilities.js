var Sequelize = require('sequelize');
var utilities = require('./utilities');
var moment = require('moment');
var async = require('async');
var slugify = require('slug');
var keystone = require('keystone');
var ObjectId = require('mongoose').Types.ObjectId;
var Webflow = require('webflow-api');
var webflow = new Webflow({
  token: keystone.get('webflow api token')
});

/*
    if(process.env.QUOTAGUARDSTATIC_URL) {
        var sequelize = new Sequelize(process.env.V1_DB_DATABASE, process.env.V1_DB_USER, process.env.V1_DB_PASS);
    } else {
        var sequelize = new Sequelize(process.env.V1_DB_DATABASE, process.env.V1_DB_USER, process.env.V1_DB_PASS, {host: process.env.V1_DB_HOST});
    }

    sequelize.authenticate()
      .then(function(err) {
        console.log('Connection has been established successfully.');
      })
      .catch(function (err) {
        console.log('Unable to connect to the database:', err);
      });
*/


exports.secondsToTime = function(totalSeconds) {

  var hours = Math.floor(totalSeconds / 3600);
  var minutes = Math.floor((totalSeconds - (hours * 3600)) / 60);
  var seconds = totalSeconds - (hours * 3600) - (minutes * 60);

  // round seconds
  seconds = Math.round(seconds * 100) / 100

  var result = (minutes < 10 ? "0" + minutes : minutes);
  result += ":" + (seconds < 10 ? "0" + seconds : seconds);
  return result;

}

exports.htmlspecialchars = function(string, quoteStyle, charset, doubleEncode) {
  //       discuss at: http://locutus.io/php/htmlspecialchars/
  //      original by: Mirek Slugen
  //      improved by: Kevin van Zonneveld (http://kvz.io)
  //      bugfixed by: Nathan
  //      bugfixed by: Arno
  //      bugfixed by: Brett Zamir (http://brett-zamir.me)
  //      bugfixed by: Brett Zamir (http://brett-zamir.me)
  //       revised by: Kevin van Zonneveld (http://kvz.io)
  //         input by: Ratheous
  //         input by: Mailfaker (http://www.weedem.fr/)
  //         input by: felix
  // reimplemented by: Brett Zamir (http://brett-zamir.me)
  //           note 1: charset argument not supported
  //        example 1: htmlspecialchars("<a href='test'>Test</a>", 'ENT_QUOTES')
  //        returns 1: '&lt;a href=&#039;test&#039;&gt;Test&lt;/a&gt;'
  //        example 2: htmlspecialchars("ab\"c'd", ['ENT_NOQUOTES', 'ENT_QUOTES'])
  //        returns 2: 'ab"c&#039;d'
  //        example 3: htmlspecialchars('my "&entity;" is still here', null, null, false)
  //        returns 3: 'my &quot;&entity;&quot; is still here'

  var optTemp = 0
  var i = 0
  var noquotes = false
  if (typeof quoteStyle === 'undefined' || quoteStyle === null) {
    quoteStyle = 2
  }
  string = string || ''
  string = string.toString()

  if (doubleEncode !== false) {
    // Put this first to avoid double-encoding
    string = string.replace(/&/g, '&amp;')
  }

  string = string
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  var OPTS = {
    'ENT_NOQUOTES': 0,
    'ENT_HTML_QUOTE_SINGLE': 1,
    'ENT_HTML_QUOTE_DOUBLE': 2,
    'ENT_COMPAT': 2,
    'ENT_QUOTES': 3,
    'ENT_IGNORE': 4
  }
  if (quoteStyle === 0) {
    noquotes = true
  }
  if (typeof quoteStyle !== 'number') {
    // Allow for a single string or an array of string flags
    quoteStyle = [].concat(quoteStyle)
    for (i = 0; i < quoteStyle.length; i++) {
      // Resolve string input to bitwise e.g. 'ENT_IGNORE' becomes 4
      if (OPTS[quoteStyle[i]] === 0) {
        noquotes = true
      }
      else if (OPTS[quoteStyle[i]]) {
        optTemp = optTemp | OPTS[quoteStyle[i]]
      }
    }
    quoteStyle = optTemp
  }
  if (quoteStyle & OPTS.ENT_HTML_QUOTE_SINGLE) {
    string = string.replace(/'/g, '&#039;')
  }
  if (!noquotes) {
    string = string.replace(/"/g, '&quot;')
  }

  return string
}

exports.ucwords = function(str) {
  //  discuss at: http://locutus.io/php/ucwords/
  // original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
  // improved by: Waldo Malqui Silva (http://waldo.malqui.info)
  // improved by: Robin
  // improved by: Kevin van Zonneveld (http://kvz.io)
  // bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
  //    input by: James (http://www.james-bell.co.uk/)
  //   example 1: ucwords('kevin van  zonneveld')
  //   returns 1: 'Kevin Van  Zonneveld'
  //   example 2: ucwords('HELLO WORLD')
  //   returns 2: 'HELLO WORLD'

  return (str + '')
    .replace(/^([a-z\u00E0-\u00FC])|\s+([a-z\u00E0-\u00FC])/g, function($1) {
      return $1.toUpperCase()
    })
}

exports.getCurrencyCreditBalanceAndPurchasedTracks = function(currency, user, returnCallback) {
  var TransactionItems = keystone.list('TransactionItem');
  var Downloads = keystone.list('Downloads');
  var Tracks = keystone.list('Track');

  //#1: Identify all currently valid transaction items

  function getCurrentValidTransactionItems(callback) {

    TransactionItems.model.find({
      endTime: {
        $gt: new Date()
      },
      $or: [{
        creditsRemaining: {
          $gt: 0
        }
      }, {
        type: 'unlimited'
      }],
      currency: currency._id,
      user: user._id
    }).exec(function(err, transactionItems) {

      callback(null, transactionItems)

    });

  }

  //#2: If transaction items are unlimited, then end with that

  function checkTypesOfValidTransactionItems(transactionItems, callback) {

    var isUnlimited = true;

    if (transactionItems.length > 0) {

      for (var i = 0; i < transactionItems.length; i++) {

        isUnlimited = isUnlimited && (transactionItems[i].type == 'unlimited');

      }

    }
    else {

      isUnlimited = false;

    }

    callback(null, transactionItems, isUnlimited);

  }

  //#3: Combine all credits if it is a credit based package

  function calculateCreditBalance(transactionItems, isUnlimited, callback) {

    var creditBalance;
    if (isUnlimited) {

      creditBalance = -1;

    }
    else if (!isUnlimited && transactionItems.length == 0) {

      creditBalance = 0;

    }
    else {

      creditBalance = transactionItems.map(function(item) {
        return item.creditsRemaining;

      }).reduce(function(a, b) {
        console.log(a, b);

        return a + b;

      });

    }

    callback(null, creditBalance);


  }

  //#4: Get IDs of any tracks already purchased

  function getPurchasedTrackList(creditBalance, callback) {

    Downloads.model.find({
      user: user._id,
      currency: currency._id
    }).select('track releases').exec(function(err, userDownloads) {

      if (err) console.log(err);

      var purchasedTracksIds = userDownloads.map((item) => {
        return item.track;
      });

      var purchasedReleaseIds = userDownloads.map((item) => {

        if (item.releases && item.releases.length > 0) {
          return item.releases[0];
        }

      }).filter((item) => {

        return typeof item !== 'undefined';

      });

      Tracks.model.find({
        $and: [{
          releases: {
            $in: purchasedReleaseIds
          }
        }, {
          _id: {
            $nin: purchasedTracksIds
          }
        }]
      }).select('id').exec(function(err, tracksPartOfPurchasedReleases) {


        if (tracksPartOfPurchasedReleases) {

          purchasedTracksIds = purchasedTracksIds.concat(tracksPartOfPurchasedReleases.map((item) => {

            return item._id;

          }));

          callback(null, creditBalance, purchasedTracksIds);

        }
        else {

          callback(null, creditBalance, purchasedTracksIds);

        }


      });


    });



  }

  //#5: Return value of available credit balance for inclusion with currency data

  function returnBalance(err, creditBalance, purchasedTracks) {
    currency.creditBalance = creditBalance;
    currency.purchasedTracks = purchasedTracks;
    returnCallback(err, currency);

  }

  async.waterfall([

    getCurrentValidTransactionItems,

    checkTypesOfValidTransactionItems,

    calculateCreditBalance,

    getPurchasedTrackList,

  ], returnBalance);

}

exports.purchaseTrack = function(trackId, userId, currencyId, userIP, returnPurchaseStatus) {
  console.log('utilities:purchaseTrack');
  console.log('utilities:purchaseTrack track Ids', trackId);
  console.log('utilities:purchaseTrack user Id', userId);
  console.log('utilities:purchaseTrack currency Id', currencyId);
  console.log('utilities:purchaseTrack user Ip', userIP);

  var Tracks = keystone.list('Track');
  var Downloads = keystone.list('Downloads');
  var DownloadQueue = keystone.list('DownloadQueue');
  var TransactionItems = keystone.list('TransactionItem');

  //#1: Make sure all tracks are in fact not already purchased by user and all live within selected currency ID

  function checkTrackIsInCurrency(callback) {
    console.log('utilities:purchaseTrack:checkTrackIsInCurrency');

    Tracks.model.findOne({
      $and: [{
        _id: {
          $in: trackId
        }
      }, {
        currency: currencyId
      }, {
        status: 'published'
      }, {
        enabled: true
      }]
    }, function(err, track) {

      if (err) callback(err);

      if (track) {

        callback(null, trackId, track);

      }
      else {

        callback({
          err: 'tracks not all in currently selected store'
        })

      }


    });


  }

  function checkTrackIsNotAlreadyPurchased(trackId, track, callback) {
    console.log('utilities:purchaseTrack:checkTrackIsNotAlreadyPurchased');

    Downloads.model.findOne({
      $or: [{
        track: trackId,
        user: userId
      }, {
        releases: {
          $in: track.releases
        },
        user: userId
      }]
    }, function(err, download) {
      if (err) callback(err);
      if (!download) {

        callback(null, trackId);

      }
      else {

        callback({
          err: 'already-purchased',
          download: download
        });

      }

    })

  }

  //#2: Make sure we have enough credits or that we have the right to unlimited downloads


  //#3: If it's possible to make a purchase for the full amount of track IDs submitted, proceed, else say insufficient credits

  function checkAvailableCreditBalance(trackId, callback) {

    console.log('utilities:purchaseTrack:checkAvailableCreditBalance');

    utilities.getCurrencyCreditBalanceAndPurchasedTracks({
      _id: currencyId
    }, {
      _id: userId
    }, function(err, currency) {
      console.log('utilities:purchaseTracks:checkAvailableCreditBalance full currency results');

      if (currency.creditBalance == -1 || currency.creditBalance >= 1) {

        callback(null, trackId);

      }
      else {
        console.log('utilities:purchaseTrack:checkAvailableCreditBalance insufficient credits');

        callback({
          err: 'insufficient-credits'
        });

      }

    });

  }

  //#4: If tracks can be purchased, then create necessary records for each one entitling user to access each

  function createDownloadEntitlements(trackId, callback) {
    console.log('creating download entitlements for submitted tracks');
    var downloadEntitlementId = [];
    var creditsDeducted = [];

    async.eachSeries([trackId], function(trackId, eachCallback) {
      console.log('looping through each track to ensure right to purchase');

      utilities.getCurrencyCreditBalanceAndPurchasedTracks({
        _id: currencyId
      }, {
        _id: userId
      }, function(err, currency) {
        
        if(err) return eachCallback(err);
        console.log('checking currency credit balance');

        if (currency.creditBalance == -1 || currency.creditBalance >= 1) {
          console.log('currency credit balance is sufficient for this one track');

          Tracks.model.findOne({
            $and: [{
              _id: trackId
            }, {
              enabled: true
            }, {
              status: 'published'
            }]
          }).exec(function(err, track) {
            console.log('finding track');

            if (err) return eachCallback({
              err: 'track ' + trackId + ' not found, published or enabled'
            });

            Downloads.model.findOne({
              track: track._id,
              user: userId
            }).exec(function(err, download) {

              if (download) return eachCallback({
                err: 'track already downloaded'
              });
              if (err) return eachCallback({
                err: err
              });

              TransactionItems.model.find({
                $and: [{
                  endTime: {
                    $gt: new Date()
                  }
                }, {
                  $or: [{
                    creditsRemaining: {
                      $gt: 0
                    }
                  }, {
                    type: 'unlimited'
                  }]
                }, {
                  currency: currency._id
                }, {
                  user: userId
                }]
              }).sort('endTime').exec(function(err, transactionItems) {

                var newDownloadEntitlement = new Downloads.model();

                newDownloadEntitlement.set({
                  user: userId
                });
                newDownloadEntitlement.set({
                  transactionItem: transactionItems[0]._id
                });
                newDownloadEntitlement.set({
                  track: trackId
                });
                newDownloadEntitlement.set({
                  releases: track.releases
                });
                newDownloadEntitlement.set({
                  editor: track.editor
                });

                if (currency.creditBalance != -1 || currency.creditBalance >= 1) {
                  newDownloadEntitlement.set({
                    creditsPaid: track.creditValue
                  });
                }

                newDownloadEntitlement.set({
                  userIP: userIP
                });
                newDownloadEntitlement.set({
                  currency: currencyId
                });

                newDownloadEntitlement.save(function(err) {
                  console.log('new download entitlement saved');
                  downloadEntitlementId.push(newDownloadEntitlement._id);
                  creditsDeducted.push(newDownloadEntitlement.creditsPaid);

                  DownloadQueue.model.findOne({
                    user: userId,
                    currency: currencyId
                  }).exec(function(err, downloadQueue) {
                    if (err) console.log(err);

                    console.log('download queue found');
                    downloadQueue.tracks.pull(new ObjectId(track._id).toString());
                    console.log('download queue modified');
                    downloadQueue.save(function(err) {

                      if (err) return eachCallback({
                        err: err
                      });

                      return eachCallback(null);

                    });

                  });

                })

              });




            })


          })



        }
        else {

          callback({
            err: 'insufficient-credits'
          });

        }

      });



    }, function(err) {

      if (err) console.log('error with purchasing tracks', err);
      utilities.getCurrencyCreditBalanceAndPurchasedTracks({
        _id: currencyId
      }, {
        _id: userId
      }, function(err, currency) {

        callback(err, {
          trackId: trackId,
          downloadEntitlementId: downloadEntitlementId,
          creditsDeducted: creditsDeducted,
          creditBalance: currency.creditBalance,
          purchasedTracks: currency.purchasedTracks
        });

      });
    })


  }

  function confirmPurchases(err, results) {
    console.log('confirmPurchases', err, results);


    if (err) {

      console.log(err);
      returnPurchaseStatus(err);

    }
    else {
      if (results && results.creditsDeducted) {
        results.creditsDeducted = results.creditsDeducted.reduce(function(totalDeduction, creditDeduction) {
          return totalDeduction + creditDeduction
        });
      }

      results.downloadEntitlementId = results.downloadEntitlementId[0];

      returnPurchaseStatus(null, results);

    }


  }

  async.waterfall([checkTrackIsInCurrency, checkTrackIsNotAlreadyPurchased, checkAvailableCreditBalance, createDownloadEntitlements], confirmPurchases);

}


exports.updateEditorProfileInWebflow = function(updatedEditorProfile) {
  console.log('updating webflow')
  var Currency = keystone.list('Currency');

  var editorCollectionId = keystone.get('webflow api editor collection id');

  var updatedEditorInformation = {
    '_archived': false,
    '_draft': false,
    stagename: updatedEditorProfile.stageName,
    name: updatedEditorProfile.stageName,
    v2id: updatedEditorProfile._id,
    facebook: updatedEditorProfile.facebookUrl,
    twitter: updatedEditorProfile.twitterUrl,
    'photo': (updatedEditorProfile.photo && updatedEditorProfile.photo.url) ? updatedEditorProfile.photo.url.replace('//', 'https://') : '',
    'logosquare': (updatedEditorProfile.logoSquare && updatedEditorProfile.logoSquare.url) ? updatedEditorProfile.logoSquare.url.replace('//', 'https://') : '',
    'logolong': (updatedEditorProfile.logoLong && updatedEditorProfile.logoLong.url) ? updatedEditorProfile.logoLong.url.replace('//', 'https://') : '',
    'backgroundimage': (updatedEditorProfile.backgroundImage && updatedEditorProfile.backgroundImage.url) ? updatedEditorProfile.backgroundImage.url.replace('//', 'https://') : '',
    instagram: updatedEditorProfile.instagramUrl,
    linkedin: updatedEditorProfile.linkedinUrl,

    soundcloud: updatedEditorProfile.soundcloudUrl,
    youtube: updatedEditorProfile.youtubeUrl,
    hometown: updatedEditorProfile.hometown,
    'new-field-8': updatedEditorProfile.googleUrl,
    'youtube-featured-video': updatedEditorProfile.youTubeFeaturedVideoUrl,
    'youtube-video-description': updatedEditorProfile.youTubeFeaturedVideoDescription,
    'i-specialize-in': updatedEditorProfile.editorSpecialization,
    'current-location': updatedEditorProfile.currentLocation,
    'country-2': updatedEditorProfile.address.country,
    'biography': updatedEditorProfile.biography,
    'soundcloudfeaturedtrackurl1': updatedEditorProfile.soundCloudFeaturedTrackUrl1,
    'soundcloudfeaturedtrackurl2': updatedEditorProfile.soundCloudFeaturedTrackUrl2,
    'soundcloudfeaturedtrackurl3': updatedEditorProfile.soundCloudFeaturedTrackUrl3,
    'soundcloudfeaturedtrackurl1description': updatedEditorProfile.soundCloudFeaturedTrackUrl1Description,
    'soundcloudfeaturedtrackurl2description': updatedEditorProfile.soundCloudFeaturedTrackUrl2Description,
    'soundcloudfeaturedtrackurl3description': updatedEditorProfile.soundCloudFeaturedTrackUrl3Description,

    'yearstarted': parseInt(new Date().getFullYear()) - parseInt(updatedEditorProfile.yearCrooklynClanStarted),
    'isi12incheditor': updatedEditorProfile.currencies.indexOf(process.env.I12INCH_CURRENCY_ID) !== -1,
    'isaudiovaulteditor': updatedEditorProfile.currencies.indexOf(process.env.AUDIO_VAULT_CURRENCY_ID) !== -1,
    'isvideovaulteditor': updatedEditorProfile.currencies.indexOf(process.env.VIDEO_VAULT_CURRENCY_ID) !== -1,
    'issiqwencereditor': updatedEditorProfile.currencies.indexOf(process.env.LOOPS_CURRENCY_ID) !== -1,

  }

  webflow.collections({
    siteId: process.env.WEBFLOW_API_SITE_ID
  }).then((collections) => {

    var editorsCollection = collections.find((collection) => {
      return collection.slug == process.env.WEBFLOW_API_EDITOR_COLLECTION_SLUG;
    });

    webflow.items({
      collectionId: editorsCollection._id
    }).then((response) => {

      var pagesOfEditorsToGet = Math.ceil(response.total / response.limit);

      async.times(pagesOfEditorsToGet, (n, next) => {

        webflow.items({
          collectionId: editorsCollection._id
        }, {
          offset: response.limit * n
        }).then((asyncResponse) => {

          next(null, asyncResponse.items);

        });

      }, function(err, editors) {

        editors = [].concat.apply([], editors);

        if (err) console.log(err);

        var editorToUpdateIndex = editors.findIndex((item) => {

          return item.v2id == updatedEditorProfile._id;

        });

        if (editorToUpdateIndex !== -1) {

          webflow.updateItem({
            collectionId: editorsCollection._id,
            itemId: editors[editorToUpdateIndex]._id,
            fields: Object.assign(updatedEditorInformation, {
              slug: editors[editorToUpdateIndex].slug
            }),
            live: true
          }).then(item => {
            console.log('returned updated item', item)

            webflow.publishSite({
              siteId: process.env.WEBFLOW_API_SITE_ID,
              domains: process.env.WEBFLOW_API_SITE_DOMAIN.split('|')
            }).then((response) => {
              if (response.queued) {
                console.log('site domains queued for publishing');

              }
              else {
                console.log('site domains not queued');

              }
            }).catch(err => console.log('error publishing site', err));
          }).catch(err => console.log('error updating item', err));

        }
        else {

          webflow.createItem({
              collectionId: editorsCollection._id,
              fields: updatedEditorInformation,
              live: true
            })
            .then(item => {
              console.log('returned newly created item', item);
              webflow.publishSite({
                siteId: process.env.WEBFLOW_API_SITE_ID,
                domains: process.env.WEBFLOW_API_SITE_DOMAIN.split('|')
              }).then((response) => {
                if (response.queued) {
                  console.log('site domains queued for publishing');

                }
                else {
                  console.log('site domains not queued');

                }
              }).catch(err => console.log('error publishing site', err));
            })
            .catch(err => console.log('error', err));

        }


      });

    });

  });

}