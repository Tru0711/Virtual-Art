import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import OrderTrackingBar from '../common/OrderTrackingBar';
import { useSocket } from '../../contexts/SocketContext.jsx';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function OrderDetailsModal({ orderId, onClose, socket = null }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { socket: contextSocket } = useSocket();
  const activeSocket = socket || contextSocket;

  const fetchOrder = async (id) => {
    try {
      setLoading(true);
      const resp = await api.request(`/orders/${id}`);
      setOrder(resp?.order || resp || null);
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orderId) return;
    fetchOrder(orderId);
  }, [orderId]);

  useEffect(() => {
    if (!activeSocket || !orderId) return undefined;

    try { activeSocket.emit('joinOrderRoom', orderId); } catch (e) { /* ignore */ }

    const handler = (data) => {
      const payloadId = data?.orderId || data?._id || data?.id;
      if (String(payloadId) === String(orderId)) fetchOrder(orderId);
    };
    activeSocket.on('order.updated', handler);

    return () => {
      try { activeSocket.emit('leaveOrderRoom', orderId); } catch (e) { /* ignore */ }
      activeSocket.off('order.updated', handler);
    };
  }, [activeSocket, orderId]);

  if (!orderId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <motion.div
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[8px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />

      <motion.div
        className="relative w-full max-w-6xl overflow-hidden rounded-[36px] border border-amber-100 bg-white shadow-[0_28px_90px_rgba(234,179,8,0.12)]"
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />

        <div className="flex items-start justify-between border-b border-amber-100 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.38em] text-amber-500">Order Details</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-[28px]">Track your order in real time</h3>
          </div>
          <button onClick={onClose} className="rounded-full border border-amber-100 bg-white p-2.5 text-slate-500 transition hover:border-amber-300 hover:text-amber-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-76px)] overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="space-y-5 animate-pulse">
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="h-44 rounded-[28px] border border-amber-100 bg-amber-50/60" />
                <div className="h-44 rounded-[28px] border border-amber-100 bg-amber-50/60" />
              </div>
              <div className="h-[420px] rounded-[28px] border border-amber-100 bg-amber-50/60" />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 rounded-[22px] border border-amber-100 bg-amber-50/60" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : order ? (
            <div className="rounded-[30px] border border-amber-100 bg-white p-3 sm:p-4 shadow-[0_18px_55px_rgba(234,179,8,0.08)]">
              <OrderTrackingBar orderId={orderId} order={order} socket={activeSocket} />
            </div>
          ) : (
            <div className="rounded-[24px] border border-amber-100 bg-amber-50 px-4 py-3 text-slate-700">No order data available</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
