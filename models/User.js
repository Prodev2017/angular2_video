var keystone = require('keystone');
var Types = keystone.Field.Types;
var MemberProfile = keystone.List('MemberProfile');
var EditorProfile = keystone.List('EditorProfile');
var AdminProfile = keystone.List('AdminProfile');
var encrypt = require('mongoose-encryption');
var utilities = require('../routes/utilities');
var uniqueValidator = require('mongoose-unique-validator');

/**
 * User Model
 * ==========
 */

var User = new keystone.List('User', { track: true, map: { name: 'email'}});

User.add({
	
	name: { type: Types.Name, index: true, trim: true, default: {first: 'First Name', last: 'Last Name'} },
	userRole: { type: Types.Select, options: [{ value: 'member', label: 'Member' }, { value: 'editor', label: 'Editor' }, { value: 'admin', label: 'Admin' }] },
	email: { type: Types.Email, required: true, initial: true, index: true, trim:true, unique: true },
	password: { type: Types.Password, initial: true, required: true },
	enabled: { type: Types.Boolean, index: true, default: false },
	emailVerified: { type: Types.Boolean, index: true, default: false },
	isAdmin: { type: Boolean, label: 'Can access Keystone', index: true },

}, 'User Details', {
	
	country: { type: Types.Select, options: ['Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Aruba','Australia','Austria','Azerbaijan','Bahamas, The','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burma','Burundi','Cambodia','Cameroon','Canada','Cabo Verde','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo, Democratic Republic of the','Congo, Republic of the','Costa Rica','Cote d\'Ivoire','Croatia','Cuba','Curacao','Cyprus','Czechia','Denmark','Djibouti','Dominica','Dominican Republic','East Timor (see Timor-Leste)','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Ethiopia','Fiji','Finland','France','Gabon','Gambia, The','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Holy See','Honduras','Hong Kong','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Korea, North','Korea, South','Kosovo','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Macau','Macedonia','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','Norway','Oman','Pakistan','Palau','Palestinian Territories','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Sint Maarten','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Swaziland','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom', 'United States','Uruguay','Uzbekistan','Vanuatu','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'], index: true },

	addressText: { type: Types.Text },
	address: { type: Types.Location, index: true },
	jobTitle: { type: Types.Text, index: true },
	phoneNumber: { type: Types.Text }
	
}, 'Account Verification', {
	remoteAddr: { type: Types.Text },
	emailConfirmationKey: { type: Types.Text, index: true },
	emailConfirmationExpiration: { type: Types.Datetime, index: true },
	
}, 'Password Reset Details', {
	passwordResetKey: { type: Types.Text, index: true },
	passwordResetExpiration: { type: Types.Datetime, index: true },

},'Editor Application', {
	
	editorApplicationSampleLink1: { type: Types.Url },
	editorApplicationSampleLink2: { type: Types.Url },
	editorSpecialization: { type: Types.Text },
	isEditorReviewed: { type: Types.Boolean, index: true }

}, 'Editor Settings', {

	currencies: { type: Types.Relationship, ref: 'Currency', index: true, many: true },
	yearStarted: { type: Types.Number, index: true, trim: true },
	socialLogin: { type: Types.Text },
	collections: { type: Types.Relationship, ref: 'Crate', filters: { type: 'collection' }, index: true, many: true },
	
}, 'Editor Profile', {

	stageName: { type: Types.Text, index: true, trim: true },
	hometown: { type: Types.Text, index: true, trim: true },
	currentLocation: { type: Types.Text, index: true, trim: true },
 	yearCrooklynClanStarted: { type: Types.Number, index: true, trim: true }, 
	payPalEmailAddress: {type: Types.Email, initial: true, trim: true },
	taxId: { type: Types.Boolean, index: true, label: 'W9/US Tax ID on File?' },
	
	backgroundImage: { type: Types.S3File, s3path: 'images' },
	logoSquare: { type: Types.S3File, s3path: 'images' },
	logoLong: { type: Types.S3File, s3path: 'images' },
	photo: { type: Types.S3File, s3path: 'images' },
	
	biography: { type: Types.Html, wysiwyg: true },
	
	facebookUrl: { type: Types.Url, trim: true },
	twitterUrl: { type: Types.Url, trim: true },
	youtubeUrl: { type: Types.Url, trim: true },
	instagramUrl: { type: Types.Url, trim: true },
	soundcloudUrl: { type: Types.Url, trim: true },
	googleUrl: { type: Types.Url, trim: true },
	linkedinUrl: { type: Types.Url, trim: true },
	
	youTubeFeaturedVideoUrl: { type: Types.Url, trim: true },
	youTubeFeaturedVideoDescription: { type: Types.Textarea },
	
	soundCloudFeaturedTrackUrl1: { type: Types.Url, trim: true },
	soundCloudFeaturedTrackUrl1Description: { type: Types.Textarea },

	soundCloudFeaturedTrackUrl2: { type: Types.Url, trim: true },
	soundCloudFeaturedTrackUrl2Description: { type: Types.Textarea },

	soundCloudFeaturedTrackUrl3: { type: Types.Url, trim: true },
	soundCloudFeaturedTrackUrl3Description: { type: Types.Textarea },

	crooklynClanV1ArtistID: { type: Types.Text, index: true },
	crooklynClanV1ArtistUsername: { type: Types.Text, index: true },
	crooklynClanV1ArtistS3Directory: { type: Types.Text },
	crooklynClanV1ArtistCatName: { type: Types.Text },
});

// Provide access to Keystone
User.schema.virtual('canAccessKeystone').get(function() {
	return this.isAdmin;
});

User.schema.pre('init', function(next) {
	if(this.name != null) {
		this.name = {first: '', last: ''};
	}
	next();
});

var encKey = process.env.V2_ENCRYPTION_KEY;
var sigKey = process.env.V2_SIGNING_KEY;

User.schema.plugin(uniqueValidator);

User.schema.plugin(encrypt, { encryptionKey: encKey, signingKey: sigKey, encryptedFields: ['taxId'] });
//User.schema.plugin(encrypt.migrations, { encryptionKey: encKey, signingKey: sigKey, encryptedFields: ['taxId'] });
/**
 * Registration
 */

User.defaultColumns = 'name, stageName, email, userRole, crooklynClanV1ArtistID, crooklynClanV1ArtistUsername, enabled, isAdmin';

User.schema.post('save', function(doc) {
	
	if(doc.userRole == 'editor' && doc.emailVerified && doc.enabled && process.env.WEBFLOW_SYNC == true) {
		
		utilities.updateEditorProfileInWebflow(doc);
		
	}
	
	
});

User.relationship({
  path: '_id',
  ref: 'Track',
  refPath: 'editor'
});

User.relationship({
  path: '_id',
  ref: 'Release',
  refPath: 'editor'
});

User.relationship({
  path: '_id',
  ref: 'Transaction',
  refPath: 'user'
});

User.relationship({
  path: '_id',
  ref: 'TransactionItem',
  refPath: 'user'
});

User.relationship({
  path: '_id',
  ref: 'Downloads',
  refPath: 'user'
});

User.relationship({
  path: '_id',
  ref: 'EditorAccounting',
  refPath: 'editor'
});

User.register();
