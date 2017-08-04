var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
Package Item Model * ==========
 */

var PackageItem = new keystone.List('PackageItem', { track: true });

PackageItem.add({
  
  name: { type: Types.Text, required: true, index: true },
  currency: { type: Types.Relationship, ref: 'Currency', index: true },
  type: { type: Types.Select, options: [{label: 'Limited Number of Credits', value: 'credit'}, {label: 'Unlimited', value: 'unlimited'}], index: true },
  price: { type: Types.Money, format: '$0,0.00', required: true, index: true, initial:true },
  credits: { type: Types.Number },
  description: { type: Types.Textarea }

});

/**
 * Registration
 */

PackageItem.defaultColumns = 'name, credits, price, currency, types';
PackageItem.register();