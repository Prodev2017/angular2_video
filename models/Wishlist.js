var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Wishlist Model
 * ==========
 */

var Wishlist = new keystone.List('Wishlist', { track: true });

Wishlist.add({
	searchQuery: { type: Types.Text },
  user: { type: Types.Relationship, ref: 'User' },
  assignedCollection: { type: Types.Relationship, ref: 'Collection' },
  genres: { type: Types.Relationship, ref: 'Genre', many: true },
  inKey: { type: Types.Relationship, ref: 'Key', many: true },
  editors: { type: Types.Relationship, ref: 'User', filters: { userRole: 'editor'}, many: true },
  yearRangeMin: { type: Types.Date, format: "YYYY" },
  yearRangeMax: { type: Types.Date, format: "YYYY" },
  bpmRangeMin: { type: Types.Number },
  bpmRangeMax: { type: Types.Number }
});


/**
 * Registration
 */

Wishlist.defaultColumns = 'name';
Wishlist.register();
