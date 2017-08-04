var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Playlist Model
 * ==========
 */

var Playlist = new keystone.List('Playlist', { track: true, sortable: true });

Playlist.add({
	name: { type: Types.Text, required: true, index: true },
  user: { type: Types.Relationship, ref: 'User' },
  tracks: { type: Types.Relationship, ref: 'Track', many: true, index: true },
});


/**
 * Registration
 */

Playlist.defaultColumns = 'name';
Playlist.register();
