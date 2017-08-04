var async = require('async');
var keystone = require('keystone');
var _ = require('lodash');
var AWS = require('aws-sdk');
var ffmpeg = require('fluent-ffmpeg');
var os = require('os');
var fs = require('fs');
var slugify = require("slug");
var moment = require('moment');
var ObjectId = keystone.mongoose.Types.ObjectId;

var verifyAccountingPeriodExistForCurrency = function(currency, year, month, callback) {

  var currencyId = currency._id;

  var firstDay = new Date(year, month, 1);
  var lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);

  var TransactionItem = keystone.list('TransactionItem');
  var AccountingPeriod = keystone.list('AccountingPeriod');

  AccountingPeriod.model.count({
    currency: currencyId,
    startDate: firstDay,
    endDate: lastDay

  }).exec(function(err, count) {
    if (err) console.log('error counting accounting periods available for specified time period', err);
    if (count == 0) {

      var newAccountingPeriod = new AccountingPeriod.model({
        currency: currencyId,
        startDate: firstDay,
        endDate: lastDay

      });

      newAccountingPeriod.save(function(err) {

        if (err) console.log('error creating new accounting period', err);
        console.log('created blank editor accounting record for ' + newAccountingPeriod.name);

        callback();

      });

    }
    else {

      callback();

    }


  })

}

var verifyAccountingPeriodsExistsForEditorForCurrency = function(editor, currency, year, month, callback) {

  var currencyId = currency._id;
  var editorId = editor._id;

  var firstDay = new Date(year, month, 1);
  var lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);

  var Download = keystone.list('Downloads');
  var AccountingPeriod = keystone.list('AccountingPeriod');
  var EditorAccounting = keystone.list('EditorAccounting');

  AccountingPeriod.model.findOne({
    currency: currencyId,
    startDate: firstDay,
    endDate: lastDay
  }).exec(function(err, accountingPeriod) {

    EditorAccounting.model.count({
      editor: editorId,
      accountingPeriod: accountingPeriod._id,
      currency: currencyId,
    }).exec(function(err, count) {

      if (count == 0) {

        var newEditorAccounting = new EditorAccounting.model({

          editor: editorId,
          payPalEmailAddress: editor.payPalEmailAddress,
          accountingPeriod: accountingPeriod._id,
          currency: currencyId,
          currencyUploadQuotaToQualifyForEarnings: currency.trackUploadQuota,

        });

        newEditorAccounting.save(function(err) {

          if (err) console.log(err);

          callback();

        });


      }
      else {

        callback();

      }


    });

  });

}


var updateAccountingPeriodTransactionTotals = function(currency, year, month, callback) {

  var currencyId = currency._id;

  var firstDay = new Date(year, month, 1);
  var lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);

  var TransactionItem = keystone.list('TransactionItem');
  var AccountingPeriod = keystone.list('AccountingPeriod');

  TransactionItem.model.aggregate([{
      $match: {
        currency: currencyId,
        startTime: {
          $gte: firstDay,
          $lte: lastDay
        }
      }
    }, {
      $group: {
        _id: currencyId,
        totalRevenue: {
          '$sum': '$price'
        },
        calculatedCompanyExpenses: {
          '$sum': '$calculatedCompanyExpenses'
        },
        calculatedSRASExpenses: {
          '$sum': '$calculatedSRASExpenses'
        },
        calculatedNetProfit: {
          '$sum': '$calculatedNetProfit'
        },
        calculatedNetProfitCompanyShare: {
          '$sum': '$calculatedNetProfitCompanyShare'
        },
        calculatedNetProfitEditorShare: {
          '$sum': '$calculatedNetProfitEditorShare'
        }

      }
    }])
    .exec(function(err, accountingPeriodTransactionTotals) {
      if (err) {
        console.log('error getting totals', err);
      }
      console.log('accounting totals returned for currency ' + currency.name + ' ' + JSON.stringify(accountingPeriodTransactionTotals));

      var accountingPeriodNumbersToUpdate;

      if (accountingPeriodTransactionTotals && accountingPeriodTransactionTotals.length > 0) {

        accountingPeriodNumbersToUpdate = accountingPeriodTransactionTotals[0];

      }
      else {
        accountingPeriodNumbersToUpdate = {
          totalRevenue: 0,
          calculatedCompanyExpenses: 0,
          calculatedSRASExpenses: 0,
          calculatedNetProfit: 0,
          calculatedNetProfitCompanyShare: 0,
          calculatedNetProfitEditorShare: 0,
        }
      }

      AccountingPeriod.model.findOne({
        currency: currencyId,
        startDate: firstDay,
        endDate: lastDay
      }).exec(function(err, accountingPeriod) {

        if (err) return callback(err);

        accountingPeriod.set(accountingPeriodNumbersToUpdate);
        accountingPeriod.save(function(err) {
          if (err) return callback(err);

          var transformedCurrency = currency.toObject();

          transformedCurrency = Object.assign(transformedCurrency, accountingPeriodTransactionTotals[0]);

          console.log('Updated Accounting Period: ', accountingPeriod.name);

          return callback(err, transformedCurrency);

        });

      });

    })


}


var updateEditorDownloadTotalsForAccountingPeriod = function(editor, currency, year, month, callback) {

  var currencyId = currency._id;
  var editorId = editor._id;

  var firstDay = new Date(year, month, 1);
  var lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);

  var Download = keystone.list('Downloads');
  var AccountingPeriod = keystone.list('AccountingPeriod');
  var EditorAccounting = keystone.list('EditorAccounting');

  Download.model.count({

    currency: currencyId,
    editor: editorId,
    createdAt: {
      $gte: firstDay,
      $lte: lastDay
    },
    accountingPeriod: {
      $ne: null
    }

  }).exec(function(err, accountingPeriodDownloadTotals) {
    if (err) {
      console.log('error getting totals', err);
    }


    if (accountingPeriodDownloadTotals && accountingPeriodDownloadTotals > 0) {

      AccountingPeriod.model.findOne({
        currency: currencyId,
        startDate: firstDay,
        endDate: lastDay
      }).exec(function(err, accountingPeriod) {

        EditorAccounting.model.findOne({
          editor: editorId,
          accountingPeriod: accountingPeriod._id,
          currency: currencyId,
        }).exec(function(err, editorAccounting) {

          editorAccounting.set({
            downloadCount: accountingPeriodDownloadTotals
          });

          editorAccounting.save(function(err) {

            var transformedEditorAccounting = editorAccounting.toObject();

            transformedEditorAccounting = Object.assign(transformedEditorAccounting, {
              downloadCount: accountingPeriodDownloadTotals
            });

            callback(err, transformedEditorAccounting);

          });

        });

      });

    }
    else {

      callback(null, currency);

    }
  })

}

