var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Setting Model
 * ==========
 */

var Setting = new keystone.List('Setting', { track: true, autokey: { path: 'slug', from: 'name' } });

Setting.add({
	name: { type: Types.Text, required: true, initial: true,  index: true },
	value: { type: Types.Text, required: true, initial: true, index: true },
	enabled: { type: Types.Boolean, index: true }
});

/**
 * Registration
 */

Setting.defaultColumns = 'name';
Setting.register();
