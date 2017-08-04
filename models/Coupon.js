var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
Coupon Model * ==========
 */

var Coupon = new keystone.List('Coupon', { track: true });

Coupon.add({
	name: { type: Types.Text, required: true, index: true },
  enabled: { type: Types.Boolean },
  packages: { type: Types.Relationship, ref: 'Package' },
  flatCreditAmount: { type: Types.Number },
  percentCreditIncrease: { type: Types.Number }, 
  priceDecreaseAmount: { type: Types.Number },
  percentPriceDecrease: { type: Types.Number },
  couponLimitTotal: { type: Types.Number },
  dateBegin: { type: Types.Date },
  couponsUsed: { type: Types.Number },
  dateEnd: { type: Types.Date }
});


/**
 * Registration
 */

Coupon.defaultColumns = 'name';
Coupon.relationship({ path: 'coupon', ref: 'Transaction', refPath: 'package' });
Coupon.register();
