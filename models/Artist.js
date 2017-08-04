var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
Artist Model * ==========
 */

var Artist = new keystone.List('Artist', { track: true });

Artist.add({
  name: { type: Types.Text, trim: true},
  originalArtist: { type: Types.Boolean }
});


/**
 * Registration
 */

Artist.defaultColumns = 'name';
Artist.register();
