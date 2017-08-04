var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
Track Activity Log Model * ==========
 */

var EditorAccounting = new keystone.List('EditorAccounting', { track: true });

EditorAccounting.add({
  
  editor: { type: Types.Relationship, ref: 'User', filters: { userRole: 'editor' }, index: true },
  payPalEmailAddress: { type: Types.Email, noedit: true },
  currency: { type: Types.Relationship, ref: 'Currency', index: true },
  accountingPeriod: { type: Types.Relationship, ref: 'AccountingPeriod', index: true },
  downloadCount: { type: Types.Number, default: 0 },
  earnings: { type: Types.Money, default: 0 },
  currencyUploadQuotaToQualifyForEarnings: { type: Types.Number, default: 0 },
  trackUploadCount: { type: Types.Number, default: 0 },
  metQuota: { type: Types.Boolean, default: false }
 
});


/**
 * Registration
 */

EditorAccounting.schema.pre('save', function(next) {
  
  var Users = keystone.list('User');
  var self = this;

  Users.model.findById(this.editor).exec(function(err, user) {
    
    if(err) console.log(err);
    
    if(user) {
      
      self.payPalEmailAddress = user.payPalEmailAddress;
      
    }
  
    next();  
    
  });
  
  
});

EditorAccounting.defaultColumns = 'accountingPeriod, track, editor, quotaThreshold, trackUploadCount, downloadCount, earnings';
EditorAccounting.register();