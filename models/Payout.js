var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
Payout Model * ==========
 */

var Payout = new keystone.List('Payout', { track: true });

Payout.add({
	editor: { type: Types.Name, required: true, index: true, initial: false },
  period: { type: Types.Date },
  creditsEarned: { type: Types.Number },
  currency: { type: Types.Relationship, ref: 'Currency' },
  downloadCount: { type: Types.Number },
  
});


/**
 * Registration
 */

Payout.defaultColumns = 'name';
Payout.register();
