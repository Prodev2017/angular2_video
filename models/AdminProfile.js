var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * AdminProfile Model
 * ==========
 */

var AdminProfile = new keystone.List('AdminProfile', { track: true });

AdminProfile.add({
	name: { type: Types.Name, required: true, index: true },
});


/**
 * Registration
 */

AdminProfile.defaultColumns = 'name';
AdminProfile.register();