var updateEditorUploadCountForAccountingPeriod = function(editor, currency, year, month, callback) {

  var currencyId = currency._id;
  var editorId = editor._id;

  if (year == 2017 && month == 5) {

    var firstDay = new Date(1980, 0, 1);
    var lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);

  }
  else {

    var firstDay = new Date(year, month, 1);
    var lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);

  }

  var Track = keystone.list('Track');
  var Release = keystone.list('Release');
  var AccountingPeriod = keystone.list('AccountingPeriod');
  var EditorAccounting = keystone.list('EditorAccounting');
  var accountingPeriodTrackUploadCount = 0;

  Track.model.count({

    currency: currencyId,
    editor: editorId,
    status: 'published',
    releases: {
      $eq: []
    },
    publishDate: {
      $gte: firstDay,
      $lte: lastDay
    }

  }).exec(function(err, accountingPeriodTrackCount) {

    Release.model.count({

      currency: currencyId,
      editor: editorId,
      status: 'published',
      publishDate: {
        $gte: firstDay,
        $lte: lastDay
      }

    }).exec(function(err, accountingPeriodReleaseCount) {

      accountingPeriodTrackUploadCount = accountingPeriodTrackCount + accountingPeriodReleaseCount;

      if (err) {

        console.log('error getting totals', err);

      }
      firstDay = new Date(year, month, 1);
      lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);

      AccountingPeriod.model.findOne({
        currency: currencyId,
        startDate: firstDay,
        endDate: lastDay
      }).exec(function(err, accountingPeriod) {

        EditorAccounting.model.findOne({
          editor: editorId,
          accountingPeriod: accountingPeriod._id,
          currency: currencyId,
        }).exec(function(err, editorAccounting) {

          if (err) return callback(err);

          editorAccounting.set({
            trackUploadCount: accountingPeriodTrackUploadCount
          });

          editorAccounting.save(function(err) {

            var transformedEditorAccounting = editorAccounting.toObject();

            transformedEditorAccounting = Object.assign(transformedEditorAccounting, {
              trackUploadCount: accountingPeriodTrackUploadCount
            });

            callback(err, transformedEditorAccounting);

          });

        });

      });

    })

  });

}


var updateEditorEarningsForAccountingPeriod = function(editor, currency, year, month, callback) {

  var currencyId = currency._id;
  var editorId = editor._id;

  var firstDay = new Date(year, month, 1);
  var lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);

  var Download = keystone.list('Downloads');
  var AccountingPeriod = keystone.list('AccountingPeriod');
  var EditorAccounting = keystone.list('EditorAccounting');

  AccountingPeriod.model.findOne({

    currency: currencyId,
    startDate: firstDay,
    endDate: lastDay

  }).exec(function(err, accountingPeriod) {

    if (err) {
      console.log('error getting totals', err);
    }

    EditorAccounting.model.findOne({
      editor: editorId,
      accountingPeriod: accountingPeriod._id,
      currency: currencyId,
    }).exec(function(err, editorAccounting) {
      if (err) {
        console.log('error getting editor accounting', err);
        return callback(err);
      }

      if (editorAccounting) {

        if (accountingPeriod.totalDownloadCount == 0) {

          var editorShareOfAccountingPeriodsDownloads = 0;
          var editorsShareOfCalculatedNetProfitEditorShare = 0;

        }
        else {

          var editorShareOfAccountingPeriodsDownloads = editorAccounting.downloadCount / accountingPeriod.totalDownloadCount;
          var editorsShareOfCalculatedNetProfitEditorShare = parseFloat(accountingPeriod.calculatedNetProfitEditorShare * editorShareOfAccountingPeriodsDownloads);

        }

        editorAccounting.set({
          earnings: parseFloat(editorsShareOfCalculatedNetProfitEditorShare)
        });

        editorAccounting.save(function(err) {

          var transformedEditorAccounting = editorAccounting.toObject();

          transformedEditorAccounting = Object.assign(transformedEditorAccounting, {
            earnings: editorsShareOfCalculatedNetProfitEditorShare
          });

          return callback(err, transformedEditorAccounting);

        });

      }
      else {

        return callback('no editor accounting record found for ' + editorId + 'in currency ' + currencyId);

      }

    });

  });



}

var updateEditorQuotaStatusForAccountingPeriod = function(editor, currency, year, month, callback) {

  var currencyId = currency._id;
  var editorId = editor._id;

  var firstDay = new Date(year, month, 1);
  var lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);

  var Download = keystone.list('Downloads');
  var AccountingPeriod = keystone.list('AccountingPeriod');
  var EditorAccounting = keystone.list('EditorAccounting');

  AccountingPeriod.model.findOne({

    currency: currencyId,
    startDate: firstDay,
    endDate: lastDay

  }).exec(function(err, accountingPeriod) {

    if (err) {
      console.log('error getting totals', err);
    }

    if (accountingPeriod) {
      EditorAccounting.model.findOne({
        editor: editorId,
        accountingPeriod: accountingPeriod._id,
        currency: currencyId,
      }).exec(function(err, editorAccounting) {
        if (err) console.log('error getting editor accounting', err);

        var didEditorMeetQuota = editorAccounting.trackUploadCount >= editorAccounting.currencyUploadQuotaToQualifyForEarnings;

        editorAccounting.set({
          metQuota: didEditorMeetQuota
        });

        editorAccounting.save(function(err) {

          var transformedEditorAccounting = editorAccounting.toObject();

          transformedEditorAccounting = Object.assign(transformedEditorAccounting, {
            metQuota: didEditorMeetQuota
          });

          callback(err, transformedEditorAccounting);

        });
      });
    }
    else {
      callback();
    }

  });


}



var updateAccountingPeriodDownloadTotals = function(currency, year, month, callback) {

  var currencyId = currency._id;

  var firstDay = new Date(year, month, 1);
  var lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);

  var Download = keystone.list('Downloads');
  var AccountingPeriod = keystone.list('AccountingPeriod');

  Download.model.count({

    currency: currencyId,
    createdAt: {
      $gte: firstDay,
      $lte: lastDay
    },
    accountingPeriod: {
      $ne: null
    }

  }).exec(function(err, accountingPeriodDownloadTotals) {

    if (err) {

      console.log('error getting totals', err);

    }

    AccountingPeriod.model.findOne({
      currency: currencyId,
      startDate: firstDay,
      endDate: lastDay
    }).exec(function(err, accountingPeriod) {

      if (err) return callback(err);

      var creditValue;

      if (accountingPeriodDownloadTotals == 0) {

        creditValue = 0;

      }
      else {

        creditValue = parseFloat(accountingPeriod.calculatedNetProfitEditorShare) / parseInt(accountingPeriodDownloadTotals);

      }

      accountingPeriod.set({

        totalDownloadCount: parseInt(accountingPeriodDownloadTotals),
        calculatedDownloadCreditValue: creditValue

      });

      accountingPeriod.save(function(err) {

        if (err) return callback(err);

        var transformedCurrency = currency.toObject();

        transformedCurrency = Object.assign(transformedCurrency, {
          totalDownloadCount: accountingPeriodDownloadTotals
        });

        return callback(err, transformedCurrency);

      });

    });

  });

}



