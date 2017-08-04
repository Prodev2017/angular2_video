/**
 * This script automatically creates a default Admin user when an
 * empty database is used for the first time. You can use this
 * technique to insert data into any List you have defined.
 * 
 * Alternatively, you can export a custom function for the update:
 * module.exports = function(done) { ... }
 */

exports.create = {
	User: [
		{ 'name.first': 'Jonathan', 'name.last': 'Judge', email: 'jonathan@codacity.com', password: 'ccmanager', isAdmin: true, enabled: true },
		{ 'name.first': 'Jonny', 'name.last': 'Smith', stageName: 'DJ Jonny', email: 'johnsmith@codacity.com', password: 'Codacity!123', userRole: 'editor', isAdmin: false, enabled: true },
		{ 'name.first': 'Edmund', 'name.last': 'Bini', stageName: 'Sizzahandz', email: 'sizzahandz@gmail.com', password: 'crooklyn', enabled: true, isAdmin: true, userRole: 'editor' }
	]
};

/*

// This is the long-hand version of the functionality above:

var keystone = require('keystone'),
	async = require('async'),
	User = keystone.list('User');

var admins = [
	{ email: 'user@keystonejs.com', password: 'admin', name: { first: 'Admin', last: 'User' } }
];

function createAdmin(admin, done) {
	
	var newAdmin = new User.model(admin);
	
	newAdmin.isAdmin = true;
	newAdmin.save(function(err) {
		if (err) {
			console.error("Error adding admin " + admin.email + " to the database:");
			console.error(err);
		} else {
			console.log("Added admin " + admin.email + " to the database.");
		}
		done(err);
	});
	
}

exports = module.exports = function(done) {
	async.forEach(admins, createAdmin, done);
};

*/
