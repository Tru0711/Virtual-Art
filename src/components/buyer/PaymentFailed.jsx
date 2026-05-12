import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import Navbar from '../layout/Navbar';
import Footer from '../layout/Footer';

const PaymentFailed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const reason = location.state?.reason || 'Payment failed or was cancelled.';
  const status = location.state?.status || 'failed';

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-amber-50 flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-12">
        <div className="bg-white rounded-3xl shadow-xl border border-rose-100 p-8 md:p-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 mb-4">
            <AlertTriangle className="h-9 w-9 text-rose-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment {status === 'cancelled' ? 'Cancelled' : 'Failed'}</h1>
          <p className="text-gray-600 mb-6">{reason}</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/checkout')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-semibold hover:shadow-lg transition-all"
            >
              <RotateCcw className="h-5 w-5" />
              Try Payment Again
            </button>
            <button
              onClick={() => navigate('/cart')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
            >
              Back to Cart
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PaymentFailed;