exports.run = function() {

  if (process.env.DYNO == 'web.1' || process.env.NODE_ENV != 'production') {

    console.log('cron jobs commenced at app start');
    //updateTrackSearchFields();
    correctOlderBetaTracks();
    autopublish();
    updateAccounting();
    ensurePreviousTracksHaveWaveformImage();

  }

}

exports.updateAccounting = function() {

  runFullAccountingUpdate();

}

var updateAccounting = function() {

  setInterval(runFullAccountingUpdate, keystone.get('accounting batch job interval'));

}

var runFullAccountingUpdate = function() {

  if (!keystone.get('updating accounting')) {
    console.log('running current month accounting update');
    keystone.set('updating accounting', true);

    var date = new Date();
    var currentMonth = date.getMonth();
    var currentYear = date.getFullYear();

    var Currency = keystone.list('Currency');

    Currency.model.find().exec(function(err, currencies) {

      async.applyEachSeries([
        verifyAccountingPeriodsExistForEachCurrency,
        updateAccountingPeriodTransactionTotalsForEachCurrency,
        updateAccountingPeriodDownloadTotalsForEachCurrency,
        verifyAccountingPeriodsExistsForEditorsForEachCurrency,
        updateEditorUploadCountForEachCurrency,
        updateEditorDownloadsForEachCurrency,
        updateEditorEarningsForEachCurrency,
        updateEditorQuotaStatusForEachCurrency,
        updateEditorRankingsForEachCurrency,
        updateTrackRankingsForEachCurrency
      ], currencies, currentMonth, currentYear, function(err, results) {

        if (err) console.log('accounting update error', err);

        keystone.set('updating accounting', false);
        console.log('completed current month accounting update');

      });

    });

  }
  else {

    console.log('accounting update in progress - will not commence until completed');

  }

}

var verifyAccountingPeriodsExistForEachCurrency = function(currencies, currentMonth, currentYear, applyEachSeriesCallback) {
  console.log('verifyAccountingPeriodsExistForEachCurrency');

  async.mapSeries(currencies, function(currency, callback) {
    verifyAccountingPeriodExistForCurrency(currency, currentYear, currentMonth, callback);
  }, function(err, currenciesWithRevisedAccounting) {
    if (err) console.log('error in verifyAccountingPeriodsExistForEachCurrency', err);

    applyEachSeriesCallback();

  })

}

var updateAccountingPeriodTransactionTotalsForEachCurrency = function(currencies, currentMonth, currentYear, applyEachSeriesCallback) {
  console.log('updateAccountingPeriodTransactionTotalsForEachCurrency');

  async.mapSeries(currencies, function(currency, callback) {
    updateAccountingPeriodTransactionTotals(currency, currentYear, currentMonth, callback);
  }, function(err, currenciesWithRevisedAccounting) {
    if (err) console.log('error in updateAccountingPeriodTransactionTotalsForEachCurrency', err);
    return applyEachSeriesCallback();

  })

}

var updateAccountingPeriodDownloadTotalsForEachCurrency = function(currencies, currentMonth, currentYear, applyEachSeriesCallback) {
  console.log('updateAccountingPeriodDownloadTotalsForEachCurrency');

  async.mapSeries(currencies, function(currency, callback) {

    updateAccountingPeriodDownloadTotals(currency, currentYear, currentMonth, callback);

  }, function(err, currenciesWithRevisedAccounting) {
    if (err) console.log('error in updateAccountingPeriodDownloadTotalsForEachCurrency', err);

    applyEachSeriesCallback();

  })


}

var verifyAccountingPeriodsExistsForEditorsForEachCurrency = function(currencies, currentMonth, currentYear, applyEachSeriesCallback) {
  console.log('verifyAccountingPeriodsExistsForEditorsForEachCurrency');


  var Users = keystone.list('User');

  async.mapSeries(currencies, function(currency, callback) {

    Users.model.find({

      userRole: 'editor'

    }).exec(function(err, editors) {

      if (err) console.log('error finding editors: ', err);

      async.mapSeries(editors, function(editor, editorCallback) {

        verifyAccountingPeriodsExistsForEditorForCurrency(editor, currency, currentYear, currentMonth, editorCallback);

      }, function(err, editorWithRevisedDownloadCounty) {

        if (err) console.log('error verifying accounting periods exist for editors of currency', err);

        callback();

      })

    })


  }, function(err, currenciesWithRevisedAccounting) {

    applyEachSeriesCallback();

  })


}


var updateEditorDownloadsForEachCurrency = function(currencies, currentMonth, currentYear, applyEachSeriesCallback) {
  console.log('updateEditorDownloadsForEachCurrency');

  var Users = keystone.list('User');

  async.mapSeries(currencies, function(currency, callback) {

    Users.model.find({

      userRole: 'editor'

    }).exec(function(err, editors) {

      if (err) console.log('error finding editors: ', err);

      async.mapSeries(editors, function(editor, editorCallback) {

        updateEditorDownloadTotalsForAccountingPeriod(editor, currency, currentYear, currentMonth, editorCallback);

      }, function(err, editorWithRevisedDownloadCounty) {

        if (err) console.log('error getting download totoals for editors', err);

        callback();

      })

    })


  }, function(err, currenciesWithRevisedAccounting) {

    applyEachSeriesCallback();

  })


}

var updateEditorUploadCountForEachCurrency = function(currencies, currentMonth, currentYear, applyEachSeriesCallback) {
  console.log('updateEditorUploadCountForEachCurrency');

  var Users = keystone.list('User');

  async.mapSeries(currencies, function(currency, callback) {

    Users.model.find({

      userRole: 'editor'

    }).exec(function(err, editors) {

      if (err) console.log('error finding editors: ', err);

      async.mapSeries(editors, function(editor, editorCallback) {

        updateEditorUploadCountForAccountingPeriod(editor, currency, currentYear, currentMonth, editorCallback);

      }, function(err, editorWithRevisedUploadCount) {

        if (err) console.log('error getting upload count for editors', err);

        callback();

      })

    })


  }, function(err, currenciesWithRevisedAccounting) {

    applyEachSeriesCallback();

  })


}

