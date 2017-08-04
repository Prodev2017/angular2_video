var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Chart Model
 * ==========
 */

var CurrentMonthTopTracksChart = new keystone.List('CurrentMonthTopTracksChart', { track: true });

CurrentMonthTopTracksChart.add({
	
	editor: { type: Types.Relationship, ref: 'User', filters: { userRole: 'editor' }, index: true },
	track: { type: Types.Relationship, ref: 'Track', index: true },
	currency: { type: Types.Relationship, ref: 'Currency', index: true },
    currentMonthRanking: { type: Types.Number, index: true }
    
});


/**
 * Registration
 */

CurrentMonthTopTracksChart.defaultColumns = 'currency, track, editor, currentMonthRanking';
CurrentMonthTopTracksChart.register();
