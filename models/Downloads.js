var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
Downloads Model * ==========
 */

var Downloads = new keystone.List('Downloads', {
  track: true
});

Downloads.add({

  user: {
    type: Types.Relationship,
    ref: 'User',
    index: true
  },
  track: {
    type: Types.Relationship,
    ref: 'Track',
    index: true
  },
  releases: { 
    type: Types.Relationship,
    ref: 'Release',
    many: true,
    index: true
  },
  editor: {
    type: Types.Relationship,
    ref: 'User',
    filters: {
      userRole: 'editor'
    },
    index: true
  },
  assignedCollection: {
    type: Types.Relationship,
    ref: 'Collection'
  },
  creditsPaid: {
    type: Types.Number
  },
  userIP: {
    type: Types.Text
  },
  currency: {
    type: Types.Relationship,
    ref: 'Currency',
    index: true
  },
  transactionItem: {
    type: Types.Relationship,
    ref: 'TransactionItem',
    index: true
  },
  isAccounted: {
    type: Types.Boolean,
    index: true
  },
  accountedOn: {
    type: Types.Datetime,
    index: true
  },
  accountingPeriod: {
    type: Types.Relationship,
    ref: 'AccountingPeriod',
    index: true
  },
  notes: {
    type: Types.Textarea
  }

});

Downloads.schema.post('save', function(doc) {

  var Track = keystone.list('Track');

  if (doc.transactionItem) {


    console.log('tracking download purchase entitlement counts for transaction items');
    var TransactionItem = keystone.list('TransactionItem');

    Downloads.model.find({
      transactionItem: doc.transactionItem
    }, function(err, downloads) {

      var count = downloads.length;
      var creditsUsed = downloads.map((download) => {
        return download.creditsPaid;
      }).reduce((a, b) => {
        return a + b;
      });

      TransactionItem.model.findById(doc.transactionItem).exec(function(err, transactionItem) {

        if (doc.creditsPaid != 0) {

          transactionItem.set({
            creditsUsed: creditsUsed
          });
          transactionItem.set({
            creditsRemaining: transactionItem.credits - creditsUsed
          });
          transactionItem.set({
            downloadsAttributed: count
          });

        }
        else {

          transactionItem.set({
            downloadsAttributed: count
          });

        }

        transactionItem.save(function(err) {
          console.log('transaction item download and/or credit balance updated');
        });

      })

    });
  }

});

Downloads.schema.post('save', function(doc) {

  console.log('Downloads:PostSave:UpdateAccountingPeriodRecord Start');
  var Tracks = keystone.list('Track');

  var TransactionItem = keystone.list('TransactionItem');
  console.log('Downloads:PostSave:UpdateAccountingPeriodRecord checking that transaction item is associated with download');

  if (doc.transactionItem && doc.createdAt) {

    console.log('Downloads:PostSave:UpdateAccountingPeriodRecord download is associated with transaction item');

    TransactionItem.model.findById(doc.transactionItem).exec(function(err, transactionItem) {

      if (transactionItem.price > 0 && !doc.isAccounted && !doc.accountedOn && !doc.accountingPeriod) {

        var AccountingPeriod = keystone.list('AccountingPeriod');

        var date = new Date(doc.createdAt),
          y = date.getFullYear(),
          m = date.getMonth();
        var firstDay = new Date(y, m, 1);
        var lastDay = new Date(y, m + 1, 0, 23, 59, 59, 999);

        console.log('Downloads:PostSave:UpdateAccountingPeriodRecord');

        AccountingPeriod.model.findOne({
          currency: doc.currency,
          startDate: firstDay,
          endDate: lastDay
        }).exec(function(err, accountingPeriodRecord) {

          if (err) console.log('Downloads:PostSave:UpdateAccountingPeriodRecord', err);

          if (!accountingPeriodRecord) {

            console.log('Downloads:PostSave:UpdateAccountingPeriodRecord no accounting period record found - will create new one');

            var newAccountingPeriod = new AccountingPeriod.model();

            newAccountingPeriod.set({
              startDate: firstDay
            });
            newAccountingPeriod.set({
              endDate: lastDay
            });
            newAccountingPeriod.set({
              currency: doc.currency
            });

            newAccountingPeriod.save(function(err) {

              if (err) console.log('Downloads:PostSave:UpdateAccountingPeriodRecord new accounting period save error', err);

              console.log('Downloads:PostSave:UpdateAccountingPeriodRecord new accounting period saved');

              AccountingPeriod.model.findOne({
                currency: doc.currency,
                startDate: firstDay,
                endDate: lastDay
              }).exec(function(err, newAccountingPeriodRecord) {

                console.log('Downloads:PostSave:UpdateAccountingPeriodRecord getting new accounting period record');

                doc.set({
                  accountedOn: new Date()
                });
                doc.set({
                  isAccounted: true
                });
                doc.set({
                  accountingPeriod: newAccountingPeriodRecord._id
                });

                doc.save(function(err) {

                  if (err) console.log('Downloads:PostSave:UpdateAccountingPeriodRecord saving transaction item accounting details error', err);

                  console.log('Downloads:PostSave:UpdateAccountingPeriodRecord saving transaction item accounting details');

                  Downloads.model.count({
                    createdAt: {
                      $gte: newAccountingPeriodRecord.startDate,
                      $lte: newAccountingPeriodRecord.endDate
                    },
                    currency: newAccountingPeriodRecord.currency
                  }, function(err, count) {

                    newAccountingPeriodRecord.set({
                      totalDownloadCount: count
                    });
                    newAccountingPeriodRecord.save(function(err) {

                      Tracks.model.findById(doc.track).exec(function(err, track) {

                        track.set({
                          downloadCount: count
                        });

                        track.save(function(err) {

                          console.log('track download count updated');

                        });

                      });

                      console.log('Downloads:PostSave:UpdateAccountingPeriodRecord updated accounting with transaction item information');

                    });

                  });

                });

              })


            });

          }
          else {

            console.log('Downloads:PostSave:UpdateAccountingPeriodRecord getting new accounting period record');

            doc.set({
              accountedOn: new Date()
            });
            doc.set({
              isAccounted: true
            });
            doc.set({
              accountingPeriod: accountingPeriodRecord._id
            });

            doc.save(function(err) {

              console.log('Downloads:PostSave:UpdateAccountingPeriodRecord saving transaction item accounting details');


              Downloads.model.count({
                createdAt: {
                  $gte: accountingPeriodRecord.startDate,
                  $lte: accountingPeriodRecord.endDate
                },
                currency: accountingPeriodRecord.currency
              }, function(err, count) {
                
                if(err) console.log(err);
                
                accountingPeriodRecord.set({
                  
                  totalDownloadCount: count,
                  calculatedDownloadCreditValue: accountingPeriodRecord.calculatedNetProfitEditorShare / count
                
                });
                
                accountingPeriodRecord.save(function(err) {

                  Tracks.model.findById(doc.track).exec(function(err, track) {

                    track.set({
                      downloadCount: count
                    });

                    track.save(function(err) {

                      console.log('track download count updated');

                    });

                  });

                  console.log('Downloads:PostSave:UpdateAccountingPeriodRecord updated accounting with transaction item information');

                });

              });

            });

          }

          if (err) console.log(err);

          Tracks.model.findById(doc.track).populate('currency').exec(function(err, track) {

            if (track) {

              updateTrackDownloadCountsForPeriod(track, accountingPeriodRecord, function(trackAccounting) {

                updateEditorDownloadCountsForPeriod(track, accountingPeriodRecord, function(editorAccounting) {

                  console.log('Auto-download count increment on track and editor accounting');

                });

              })


            }

          });


        });

      }

    });

  }


});

