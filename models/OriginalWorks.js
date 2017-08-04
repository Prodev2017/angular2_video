var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
OriginalWorks Model * ==========
 */

var OriginalWorks = new keystone.List('OriginalWorks', { track: true });

OriginalWorks.add({

  name: { type: Types.Text, required: true, trim: true },
  version: { type: Types.Text, initial:true, required: true, trim: true },
  artists: { type: Types.Relationship, ref: 'Artist', many: true, index:true, initial:true, required: true },
  artistsFeatured: { type: Types.Relationship, ref: 'Artist', many: true, index:true },
  artistsDisplayName: { type: Types.Text, index: true, default: '', trim: true },
  artistsFeaturedDisplayName: { type: Types.Text, index: true, default: '', trim: true },
  displayName: { type: Types.Text, index: true, default: '', trim: true },
  sourceTrack: { type: Types.Relationship, ref: 'Track', index:true }

});

OriginalWorks.schema.pre('save', function(next) {
	var self = this;
	if(this.artists && this.artists.length > 0) {

    keystone.list('Artist').model.find({_id: { $in: this.artists }}).exec(function(err, artists) {
      console.log(artists);
			if(artists) {

        if(artists.length == 2) {
          self.artistsDisplayName = artists.map(function(artist) {
            return artist.name;
          }).join(' & ')
        } else if(artists.length >= 3) {
          self.artistsDisplayName = artists.map(function(artist) {
            return artist.name;
          }).join(', ')
        } else {
          self.artistsDisplayName = artists[0].name;
        }

			}

			next();

		});
	} else {
		next();
	}
});

OriginalWorks.schema.pre('save', function(next) {
	var self = this;

    this.displayName = this.name + ' (' + this.version + ') by ' + this.artistsDisplayName + ' (' + this.artistsFeaturedDisplayName + ')';
		next();

});

OriginalWorks.schema.pre('save', function(next) {
	var self = this;
	if(this.artistsFeatured && this.artistsFeatured.length > 0) {

    keystone.list('Artist').model.find({_id: { $in: this.artistsFeatured }}).exec(function(err, artistsFeatured) {
      console.log(artistsFeatured);
			if(artistsFeatured) {

        if(artistsFeatured.length == 2) {
          self.artistsFeaturedDisplayName = artistsFeatured.map(function(artist) {
            return artist.name;
          }).join(' & ')
        } else if(artistsFeatured.length >= 3) {
          self.artistsFeaturedDisplayName = artistsFeatured.map(function(artist) {
            return artist.name;
          }).join(', ')
        } else {
          self.artistsFeaturedDisplayName = artistsFeatured[0].name;
        }

			}

			next();

		});
	} else {
		next();
	}
});

OriginalWorks.schema.pre('save', function(next) {

    this.displayName = this.name + ' ';

    if(this.version) {
      this.displayName += '(' + this.version + ') ';
    }

    this.displayName += 'by ' + this.artistsDisplayName;

    if(this.artistsFeaturedDisplayName) {
      this.displayName += ' (' + this.artistsFeaturedDisplayName + ')';
    }

		next();

});



/**
 * Registration
 */

OriginalWorks.defaultColumns = 'name, version, artist, artistsFeatured';
OriginalWorks.relationship({ path: 'name', ref: 'Track', refPath: 'originalWorks' });

OriginalWorks.register();
