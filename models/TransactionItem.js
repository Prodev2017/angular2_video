var keystone = require('keystone');
var Types = keystone.Field.Types;
var moment = require('moment');

const COMPANY_EXPENSES_PERCENTAGE = 0.10;
const SRAS_EXPENSES_PERCENTAGE = 0.10;

//Must add up to 100%
const NET_PROFIT_COMPANY_SHARE = 0.50;
const NET_PROFIT_EDITOR_SHARE = 0.50;

/**
Transaction Model * ==========
 */

var TransactionItem = new keystone.List('TransactionItem', {
  track: true
});

TransactionItem.add({

  user: {
    type: Types.Relationship,
    ref: 'User',
    index: true
  },
  sourcePackage: {
    type: Types.Relationship,
    ref: 'Package',
    index: true
  },
  sourcePackageItem: {
    type: Types.Relationship,
    ref: 'PackageItem',
    index: true
  },
  transaction: {
    type: Types.Relationship,
    ref: 'Transaction',
    index: true
  },
  startTime: {
    type: Types.Datetime,
    default: Date.now(),
    index: true
  },
  endTime: {
    type: Types.Datetime,
    default: moment().add(30, 'days'),
    index: true
  },
  name: {
    type: Types.Text,
    required: true,
    index: true
  },
  currency: {
    type: Types.Relationship,
    ref: 'Currency',
    index: true
  },
  type: {
    type: Types.Select,
    options: [{
      label: 'Limited Number of Credits',
      value: 'credit'
    }, {
      label: 'Unlimited',
      value: 'unlimited'
    }],
    index: true
  },
  price: {
    type: Types.Money,
    index: true
  },
  credits: {
    type: Types.Number,
    default: 0
  },
  creditsUsed: {
    type: Types.Number,
    default: 0
  },
  creditsRemaining: {
    type: Types.Number,
    default: 0
  },
  downloadsAttributed: {
    type: Types.Number,
    default: 0
  },
  description: {
    type: Types.Textarea
  },
  notes: {
    type: Types.Textarea
  },
}, 'Accounting Status', {
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
}, 'Accounting Breakdown', {
  calculatedCompanyExpenses: {
    type: Types.Money,
    default: 0
  },
  calculatedSRASExpenses: {
    type: Types.Money,
    default: 0
  },
  calculatedNetProfit: {
    type: Types.Money,
    default: 0
  },
  calculatedNetProfitCompanyShare: {
    type: Types.Money,
    default: 0
  },
  calculatedNetProfitEditorShare: {
    type: Types.Money,
    default: 0
  },
}, 'Percentages Applied To Accounting', {
  companyExpensesPercentage: {
    type: Types.Number,
    format: '0%'
  },
  srasExpensesPercentage: {
    type: Types.Number,
    format: '0%'
  },
  netProfitCompanySharePercentage: {
    type: Types.Number,
    format: '0%'
  },
  netProfitEditorSharePercentage: {
    type: Types.Number,
    format: '0%'
  },

});

TransactionItem.schema.pre('save', function(next) {

  var doc = this;

  console.log('TransactionItem:PostSave:UpdateAccountingPeriodRecord Start');

  if (doc.price > 0 && !doc.isAccounted && !doc.accountedOn && !doc.accountingPeriod) {

    var AccountingPeriod = keystone.list('AccountingPeriod');

    var date = new Date(doc.startTime),
      y = date.getFullYear(),
      m = date.getMonth();
    var firstDay = new Date(y, m, 1);
    var lastDay = new Date(y, m + 1, 0, 23, 59, 59, 999);

    console.log('TransactionItem:PostSave:UpdateAccountingPeriodRecord', {
      date: date,
      start_date: doc.startTime,
      y: y,
      m: m,
      currency: doc.currency,
      startDate: firstDay,
      endDate: lastDay
    });

    doc.populate('currency', function(err, docWithCurrency) {

      AccountingPeriod.model.findOne({
        currency: doc.currency,
        startDate: firstDay,
        endDate: lastDay
      }).populate('currency').exec(function(err, accountingPeriodRecord) {

        var calculatedCompanyExpenses, calculatedSRASExpenses, calculatedNetProfit, calculatedNetProfitCompanyShare, calculatedNetProfitEditorShare;

          doc.set({
            companyExpensesPercentage: (typeof doc.companyExpensesPercentage == 'undefined') ? COMPANY_EXPENSES_PERCENTAGE : doc.companyExpensesPercentage
          });
          doc.set({
            srasExpensesPercentage: (typeof doc.srasExpensesPercentage == 'undefined') ? SRAS_EXPENSES_PERCENTAGE : doc.srasExpensesPercentage
          });
          doc.set({
            netProfitCompanySharePercentage: (typeof doc.netProfitCompanySharePercentage == 'undefined') ? NET_PROFIT_COMPANY_SHARE : doc.netProfitCompanySharePercentage
          });
          doc.set({
            netProfitEditorSharePercentage: (typeof doc.netProfitEditorSharePercentage == 'undefined') ? NET_PROFIT_EDITOR_SHARE : doc.netProfitEditorSharePercentage
          });

          calculatedCompanyExpenses = doc.price * COMPANY_EXPENSES_PERCENTAGE;
          calculatedSRASExpenses = doc.price * SRAS_EXPENSES_PERCENTAGE;
          calculatedNetProfit = doc.price - calculatedCompanyExpenses - calculatedSRASExpenses;
          calculatedNetProfitCompanyShare = calculatedNetProfit * NET_PROFIT_COMPANY_SHARE;
          calculatedNetProfitEditorShare = calculatedNetProfit * NET_PROFIT_EDITOR_SHARE;

    
        doc.set({
          calculatedCompanyExpenses: calculatedCompanyExpenses
        });
        doc.set({
          calculatedSRASExpenses: calculatedSRASExpenses
        });
        doc.set({
          calculatedNetProfit: calculatedNetProfit
        });
        doc.set({
          calculatedNetProfitCompanyShare: calculatedNetProfitCompanyShare
        });
        doc.set({
          calculatedNetProfitEditorShare: calculatedNetProfitEditorShare
        });

        if (err) console.log('TransactionItem:PostSave:UpdateAccountingPeriodRecord', err);

        if (!accountingPeriodRecord) {

          console.log('TransactionItem:PostSave:UpdateAccountingPeriodRecord no accounting period record found - will create new one');

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

            if (err) console.log('TransactionItem:PostSave:UpdateAccountingPeriodRecord new accounting period save error', err);

            console.log('TransactionItem:PostSave:UpdateAccountingPeriodRecord new accounting period saved');

            AccountingPeriod.model.findOne({
              currency: doc.currency,
              startDate: firstDay,
              endDate: lastDay
            }).exec(function(err, newAccountingPeriodRecord) {

              console.log('TransactionItem:PostSave:UpdateAccountingPeriodRecord getting new accounting period record');

              doc.set({
                accountedOn: new Date()
              });
              doc.set({
                isAccounted: true
              });
              doc.set({
                accountingPeriod: newAccountingPeriodRecord._id
              });

              next();

            })

          });

        }
        else {

          console.log('TransactionItem:PostSave:UpdateAccountingPeriodRecord getting new accounting period record');

          doc.set({
            accountedOn: new Date()
          });
          doc.set({
            isAccounted: true
          });
          doc.set({
            accountingPeriod: accountingPeriodRecord._id
          });

          console.log('TransactionItem:PostSave:UpdateAccountingPeriodRecord saving transaction item accounting details ');
          next();
        }

      });

    });

  }
  else {
    next();
  }

});

