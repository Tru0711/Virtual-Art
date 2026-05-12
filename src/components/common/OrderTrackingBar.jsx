import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { getImageUrl } from '../../lib/imageUtils';
import { Check, Clock, Package, Truck, MapPin, CalendarDays, BadgeInfo } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSocket } from '../../contexts/SocketContext.jsx';

const STATUS_STEPS = [
  { label: 'Order Placed', icon: Package },
  { label: 'Processing', icon: Clock },
  { label: 'Packed', icon: Package },
  { label: 'Shipped', icon: Truck },
  { label: 'Out for Delivery', icon: MapPin },
  { label: 'Delivered', icon: Check },
];

const statusToIndex = (status) => {
  if (!status) return 0;

  const normalized = String(status).toLowerCase();
  const map = {
    pending: 0,
    placed: 0,
    'order placed': 0,
    processing: 1,
    packed: 2,
    shipped: 3,
    'out for delivery': 4,
    out_for_delivery: 4,
    delivered: 5,
    completed: 5,
  };

  if (Object.prototype.hasOwnProperty.call(map, normalized)) {
    return map[normalized];
  }

  const fallbackIndex = STATUS_STEPS.findIndex((step) => step.label.toLowerCase() === normalized);
  return fallbackIndex >= 0 ? fallbackIndex : 0;
};

const formatDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getOrderArtwork = (order) => {
  const artwork = order?.artwork_id || order?.artwork || order?.items?.[0]?.product || order?.items?.[0]?.artwork || null;
  return {
    title: artwork?.title || order?.items?.[0]?.productTitle || order?.items?.[0]?.title || 'Artwork',
    imageUrl: artwork?.image_url || artwork?.image || artwork?.thumbnail || artwork?.images?.[0] || order?.artwork_image || order?.thumbnail || null,
    medium: artwork?.medium || artwork?.category || null,
  };
};