var updateEditorEarningsForEachCurrency = function(currencies, currentMonth, currentYear, applyEachSeriesCallback) {
  console.log('updateEditorEarningsForEachCurrency');

  var Users = keystone.list('User');

  async.mapSeries(currencies, function(currency, callback) {

    Users.model.find({

      userRole: 'editor'

    }).exec(function(err, editors) {

      if (err) console.log('error finding editors: ', err);

      async.mapSeries(editors, function(editor, editorCallback) {

        updateEditorEarningsForAccountingPeriod(editor, currency, currentYear, currentMonth, editorCallback);

      }, function(err, editorWithRevisedDownloadCounty) {

        if (err) console.log('error updating earnings for editor accounting periods', err);

        callback();

      })

    })


  }, function(err, currenciesWithRevisedAccounting) {

    applyEachSeriesCallback();

  })


}

var updateEditorQuotaStatusForEachCurrency = function(currencies, currentMonth, currentYear, applyEachSeriesCallback) {
  console.log('updateEditorQuotaStatusForEachCurrency');

  var Users = keystone.list('User');

  async.mapSeries(currencies, function(currency, callback) {

    Users.model.find({

      userRole: 'editor'

    }).exec(function(err, editors) {

      if (err) console.log('error finding editors: ', err);

      async.mapSeries(editors, function(editor, editorCallback) {

        updateEditorQuotaStatusForAccountingPeriod(editor, currency, currentYear, currentMonth, editorCallback);

      }, function(err, editorWithRevisedDownloadCounty) {

        if (err) console.log('error updating editor quota status for currency in accounting period', err);

        callback();

      })

    })


  }, function(err, currenciesWithRevisedAccounting) {

    applyEachSeriesCallback();

  })


}

var updateEditorRankingsForEachCurrency = function(currencies, currentMonth, currentYear, applyEachSeriesCallback) {
  console.log('updateEditorRankingsForEachCurrency');
  var currentMonthStartDate, currentMonthEndDate, lastMonthStartDate, lastMonthEndDate;
  var Downloads = keystone.list('Downloads');
  var Tracks = keystone.list('Track');

  currentMonthStartDate = moment(new Date(currentYear, currentMonth, 1));
  currentMonthEndDate = moment(new Date(currentYear, currentMonth, 1)).endOf('month');
  lastMonthStartDate = moment(new Date(currentYear, currentMonth, 1)).subtract(1, 'month');
  lastMonthEndDate = moment(new Date(currentYear, currentMonth, 1)).endOf('month');

  async.mapSeries(currencies, function(currency, currencyCallback) {

    async.waterfall([

      async.constant(currency, currentMonthStartDate, currentMonthEndDate),
      getValidEditors,
      getAllTimeEditorRankings,
      getCurrentMonthEditorRanking,
      getLastMonthEditorRanking
    ], function(err, rankings) {

      if (err) return currencyCallback(err);

      currency.rankings = rankings;

      var updatedCurrency = currency.toObject();

      updatedCurrency.rankings = rankings;

      return currencyCallback(null, updatedCurrency);

    });

  }, function(err, updatedCurrencies) {

    if (err) console.log('error updating editor quota status for currency in accounting period', err);

    var Charts = keystone.list('Chart');
    var Users = keystone.list('User');

    Users.model.find({
      userRole: 'editor',
      enabled: true
    }).select('_id currencies').exec(function(err, editors) {

      async.eachSeries(updatedCurrencies, function(updatedCurrency, currencyChartCallback) {

        async.filterSeries(editors, function(editor, filterCallback) {

          Tracks.model.count({
            editor: editor,
            currency: updatedCurrency,
            status: 'published',
            publishDate: {
              $gte: currentMonthStartDate,
              $lte: currentMonthEndDate
            }
          }).exec(function(err, trackCount) {

            if (err) return filterCallback(err);
            return filterCallback(null, trackCount > 0);

          });

        }, function(err, enabledEditors) {

          if (err) return currencyChartCallback(err);
          console.log('enabledEditors', enabledEditors);



          Charts.model.remove({
            currency: updatedCurrency
          }).exec(function(err) {


            if (err) return currencyChartCallback(err);

            console.log('charts removed for this currency');


            async.eachSeries(enabledEditors, function(editor, editorChartCallback) {

              if (editor.currencies.indexOf(updatedCurrency._id) !== -1) {

                var currentMonthRanking, lastMonthRanking, allTimeRanking;

                var currentMonthRank = updatedCurrency.rankings.currentMonthEditorRankings.filter((item) => {

                  return item.editor && item.editor.toString() == editor._id.toString();

                });

                if (typeof currentMonthRank != 'undefined' && currentMonthRank.length == 1) {

                  currentMonthRanking = currentMonthRank[0].ranking;

                }
                else {

                  currentMonthRanking = 99999999999;

                }

                var lastMonthRanking = updatedCurrency.rankings.lastMonthEditorRankings.filter((item) => {

                  return item.editor && item.editor.toString() == editor._id.toString();


                });

                if (typeof lastMonthRanking != 'undefined' && lastMonthRanking.length == 1) {
                  lastMonthRanking = lastMonthRanking[0].ranking;

                }
                else {

                  lastMonthRanking = 99999999999;

                }

                var allTimeRanking = updatedCurrency.rankings.allTimeRankings.filter((item) => {

                  return item._id.toString() == editor._id.toString();

                });

                if (typeof allTimeRanking != 'undefined' && allTimeRanking.length == 1) {

                  allTimeRanking = allTimeRanking[0].ranking;

                }
                else {

                  allTimeRanking = 99999999999;

                }

                Charts.model.findOneAndUpdate({
                  editor: editor._id,
                  currency: updatedCurrency._id,

                }, {
                  currentMonthRanking: currentMonthRanking,
                  lastMonthRanking: lastMonthRanking,
                  allTimeRanking: allTimeRanking,

                }, {
                  upsert: true,
                  new: true
                }).exec(function(err, chart) {

                  if (err) return editorChartCallback(err);

                  return editorChartCallback();

                });

              }
              else {
                return editorChartCallback();

              }
            }, function(err) {


              if (err) return currencyChartCallback(err);
              return currencyChartCallback();


            });






          });

        });

      }, function(err) {

        if (err) console.log(err);
        applyEachSeriesCallback();

      });

    });

  });

}

