// ===== Customers Page Controller =====
const CustomersPage = {
    customers: [],
    currentCustomerId: null,
    isEditMode: false,

    // Initialize customers page
    async init() {
        await this.loadCustomers();
        this.setupEventListeners();
    },

    // Load customers from API
    async loadCustomers() {
        try {
            const customers = await api.customers.getAll();
            this.customers = customers;
            this.renderCustomersTable(customers);
            this.updateStats();
        } catch (error) {
            console.error('Error loading customers:', error);
            this.customers = [];
        }
    },

    // Render customers table
    renderCustomersTable(customers) {
        const tbody = document.getElementById('customersList');
        if (!tbody) return;

        if (customers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                        ยังไม่มีข้อมูลลูกค้า คลิก "+ เพิ่มลูกค้าใหม่" เพื่อเพิ่มลูกค้า
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = customers.map(customer => {
            const typeLabel = customer.customerType === 'company' ? 'นิติบุคคล' : 'บุคคลทั่วไป';
            const typeBadge = customer.customerType === 'company' ? 'badge-company' : 'badge-individual';

            return `
                <tr data-id="${customer._id}">
                    <td>${customer._id.slice(-6).toUpperCase()}</td>
                    <td>${customer.name}</td>
                    <td><span class="badge ${typeBadge}">${typeLabel}</span></td>
                    <td>${customer.phone || '-'}</td>
                    <td>${customer.email || '-'}</td>
                    <td>${customer.address || '-'}</td>
                    <td>${customer.totalProjects || 0}</td>
                    <td>
                        <button class="btn-icon edit-btn" title="แก้ไข" data-id="${customer._id}">✏️</button>
                        <button class="btn-icon delete-btn" title="ลบ" data-id="${customer._id}">🗑️</button>
                        <button class="btn-icon view-btn" title="ดูรายละเอียด" data-id="${customer._id}">👁️</button>
                    </td>
                </tr>
            `;
        }).join('');

        this.attachRowEventListeners();
    },

    // Attach event listeners to table row buttons
    attachRowEventListeners() {
        document.querySelectorAll('#customersList .edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleEdit(e.currentTarget.dataset.id);
            });
        });

        document.querySelectorAll('#customersList .delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteCustomer(e.target.dataset.id);
            });
        });

        document.querySelectorAll('#customersList .view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.viewCustomer(e.target.dataset.id);
            });
        });
    },

    // Update stats cards
    updateStats() {
        const total = this.customers.length;
        const companies = this.customers.filter(c => c.customerType === 'company').length;
        const thisMonth = this.customers.filter(c => {
            const created = new Date(c.createdAt);
            const now = new Date();
            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        }).length;

        const statCards = document.querySelectorAll('.stat-card .stat-info h3');
        if (statCards.length >= 3) {
            statCards[0].textContent = total;
            statCards[1].textContent = companies;
            statCards[2].textContent = thisMonth;
        }
    },

    // Setup event listeners
    setupEventListeners() {
        const addCustomerBtn = document.getElementById('addCustomerBtn');
        if (addCustomerBtn) {
            addCustomerBtn.addEventListener('click', () => {
                this.openAddModal();
            });
        }

        const cancelAddCustomer = document.getElementById('cancelAddCustomer');
        if (cancelAddCustomer) {
            cancelAddCustomer.addEventListener('click', () => {
                closeModal('addCustomerModal');
            });
        }

        // Add Customer Form
        const addCustomerForm = document.getElementById('addCustomerForm');
        if (addCustomerForm) {
            addCustomerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveCustomer();
            });
        }

        // Customer Type toggle
        const customerType = document.getElementById('customerType');
        const companyFields = document.getElementById('companyFields');
        if (customerType && companyFields) {
            customerType.addEventListener('change', function() {
                companyFields.style.display = this.value === 'company' ? 'block' : 'none';
            });
        }

        // Search and Filter
        const searchInput = document.getElementById('searchCustomer');
        const filterType = document.getElementById('filterCustomerType');

        [searchInput, filterType].forEach(el => {
            el?.addEventListener('input', () => this.filterCustomers());
            el?.addEventListener('change', () => this.filterCustomers());
        });
    },

    updateModalUI() {
        const modalTitle = document.querySelector('#addCustomerModal h2');
        if (modalTitle) {
            modalTitle.textContent = this.isEditMode ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่';
        }
    },

    resetForm() {
        document.getElementById('addCustomerForm')?.reset();
        const companyFields = document.getElementById('companyFields');
        if (companyFields) {
            companyFields.style.display = 'none';
        }
    },

    openAddModal() {
        this.currentCustomerId = null;
        this.isEditMode = false;
        this.resetForm();
        this.updateModalUI();
        openModal('addCustomerModal');
    },

    // Save customer (create or update)
    async saveCustomer() {
        const formData = {
            customerType: document.getElementById('customerType')?.value || 'individual',
            name: document.getElementById('customerName')?.value,
            companyName: document.getElementById('companyName')?.value,
            taxId: document.getElementById('taxId')?.value,
            phone: document.getElementById('customerPhone')?.value,
            email: document.getElementById('customerEmail')?.value,
            address: document.getElementById('customerAddress')?.value,
            notes: document.getElementById('customerNotes')?.value
        };

        try {
            if (this.isEditMode && this.currentCustomerId) {
                await api.customers.update(this.currentCustomerId, formData);
                alert('แก้ไขข้อมูลลูกค้าเรียบร้อย');
            } else {
                await api.customers.create(formData);
                alert('เพิ่มลูกค้าเรียบร้อย');
            }
            
            closeModal('addCustomerModal');
            this.resetForm();
            this.currentCustomerId = null;
            this.isEditMode = false;
            this.updateModalUI();
            await this.loadCustomers();
        } catch (error) {
            console.error('Error saving customer:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
        }
    },

    // Edit customer
    handleEdit(id) {
        const customer = this.customers.find(c => c._id === id);
        if (!customer) return;

        this.currentCustomerId = id;
        this.isEditMode = true;
        this.updateModalUI();

        // Fill form with customer data
        document.getElementById('customerType').value = customer.customerType || 'individual';
        document.getElementById('customerName').value = customer.name || '';
        document.getElementById('companyName').value = customer.companyName || '';
        document.getElementById('taxId').value = customer.taxId || '';
        document.getElementById('customerPhone').value = customer.phone || '';
        document.getElementById('customerEmail').value = customer.email || '';
        document.getElementById('customerAddress').value = customer.address || '';
        document.getElementById('customerNotes').value = customer.notes || '';

        // Show company fields if company type
        const companyFields = document.getElementById('companyFields');
        if (companyFields) {
            companyFields.style.display = customer.customerType === 'company' ? 'block' : 'none';
        }

        openModal('addCustomerModal');
    },

    // Delete customer
    async deleteCustomer(id) {
        if (!confirm('ต้องการลบข้อมูลลูกค้านี้หรือไม่?')) return;

        try {
            await api.customers.delete(id);
            alert('ลบข้อมูลลูกค้าเรียบร้อย');
            await this.loadCustomers();
        } catch (error) {
            console.error('Error deleting customer:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
        }
    },

    // View customer details
    viewCustomer(id) {
        const customer = this.customers.find(c => c._id === id);
        if (!customer) return;

        const details = [
            `ชื่อ: ${customer.name}`,
            `ประเภท: ${customer.customerType === 'company' ? 'นิติบุคคล' : 'บุคคลทั่วไป'}`,
            customer.companyName ? `บริษัท: ${customer.companyName}` : '',
            `โทร: ${customer.phone || '-'}`,
            `อีเมล: ${customer.email || '-'}`,
            `ที่อยู่: ${customer.address || '-'}`,
            `โครงการทั้งหมด: ${customer.totalProjects || 0}`,
            `ยอดใช้จ่าย: ฿${(customer.totalSpent || 0).toLocaleString('th-TH')}`
        ].filter(Boolean).join('\n');

        alert(`รายละเอียดลูกค้า:\n\n${details}`);
    },

    // Filter customers
    filterCustomers() {
        const search = document.getElementById('searchCustomer')?.value.toLowerCase() || '';
        const type = document.getElementById('filterCustomerType')?.value || 'all';

        const filtered = this.customers.filter(customer => {
            const matchSearch = customer.name.toLowerCase().includes(search) ||
                               (customer.phone || '').includes(search) ||
                               (customer.email || '').toLowerCase().includes(search);
            const matchType = type === 'all' || customer.customerType === type;
            
            return matchSearch && matchType;
        });

        this.renderCustomersTable(filtered);
    },

    // Export to Excel
    exportToExcel() {
        const data = this.customers.map(c => ({
            'รหัสลูกค้า': c._id.slice(-6).toUpperCase(),
            'ชื่อ': c.name,
            'ประเภท': c.customerType === 'company' ? 'นิติบุคคล' : 'บุคคลทั่วไป',
            'บริษัท': c.companyName || '-',
            'เลขผู้เสียภาษี': c.taxId || '-',
            'โทรศัพท์': c.phone || '-',
            'อีเมล': c.email || '-',
            'ที่อยู่': c.address || '-',
            'โครงการทั้งหมด': c.totalProjects || 0,
            'ยอดใช้จ่ายรวม': c.totalSpent || 0
        }));

        ExportUtils.exportToExcel(data, 'customers');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('addCustomerBtn')) {
        CustomersPage.init();
    }
});
