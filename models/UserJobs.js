var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * User Jobs Model
 * ==========
 */

var UserJobs = new keystone.List('UserJobs', { track: true });

UserJobs.add({
	name: { type: Types.Text, required: true, index: true },
});

/**
 * Registration
 */

UserJobs.defaultColumns = 'name';
UserJobs.register();