var getValidEditors = function(currency, currentMonthStartDate, currentMonthEndDate, callback) {
  console.log('getValidEditors for ' + currency.name);

  var Users = keystone.list('User');
  var Tracks = keystone.list('Track');

  Users.model.find({
    userRole: 'editor',
    enabled: true,
    currencies: currency._id
  }).select('id').exec(function(err, editors) {
    if (err) return callback(err);


    async.filterSeries(editors, function(editor, filterCallback) {

      Tracks.model.count({
        editor: editor,
        status: 'published',
        publishDate: {
          $gte: currentMonthStartDate,
          $lte: currentMonthEndDate
        }
      }).exec(function(err, trackCount) {

        if (err) return filterCallback(err);
        return filterCallback(null, trackCount > 0);

      })

    }, function(err, enabledEditors) {

      if (err) return callback(err);
      enabledEditors = enabledEditors.map((item) => {
        return new ObjectId(item._id);
      });
      return callback(null, currency, enabledEditors);
    })

  });


}

var getAllTimeEditorRankings = function(currency, enabledEditors, callback) {

  console.log('getAllTimeEditorRankings for ' + currency.name);

  var Downloads = keystone.list('Downloads');

  Downloads.model.aggregate([{
    $match: {
      currency: currency._id,
      editor: {
        $in: enabledEditors
      },
      accountingPeriod: {
        $ne: null
      }
    }
  }, {
    $group: {

      _id: "$editor",
      count: {
        $sum: 1
      }

    }
  }, {

    $sort: {

      count: -1

    }
  }, {

    $project: {

      count: 1

    }


  }]).exec(function(err, allTimeRankings) {
    if (err) return callback(err);

    for (var i = 0; i < allTimeRankings.length; i++) {

      allTimeRankings[i].ranking = parseInt(i + 1);

    }

    return callback(null, currency, enabledEditors, allTimeRankings);

  });

}

var getCurrentMonthEditorRanking = function(currency, enabledEditors, allTimeRankings, callback) {

  console.log('getCurrentMonthEditorRanking for ' + currency.name);

  var currentMonthStartDate = moment().startOf('month');
  var currentMonthEndDate = moment().endOf('month');

  var AccountingPeriod = keystone.list('AccountingPeriod');
  var EditorAccounting = keystone.list('EditorAccounting');

  AccountingPeriod.model.findOne({
    currency: currency._id,
    startDate: currentMonthStartDate,
    endDate: currentMonthEndDate
  }).exec(function(err, accountingPeriod) {
    if (err) return callback(err);

    EditorAccounting.model.find({
      accountingPeriod: accountingPeriod._id,
      currency: currency._id,
      editor: {
        $in: enabledEditors
      }

    }).sort({
      downloadCount: -1
    }).exec(function(err, currentMonthEditorRankings) {
      if (err) return callback(err);

      var updatedRankings = [];

      for (var i = 0; i < currentMonthEditorRankings.length; i++) {

        var editorRanking = currentMonthEditorRankings[i].toObject()
        editorRanking.ranking = parseInt(i + 1);
        updatedRankings.push(editorRanking);

      }

      return callback(null, currency, enabledEditors, allTimeRankings, updatedRankings);

    });

  });

}

var getLastMonthEditorRanking = function(currency, enabledEditors, allTimeRankings, currentMonthEditorRankings, callback) {

  console.log('getLastMonthEditorRanking for ' + currency.name);

  var lastMonthStartDate = moment().startOf('month').subtract(1, 'month');
  var lastMonthEndDate = moment().endOf('month').subtract(1, 'month');

  var currentMonthStartDate = moment().startOf('month');
  var currentMonthEndDate = moment().endOf('month');

  var AccountingPeriod = keystone.list('AccountingPeriod');
  var EditorAccounting = keystone.list('EditorAccounting');

  AccountingPeriod.model.findOne({
    currency: currency,
    startDate: lastMonthStartDate,
    endDate: lastMonthEndDate
  }).exec(function(err, accountingPeriod) {

    if (err) return callback(err);

    if (accountingPeriod) {

      EditorAccounting.model.find({
        accountingPeriod: accountingPeriod._id,
        currency: currency._id,
        editor: {
          $in: enabledEditors
        }
      }).sort({
        downloadCount: -1
      }).exec(function(err, lastMonthEditorRankings) {

        if (err) return callback(err);

        var updatedRankings = [];

        for (var i = 0; i < lastMonthEditorRankings.length; i++) {

          var editorRanking = lastMonthEditorRankings[i].toObject()
          editorRanking.ranking = parseInt(i + 1);
          updatedRankings.push(editorRanking);

        }

        var results = {
          allTimeRankings: allTimeRankings,
          currentMonthEditorRankings: currentMonthEditorRankings,
          lastMonthEditorRankings: updatedRankings
        };

        return callback(null, results);

      });

    }
    else {

      AccountingPeriod.model.findOne({
        currency: currency._id,
        startDate: currentMonthStartDate,
        endDate: currentMonthEndDate
      }).exec(function(err, accountingPeriod) {

        if (err) return callback(err);

        EditorAccounting.model.find({
          editor: {
            $in: enabledEditors
          },

          accountingPeriod: accountingPeriod._id,
          currency: currency._id,

        }).sort({
          downloadCount: -1
        }).exec(function(err, lastMonthEditorRankings) {

          if (err) return callback(err);

          var updatedRankings = [];

          for (var i = 0; i < lastMonthEditorRankings.length; i++) {

            var editorRanking = lastMonthEditorRankings[i].toObject()
            editorRanking.ranking = 99999999999;
            updatedRankings.push(editorRanking);

          }
          var results = {
            allTimeRankings: allTimeRankings,
            currentMonthEditorRankings: currentMonthEditorRankings,
            lastMonthEditorRankings: updatedRankings
          };
          return callback(null, results);

        });


      });

    }
  });
}

var updateTrackRankingsForEachCurrency = function(currencies, currentMonth, currentYear, applyEachSeriesCallback) {
  console.log('updateTrackRankingsForEachCurrency');
  var currentMonthStartDate, currentMonthEndDate, lastMonthStartDate, lastMonthEndDate;

  async.mapSeries(currencies, function(currency, currencyCallback) {

    async.waterfall([

      async.constant(currency),
      getAllTimeTrackRankings,
      getCurrentMonthTrackRanking,
      getLastMonthTrackRanking
    ], function(err, rankings) {

      if (err) return currencyCallback(err);
      return currencyCallback();

    });

  }, function(err, results) {
    if (err) return applyEachSeriesCallback(err);
    return applyEachSeriesCallback();


  });


}


