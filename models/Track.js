var keystone = require('keystone');
var Types = keystone.Field.Types;
var deepPopulate = require('mongoose-deep-populate')(keystone.mongoose);
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

/**
 * Track Model
 * ==========
 */

var Track = new keystone.List('Track', {
	track: true,
  defaultSort: '-updatedAt'
});

Track.add('Basic Information', {

		name: { type: Types.Text, index: true, trim: true },
		version: { type: Types.Text, index: true, label: 'Version', trim: true },
		artist: { type: Types.Relationship, ref: 'Artist', many: true, index: true },
		artistsFeatured: { type: Types.Relationship, ref: 'Artist', label: 'Featured Artists', many: true, index: true },
		editor: { type: Types.Relationship, ref: 'User', filters: { userRole: 'editor' }, index: true }

	}, 'Formatted Labels', {

		formattedName: { type: Types.Text, index: true, noedit: true },
		artistPrimaryName: { type: Types.Text, label: 'Artist Label', noedit: true, index: true },
		artistsFeaturedDisplayName: { type: Types.Text, label: 'Featured Artist Label', noedit: true },
		editorPrimaryName: { type: Types.Text, label: 'Editor Label', noedit: true },
		genrePrimaryName: { type: Types.Text, label: 'Genre Label',noedit: true },
		keyPrimaryName: { type: Types.Text, label: 'Key Label', noedit: true }

	}, 'Track Editor Settings', {

		description: { type: Types.Textarea },
		startBpm: { type: Types.Number, index: true, default: 0 },
		endBpm: { type: Types.Number, index: true, default: 0 },
		releaseYear: { type: Types.Number, index: true, default: 0 },

		versionType: { type: Types.Relationship, ref: 'Tag', index: true, filters: { tagField: 'Tag 2' } },
		cleanDirty: { type: Types.Relationship, ref: 'Tag', index: true, filters: { tagField: 'Tag 1' } },
		introType: { type: Types.Relationship, ref: 'Tag', index: true, filters: { tagField: 'Tag 3' } },
		outroType: { type: Types.Relationship, ref: 'Tag', index: true, filters: { tagField: 'Tag 4' } },

		genres: { type: Types.Relationship, ref: 'Genre', many: true, index: true },
		isOriginal: { type: Types.Boolean, index: true },
		originalWorks: { type: Types.Relationship, ref: 'OriginalWorks', many: true, index: true },
		gigTypes: { type: Types.Relationship, ref: 'GigType', many: true, index: true },
		releases: { type: Types.Relationship, ref: 'Release', many: true, index: true },

	}, 'Track Metadata', {

		trackLength: { type: Types.Number, note: "in seconds" },
		inKey: { type: Types.Relationship, ref: 'Key', index: true },
		image: { type: Types.S3File, s3path: 'images' },
		hiBitRateFileBitRate: { type: Types.Text, noedit: true, label: 'Audio Bitrate' },

	}, 'Waveform', {

		waveformImageFileName: { type: Types.Text, noedit: true, default: '' },
		waveformImageFilePath: { type: Types.Text, noedit: true, default: '' },
		waveformImageFileUrl: { type: Types.Text, noedit: true, default: '' },
		
		waveformImageSnippetFileName: { type: Types.Text, noedit: true, default: ''},
		waveformImageSnippetFilePath: { type: Types.Text, noedit: true, default: '' },
		waveformImageSnippetFileUrl: { type: Types.Text, noedit: true, default: '' }

	}, 'Video Metadata', {

		videoHiBitRateFileBitRate: { type: Types.Text, noedit: true, label: 'Video Bitrate' },
		videoHeight: {type: Types.Number, index: true },
		videoWidth: { type: Types.Number, index: true },

	}, 'Track File Information', {

		fileType: { type: Types.Select, options: [{ value: 'audio', label: 'Audio' }, { value: 'video', label: 'Video' }], index: true },
		hiBitRateFile: { type: Types.S3File, s3path: 'hiBitRateTracks', label: 'Original Upload Path' },
		customDraftSnippetFile: { type: Types.S3File, label: 'Original Custom Snippet Path' },
		customDraftSnippetFileStatus: { type: Types.Select, options: [{label: 'Processing', value: 'processing'}, {label: 'Processed', value: 'processed'}], index: true },
		publishedHiBitRateFile: { type: Types.S3File, label: 'Published Track Path'},
		publishedLowBitRateFile: { type: Types.S3File, label: 'Preview/Snippet Track Path' }

	}, 'Store Settings', {

		status: { type: Types.Select, options: ['draft', 'submitted', 'processing', 'published', 'error'], index: true, default: 'draft' },
		publishDate: { type: Types.Date, index: true },
		enabled: { type: Types.Boolean, index: true },
		currency: { type: Types.Relationship, ref: 'Currency', index: true },
		assignedCollections: { type: Types.Relationship, ref: 'Collection', index: true, initial: true, many: true },
		downloadCount: { type: Types.Number, index: true },
		creditValue: { type: Types.Number, default: 1 },
		tier: { type: Types.Relationship, ref: 'Tier', index: true },
		textSearchField: { type: Types.Textarea, noedit: true, text: true },
		downloadCount: { type: Types.Number }

	}, 'Track Draft Data', {
		
		draftTrackUploadedToS3: { type: Types.Boolean, default: false },
		artistText: { type: Types.Text, label: 'Pre-Validated Artist Names', trim: true, index: true },
		artistsFeaturedText: { type: Types.Text, label: 'Pre-Validated Featured Artists Names', trim: true },
		originalWorksDraft: { type: Types.Textarea, label: 'Pre-Validated Original Works', trim: true },
		originalFileName: { type: Types.Text, label: 'Original Upload Filename', trim: true },
		draftFlaggedAsDuplicate: { type: Types.Boolean, index: true, default: false},
		isTrackValid: { type: Types.Boolean, default: false }

	}, 'Crooklyn Clan v1 Crosslisting', {

		crooklynClanv1ProductID: { type: Types.Text, index: true },
		crooklynClanv1ProductCode: { type: Types.Text, index: true },
		crooklynClanv1PublishedTrack: { type: Types.Text },
		crooklynClanv1SampleTrack: { type: Types.Text },
		crooklynClanv1AutoMigrated: { type: Types.Boolean, index: true },
		crooklynClanv1CatId: { type: Types.Text, index: true },
		crooklynClanv1Active: { type: Types.Boolean, index: true },
		crooklynClanv1Disabled: { type: Types.Boolean, index: true },
		crooklynClanv1Popularity: { type: Types.Number, index: true },
		crooklynClanv1AddedDate: { type: Types.Date, index: true, default: Date.now }

	}, 'Deprecated Data', {

        album: { type: Types.Text, index: true, default: 'Promo Single' }

	}, 'Utilities', {

		actions: { type: Types.Select, options: [{ value: 'none', label: 'None'}, {value: 'republish', label: 'Re-Publish Track & Affiliated Releases for v1'}], default: 'none' },
		confirmAction: { type: Types.Boolean, default: false },
		lastAction: { type: Types.Textarea, noedit: true }

	}, 'Debugging', {
		errorMessage: { type: Types.Textarea, noedit: true }
	});

