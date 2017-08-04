var Keystone = require('keystone');
var Types = Keystone.Field.Types;

/**
 * LoopLength Model
 * ==========
 */

var LoopLength = new Keystone.List('LoopLength', { track: true });

LoopLength.add({
	name: { type: Types.Text, required: true, index: true },
});


/**
 * Registration
 */

LoopLength.defaultColumns = 'name';
LoopLength.register();
