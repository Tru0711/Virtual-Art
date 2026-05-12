import React, { useState } from 'react';
import { adminApi } from '../../lib/adminApi';
import { toast } from 'react-hot-toast';
import { getFormattedRupee } from '../../lib/pricing';
import { X } from 'lucide-react';

const TransactionsSection = ({ orders, paymentInsights, onOrdersUpdated }) => {
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const summary = paymentInsights?.summary || {};
  const recentTransactions = paymentInsights?.recent_transactions || [];
  const failedPayments = paymentInsights?.failed_payments || [];

  const handleDeliveryStatusChange = async (orderId, newStatus) => {
    setUpdatingOrder(orderId);
    try {
      const response = await adminApi.updateDeliveryStatus(orderId, newStatus);
      if (response.success) {
        toast.success(`Order delivery status updated to ${newStatus}`);
        // Refresh orders if callback provided
        if (onOrdersUpdated) {
          onOrdersUpdated();
        }
      } else {
        toast.error(response.message || 'Failed to update delivery status');
      }
    } catch (error) {
      console.error('Error updating delivery status:', error);
      toast.error('Failed to update delivery status');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
  };

  const closeOrderModal = () => {
    setSelectedOrder(null);
  };
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Transaction Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{getFormattedRupee(summary.total_revenue)}</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm text-blue-700">Total Commission Earned</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{getFormattedRupee(summary.total_commission_earned)}</p>
        </div>
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <p className="text-sm text-indigo-700">Platform Markup Earnings</p>
          <p className="text-2xl font-bold text-indigo-900 mt-1">{getFormattedRupee(summary.platform_markup_earned)}</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm text-red-700">Failed Payments</p>
          <p className="text-2xl font-bold text-red-900 mt-1">{summary.total_failed_payments || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Recent Payment Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artwork</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artist Share</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Share</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentTransactions.map((transaction) => (
                <tr key={transaction._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{transaction.artwork_id?.title || transaction.metadata?.title || 'Artwork'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{transaction.buyer_id?.full_name || transaction.buyer_id?.email || 'Unknown buyer'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{getFormattedRupee(transaction.amount_paid)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-700">{getFormattedRupee(transaction.artist_amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">{getFormattedRupee(transaction.admin_amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      transaction.status === 'paid' ? 'bg-green-100 text-green-800' :
                      transaction.status === 'initiated' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-600">{transaction.transaction_id || transaction.gateway_payment_id || 'N/A'}</td>
                </tr>
              ))}
              {!recentTransactions.length && (
                <tr>
                  <td colSpan={7} className="px-6 py-6 text-sm text-gray-500 text-center">No transactions available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Failed Payments</h2>
        </div>
        <div className="space-y-3 p-4">
          {failedPayments.map((payment) => (
            <div key={payment._id} className="rounded-lg border border-red-100 bg-red-50 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <p className="font-medium text-gray-900">{payment.artwork_id?.title || payment.metadata?.title || 'Artwork'}</p>
                <p className="text-sm text-gray-600">Buyer: {payment.buyer_id?.full_name || payment.buyer_id?.email || 'Unknown buyer'}</p>
                <p className="text-xs text-gray-500">{payment.metadata?.failure_reason || 'Payment failed'}</p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm font-semibold text-red-700">{payment.status}</p>
                <p className="text-xs text-gray-500">{new Date(payment.updated_at || payment.created_at || Date.now()).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {!failedPayments.length && (
            <p className="text-sm text-gray-500">No failed payments.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Order Delivery Status</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => {
                const orderId = order._id || order.id;
                const user = order.user_id;
                const userLabel = typeof user === 'object'
                  ? (user?.full_name || user?.email || user?._id)
                  : user;
                return (
                  <tr key={orderId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {orderId ? `${orderId.slice(0, 8)}...` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {userLabel ? `User ${userLabel.toString().slice(0, 8)}...` : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ₹{Number(order.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        order.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.payment_status || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={order.delivery_status || 'pending'}
                        onChange={(e) => handleDeliveryStatusChange(orderId, e.target.value)}
                        disabled={updatingOrder === orderId}
                        className={`text-xs rounded-lg border-0 font-medium ${
                          order.delivery_status === 'delivered' ? 'bg-green-100 text-green-800' :
                          order.delivery_status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        } ${updatingOrder === orderId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="placed">Placed</option>
                        <option value="processing">Processing</option>
                        <option value="packed">Packed</option>
                        <option value="shipped">Shipped</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.order_date || order.created_at || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => handleViewOrder(order)}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
                <p className="text-sm text-gray-500">Order ID: {selectedOrder._id || selectedOrder.id}</p>
              </div>
              <button type="button" onClick={closeOrderModal} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-6 px-6 py-6 text-sm text-gray-700 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Order ID</p>
                <p className="mt-1 font-mono text-gray-900">{selectedOrder._id || selectedOrder.id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Order Date</p>
                <p className="mt-1 font-medium text-gray-900">{new Date(selectedOrder.order_date || selectedOrder.created_at || Date.now()).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Total Amount</p>
                <p className="mt-1 font-semibold text-gray-900">{getFormattedRupee(selectedOrder.total_amount || 0)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Payment Status</p>
                <p className="mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedOrder.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                    selectedOrder.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedOrder.payment_status || 'pending'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Order Status</p>
                <p className="mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedOrder.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    selectedOrder.status === 'completed' ? 'bg-green-100 text-green-800' :
                    selectedOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedOrder.status}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Delivery Status</p>
                <p className="mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedOrder.delivery_status === 'delivered' ? 'bg-green-100 text-green-800' :
                    selectedOrder.delivery_status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                    selectedOrder.delivery_status === 'out_for_delivery' ? 'bg-indigo-100 text-indigo-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedOrder.delivery_status || 'pending'}
                  </span>
                </p>
              </div>
              {typeof selectedOrder.user_id === 'object' && (
                <>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Customer Name</p>
                    <p className="mt-1 font-medium text-gray-900">{selectedOrder.user_id?.full_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Customer Email</p>
                    <p className="mt-1 font-medium text-gray-900">{selectedOrder.user_id?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Customer Phone</p>
                    <p className="mt-1 font-medium text-gray-900">{selectedOrder.user_id?.phone || 'N/A'}</p>
                  </div>
                </>
              )}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Items</p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="bg-gray-50 rounded p-2 text-xs">
                        <p className="font-medium text-gray-900">{item.artwork_id?.title || item.title || 'Item'}</p>
                        <p className="text-gray-600">Quantity: {item.quantity || 1}</p>
                        <p className="text-gray-600">Price: {getFormattedRupee(item.price || 0)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 bg-gray-50">
              <button
                type="button"
                onClick={closeOrderModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsSection;
