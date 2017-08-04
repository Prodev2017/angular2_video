var keystone = require('keystone');
var Types = keystone.Field.Types;
var utilities = require('../routes/utilities');

/**
 * Genre Model
 * ==========
 */

var Genre = new keystone.List('Genre', { track: true });

Genre.add({
	
	name: { type: Types.Text, required: true, index: true },

});


/**
 * Registration
 */

Genre.defaultColumns = 'name';
Genre.register();

Genre.schema.post('save', function(doc) {
   
   keystone.list('Genre').model.find(function(err, genres) {
       
       for(var i = 0; i < genres.length; i++) {
        
            utilities.updateGenres(genres[i]); 

       }

   });
    
});