var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
Track Activity Log Model * ==========
 */

var TrackAccounting = new keystone.List('TrackAccounting', { track: true });

TrackAccounting.add({
  
  editor: { type: Types.Relationship, ref: 'User', filters: { userRole: 'editor' }, index: true },
  track: { type: Types.Relationship, ref: 'Track', index: true },
  currency: { type: Types.Relationship, ref: 'Currency', index: true },
  accountingPeriod: { type: Types.Relationship, ref: 'AccountingPeriod', index: true },
  downloadCount: { type: Types.Number, default: 0 },
  earnings: { type: Types.Money, default: 0 }
 
});


/**
 * Registration
 */

TrackAccounting.defaultColumns = 'accountingPeriod, track, editor, downloadCount, earnings';
TrackAccounting.register();
