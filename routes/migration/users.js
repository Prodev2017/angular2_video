var keystone = require('keystone');
var Users = keystone.list('User');
var async = require('async');
var Sequelize = require('sequelize');
var slugify = require("slug");

/* Get v1 users and synchronize with v2 */
exports = module.exports = function(req, res) {

    if (process.env.QUOTAGUARDSTATIC_URL) {
        var sequelize = new Sequelize(process.env.V1_DB_DATABASE, process.env.V1_DB_USER, process.env.V1_DB_PASS);
    }
    else {
        var sequelize = new Sequelize(process.env.V1_DB_DATABASE, process.env.V1_DB_USER, process.env.V1_DB_PASS, {
            host: process.env.V1_DB_HOST
        });
    }

    sequelize.authenticate()
        .then(function() {
            console.log('Connection has been established successfully.');
            sequelize.query('SELECT * FROM `CubeCart_category` where `active` = 1 and `email` != ""', { type: sequelize.QueryTypes.SELECT})
              .then(function(users) {
                console.log(users.length);
                
                async.eachSeries(users, createOrUpdateUserAccount, function(err){
                    if(err) return console.log(err);
                    res.apiResponse({status:'ok'});
                });
                
                
                
                //res.apiResponse({status:'ok'});
              });

        })
        .catch(function(err) {
            console.log('Unable to connect to the database:', err);
        });
        
        function createOrUpdateUserAccount(user, syncCallback) {
            console.log('user data from v1', user);
            Users.model.findOne({crooklynClanV1ArtistID: user.cat_id}).exec(function(err, v2user) {
               console.log('initial check for existing record', err, v2user);
               if(err) return syncCallback(err);
               
               if(!v2user) {
                   console.log('cannot find an existing v2 user that matches this v1 user');
                   var newV2User = new Users.model({
                       email: user.email,
                       biography: user.cat_desc,
                       stageName: user.cat_name,
                       crooklynClanV1ArtistID: user.cat_id,
                       crooklynClanV1ArtistUsername: user.username,
                       crooklynClanV1ArtistCatName: user.cat_name,
                       crooklynClanV1ArtistS3Directory: user.directory,
                       payPalEmailAddress: user.email,
                       enabled: true,
                       addressText: user.address,
                       userRole: 'editor',
                       emailVerified: true,
                       taxId: user.ss,
                       password: slugify(user.cat_id + user.email + user.cat_name, '')
                   });
                   console.log('new user set up',newV2User);
                   newV2User.save(function(err){
                       console.log('saving new v2 user', err);
                       if(err) return syncCallback(err);
                       syncCallback();
                   });
               } else {
                  
                  syncCallback();

               }
               
                
            });
            
        }


}