const express = require('express');
const { auth } = require('../middleware/auth');
const razorpayController = require('../controllers/razorpayController');

const router = express.Router();

router.post('/create-order', auth, razorpayController.createCheckoutOrder);
router.post('/verify', auth, razorpayController.verifyCheckoutPayment);
router.post('/fail', auth, razorpayController.markCheckoutFailure);
router.get('/wallet', auth, razorpayController.getArtistWallet);

module.exports = router;