var getAllTimeTrackRankings = function(currency, callback) {

  console.log('getAllTimeEditorRankings for ' + currency.name);

  var Track = keystone.list('Track');

  var currencyId = currency._id;
  var currentPage = 1;
  var rowsPerPage = 25;
  var sortCriteria = {};
  var matchCriteria = {

    currency: new ObjectId(currencyId),
    status: 'published'

  };

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
        editor: 1,
        currency: 1,
        downloadCountForPeriod: {
          $size: {

            $filter: {

              input: "$downloads",
              as: "download",
              cond: {
                $ne: ["$$download.accountingPeriod", null]
              }
            }
          }
        }
      }
    }, {
      $sort: {
        downloadCountForPeriod: -1
      }
    }, {

      $limit: 25

    }

  ]);

  trackQuery.exec(function(err, topTracks) {

    var AllTimeTopTracksChart = keystone.list('AllTimeTopTracksChart');

    async.eachOfSeries(topTracks, function(track, index, eachSeriesCallback) {

      AllTimeTopTracksChart.model.findOneAndUpdate({
        allTimeRanking: parseInt(index + 1),
        currency: currency

      }, {
        track: track,
        editor: track.editor,
        currency: currency,
        allTimeRanking: parseInt(index + 1),

      }, {
        upsert: true,
        new: true
      }).exec(function(err, newTrack) {

        if (err) return eachSeriesCallback(err);
        return eachSeriesCallback();

      });

    }, function(err) {

      if (err) return callback(err);
      return callback(null, currency);

    });

  });



}

var getCurrentMonthTrackRanking = function(currency, callback) {

  console.log('getCurrentMonthTrackRanking for ' + currency.name);

  var Track = keystone.list('Track');

  var currencyId = currency._id;

  var matchCriteria = {

    currency: new ObjectId(currencyId),
    status: 'published'

  };
  var startDate = moment().startOf('month').toISOString();
  var endDate = moment().endOf('month').toISOString();

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
        editor: 1,
        currency: 1,
        downloadCountForPeriod: {
          $size: {
            $filter: {

              input: "$downloads",
              as: "currentMonthDownload",
              cond: {
                $and: [{
                  $lte: ["$$currentMonthDownload.createdAt", new Date(endDate)]
                }, {
                  $gte: ["$$currentMonthDownload.createdAt", new Date(startDate)]
                }, {
                  $ne: ["$$currentMonthDownload.accountingPeriod", null]
                }]

              },
            }

          }
        },

      }
    }, {
      $sort: {
        downloadCountForPeriod: -1
      }
    }, {

      $limit: 25

    }

  ]);

  trackQuery.exec(function(err, topTracks) {

    var CurrentMonthTopTracksChart = keystone.list('CurrentMonthTopTracksChart');

    async.eachOfSeries(topTracks, function(track, index, eachSeriesCallback) {

      CurrentMonthTopTracksChart.model.findOneAndUpdate({
        currentMonthRanking: parseInt(index + 1),
        currency: currency

      }, {
        track: track,
        editor: track.editor,
        currency: currency,
        currentMonthRanking: parseInt(index + 1),

      }, {
        upsert: true,
        new: true
      }).exec(function(err, newTrack) {

        if (err) return eachSeriesCallback(err);
        return eachSeriesCallback();

      });

    }, function(err) {

      if (err) return callback(err);
      return callback(null, currency);

    });

  });

}

var getLastMonthTrackRanking = function(currency, callback) {

  console.log('getLastMonthTrackRanking for ' + currency.name);

  var Track = keystone.list('Track');

  var currencyId = currency._id;

  var matchCriteria = {

    currency: new ObjectId(currencyId),
    status: 'published'

  };

  var startDate = moment().subtract(1, 'month').startOf('month').toISOString();
  var endDate = moment().subtract(1, 'month').endOf('month').toISOString();

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
        editor: 1,
        currency: 1,
        downloadCountForPeriod: {
          $size: {
            $filter: {

              input: "$downloads",
              as: "lastMonthDownload",
              cond: {
                $and: [{
                  $lte: ["$$lastMonthDownload.createdAt", new Date(endDate)]
                }, {
                  $gte: ["$$lastMonthDownload.createdAt", new Date(startDate)]
                }, {
                  $ne: ["$$lastMonthDownload.accountingPeriod", null]
                }]

              },
            }

          }
        },

      }
    }, {
      $sort: {
        downloadCountForPeriod: -1
      }
    }, {

      $limit: 25

    }

  ]);

  trackQuery.exec(function(err, topTracks) {

    var LastMonthTopTracksChart = keystone.list('LastMonthTopTracksChart');

    async.eachOfSeries(topTracks, function(track, index, eachSeriesCallback) {

      LastMonthTopTracksChart.model.findOneAndUpdate({
        lastMonthRanking: parseInt(index + 1),
        currency: currency
      }, {
        track: track,
        editor: track.editor,
        currency: currency,
        lastMonthRanking: parseInt(index + 1),

      }, {
        upsert: true,
        new: true
      }).exec(function(err, newTrack) {

        if (err) return eachSeriesCallback(err);
        return eachSeriesCallback();

      });

    }, function(err) {

      if (err) return callback(err);
      return callback(null, currency);

    });

  });



}


//  1. Get editor accountings sorted by download count for current month for each currency.
//  2. Get editor accountings sorted by download count for last month for each currency.
//  3. Aggregate download counts for each currency grouped by editor and sorted by download count to get all time.
//  4. Update Webflow for each currency.
//  5. Trigger Webflow publish

var autopublish = function() {

  if (!process.env.DISABLE_AUTOPUBLISH || process.env.DISABLE_AUTOPUBLISH !== 1) {

    setInterval(processSubmittedTracksAndReleasesIntoPublished, keystone.get('track processing batch job interval'));

  }

}

