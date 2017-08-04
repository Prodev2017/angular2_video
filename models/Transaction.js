var keystone = require('keystone');
var Types = keystone.Field.Types;
var moment = require('moment');
var async = require('async');

/**
Transaction Model * ==========
 */

var Transaction = new keystone.List('Transaction', { track: true });

Transaction.add({
  
  user: { type: Types.Relationship, ref:'User', initial: true, required: true, index: true },
  name: { type: Types.Text, default: 'Transaction' },
  sourcePackage: { type: Types.Relationship, ref: 'Package', initial: true, required: true, index: true },
  price: { type: Types.Money, format: '$0,0.00', default: 0, required: true, initial: true },
  basis: { type: Types.Select, options: [{label: 'Recurring', value: 'recurring'}, {label: 'One Time', value: 'one-time'}], required: true, initial: true, index: true },
  startTime: { type: Types.Datetime, default: Date.now() },
  endTime: { type: Types.Datetime, default: moment().add(30, 'days') },
  paypalBillingAgreementId: { type: Types.Text, index: true, noedit: true },
  paypalPaymentId: { type: Types.Text, index: true, noedit: true },
  paypalTransactionId: { type: Types.Text, index: true, noedit: true },
  paypalWebhookId: { type: Types.Text, index: true, noedit: true },
  status: { type: Types.Select, options: [{label: 'Pending Payment', value: 'pending'}, {label: 'Payment Completed', value: 'completed'}], index: true },
  description: { type: Types.Textarea },
  transactionItems: { type: Types.Relationship, ref: 'TransactionItem', many: true, index: true },
  doNotRenew: { type: Types.Boolean, index: true },
  doNotRenewTimestamp: { type: Types.Datetime, index: true },
  notes: { type: Types.Textarea }


});

/**
 * Registration
 */
 
Transaction.schema.post('remove', function(doc) {
  
  var TransactionItems = keystone.list('TransactionItem');
  
  console.log(doc);
  
  TransactionItems.model.remove({$in: doc.transactionItems}).exec(function(err) {
    
    console.log('removed associated transaction items');
    if(err) console.log('error automatically deleting transaction items affiliated with deleted transaction', doc._id, doc.user);
    
  });
  
})
 
Transaction.schema.pre('save', function(next) {
  
  var doc = this;
  var TransactionItem = keystone.list('TransactionItem');
  var Package = keystone.list('Package');
  
  console.log('Transaction:PostSave:CreateTransactionItems Start');
    console.log('Transaction:PostSave:CreateTransactionItems checking that there is a user, price, source package and transactions items must be empty');

  if(doc.user && doc.sourcePackage && doc.transactionItems.length == 0 && doc.status == 'completed') {
    console.log('Transaction:PostSave:CreateTransactionItems there is a user, price, source package and transactions items are empty');
    console.log('Transaction:PostSave:CreateTransactionItems populating source package');

    doc.populate('sourcePackage', function(err, doc) {
          console.log('Transaction:PostSave:CreateTransactionItems populating source package package items');

      doc.name = doc.sourcePackage.name;
      
      doc.sourcePackage.populate('packageItems', function(err, sourcePackage) {
        
        console.log('Transaction:PostSave:CreateTransactionItems got package items');

        async.eachSeries(sourcePackage.packageItems, function(packageItem, callback) {
          
          this.price += packageItem.price;

          var newTransactionItem = TransactionItem.model({
            
            startTime: doc.startTime,
            endTime: moment(doc.startTime).add(sourcePackage.creditExpirationTerm,'days'),
            transaction: doc._id,
            sourcePackage: sourcePackage._id,
            sourcePackageItem: packageItem._id,
            name: packageItem.name,
            price: packageItem.price,
            credits: packageItem.credits,
            creditsRemaining: packageItem.credits,
            user: doc.user,
            type: packageItem.type,
            currency: packageItem.currency
            
          });
          
          console.log(newTransactionItem);
          
          newTransactionItem.save( function(err) {
            if(err) console.log(err);
            
            doc.transactionItems.push(newTransactionItem._id);
            callback(err);
            
          });
          
        }, function(err) {
          
          console.log('Transaction:PostSave:CreateTransactionItems done creating additional transaction items');
          next();
          
        });

        
      });
      
    });

  } else {
    next();
  }
  
});

Transaction.relationship({
  path: '_id',
  ref: 'TransactionItem',
  refPath: 'transaction'
});

Transaction.defaultColumns = 'user, package, transactionItems, price, basis, endTime, doNotRenew, status, paypalBillingAgreementId, paypalPaymentId, paypalTransactionId, paypalWebhookId';


Transaction.register();

