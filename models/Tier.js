var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Tier Model
 * ==========
 */

var Tier = new keystone.List('Tier', { track: true });

Tier.add({
	name: { type: Types.Text, required: true, index: true },
  tiersIncluded: { type: Types.Relationship, ref: 'Tier', many: true },
  poolMembershipPrice: { type: Types.Money, currency: 'en-us'},
  boutiqueMembershipPrice: { type: Types.Money, currency: 'en-us'},
  creditValue: { type: Types.Number },
  accountingType: { type: Types.Select, options: [{label: 'Boutique', value: 'boutique'},{label: 'Pool', value: 'pool'}]},
});

/**
 * Registration
 */

Tier.defaultColumns = 'name';
Tier.relationship({ path: 'name', ref: 'Track', refPath: 'tier' });
Tier.register();