var processSubmittedTracksAndReleasesIntoPublished = function() {
  var releaseController = require('./api/v1/members/releases');
  var Tracks = keystone.list('Track');
  var Release = keystone.list('Release');
  var trackController = require('./api/v1/members/track');
  var trackVideoController = require('./api/v1/members/trackVideo');

  var req = {
    user: {
      _id: 'SYSTEM CRON'
    }
  };
  var res = {};

  var logPrefix = "[AUTO-PUBLISH JOB]";
  //console.log(logPrefix, 'commencing autopublish run')

  function publishTracks(tracks, callback) {

    console.log(logPrefix, 'publishTracks');
    async.eachSeries(tracks, publishTrack, callback);

  }

  function publishReleases(releases, callback) {
    console.log(logPrefix, 'publishReleases');

    async.eachSeries(releases, publishRelease, callback);

  }

  function publishRelease(release, publishCallback) {
    console.log(logPrefix, 'publishRelease');

    release.set({
      status: 'published'
    });
    release.save(function(err) {

      if (err) return publishCallback(err);
      publishCallback(null);

    });
    // req.publishCallback = publishCallback;
    // releaseController.publish(req, res);

  }

  function publishTrack(track, publishCallback) {

    console.log(logPrefix, 'publishTrack');

    track.status = 'submitted';

    req.body = track;
    req.publishCallback = publishCallback;
    req.user = track.editor;
    if (track.fileType == 'audio') {
      trackController.submit(req, res);
    }

    if (track.fileType == 'video') {

      trackVideoController.submit(req, res);

    }

  }


  if (!keystone.get('autopublish running')) {
    //console.log(logPrefix, 'autopublish not currently running, initializing run')

    keystone.set('autopublish running', true);

    Tracks.model.find({
      status: 'submitted'
    }).populate('editor').exec(function(err, tracks) {

      var tracksToPublish = tracks.map((item) => {
        return item._id;
      });

      console.log(logPrefix, 'found tracks to begin publishing', tracksToPublish);

      if (err) console.log('error autopublishing tracks', err);

      publishTracks(tracks, function(err) {

        var releasesToPublish = tracks.map((item) => {

          if (item.releases && item.releases.length > 0) {
            return item.releases[0];
          }

        }).filter((item) => {

          return typeof item !== 'undefined';

        });


        console.log(logPrefix, 'completed running through submitted tracks and publishing')
        console.log(logPrefix, 'found related releases to begin publishing', releasesToPublish);

        Release.model.find({
          _id: {
            $in: releasesToPublish
          },
          status: 'submitted'
        }).populate('editor').exec(function(err, releases) {

          publishReleases(releases, function(err, results) {
            if (err) console.log('error autopublishing tracks', err);

            console.log(logPrefix, 'completed running through submitted releases and publishing');

            keystone.set('autopublish running', false);

          });

        });

      });

    });

  }
  else {

    //console.log(logPrefix, 'autopublish not currently running, waiting for current run to conclude');

  }



}

var correctOlderBetaTracks = function() {

  var Tracks = keystone.list('Track');

  if (process.env.CORRECT_OLDER_BETA_TRACKS && process.env.CORRECT_OLDER_BETA_TRACKS == 1) {
console.log('attempting to correct tracks from older periods of beta tracks uploaded');
    var dateBeforeAprilTenth = moment('2017-04-10');

    Tracks.model.find({
      createdAt: {
        $lte: dateBeforeAprilTenth
      },
      status: 'published'
    }).cursor().eachAsync( (track) => {

      if (track && track.publishedHiBitRateFile && track.publishedHiBitRateFile.url && track.publishedHiBitRateFile.url.indexOf('tracks/draft/hi_bit_rate/') !== -1) {
        console.log('track likely affected ' + track._id);

          var newHiBitRateFileUrl = track.publishedHiBitRateFile.url;
          
          if(track.publishedHiBitRateFile.filename && track.publishedHiBitRateFile.filename.indexOf('tracks/draft/hi_bit_rate/') !== -1) {

            var newHiBitRateFileFileName = track.publishedHiBitRateFile.filename;

          } else {
  
            var newHiBitRateFileFileName = 'tracks/draft/hi_bit_rate/' + track.publishedHiBitRateFile.filename;

          }

          Tracks.model.update({
            _id: track._id
          }, {
            $set: {
              "hiBitRateFile.url": newHiBitRateFileUrl,
              "hiBitRateFile.filename": newHiBitRateFileFileName,
              status: 'submitted'
            }
          }, {
            new: true
          }).exec(function(err, updatedTrack) {
            
            if(err) console.log(err);
            console.log('updated track where paths were wrong and submitted for new processing', updatedTrack);

          })

        } else {
          console.log('track not eligible');

        }



    }, function() {
      console.log('done');
    });

  }


}

