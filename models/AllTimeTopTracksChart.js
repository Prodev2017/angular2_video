var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Chart Model
 * ==========
 */

var AllTimeTopTracksChart = new keystone.List('AllTimeTopTracksChart', { track: true });

AllTimeTopTracksChart.add({
	
	editor: { type: Types.Relationship, ref: 'User', filters: { userRole: 'editor' }, index: true },
	track: { type: Types.Relationship, ref: 'Track', index: true },
	currency: { type: Types.Relationship, ref: 'Currency', index: true },
    allTimeRanking: { type: Types.Number, index: true }
    
});


/**
 * Registration
 */

AllTimeTopTracksChart.defaultColumns = 'currency, track, editor, allTimeRanking';
AllTimeTopTracksChart.register();
