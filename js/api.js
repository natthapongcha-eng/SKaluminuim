// ===== API Configuration =====
const API_BASE_URL = 'http://localhost:8080/api';

// ===== API Service =====
const api = {
    // Generic fetch wrapper
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        };
        
        try {
            const response = await fetch(url, config);
            const contentType = response.headers.get('content-type') || '';
            const isJson = contentType.includes('application/json');
            const data = isJson ? await response.json() : await response.text();
            
            if (!response.ok) {
                const fallbackMessage = typeof data === 'string'
                    ? `API request failed (${response.status})`
                    : 'API request failed';
                throw new Error(data?.message || fallbackMessage);
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
        async checkIn(userId, userName, note = '') {
            return api.request('/attendance/check-in', {
                method: 'POST',
                body: JSON.stringify({ userId, userName, note })
            });
        },
        async checkOut(userId, note = '') {
            return api.request('/attendance/check-out', {
                method: 'POST',
                body: JSON.stringify({ userId, note })
            });
        },
        async getToday(userId) {
            return api.request(`/attendance/today/${userId}`);
        },
        async getStats(params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.request(`/attendance/stats/summary${query ? '?' + query : ''}`);
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
        async publish(content, createdBy = 'CEO') {
            return api.request('/announcement', {
                method: 'POST',
                body: JSON.stringify({ content, createdBy })
            });
        },
        async clear() {
            return api.request('/announcement', {
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
