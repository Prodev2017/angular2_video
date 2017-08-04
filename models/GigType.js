var keystone = require('keystone');
var Types = keystone.Field.Types;
var combinations = require('string-combinations');
var async = require('async');

/**
* GigType Model
* ==========
*/

var GigType = new keystone.List('GigType', { track: true });

GigType.add({
	name: { type: Types.Text, required: true, index: true },
	popularity: { type: Types.Select, options: [1,2,3], noedit: true, default: 1 },
	energy: { type: Types.Select, options: [1,2,3], noedit: true, default: 1 },
	djTiming: { type: Types.Select, options: [1,2,3], noedit: true, default: 1 },
});





GigType.schema.post('save', function(doc) {

	if(doc.popularity == 1 && doc.energy == 1 && doc.djTiming == 1) {

		GigType.model.find({name: doc.name}).exec(function(err, existingGigTypes) {

			var totalPossibilities = {};

			var options = '123123123';

			var myCombinations = combinations.generate(options); //1 is the shorted a combo will be, 2 is the longest

			myCombinations = myCombinations.filter(function(item) {
				return (item.length == 3) ? item : false;
			});

			for(var i = 0; i < myCombinations.length; i++) {
				totalPossibilities[myCombinations[i]] = myCombinations[i];
			}

			for(var i = 0; i < existingGigTypes.length; i++) {
				var key = existingGigTypes[i].popularity.toString() + existingGigTypes[i].energy.toString() + existingGigTypes[i].djTiming.toString();
				totalPossibilities[key] = existingGigTypes[i];
			}
			console.log(totalPossibilities);
			async.eachSeries(totalPossibilities,function(item,callback) {
				console.log(item);
				if(typeof item === 'string') {
					console.log('item is not object');
					var gigTypeVariation = new GigType.model();
					var settings = item.split('');
					gigTypeVariation.name = doc.name;
					gigTypeVariation.popularity = settings[0];
					gigTypeVariation.energy = settings[1];
					gigTypeVariation.djTiming = settings[2];

					gigTypeVariation.save(function(err){
						if(err) console.log(err);
						callback(null);
					});


				} else {
					callback(null);
				}

			});

		});

	}

});

GigType.schema.post('remove', function(doc) {

	GigType.model.find({"name":doc.name}).remove().exec();

});


/**
* Registration
*/

GigType.defaultColumns = 'name,popularity,energy,djTiming';
GigType.register();
