var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
Track Activity Log Model * ==========
 */

var trackActivityLog = new keystone.List('trackActivityLog', { track: true });

trackActivityLog.add({
  track: { type: Types.Relationship, ref: 'Track' },
  collectionFrom: { type: Types.Relationship, ref: 'Collection' },
  collectionTo: { type: Types.Relationship, ref: 'Collection' },
  currencyFrom: { type: Types.Relationship, ref: 'Currency', filters: { accountingType: 'boutique' } },
  currencyTo: { type: Types.Relationship, ref: 'Currency', filters: { accountingType: 'pool' } }
  
  
 
});


/**
 * Registration
 */

trackActivityLog.defaultColumns = 'name';
trackActivityLog.register();
