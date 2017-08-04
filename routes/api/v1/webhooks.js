var async = require('async'),
    keystone = require('keystone');

var User = keystone.list('User');
var Transactions = keystone.list('Transaction');

var paypal = require('paypal-rest-sdk');
paypal.configure({

    'mode': keystone.get('paypal env'), //sandbox or live
    'client_id': keystone.get('paypal client id'),
    'client_secret': keystone.get('paypal client secret')

});

exports.paymentCaptureNotification = function(req, res) {
    console.log('PAYPAL WEBHOOK RECEIVED');

    var webhookId = keystone.get('paypal webhook id');
            console.log(req.body);

    paypal.notification.webhookEvent.verify(req.headers, req.body, webhookId, function(error, response) {
        if (error) {
            console.log(error);
                        res.send();

        }
        else {
                                    res.send();

            console.log(response);

            // Verification status must be SUCCESS
            if (response.verification_status === "SUCCESS") {

                if (req.body.event_type == "PAYMENT.SALE.COMPLETED") {

                    var billingAgreementId = req.body.resource.billing_agreement_id;
                    var parentPayment = req.body.resource.parent_payment;
                    var webhookId = req.body.id;
                    var transactionId = req.body.resource.id;
                    Transactions.model.findOne({
                            paypalBillingAgreementId: billingAgreementId
                    }).sort({createdAt: -1}).populate('sourcePackage').exec(function(err, transaction) {

                        if (err) console.log(err);

                        if (transaction) {

                            if (!transaction.paypalTransactionId) {

                                transaction.set({
                                    paypalBillingAgreementId: billingAgreementId,
                                    paypalPaymentId: parentPayment,
                                    paypalTransactionId: transactionId,
                                    paypalWebhookId: webhookId,
                                    status: 'completed'
                                });

                                transaction.save(function(err) {
                                    if (err) console.log('error saving transaction after webhook', err);
                                    console.log('webhook transaction data saved');
                                });

                            }
                            else if (transaction.billingAgreementId && transaction.paypalTransactionId && transaction.basis == 'recurring') {

                                var newTransaction = new Transactions.model();

                                newTransaction.set('user', transaction.user);
                                newTransaction.set('sourcePackage', transaction.sourcePackage);
                                newTransaction.set('price', transaction.price);
                                newTransaction.set('basis', transaction.basis);
                                newTransaction.set({
                                    paypalBillingAgreementId: billingAgreementId,
                                    paypalPaymentId: parentPayment,
                                    paypalTransactionId: transactionId,
                                    paypalWebhookId: webhookId,
                                    status: 'completed'
                                });

                                newTransaction.save(function(err) {

                                    if (err) console.log(err);

                                });


                            }
                            else {
                                console.log('transaction cannot be processed as found', transaction);
                            }
                        }
                        else {
                                console.log('transaction not found');

                        }
                    });


                } else if (req.body.event_type == "BILLING.SUBSCRIPTION.CREATED") {
                    

                } else if (req.body.event_type == "BILLING.SUBSCRIPTION.CANCELLED") {

                    
                }
                else {
                    console.log("Unhandled webhook response");

                }
            }
        }
    });

}