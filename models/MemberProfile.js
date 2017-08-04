var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * MemberProfile Model
 * ==========
 */

var MemberProfile = new keystone.List('MemberProfile', { track: true });

MemberProfile.add({
	name: { type: Types.Name, required: true, index: true },
});


/**
 * Registration
 */

MemberProfile.defaultColumns = 'name';
MemberProfile.register();