/**
 * Registration
 */

Track.defaultColumns = 'name, release';
Track.relationship({
	path: 'downloads',
	ref: 'Downloads',
	refPath: 'track'
});
Track.schema.plugin(mongooseAggregatePaginate);

Track.schema.index({'textSearchField': 'text'});

Track.schema.pre('save', function(next) {

	var self = this;
	Track.model.findById(this._id).exec(function(err, track) {
		if(err) console.log(err);
		if(track) {

			if(self.status == 'published' && track.status != 'published' && !self.publishDate && !track.publishDate) {
				self.publishDate = new Date();
				next();
			} else {
				next();
			}

		} else {
			next();
		}

	});

});

Track.schema.pre('save', function(next) {
	var logPrefix = '[TRACKID=' + this._id + ']';
	console.log(logPrefix,'creating artist display name');
	var self = this;
	if (this.artist && this.artist.length > 0) {

		keystone.list('Artist').model.findById(this.artist[0]).exec(function(err, artist) {
			if (artist) {
				//console.log(logPrefix,"Artist: ", artist);

				self.artistPrimaryName = artist.name;

			}

			next();

		});
	}
	else {
		this.artistPrimaryName = "";
		next();
	}
});

Track.schema.pre('save', function(next) {
		var logPrefix = '[TRACKID=' + this._id + ']';

	console.log(logPrefix,'creating editor display name');

	var self = this;
	if (this.editor) {

		keystone.list('User').model.findById(this.editor).populate('editorProfile').exec(function(err, editor) {
			//console.log(logPrefix,"editor: ", editor,err);
			self.editorPrimaryName = editor.stageName;
			next();
		});

	}
	else {
		next();
	}
});

Track.schema.pre('save', function(next) {
		var logPrefix = '[TRACKID=' + this._id + ']';

	console.log(logPrefix,'creating key display name');

	var self = this;
	if (this.inKey) {

		keystone.list('Key').model.findById(this.inKey).exec(function(err, inKey) {
			//console.log(logPrefix,"inKey: ", inKey);

			self.keyPrimaryName = inKey.camelotKey + " / " + inKey.musicKey;
			next();
		});

	}
	else {
		next();
	}
});

Track.schema.pre('save', function(next) {
		var logPrefix = '[TRACKID=' + this._id + ']';

	console.log(logPrefix,'creating artist featured display name');

	var self = this;
	if (this.artistsFeatured && this.artistsFeatured.length > 0) {

		keystone.list('Artist').model.find({
			_id: {
				$in: this.artistsFeatured
			}
		}).exec(function(err, artistsFeatured) {
			//console.log(logPrefix,artistsFeatured);
			if (artistsFeatured) {

				if (artistsFeatured.length == 2) {
					self.artistsFeaturedDisplayName = artistsFeatured.map(function(artist) {
						return artist.name;
					}).join(' & ')
				}
				else if (artistsFeatured.length >= 3) {
					self.artistsFeaturedDisplayName = artistsFeatured.map(function(artist) {
						return artist.name;
					}).join(', ')
				}
				else {
					self.artistsFeaturedDisplayName = artistsFeatured[0].name;
				}

			}

			next();

		});
	}
	else {
		this.artistsFeaturedDisplayName = "";
		next();
	}
});

