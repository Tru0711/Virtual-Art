import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, ShoppingBag } from 'lucide-react';
import Navbar from '../layout/Navbar';
import Footer from '../layout/Footer';
import { getFormattedRupee } from '../../lib/pricing';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const summary = location.state?.summary || {};
  const items = summary.items || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-amber-50 flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-12">
        <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-18 h-18 rounded-full bg-emerald-100 mb-4">
              <CheckCircle className="h-12 w-12 text-emerald-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Payment Successful</h1>
            <p className="text-gray-600 mt-3">Your Razorpay payment has been confirmed and the artwork purchase has been recorded.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-sm text-emerald-700 font-semibold">Total Paid</p>
              <p className="text-2xl font-bold text-emerald-900 mt-2">{getFormattedRupee(summary.amount_paid)}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-amber-700 font-semibold">Payment ID</p>
              <p className="text-sm font-mono text-amber-900 mt-2 break-all">{summary.payment_id || 'N/A'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm text-slate-700 font-semibold">Order Date</p>
              <p className="text-sm font-semibold text-slate-900 mt-2">{summary.order_date ? new Date(summary.order_date).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {items.map((item, index) => (
              <div key={index} className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-gray-200 p-4">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{item.title}</h3>
                  <p className="text-sm text-gray-600">Artist: {item.artist_name || 'Artist'}</p>
                  <p className="text-xs text-gray-500 mt-1 break-all">Transaction ID: {item.transaction_id || summary.payment_id || 'N/A'}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-sm text-gray-500">Paid</p>
                  <p className="text-lg font-bold text-gray-900">{getFormattedRupee(item.amount_paid)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/my-orders')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-semibold hover:shadow-lg transition-all"
            >
              <ShoppingBag className="h-5 w-5" />
              View My Orders
            </button>
            <button
              onClick={() => navigate('/user/dashboard')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
            >
              Continue Shopping
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PaymentSuccess;