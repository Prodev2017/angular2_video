var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Crate Model
 * ==========
 */

var Crate = new keystone.List('Crate', { track: true });

Crate.add({
  name: { type: Types.Text, required: true, index: true },
  user: { type: Types.Relationship, ref: 'User', index: true },
  editorOwner: { type: Types.Relationship, ref: 'User', filters: { userRole: 'editor' }, index: true },
  type: { type: Types.Select, options: [{label: 'Editor Defined', value: 'collection'}, { label: "User Defined", value: 'crate'}], index: true },
  description: { type: Types.Textarea },
  currency: { type: Types.Relationship, ref: 'Currency', index:true },
  genres: { type: Types.Relationship, ref: 'Genre', many: true },
  keys: { type: Types.Relationship, ref: 'Key', many: true },
  editors: { type: Types.Relationship, ref: 'User', filters: { userRole: 'editor'}, many: true },
  tags: { type: Types.Relationship, ref: 'Tag', index: true, many: true },
  minYear: { type: Types.Number },
  maxYear: { type: Types.Number },
  minLength: { type: Types.Number },
  maxLength: { type: Types.Number },
  bpmRangeMin: { type: Types.Number },
  bpmRangeMax: { type: Types.Number },
  trackName: { type: Types.Text },
  artistName: { type: Types.Text },
  tracks: { type: Types.Relationship, ref: 'Track', many: true, index: true },
  softDelete: { type: Types.Boolean, default: false, index: true }
});



/**
 * Registration
 */

Crate.defaultColumns = 'name';
Crate.register();
