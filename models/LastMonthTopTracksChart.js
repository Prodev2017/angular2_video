var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Chart Model
 * ==========
 */

var LastMonthTopTracksChart = new keystone.List('LastMonthTopTracksChart', { track: true });

LastMonthTopTracksChart.add({
	
	editor: { type: Types.Relationship, ref: 'User', filters: { userRole: 'editor' }, index: true },
	track: { type: Types.Relationship, ref: 'Track', index: true },
	currency: { type: Types.Relationship, ref: 'Currency', index: true },
    lastMonthRanking: { type: Types.Number, index: true }
    
});


/**
 * Registration
 */

LastMonthTopTracksChart.defaultColumns = 'currency, track, editor, lastMonthRanking';
LastMonthTopTracksChart.register();
