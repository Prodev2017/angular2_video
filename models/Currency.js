var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
Currency Model * ==========
 */

var Currency = new keystone.List('Currency', { track: true, sortable: true, autokey: { path: 'slug', from: 'name', unique: false }});

Currency.add({
	
	name: { type: Types.Text, required: true, index: true },
	slug: { type: Types.Text, noedit:true, index: true },
	accountingType: { type: Types.Select, options: [{label: 'Boutique', value: 'boutique'},{label: 'Pool', value: 'pool'}]},
	color: { type: Types.Color },
	enabled: { type: Types.Boolean, index:true, default: false },
	uploadsCanBeOriginalWorks: { type: Types.Boolean, index: true },
	mediaType: {type: Types.Select, options: [{label: 'Audio', value: 'audio'},{label: 'Video', value: 'video'}] },
	trackUploadQuota: { type: Types.Number, default: 0 }
	
});

/**
 * Registration
 */

Currency.defaultColumns = 'name';
Currency.relationship({ path: 'name', ref: 'Collection', refPath: 'currencyAccepted' });

Currency.register();
