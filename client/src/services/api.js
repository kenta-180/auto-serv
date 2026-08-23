let cachedWorkingBase = null;

export const getApiBase = () => {
  if (cachedWorkingBase) return cachedWorkingBase;
  if (typeof window !== 'undefined' && window.localStorage?.getItem('custom_api_url')) {
    const custom = window.localStorage.getItem('custom_api_url');
    if (custom) return custom;
  }
  if (import.meta.env?.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window === 'undefined') return 'http://127.0.0.1:5000/api';
  
  const { hostname, origin, port } = window.location;

  // 1. Capacitor Android / Mobile / Dev Server default base URL
  if (typeof window !== 'undefined' && typeof window.Capacitor !== 'undefined') {
    return 'https://newly-acting-pockets-gates.trycloudflare.com/api';
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:5000/api';
  }

  // 2. Same-origin if served directly from Express backend on port 5000
  if (port === '5000') {
    return `${origin}/api`;
  }

  // 3. Local Network IP (e.g. 192.168.x.x) or any local hostname
  return `http://${hostname}:5000/api`;
};

export const API_BASE = getApiBase();

/**
 * Resilient Fetch Engine — Instant Working Base Memory & Multi-Endpoint Failover
 */
const isValidApiResponse = (res) => {
  if (!res) return false;
  if (res.status === 204 || res.status === 304) return true;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html')) return false;
  if (contentType.includes('application/json') || contentType.includes('json')) return true;
  return res.ok || (res.status >= 200 && res.status < 500);
};

const createTimeoutSignal = (callerSignal, timeoutMs = 5000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException(`Request timed out after ${timeoutMs}ms`, 'TimeoutError'));
  }, timeoutMs);

  if (callerSignal) {
    if (callerSignal.aborted) {
      clearTimeout(timeoutId);
      controller.abort(callerSignal.reason);
    } else {
      callerSignal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        controller.abort(callerSignal.reason);
      }, { once: true });
    }
  }

  return { signal: controller.signal, cleanup: () => clearTimeout(timeoutId) };
};

