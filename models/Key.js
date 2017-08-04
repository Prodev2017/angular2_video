var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Key Model
 * ==========
 */

var Key = new keystone.List('Key', { track: true, map: {name: 'musicKey'} });

Key.add({
	musicKey: { type: Types.Text, required: true, initial: true, index: true },
	camelotKey: { type: Types.Text, required: true, initial: true, index: true }
});


/**
 * Registration
 */

Key.defaultColumns = 'name';
Key.register();