const formatDateTime = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const StepNode = ({ step, index, activeIndex }) => {
  const completed = index < activeIndex;
  const active = index === activeIndex;
  const Icon = step.icon;

  const circleClassName = completed
    ? 'border-amber-400 bg-amber-400 text-white shadow-[0_0_0_1px_rgba(251,191,36,0.25),0_0_18px_rgba(251,191,36,0.24)]'
    : active
      ? 'border-amber-300 bg-white text-amber-500 shadow-[0_0_0_1px_rgba(251,191,36,0.18),0_0_26px_rgba(251,191,36,0.18)]'
      : 'border-slate-200 bg-white text-slate-400';

  return (
    <div className="flex min-w-[132px] flex-col items-center px-1 text-center">
      <div className="relative flex h-12 w-12 items-center justify-center">
        {active ? <span className="absolute inset-0 rounded-full bg-amber-200/70 blur-md animate-ping" /> : null}
        <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-500 ${circleClassName}`}>
          <Icon className={`h-4 w-4 ${completed ? 'text-white' : active ? 'text-amber-500' : 'text-slate-400'}`} />
          {active ? <span className="absolute inset-0 rounded-full ring-1 ring-amber-200" /> : null}
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <div className={`text-[10px] font-semibold uppercase tracking-[0.26em] ${completed ? 'text-amber-600' : active ? 'text-slate-900' : 'text-slate-500'}`}>
          {step.label}
        </div>
        <div className={`text-[10px] leading-4 ${completed ? 'text-amber-500' : active ? 'text-slate-600' : 'text-slate-400'}`}>
          {completed ? 'Completed' : active ? 'In progress' : 'Pending'}
        </div>
      </div>
    </div>
  );
};

const TimelineCard = ({ order }) => {
  const stepIndex = useMemo(() => statusToIndex(order?.delivery_status || order?.status || order?.deliveryStatus), [order]);
  const progressPercent = useMemo(() => (stepIndex / (STATUS_STEPS.length - 1)) * 100, [stepIndex]);
  const trackingId = order?.tracking_id || order?.trackingId || null;
  const courier = order?.courier_name || order?.courier || null;
  const expected = formatDate(order?.expected_delivery_date || order?.expectedDelivery || order?.eta);
  const createdAt = formatDateTime(order?.order_date || order?.created_at || order?.updated_at);
  const artwork = getOrderArtwork(order);
  const orderId = order?._id || order?.id || null;
  const currentStepLabel = STATUS_STEPS[stepIndex]?.label || STATUS_STEPS[0].label;

  return (
    <div className="rounded-[28px] border border-amber-100 bg-[#fffdf8] p-4 shadow-[0_18px_50px_rgba(234,179,8,0.08)] md:p-5">
      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[1.15fr_0.7fr] xl:items-start xl:gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-[22px] border border-amber-100 bg-amber-50 shadow-[0_10px_24px_rgba(234,179,8,0.08)] md:h-36 md:w-36">
            {artwork.imageUrl ? (
              <img
                src={getImageUrl(artwork.imageUrl)}
                alt={artwork.title}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = 'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg';
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(255,248,220,1),rgba(255,255,255,1))] text-amber-400">
                <div className="flex flex-col items-center gap-2">
                  <BadgeInfo className="h-8 w-8" />
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-500">Preview</span>
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-3 pt-1">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-amber-500">Artwork</p>
              <h4 className="mt-1 text-[clamp(1.4rem,2vw,2.15rem)] font-semibold leading-tight text-slate-900">{artwork.title}</h4>
              <p className="mt-1 text-sm text-slate-500">{artwork.medium || 'Order Placed'}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-600">
                {currentStepLabel}
              </span>
              {trackingId ? (
                <span className="rounded-full border border-amber-100 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
                  Tracking {trackingId}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-3 rounded-[18px] border border-amber-100 bg-white px-4 py-3 shadow-[0_8px_20px_rgba(234,179,8,0.05)]">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-amber-50 text-amber-500">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-500">Shipment tracker</p>
                <p className="text-sm text-slate-600">Track your order in real time</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-[24px] border border-amber-100 bg-white p-4 text-sm text-slate-600 shadow-[0_8px_24px_rgba(234,179,8,0.05)] xl:self-start">
          <div>
            <span className="text-slate-400">Order ID: </span>
            <span className="font-mono text-slate-900">{orderId || 'Pending'}</span>
          </div>
          <div>
            <span className="text-slate-400">Courier: </span>
            <span className={courier ? 'text-amber-600' : 'text-slate-400'}>{courier || 'Assigned soon'}</span>
          </div>
          <div>
            <span className="text-slate-400">ETA: </span>
            <span className={expected ? 'text-amber-600' : 'text-slate-400'}>{expected || 'Not available yet'}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border border-amber-100 bg-white p-4 shadow-[0_10px_30px_rgba(234,179,8,0.05)] md:p-5">
        <div className="relative overflow-x-auto pb-3">
          <div className="absolute left-6 right-6 top-[1.55rem] h-1.5 rounded-full bg-amber-100" />
          <motion.div
            className="absolute left-6 top-[1.55rem] h-1.5 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ ease: 'easeOut', duration: 0.9 }}
            style={{
              background: 'linear-gradient(90deg, rgba(245,158,11,0.95) 0%, rgba(251,191,36,0.95) 65%, rgba(255,255,255,1) 100%)',
              boxShadow: '0 0 20px rgba(245,158,11,0.25)',
            }}
          />

          <div className="relative flex min-w-max items-start gap-1 px-2 pt-1">
            {STATUS_STEPS.map((step, index) => (
              <StepNode key={step.label} step={step} index={index} activeIndex={stepIndex} />
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-amber-500 shadow-sm">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.26em] text-amber-500">Progress</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{Math.round(progressPercent)}% complete</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-amber-500 shadow-sm">
                <BadgeInfo className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.26em] text-amber-500">Current stage</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{currentStepLabel}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-amber-500 shadow-sm">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.26em] text-amber-500">Tracking status</p>
                <p className={`mt-1 text-sm font-medium ${courier || trackingId || expected ? 'text-slate-900' : 'text-slate-500'}`}>
                  {courier || trackingId || expected ? 'Live shipment details available' : 'Shipment details pending'}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-amber-500 shadow-sm">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.26em] text-amber-500">Order date</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{createdAt || 'Not available'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function OrderTrackingBar({ orderId, order: initialOrder = null, pollInterval = 8000, socket = null }) {
  const { socket: contextSocket, connected } = useSocket();
  const activeSocket = socket || contextSocket;

  const [order, setOrder] = useState(initialOrder);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    setOrder(initialOrder || null);
  }, [initialOrder]);

  const fetchOrder = async (id) => {
    try {
      setError(null);
      const resp = await api.request(`/orders/${id}`);
      if (!mounted.current) return;
      setOrder(resp?.order || resp || null);
    } catch (e) {
      if (!mounted.current) return;
      setError(e.message || 'Failed to fetch order');
    }
  };

  useEffect(() => {
    if (!orderId || initialOrder) return undefined;
    fetchOrder(orderId);

    if (activeSocket && connected) {
      return undefined;
    }

    const id = setInterval(() => fetchOrder(orderId), pollInterval);
    return () => clearInterval(id);
  }, [orderId, pollInterval, activeSocket, connected, initialOrder]);

  useEffect(() => {
    if (!activeSocket || !orderId || initialOrder) return undefined;

    try {
      activeSocket.emit('joinOrderRoom', orderId);
    } catch (e) {
      // ignore
    }

    const handler = (data) => {
      if (!data) return;
      const payloadId = data.orderId || data._id || data.id;
      if (String(payloadId) !== String(orderId)) return;

      const hasStatus = Object.prototype.hasOwnProperty.call(data, 'status') || Object.prototype.hasOwnProperty.call(data, 'delivery_status');
      const hasTracking = Object.prototype.hasOwnProperty.call(data, 'tracking_id') || Object.prototype.hasOwnProperty.call(data, 'courier_name');

      if (hasStatus || hasTracking) {
        setOrder((prev) => ({
          ...(prev || {}),
          status: data.status ?? prev?.status,
          delivery_status: data.delivery_status ?? prev?.delivery_status,
          tracking_id: data.tracking_id ?? prev?.tracking_id,
          trackingId: data.tracking_id ?? prev?.trackingId,
          courier_name: data.courier_name ?? prev?.courier_name,
          updated_at: data.updated_at ?? prev?.updated_at,
        }));
      } else {
        fetchOrder(orderId);
      }
    };

    activeSocket.on('order.updated', handler);

    return () => {
      try {
        activeSocket.emit('leaveOrderRoom', orderId);
      } catch (e) {
        // ignore
      }
      activeSocket.off('order.updated', handler);
    };
  }, [activeSocket, orderId, initialOrder]);

  if (error && !order) {
    return <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>;
  }

  return <TimelineCard order={order} />;
}
