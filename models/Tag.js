var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Tag Model
 * ==========
 */

var Tag = new keystone.List('Tag', { track: true });

Tag.add({
	name: { type: Types.Text, required: true, index: true },
  color: { type: Types.Color },
	textColor: { type: Types.Select, options: ['black','white'] },
  tagField: { type: Types.Select, options: ['Tag 1','Tag 2','Tag 3','Tag 4'] }
});

/**
 * Registration
 */

Tag.defaultColumns = 'name,tagField,color,textColor';
Tag.register();
