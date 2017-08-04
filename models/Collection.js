var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Collection Model
 * ==========
 */

var Collection = new keystone.List('Collection', { track: true });

Collection.add({
	name: { type: Types.Text, required: true, index: true },
    currencyAccepted: { type: Types.Relationship, ref: 'Currency' }
});


/**
 * Registration
 */

Collection.defaultColumns = 'name';
Collection.relationship({ path: 'name', ref: 'Track', refPath: 'assignedCollections' });
Collection.relationship({ path: 'name', ref: 'Downloads', refPath: 'assignedCollection' });
Collection.register();
