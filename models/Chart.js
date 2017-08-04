var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Chart Model
 * ==========
 */

var Chart = new keystone.List('Chart', { track: true });

Chart.add({
	
	editor: { type: Types.Relationship, ref: 'User', filters: { userRole: 'editor' }, index: true },
	currency: { type: Types.Relationship, ref: 'Currency', index: true },
    currentMonthRanking: { type: Types.Number, index: true },
    lastMonthRanking: { type: Types.Number, index: true },
    allTimeRanking: { type: Types.Number, index: true }
    
});


/**
 * Registration
 */

Chart.defaultColumns = 'currency, editor, currentMonthRanking, lastMonthRanking, allTimeRanking';
Chart.register();