var ensurePreviousTracksHaveWaveformImage = function() {

  if (process.env.UPDATE_BETA_TRACKS == true) {
    var logPrefix;

    var Tracks = keystone.list('Track');

    Tracks.model.find({
      waveformImageSnippetFileUrl: undefined,
      status: {
        $in: ['submitted', 'published']
      }
    }).exec(function(err, tracks) {
      console.log('tracks in need of updating: ', tracks.length)
      async.mapSeries(tracks, function(track, mapCallback) {
        logPrefix = '[TRACKID=' + track._id + ']';
        console.log(logPrefix, 'cleaning up old track to conform to new data standards for waveform and paths');

        async.waterfall([
            async.constant(track),
            getHiBitRateTrackToProcess,
            saveLowBitRateVersionToAmazonS3,
            submitTrack
          ],
          function(err, results) {

            if (err) console.log('error updating track with waveforms and paths', err);
            mapCallback();

          });

      });

    }, function(err, results) {

      if (err) console.log(err);
      console.log('updated tracks with waveforms and paths');

    })


    /*
	res.apiResponse({
	TrackMetadata: probeData,
});*/


    function getHiBitRateTrackToProcess(trackData, callback) {
      console.log(logPrefix, 'getHiBitRateTrackToProcess');

      if (trackData.hiBitRateFile.originalname.indexOf('draft') !== -1) {

        var filePath = trackData.hiBitRateFile.originalname;

      }
      else {

        if (trackData.hiBitRateFile.filename[0] == '/') {

          trackData.hiBitRateFile.filename = trackData.hiBitRateFile.filename.splice(0, 1);

        }

        var filePath = trackData.hiBitRateFile.path.replace(/^\/+/g, '') + '/' + trackData.hiBitRateFile.filename.replace('tracks/published/hi_bit_rate/', '').replace('tracks/draft/hi_bit_rate/', '');

      }

      var s3download = new AWS.S3({
        params: {
          Bucket: keystone.get('s3 config').bucket,
          Key: filePath
        }
      });

      trackData.s3download = s3download;
      var mp3FilePath = '/tmp/track_draft_hi_bit_rate_' + trackData.hiBitRateFile.filename.replace('tracks/published/hi_bit_rate/', '').replace('tracks/draft/hi_bit_rate/', '');
      var mp3File = require('fs').createWriteStream(mp3FilePath);
      var fileDownload = trackData.s3download.getObject().createReadStream()
        .on('error', function(err) {
          console.log('error accessing track from S3', filePath, err);
          return callback(err);
        })
        .pipe(mp3File);

      mp3File.on('finish', function() {

        trackData.mp3FilePath = mp3FilePath;
        callback(null, trackData);

      });

    }

    function saveLowBitRateVersionToAmazonS3(trackData, callback) {
      console.log(logPrefix, 'saveLowBitRateVersionToAmazonS3');

      var draftTrackPath, draftTrackFilename, publishedTrackPath, draftTrackUrl, draftTrackOriginalName, publishedTrackUrl;

      draftTrackPath = '/tracks/draft/hi_bit_rate';
      draftTrackFilename = trackData.hiBitRateFile.originalname;
      publishedTrackPath = trackData.hiBitRateFile.filename;
      publishedTrackUrl = trackData.hiBitRateFile.url;
      draftTrackUrl = trackData.hiBitRateFile.url.replace(trackData.hiBitRateFile.filename, trackData.hiBitRateFile.originalname);
      draftTrackOriginalName = trackData.hiBitRateFile.originalname.replace(draftTrackPath, '');

      if (trackData.customDraftSnippetFile && trackData.customDraftSnippetFile.length > 0) {
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
          if (err) console.log(logPrefix, err, err.stack); // an error occurred

          trackData.publishedLowBitRateFile = {

            filename: 'tracks/published/low_bit_rate/' + publishedSnippetFilename,
            originalname: trackData.mp3FileName,
            path: '/tracks/published/low_bit_rate',
            size: 0,
            filetype: 'audio/mp3',
            url: 'https://' + s3Bucket + '.s3.amazonaws.com/tracks/published/low_bit_rate/' + publishedSnippetFilename

          };

          trackData.hiBitRateFile = {

            filename: draftTrackUrl,
            originalname: draftTrackOriginalName,
            path: draftTrackPath,
            filetype: 'audio/mp3',
            size: 0,
            url: draftTrackUrl

          };

          trackData.publishedHiBitRateFile = {

            filename: publishedTrackPath,
            originalname: draftTrackFilename,
            path: '/tracks/published/hi_bit_rate',
            filetype: 'audio/mp3',
            size: 0,
            url: publishedTrackUrl

          };

          callback(null, trackData);

        });


      }
      else {
        console.log('not processing custom snippet -- generating automatic snippet')
        var s3upload = new AWS.S3({
          params: {
            Bucket: keystone.get('s3 config').bucket,
            Key: 'tracks/published/low_bit_rate/' + trackData.hiBitRateFile.filename.replace('tracks/published/hi_bit_rate/', '').replace('tracks/draft/hi_bit_rate/', '')
          }
        });
        console.log(logPrefix, 'mp3 path for creating auto snippet');

        var mp3PreviewFilePath = '/tmp/track_draft_low_bit_rate_' + trackData.hiBitRateFile.filename.replace('tracks/published/hi_bit_rate/', '').replace('tracks/draft/hi_bit_rate/', '');

        ffmpeg(trackData.mp3FilePath)
          .audioCodec('libmp3lame')
          .duration(210)
          .audioBitrate('64k')
          .audioChannels(1)
          .format('mp3')
          .save(mp3PreviewFilePath)
          .on('start', function(cmd) {})
          .on('error', function(err) {
            console.log(logPrefix, 'An error occurred: ' + err.message);
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
                  size: 0,
                  path: '/tracks/published/low_bit_rate',
                  filetype: 'audio/mp3',
                  url: decodeURIComponent(data.Location)
                };

                trackData.hiBitRateFile = {

                  filename: draftTrackUrl,
                  originalname: draftTrackOriginalName,
                  path: draftTrackPath,
                  size: 0,
                  filetype: 'audio/mp3',
                  url: draftTrackUrl

                };

                trackData.publishedHiBitRateFile = {

                  filename: publishedTrackPath,
                  originalname: draftTrackFilename,
                  path: '/tracks/published/hi_bit_rate',
                  size: 0,
                  filetype: 'audio/mp3',
                  url: publishedTrackUrl

                };


                console.log(logPrefix, 'generate waveform for automatically generated snippet');
                var filenameParts = trackData.mp3FilePath.replace('/tmp/', '').split('.');
                var waveformFileName = trackData._id + '_S.png';
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

                        fs.unlink(tmpPath);
                        fs.unlink(mp3PreviewFilePath);
                        fs.unlink(trackData.mp3FilePath);

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

    function submitTrack(trackData, callback) {

      console.log(logPrefix, 'submit track in database');

      Tracks.model.findById(trackData._id).exec(function(err, track) {
        console.log(logPrefix, 'verifying track is returned from database');

        if (err) return callback(err);

        track.set({
          hiBitRateFile: Object.assign(track.hiBitRateFile, trackData.hiBitRateFile)
        });

        track.set({
          publishedLowBitRateFile: Object.assign(track.publishedLowBitRateFile, trackData.publishedLowBitRateFile)
        });

        track.set({
          publishedHiBitRateFile: Object.assign(track.publishedHiBitRateFile, trackData.publishedHiBitRateFile)
        });

        track.set({
          waveformImageSnippetFileUrl: trackData.waveformImageSnippetFileUrl
        });
        track.set({
          waveformImageSnippetFilePath: trackData.waveformImageSnippetFilePath
        });
        track.set({
          waveformImageSnippetFileName: trackData.waveformImageSnippetFileName
        });

        track.save(function(err) {

          console.log(logPrefix, 'track saved');

          if (err) return console.log(err);

          callback(null, trackData);

        });

      });

    }

  }


}

var updateTrackSearchFields = function() {

  var Track = keystone.list('Track');

  Track.model.find({
    status: 'published',
    textSearchField: {
      $eq: null
    }
  }).populate('originalWorks').lean().exec(function(err, tracks) {

    if (err) return console.log(err);

    async.eachSeries(tracks, function(track, callback) {

      var originalWorksArray = track.originalWorks.map((item) => {
        return item.displayName;
      });

      var joinedOriginalWorksString = originalWorksArray.join(' ');

      if (track.artistsFeaturedDisplayName) {

        joinedOriginalWorksString = track.formattedName + ' ' + track.artistsDisplayName + ' ' + track.artistsFeaturedDisplayName + ' ' + joinedOriginalWorksString;

      }
      else {

        joinedOriginalWorksString = track.formattedName + ' ' + track.artistsDisplayName + ' ' + joinedOriginalWorksString;

      }

      Track.model.update({
        _id: track._id
      }, {
        textSearchField: joinedOriginalWorksString
      }, {
        new: true
      }).exec(function(err) {

        console.log('updated track search field text for track ' + track._id);
        if (err) return callback(err);
        return setImmediate(callback);

      });

    }, function(err) {

      if (err) {

        return console.log(err);

      }
      console.log('Completed track search field update');
      return true;

    });


  });


}