if (typeof window !== 'undefined' && !window.__resilientFetchMonkeyPatched) {
  window.__resilientFetchMonkeyPatched = true;
  const originalFetch = window.fetch;

  window.fetch = async function (resource, config) {
    const resourceUrl = typeof resource === 'string' ? resource : resource?.url;

    if (resourceUrl && resourceUrl.includes('/api/')) {
      const apiPath = resourceUrl.substring(resourceUrl.indexOf('/api/'));
      const primaryBase = cachedWorkingBase || getApiBase();
      const primaryTargetUrl = `${primaryBase.replace(/\/api$/, '')}${apiPath}`;

      // 1. Try Primary / Cached Working Base First (1.8s timeout for fast failover)
      const primaryTimeout = createTimeoutSignal(config?.signal, 1800);
      try {
        const options = { ...config, signal: primaryTimeout.signal };

        const response = await originalFetch(primaryTargetUrl, options);
        primaryTimeout.cleanup();

        if (isValidApiResponse(response)) {
          cachedWorkingBase = primaryBase;
          return response;
        }
      } catch (err) {
        primaryTimeout.cleanup();
        cachedWorkingBase = null;
        if (typeof window !== 'undefined' && window.localStorage?.getItem('custom_api_url') === primaryBase) {
          window.localStorage.removeItem('custom_api_url');
        }
      }

      // 2. Parallel Race Failover Engine (Fires all candidate endpoints simultaneously)
      const { hostname, origin } = window.location;
      const candidateBases = Array.from(new Set([
        'http://192.168.0.105:5000/api',
        'https://newly-acting-pockets-gates.trycloudflare.com/api',
        'http://127.0.0.1:5000/api',
        'http://localhost:5000/api',
        (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') ? `http://${hostname}:5000/api` : null,
        'http://10.0.2.2:5000/api',
        `${origin}/api`
      ].filter(Boolean)));

      try {
        const winner = await Promise.any(
          candidateBases.map(async (base) => {
            const targetUrl = `${base.replace(/\/api$/, '')}${apiPath}`;
            const candidateTimeout = createTimeoutSignal(config?.signal, 2500);

            try {
              const options = { ...config, signal: candidateTimeout.signal };
              const response = await originalFetch(targetUrl, options);
              candidateTimeout.cleanup();

              if (isValidApiResponse(response)) {
                return { base, response };
              }
            } catch (e) {
              candidateTimeout.cleanup();
            }
            throw new Error(`Endpoint ${base} failed`);
          })
        );

        cachedWorkingBase = winner.base;
        return winner.response;
      } catch (aggregateErr) {
        throw new Error('Server request timed out. Please check backend connection.');
      }
    }

    return originalFetch(resource, config);
  };
}

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

export const api = {
  // Auth — Twilio Verify OTP Integration
  sendOtp: async (phone) => {
    const res = await fetch(`${getApiBase()}/auth/phone/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send OTP via Twilio Verify');
    return data;
  },

  verifyOtp: async (phone, otp) => {
    const res = await fetch(`${getApiBase()}/auth/phone/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, code: otp })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid OTP verification code');
    return data;
  },

  verifyFirebaseToken: async (idToken, phone) => {
    const res = await fetch(`${getApiBase()}/auth/verify-firebase-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, phone })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server-side Firebase token verification failed');
    return data;
  },


  login: async (identifier, password) => {
    const res = await fetch(`${getApiBase()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ identifier, email: identifier, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid credentials');
    return data;
  },

  register: async (user) => {
    const res = await fetch(`${getApiBase()}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(user)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
  },

  logout: async () => {
    try {
      await fetch(`${getApiBase()}/auth/logout`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include'
      });
    } catch (e) {
      // Ignore network failures on logout
    }
  },

  getMe: async () => {
    const res = await fetch(`${getApiBase()}/auth/me`, { headers: getHeaders(), credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  },

  // Vehicles
  getVehicles: async () => {
    try {
      const res = await fetch(`${getApiBase()}/vehicles`, { headers: getHeaders(), credentials: 'include' });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  },
  createVehicle: async (vehicleData) => {
    const res = await fetch(`${getApiBase()}/vehicles`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(vehicleData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create vehicle');
    return data;
  },
  deleteVehicle: async (id) => {
    const res = await fetch(`${getApiBase()}/vehicles/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete vehicle');
    return data;
  },

  // Job Cards
  getJobCards: async () => {
    try {
      const res = await fetch(`${getApiBase()}/job-cards`, { headers: getHeaders(), credentials: 'include' });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  },
  getJobCardById: async (id) => {
    const res = await fetch(`${getApiBase()}/job-cards/${id}`, { headers: getHeaders() });
    return res.json();
  },
  createJobCard: async (cardData) => {
    const res = await fetch(`${getApiBase()}/job-cards`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(cardData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create job card');
    return data;
  },

  // Step 2 Methods
  recordInspection: async (id, media) => {
    const res = await fetch(`${getApiBase()}/job-cards/${id}/inspection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify({ media })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to record inspection');
    return data;
  },

  createEstimate: async (id, tasks, partEstimates) => {
    const res = await fetch(`${getApiBase()}/job-cards/${id}/estimate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ tasks, partEstimates })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create estimate');
    return data;
  },

  approveEstimate: async (id, approvalNotes) => {
    const res = await fetch(`${getApiBase()}/job-cards/${id}/approve-estimate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ approvalNotes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to approve estimate');
    return data;
  },

  // Step 3 Methods
  assignTechnician: async (id, technicianId) => {
    const res = await fetch(`${getApiBase()}/job-cards/${id}/assign`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ technicianId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to assign technician');
    return data;
  },

  checkoutParts: async (id, parts) => {
    const res = await fetch(`${getApiBase()}/job-cards/${id}/parts/checkout`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ parts })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to checkout inventory parts');
    return data;
  },

  // Step 4 Methods
  startJob: async (id) => {
    const res = await fetch(`${getApiBase()}/job-cards/${id}/start`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to start repair work');
    return data;
  },

  markUnfinished: async (id, reason) => {
    const res = await fetch(`${getApiBase()}/job-cards/${id}/unfinished`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to mark job card unfinished');
    return data;
  },

  addProgressMedia: async (id, url, caption) => {
    const res = await fetch(`${getApiBase()}/job-cards/${id}/media`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ url, caption })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add progress media');
    return data;
  },

  // Step 5 Methods
  recordQC: async (id, pass, notes, checklist) => {
    const res = await fetch(`${getApiBase()}/job-cards/${id}/qc`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ pass, notes, checklist })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to record QC inspection');
    return data;
  },

  getFinalBill: async (id) => {
    const res = await fetch(`${getApiBase()}/job-cards/${id}/final-bill`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch computed final bill');
    return data;
  },

  // Step 6 Methods
  createInvoice: async (jobCardId, taxRate = 10.0) => {
    const res = await fetch(`${getApiBase()}/job-cards/${jobCardId}/invoice`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ taxRate })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate frozen invoice');
    return data;
  },

  getPublicInvoice: async (invoiceId, token) => {
    const url = token ? `${getApiBase()}/invoices/public/${invoiceId}?token=${encodeURIComponent(token)}` : `${getApiBase()}/invoices/public/${invoiceId}`;
    const res = await fetch(url, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch invoice details');
    return data;
  },

  getPublicGallery: async (jobCardId, token) => {
    const url = token ? `${getApiBase()}/job-cards/public-gallery/${jobCardId}?token=${encodeURIComponent(token)}` : `${getApiBase()}/job-cards/public-gallery/${jobCardId}`;
    const res = await fetch(url, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch customer photo gallery');
    return data;
  },

  sendInvoiceWhatsApp: async (invoiceId) => {
    const res = await fetch(`${getApiBase()}/invoices/${invoiceId}/send-whatsapp`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send WhatsApp invoice');
    return data;
  },

  createCheckoutSession: async (invoiceId, jobCardId, token) => {
    const res = await fetch(`${getApiBase()}/payments/checkout-session`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ invoiceId, jobCardId, token })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create checkout session');
    return data;
  },

  handlePaymentWebhook: async (invoiceId, signature, transactionReference, paymentMethod = 'UPI_RAZORPAY') => {
    const res = await fetch(`${getApiBase()}/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId, signature, transactionReference, paymentMethod, event: 'payment.authorized' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Payment webhook verification failed');
    return data;
  },

  markPaidCash: async (jobCardId, notes) => {
    const res = await fetch(`${getApiBase()}/job-cards/${jobCardId}/mark-paid-cash`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to record manual cash payment');
    return data;
  },

  downloadInvoicePDF: (jobCardId) => {
    const token = localStorage.getItem('token');
    const url = `${getApiBase()}/job-cards/${jobCardId}/invoice-pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    window.open(url, '_blank');
  },

  // Step 7 Methods
  deliverVehicle: async (id) => {
    const res = await fetch(`${getApiBase()}/job-cards/${id}/deliver`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to complete vehicle delivery');
    return data;
  },

  deliverJobCard: async (id) => {
    const res = await fetch(`${getApiBase()}/job-cards/${id}/deliver`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to complete vehicle delivery');
    return data;
  },

  updateJobStatus: async (id, status, technicianId, laborCost, notes) => {
    const res = await fetch(`${getApiBase()}/job-cards/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, technicianId, laborCost, notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update status');
    return data;
  },
  addPartToJobCard: async (id, inventoryItemId, quantity) => {
    const res = await fetch(`${getApiBase()}/job-cards/${id}/parts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ inventoryItemId, quantity })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add part');
    return data;
  },

  // Inventory
  getInventory: async () => {
    try {
      const res = await fetch(`${getApiBase()}/inventory`, { headers: getHeaders(), credentials: 'include' });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  },
  createInventoryItem: async (itemData) => {
    const res = await fetch(`${getApiBase()}/inventory`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(itemData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add inventory item');
    return data;
  },
  updateStock: async (id, delta, reason) => {
    const res = await fetch(`${getApiBase()}/inventory/${id}/stock`, {
      method: 'PATCH',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ delta, reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to adjust stock');
    return data;
  },

  // Invoices
  getInvoices: async () => {
    try {
      const res = await fetch(`${getApiBase()}/invoices`, { headers: getHeaders(), credentials: 'include' });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  },
  recordPayment: async (id, paymentMethod, transactionReference) => {
    const res = await fetch(`${getApiBase()}/invoices/${id}/pay`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ paymentMethod, transactionReference })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to record payment');
    return data;
  },

  // Users & Audit Logs
  getUsers: async (role) => {
    try {
      const url = role ? `${getApiBase()}/users?role=${role}` : `${getApiBase()}/users`;
      const res = await fetch(url, { headers: getHeaders(), credentials: 'include' });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  },
  createUser: async (userData) => {
    const res = await fetch(`${getApiBase()}/users`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create user');
    return data;
  },
  getAuditLogs: async () => {
    try {
      const res = await fetch(`${getApiBase()}/audit-logs`, { headers: getHeaders(), credentials: 'include' });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  },

  // Attendance & Clock-In/Out Methods
  clockIn: async () => {
    const res = await fetch(`${getApiBase()}/attendance/clock-in`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to clock in');
    return data;
  },
  clockOut: async () => {
    const res = await fetch(`${getApiBase()}/attendance/clock-out`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to clock out');
    return data;
  },
  getTodayAttendance: async () => {
    try {
      const res = await fetch(`${getApiBase()}/attendance/today`, { headers: getHeaders(), credentials: 'include' });
      return await res.json();
    } catch (e) {
      return { clockedIn: false, clockedOut: false, record: null, hoursWorked: 0 };
    }
  },
  getAttendanceHistory: async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${getApiBase()}/attendance/history?${query}`, { headers: getHeaders(), credentials: 'include' });
      const data = await res.json();
      return data;
    } catch (e) {
      return { records: [], jobsWorkedOn: [], summary: { totalShifts: 0, totalHours: 0, presentCount: 0, lateCount: 0, absentCount: 0, leaveCount: 0 } };
    }
  },
  adminUpdateAttendance: async (dataPayload) => {
    const res = await fetch(`${getApiBase()}/attendance/admin-edit`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(dataPayload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update attendance record');
    return data;
  },

  // Per-Task Time Log Methods
  startTimeLog: async (jobCardId) => {
    const res = await fetch(`${getApiBase()}/job-cards/${jobCardId}/time-logs/start`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to start active repair timer');
    return data;
  },
  pauseTimeLog: async (jobCardId) => {
    const res = await fetch(`${getApiBase()}/job-cards/${jobCardId}/time-logs/pause`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to pause active repair timer');
    return data;
  },
  getTimeLogs: async (jobCardId) => {
    try {
      const res = await fetch(`${getApiBase()}/job-cards/${jobCardId}/time-logs`, { headers: getHeaders(), credentials: 'include' });
      return await res.json();
    } catch (e) {
      return { logs: [], totalSeconds: 0 };
    }
  },

  // Canned Note Template Methods
  getCannedNotes: async () => {
    try {
      const res = await fetch(`${getApiBase()}/canned-notes`, { headers: getHeaders(), credentials: 'include' });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  },
  createCannedNote: async (category, text) => {
    const res = await fetch(`${getApiBase()}/canned-notes`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ category, text })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create canned note template');
    return data;
  },
  deleteCannedNote: async (id) => {
    const res = await fetch(`${getApiBase()}/canned-notes/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete canned note template');
    return data;
  },

  // Booking & Slot Scheduling Methods
  getSlotsByDate: async (date) => {
    try {
      const url = date ? `${getApiBase()}/bookings/slots?date=${date}` : `${getApiBase()}/bookings/slots`;
      const res = await fetch(url, { headers: getHeaders() });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  },

  createBooking: async (bookingData) => {
    const res = await fetch(`${getApiBase()}/bookings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(bookingData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create booking');
    return data;
  },

  getCustomerBookings: async () => {
    try {
      const res = await fetch(`${getApiBase()}/bookings/my-bookings`, { headers: getHeaders() });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  },

  cancelBooking: async (id) => {
    const res = await fetch(`${getApiBase()}/bookings/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to cancel booking');
    return data;
  },

  rescheduleBooking: async (id, newSlotId) => {
    const res = await fetch(`${getApiBase()}/bookings/${id}/reschedule`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ newSlotId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reschedule booking');
    return data;
  },

  getAdminSchedule: async (date) => {
    try {
      const url = date ? `${getApiBase()}/bookings/admin/schedule?date=${date}` : `${getApiBase()}/bookings/admin/schedule`;
      const res = await fetch(url, { headers: getHeaders() });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  },

  markBookingStatus: async (id, status) => {
    const res = await fetch(`${getApiBase()}/bookings/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update booking status');
    return data;
  }
};
