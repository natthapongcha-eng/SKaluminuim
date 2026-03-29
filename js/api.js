// ===== API Configuration =====
const API_BASE_URL = '/api';

// ===== API Service =====
const api = {
    // Generic fetch wrapper
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
        const headers = {
            ...(options.headers || {})
        };

        if (!isFormData && !Object.prototype.hasOwnProperty.call(headers, 'Content-Type')) {
            headers['Content-Type'] = 'application/json';
        }

        const config = {
            ...options,
            headers
        };
        
        try {
            const response = await fetch(url, config);
            const contentType = response.headers.get('content-type') || '';
            const isJson = contentType.includes('application/json');
            const data = isJson ? await response.json() : await response.text();
            
            if (!response.ok) {
                const fallbackMessage = typeof data === 'string'
                    ? data
                    : `API request failed (${response.status})`;
                const apiError = new Error(data?.message || fallbackMessage || 'API request failed');
                apiError.response = {
                    status: response.status,
                    data: isJson ? data : { message: fallbackMessage }
                };
                apiError.status = response.status;
                throw apiError;
            }

            if (!isJson) {
                throw new Error(`API returned non-JSON response (${response.status})`);
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    // ===== Auth =====
    auth: {
        async login(email, password, role) {
            return api.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password, role })
            });
        },
        async getProfile(userId) {
            return api.request(`/auth/profile/${userId}`);
        },
        async getProfileByEmail(email, role) {
            return api.request('/auth/profile-by-email', {
                method: 'POST',
                body: JSON.stringify({ email, role })
            });
        },
        async updateProfile(userId, profileData) {
            return api.request(`/auth/profile/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });
        },
        async updateProfileByEmail(email, role, profileData) {
            return api.request('/auth/profile-by-email', {
                method: 'PUT',
                body: JSON.stringify({ email, role, ...profileData })
            });
        },
        async getUsers() {
            return api.request('/auth/users');
        },
        async createUser(userData) {
            return api.request('/auth/users', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
        }
    },
    
    // ===== Inventory =====
    inventory: {
        async getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.request(`/inventory${query ? '?' + query : ''}`);
        },
        async getById(id) {
            return api.request(`/inventory/${id}`);
        },
        async create(itemData) {
            return api.request('/inventory', {
                method: 'POST',
                body: JSON.stringify(itemData)
            });
        },
        async update(id, itemData) {
            return api.request(`/inventory/${id}`, {
                method: 'PUT',
                body: JSON.stringify(itemData)
            });
        },
        async delete(id) {
            return api.request(`/inventory/${id}`, {
                method: 'DELETE'
            });
        },
        async stockIn(id, data) {
            return api.request(`/inventory/${id}/stock-in`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },
        async stockOut(id, data) {
            return api.request(`/inventory/${id}/stock-out`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },
        async getStats() {
            return api.request('/inventory/stats/summary');
        }
    },
    
    // ===== Projects =====
    projects: {
        async getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.request(`/projects${query ? '?' + query : ''}`);
        },
        async getById(id) {
            return api.request(`/projects/${id}`);
        },
        async create(projectData) {
            return api.request('/projects', {
                method: 'POST',
                body: JSON.stringify(projectData)
            });
        },
        async update(id, projectData) {
            return api.request(`/projects/${id}`, {
                method: 'PUT',
                body: JSON.stringify(projectData)
            });
        },
        async updateStatus(id, statusData) {
            try {
                return await api.request(`/projects/${id}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify(statusData)
                });
            } catch (error) {
                const message = String(error?.message || '');
                const isMissingEndpoint = message.includes('API endpoint not found')
                    || message.includes('/status')
                    || message.includes('(404)');

                if (!isMissingEndpoint) {
                    throw error;
                }

                const fallbackPayload = {
                    status: statusData?.status,
                    paymentStatus: statusData?.paymentStatus,
                    userId: statusData?.userId,
                    createdByName: statusData?.createdByName
                };

                const updated = await api.request(`/projects/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(fallbackPayload)
                });
                if (updated && typeof updated === 'object') {
                    updated.__fallbackUsed = true;
                }
                return updated;
            }
        },
        async cancel(id, payload = {}) {
            try {
                return await api.request(`/projects/${id}/cancel`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload)
                });
            } catch (error) {
                const message = String(error?.message || '');
                const isMissingEndpoint = message.includes('API endpoint not found')
                    || message.includes('/cancel')
                    || message.includes('(404)');

                if (!isMissingEndpoint) {
                    throw error;
                }

                const updated = await api.request(`/projects/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        status: 'cancelled',
                        userId: payload?.userId,
                        createdByName: payload?.createdByName
                    })
                });
                if (updated && typeof updated === 'object') {
                    updated.__fallbackUsed = true;
                }
                return updated;
            }
        },
        async delete(id) {
            return api.request(`/projects/${id}`, {
                method: 'DELETE'
            });
        },
        async getStats() {
            return api.request('/projects/stats/summary');
        }
    },
    
    // ===== Customers =====
    customers: {
        async getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.request(`/customers${query ? '?' + query : ''}`);
        },
        async getById(id) {
            return api.request(`/customers/${id}`);
        },
        async create(customerData) {
            return api.request('/customers', {
                method: 'POST',
                body: JSON.stringify(customerData)
            });
        },
        async update(id, customerData) {
            return api.request(`/customers/${id}`, {
                method: 'PUT',
                body: JSON.stringify(customerData)
            });
        },
        async delete(id) {
            return api.request(`/customers/${id}`, {
                method: 'DELETE'
            });
        },
        async getStats() {
            return api.request('/customers/stats/summary');
        }
    },
    
    // ===== Quotations =====
    quotations: {
        async getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.request(`/quotations${query ? '?' + query : ''}`);
        },
        async getById(id) {
            return api.request(`/quotations/${id}`);
        },
        async getNextNumber() {
            return api.request('/quotations/next/number');
        },
        async create(quotationData) {
            return api.request('/quotations', {
                method: 'POST',
                body: JSON.stringify(quotationData)
            });
        },
        async update(id, quotationData) {
            return api.request(`/quotations/${id}`, {
                method: 'PUT',
                body: JSON.stringify(quotationData)
            });
        },
        async delete(id) {
            return api.request(`/quotations/${id}`, {
                method: 'DELETE'
            });
        },
        async getStats() {
            return api.request('/quotations/stats/summary');
        }
    },
    
    // ===== Attendance =====
    attendance: {
        async getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.request(`/attendance${query ? '?' + query : ''}`);
        },
        async getDay(date, actor = {}) {
            const query = new URLSearchParams({
                date,
                actorId: actor.id || '',
                actorRole: actor.role || ''
            }).toString();
            return api.request(`/attendance/day?${query}`);
        },
        async getAvailableEmployees(date, actor = {}) {
            const query = new URLSearchParams({
                date,
                actorId: actor.id || '',
                actorRole: actor.role || ''
            }).toString();
            return api.request(`/attendance/employees/available?${query}`);
        },
        async checkIn(employeeId, employeeName, note = '', date, actor = {}) {
            return api.request('/attendance/check-in', {
                method: 'POST',
                body: JSON.stringify({
                    employeeId,
                    employeeName,
                    note,
                    date,
                    actorId: actor.id,
                    actorRole: actor.role,
                    actorName: actor.name || actor.email || ''
                })
            });
        },
        async checkOut(employeeId, note = '', date, actor = {}) {
            return api.request('/attendance/check-out', {
                method: 'POST',
                body: JSON.stringify({
                    employeeId,
                    note,
                    date,
                    actorId: actor.id,
                    actorRole: actor.role,
                    actorName: actor.name || actor.email || ''
                })
            });
        },
        async updateCheckout(recordId, checkOutTime, note = '', actor = {}) {
            return api.request(`/attendance/${recordId}/checkout`, {
                method: 'PUT',
                body: JSON.stringify({
                    checkOutTime,
                    note,
                    actorId: actor.id,
                    actorRole: actor.role,
                    actorName: actor.name || actor.email || ''
                })
            });
        },
        async updateTimes(recordId, payload = {}) {
            const actor = payload.actor || {};
            return api.request(`/attendance/${recordId}/time`, {
                method: 'PUT',
                body: JSON.stringify({
                    checkIn: payload.checkInTime,
                    checkOut: payload.checkOutTime,
                    checkInTime: payload.checkInTime,
                    checkOutTime: payload.checkOutTime,
                    note: payload.note || '',
                    actorId: actor.id,
                    actorRole: actor.role,
                    actorName: actor.name || actor.email || ''
                })
            });
        },
        async deleteRecord(recordId, actor = {}) {
            const query = new URLSearchParams({
                actorId: actor.id || '',
                actorRole: actor.role || ''
            }).toString();
            return api.request(`/attendance/${recordId}?${query}`, {
                method: 'DELETE'
            });
        },
        async getToday(userId) {
            return api.request(`/attendance/today/${userId}`);
        },
        async getStats(params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.request(`/attendance/stats/summary${query ? '?' + query : ''}`);
        },
        async getCalendarSummary(month, actor = {}) {
            const query = new URLSearchParams({
                month,
                actorId: actor.id || '',
                actorRole: actor.role || ''
            }).toString();
            return api.request(`/attendance/calendar/summary?${query}`);
        }
    },
    
    // ===== Reports =====
    reports: {
        async getDashboard() {
            return api.request('/reports/dashboard');
        },
        async getSales(params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.request(`/reports/sales${query ? '?' + query : ''}`);
        },
        async getInventory() {
            return api.request('/reports/inventory');
        },
        async getProjects(params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.request(`/reports/projects${query ? '?' + query : ''}`);
        },
        async getAttendance(params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.request(`/reports/attendance${query ? '?' + query : ''}`);
        },
        async getStockMovements(params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.request(`/reports/stock-movements${query ? '?' + query : ''}`);
        }
    },

    // ===== Announcement =====
    announcement: {
        async getCurrent() {
            return api.request('/announcement');
        },
        async publish(content, createdBy = 'CEO', startAt, endAt) {
            return api.request('/announcement', {
                method: 'POST',
                body: JSON.stringify({ content, createdBy, startAt, endAt })
            });
        },
        async clear() {
            return api.request('/announcement', {
                method: 'DELETE'
            });
        },
        async deleteById(id) {
            return api.request(`/announcement/${id}`, {
                method: 'DELETE'
            });
        },
        async getHistory() {
            return api.request('/announcement/history');
        }
    },
    
    // ===== Status =====
    async getStatus() {
        return api.request('/status');
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
}