var updateTrackDownloadCountsForPeriod = function(track, accountingPeriod, callback) {

  var Track = keystone.list('Track');
  var TrackAccounting = keystone.list('TrackAccounting');

  TrackAccounting.model.findOne({
    track: track,
    accountingPeriod: accountingPeriod
  }).exec(function(err, trackAccounting) {

    if (!trackAccounting) {

      var trackAccounting = new TrackAccounting.model({
        accountingPeriod: accountingPeriod,
        track: track,
        editor: track.editor,
        currency: track.currency
      });


    }

    Downloads.model.count({
      createdAt: {
        $gte: accountingPeriod.startDate,
        $lte: accountingPeriod.endDate
      },
      track: track._id,
      accountingPeriod: {$ne: null}

    }, function(err, downloadCount) {

      trackAccounting.set({
        downloadCount: downloadCount
      });
      trackAccounting.save(function(err) {

        if (err) console.log(err);

        callback(trackAccounting);

      });

    });

  })

}

var updateEditorDownloadCountsForPeriod = function(track, accountingPeriod, callback) {

  var Track = keystone.list('Track');
  var EditorAccounting = keystone.list('EditorAccounting');

  EditorAccounting.model.findOne({
    currency: track.currency,
    editor: track.editor,
    accountingPeriod: accountingPeriod
  }).exec(function(err, editorAccounting) {

    if (!editorAccounting) {

      var editorAccounting = new EditorAccounting.model({

        accountingPeriod: accountingPeriod,
        editor: track.editor,
        quotaThreshold: track.currency.trackUploadQuota,
        currency: track.currency
      });

    }

    Downloads.model.count({
      createdAt: {
        $gte: accountingPeriod.startDate,
        $lte: accountingPeriod.endDate
      },
      editor: track.editor
    }, function(err, downloadCount) {
      console.log('Download:EditorAccountingUpdate downloadCount', downloadCount);
      editorAccounting.set({
        downloadCount: downloadCount,
        earnings: accountingPeriod.calculatedDownloadCreditValue * downloadCount 
      });
      editorAccounting.save(function(err) {

        if (err) console.log(err);

        callback(editorAccounting);

      });

    });

  });

}


/**
 * Registration
 */

Downloads.defaultColumns = 'user, track, creditsPaid, userIP, currency, createdOn';
Downloads.relationship({
  path: 'transactionItem',
  ref: 'TransactionItem',
  refPath: 'name'
});
Downloads.register();