TransactionItem.schema.post('save', function(doc) {
  console.log('updating accounting period with latest transaction item totals', doc);
  var AccountingPeriod = keystone.list('AccountingPeriod');

  var date = new Date(doc.startTime),
    y = date.getFullYear(),
    m = date.getMonth();
  var firstDay = new Date(y, m, 1);
  var lastDay = new Date(y, m + 1, 0, 23, 59, 59, 999);

  AccountingPeriod.model.findOne({
    currency: doc.currency,
    startDate: firstDay,
    endDate: lastDay
  }).populate('currency').exec(function(err, accountingPeriodRecord) {
    if (err) console.log(err);
    if (accountingPeriodRecord) {
      TransactionItem.model.aggregate([{
        $match: {
          accountingPeriod: accountingPeriodRecord._id
        }
      }, {
        $group: {
          _id: accountingPeriodRecord._id,
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
      }]).exec(function(err, accountingPeriodTransactionTotals) {
        console.log('after TransactionItems aggregate');
        if (err) console.log(err);
        console.log(accountingPeriodTransactionTotals);
        if(accountingPeriodTransactionTotals) {
        accountingPeriodRecord.set({
          totalRevenue: accountingPeriodTransactionTotals[0].totalRevenue
        });
        accountingPeriodRecord.set({
          calculatedCompanyExpenses: accountingPeriodTransactionTotals[0].calculatedCompanyExpenses
        });
        accountingPeriodRecord.set({
          calculatedSRASExpenses: accountingPeriodTransactionTotals[0].calculatedSRASExpenses
        });
        accountingPeriodRecord.set({
          calculatedNetProfit: accountingPeriodTransactionTotals[0].calculatedNetProfit
        });
        accountingPeriodRecord.set({
          calculatedNetProfitCompanyShare: accountingPeriodTransactionTotals[0].calculatedNetProfitCompanyShare
        });
        accountingPeriodRecord.set({
          calculatedNetProfitEditorShare: accountingPeriodTransactionTotals[0].calculatedNetProfitEditorShare
        });
        if (accountingPeriodRecord.totalDownloadCount > 0) {

          accountingPeriodRecord.set({
            calculatedDownloadCreditValue: accountingPeriodTransactionTotals[0].calculatedNetProfitEditorShare / accountingPeriodRecord.totalDownloadCount
          });

        }
        else {
          accountingPeriodRecord.set({
            calculatedDownloadCreditValue: accountingPeriodTransactionTotals[0].calculatedNetProfitEditorShare
          });

        }
        

        accountingPeriodRecord.save(function(err) {
          if(err) console.log(err);
          console.log('TransactionItem:PostSave:UpdateAccountingPeriodRecord updated accounting with transaction item information ');

        });
          
        } else {
          
          console.log('error: cannot find existing accounting period for transaction item', JSON.stringify(doc));
          
        }

      });
    }

  });

})

/**
 * Registration
 */

TransactionItem.defaultColumns = 'user, transaction, startTime, endTime, currency, type, credits, creditsUsed, creditsRemaining, price, calculatedCompanyExpenses, calculatedSRASExpenses, calculatedNetProfit, calculatedNetProfitCompanyShare, calculatedNetProfitEditorShare';
TransactionItem.relationship({
  path: '_id',
  ref: 'Downloads',
  refPath: 'transactionItem'
});

TransactionItem.relationship({
  path: '_id',
  ref: 'AccountingPeriod',
  refPath: 'accountingPeriod'
});


TransactionItem.register();
