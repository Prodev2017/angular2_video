var keystone = require('keystone');
var Types = keystone.Field.Types;
var paypal = require('paypal-rest-sdk');
paypal.configure({

  'mode': keystone.get('paypal env'), //sandbox or live
  'client_id': keystone.get('paypal client id'),
  'client_secret': keystone.get('paypal client secret')

});

/**
Package Model * ==========
 */

var Package = new keystone.List('Package', {
  track: true
});

Package.add({

  name: {
    type: Types.Text,
    required: true,
    index: true
  },
  description: {
    type: Types.Textarea,
    required: true,
    initial: true,
    maxlength: 126,
    label: 'PayPal Maximum 126 Character Limit'
  },
  term: {
    type: Types.Number,
    required: true,
    initial: true,
    label: 'Term(in days)'
  },
  creditExpirationTerm: {
    type: Types.Number,
    required: true,
    initial: true,
    label: 'Credits Expire (in days)'
  },
  basis: {
    type: Types.Select,
    options: [{
      label: 'Recurring',
      value: 'recurring'
    }, {
      label: 'One Time',
      value: 'one-time'
    }]
  },
  price: {
    type: Types.Money,
    format: '$0,0.00',
    noedit: true
  },
  packageItems: {
    type: Types.Relationship,
    ref: 'PackageItem',
    many: true,
    index: true
  },
  payPalBillingPlanId: {
    type: Types.Text,
    noedit: true,
    index: true
  },
  enabled: { type: Types.Boolean, default: false, index: true, label: 'Publicly display this package for purchase on the site?' }

});

/**
 * Registration
 */

Package.defaultColumns = 'name, credits, price, currency';

Package.schema.pre('save', function(next) {
    
    var self = this;

    if (self.packageItems && self.packageItems.length > 0) {
      
      var PackageItems = keystone.list('PackageItem');
      PackageItems.model.find({_id: { $in: self.packageItems}}).exec(function(err, packageItems) {
        
      var itemPrices = packageItems.map(function(packageItem) {
        return packageItem.price;
      }).reduce(function(a, b) {
        console.log(a, b);
        return a + b;
      });

      self.price = itemPrices;


      next();
      
      });

    }
    else {

      next();

    }

});

Package.schema.pre('save', function(next) {
  
  var self = this;
  
    if (self.price && self.basis == 'recurring' && !self.payPalBillingPlanId) {

      var billingPlanAttribs = {
        name: self.name,
        description: self.description,
        type: 'infinite',
        payment_definitions: [{
          name: 'Standard Plan',
          type: 'REGULAR',
          frequency_interval: self.term,
          frequency: 'DAY',
          cycles: 0,
          amount: {
            currency: 'USD',
            value: self.price
          }
        }],
        merchant_preferences: {
          setup_fee: {
            value: self.price,
            currency: "USD"
          },          
          max_fail_attempts: '0',
          auto_bill_amount: 'YES',
          initial_fail_amount_action: 'CONTINUE',
          return_url: process.env.EMAIL_SITE_URL,
          cancel_url: process.env.EMAIL_SITE_URL

        }
      };

      paypal.billingPlan.create(billingPlanAttribs, function(error, billingPlan) {
        var billingPlanUpdateAttributes;

        if (error) {
          console.log(JSON.stringify(error));
          next();

        }
        else {
          // Create billing plan patch object
          billingPlanUpdateAttributes = [{
            op: 'replace',
            path: '/',
            value: {
              state: 'ACTIVE'
            }
          }];

          // Activate the plan by changing status to active
          paypal.billingPlan.update(billingPlan.id, billingPlanUpdateAttributes, function(error, response) {
            if (error) {
              console.log(JSON.stringify(error));
              next();
            }
            else {
              console.log('Billing plan created under ID: ' + billingPlan.id);
              self.payPalBillingPlanId = billingPlan.id;
              next();
            }
          });
        }
      });



    }
    else {

      next();

    }

});

Package.register();
