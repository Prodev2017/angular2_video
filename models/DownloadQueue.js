var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * DownloadQueue Model
 * ==========
 */

var DownloadQueue = new keystone.List('DownloadQueue', { track: true });

DownloadQueue.add({
    currency: { type: Types.Relationship, ref: 'Currency', index: true },
    user: { type: Types.Relationship, ref: 'User', index: true },
    tracks: { type: Types.Relationship, ref: 'Track', index: true, many: true, filters: {currency: ':currency' } }
});


/**
 * Registration
 */

DownloadQueue.defaultColumns = 'currency, user, tracks';
DownloadQueue.relationship({ path: 'tracks', ref: 'Track', refPath: 'name' });
DownloadQueue.relationship({ path: 'currency', ref: 'Currency', refPath: 'name' });
DownloadQueue.register();