Track.schema.post('save', function(doc) {

  console.log('Track:PostSave:UpdateAccountingPeriodRecord Start');

  var AccountingPeriod = keystone.list('AccountingPeriod');
  if(doc.publishDate && !doc.crooklynClanv1AutoMigrated) {


  var date = new Date(doc.publishDate), y = date.getFullYear(), m = date.getMonth();
  var firstDay = new Date(y, m, 1);
  var lastDay = new Date(y, m + 1, 0, 23, 59, 59, 999);

  console.log('Track:PostSave:UpdateAccountingPeriodRecord');

  doc.populate('currency', function(err, docWithCurrency) {

  AccountingPeriod.model.findOne({currency: doc.currency, startDate: firstDay, endDate: lastDay}).populate('currency').exec(function(err, accountingPeriodRecord) {

    if(!accountingPeriodRecord) {

      console.log('Track:PostSave:UpdateAccountingPeriodRecord no accounting period record found - will create new one');

      var newAccountingPeriod = new AccountingPeriod.model();

      newAccountingPeriod.set({ startDate: firstDay });
      newAccountingPeriod.set({ endDate: lastDay });
      newAccountingPeriod.set({ currency: doc.currency });

      newAccountingPeriod.save( function(err) {

		createOrUpdateEditorAccounting(doc, newAccountingPeriod, function(editorAccounting) {

			console.log('Track:PostSave:UpdateAccountingPeriodRecord editor accounting saved');

		})

      });

    } else {

          console.log('Track:PostSave:UpdateAccountingPeriodRecord getting new accounting period record');

		createOrUpdateEditorAccounting(doc, accountingPeriodRecord, function(editorAccounting) {

			console.log('Track:PostSave:UpdateAccountingPeriodRecord editor accounting saved');

		})


    }

  });

});
  } else {

  }

});

var getTracksWithoutReleasesCountForAccountingPeriod = function(track, accountingPeriod, callback) {

	Track.model.count({publishDate: {$gte: accountingPeriod.startDate, $lte: accountingPeriod.endDate}, editor: track.editor, status: 'published', releases: []}, function(err, count) {
		if(err) return callback(err);
		console.log('getTracksWithoutReleasesCountForAccountingPeriod');
		return callback(null,count);

	});

}

var getReleasesCountForAccountingPeriod = function(track, accountingPeriod, callback) {

	var Release = keystone.list('Release');

	Release.model.count({publishDate: {$gte: accountingPeriod.startDate, $lte: accountingPeriod.endDate}, editor: track.editor, status: 'published'},
	
	function(err, count) {
		console.log('getReleasesCountForAccountingPeriod');

		if(err) return callback(err);
		

		return callback(null, count);

	});

}

var getTotalUploadCount = function(track, accountingPeriod, callback) {

	getTracksWithoutReleasesCountForAccountingPeriod(track, accountingPeriod, function(err, tracksWithoutReleaseCount) {

		getReleasesCountForAccountingPeriod(track, accountingPeriod, function(err, releasesCount) {

			return callback(tracksWithoutReleaseCount + releasesCount);

		});

	});

}

var createOrUpdateEditorAccounting = function(track, accountingPeriod, callback) {

	console.log('Track:PostSave:createOrUpdateEditorAccounting create accounting record for track in current accounting period');

	var EditorAccounting = keystone.list('EditorAccounting');

	EditorAccounting.model.findOne({editor: track.editor, accountingPeriod: accountingPeriod }).exec( function(err, editorAccountingForPeriod) {

		if(err) return console.log('Track:PostSave:createOrUpdateEditorAccounting', err);

		if(editorAccountingForPeriod) {

			getTotalUploadCount(track, accountingPeriod, function(count) {

				editorAccountingForPeriod.set({trackUploadCount: count});
				editorAccountingForPeriod.save( function(err) {

					console.log('Track:PostSave:createOrUpdateEditorAccounting saved updated track/release count');
					return callback(editorAccountingForPeriod);

				});

			});


		} else {

			var newEditorAccounting = new EditorAccounting.model({
				accountingPeriod: accountingPeriod,
				editor: track.editor,
				quotaThreshold: track.currency.trackUploadQuota
			});

			getTotalUploadCount(track, accountingPeriod, function(count) {

				newEditorAccounting.set({trackUploadCount: count});
				newEditorAccounting.save( function(err) {

					console.log('Track:PostSave:createOrUpdateEditorAccounting saved updated track/release count');
					callback(newEditorAccounting);

				});

			});


		}

	});

}


Track.defaultColumns = 'updatedAt, title, editor, status, releases'
Track.relationship({
  path: '_id',
  ref: 'TrackAccounting',
  refPath: 'track'
});

Track.register();
