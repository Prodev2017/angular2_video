var keystone = require('keystone');
var Types = keystone.Field.Types;
var moment = require('moment');


/**
Transaction Model * ==========
 */

var AccountingPeriod = new keystone.List('AccountingPeriod', { track: true });

AccountingPeriod.add({
  
  name: { type: Types.Text, noedit: true, index:true },
  periodMonthText: { type: Types.Text, noedit: true, index: true },
  currency: { type: Types.Relationship, ref: 'Currency', index: true, noedit: true },
  startDate: { type: Types.Datetime, index: true, noedit: true },
  endDate: { type: Types.Datetime, index: true, noedit: true },
  totalRevenue: { type: Types.Money, default:0, noedit: true},
  totalDownloadCount: { type: Types.Number, default: 0, noedit: true},
  calculatedCompanyExpenses: { type: Types.Money, default: 0, noedit: true, label: 'Company Expenses'},
  calculatedSRASExpenses: { type: Types.Money, default: 0, noedit: true,  label: 'SRAS Expenses'},
  calculatedNetProfit: { type: Types.Money, default: 0, noedit: true,  label: 'Net Profit'},
  calculatedNetProfitCompanyShare: { type: Types.Money, default: 0, noedit: true,  label: 'NP Company Share'},
  calculatedNetProfitEditorShare: { type: Types.Money, default: 0, noedit: true, label: 'NP Editors Share' },
  calculatedDownloadCreditValue: { type: Types.Money, default: 0, noedit: true, label: 'Credit Value' },
  notes: {type: Types.Textarea },

});

AccountingPeriod.defaultColumns = 'currency, startDate, endDate, totalRevenue, totalDownloadCount, calculatedCompanyExpenses, calculatedSRASExpenses, calculatedNetProfit, calculatedNetProfitCompanyShare, calculatedNetProfitEditorShare, calculatedDownloadCreditValue';

AccountingPeriod.schema.pre('save', function(next) {
  var self = this;
  var monthText = this._.startDate.format('MMMM YYYY');
  this.populate('currency', function(err, accountingPeriod) {
    
      var name = monthText + ' ' + accountingPeriod.currency.name; 
      
      var periodMonthText = monthText;
      
      if(self.name != name) {
        self.name = name;
      }
      
      if(self.periodMonthText != periodMonthText) {
        self.periodMonthText = periodMonthText
      }
      
      next();

    
  });
  
});

AccountingPeriod.register();