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
                        <button class="btn-icon edit-btn" title="แก้ไข" data-id="${customer._id}"><i class="bi bi-pencil-square" aria-hidden="true"></i></button>
                        <button class="btn-icon delete-btn" title="ลบ" data-id="${customer._id}"><i class="bi bi-trash" aria-hidden="true"></i></button>
                        <button class="btn-icon view-btn" title="ดูรายละเอียด" data-id="${customer._id}"><i class="bi bi-eye" aria-hidden="true"></i></button>
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
                this.deleteCustomer(e.currentTarget.dataset.id);
            });
        });

        document.querySelectorAll('#customersList .view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.viewCustomer(e.currentTarget.dataset.id);
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
        document.getElementById('customerPhone').value = customer.phone || '';
        document.getElementById('customerEmail').value = customer.email || '';
        document.getElementById('customerAddress').value = customer.address || '';
        document.getElementById('customerNotes').value = customer.notes || '';


        openModal('addCustomerModal');
    },

    // Delete customer
    async deleteCustomer(id) {
        let shouldDelete = false;

        if (typeof showStyledConfirm === 'function') {
            shouldDelete = await showStyledConfirm({
                title: 'ยืนยันการลบลูกค้า',
                message: 'ต้องการลบข้อมูลลูกค้านี้หรือไม่?',
                confirmText: 'ลบข้อมูล',
                cancelText: 'ยกเลิก',
                variant: 'danger'
            });
        } else {
            shouldDelete = window.confirm('ต้องการลบข้อมูลลูกค้านี้หรือไม่?');
        }

        if (!shouldDelete) return;

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

        const typeLabel = customer.customerType === 'company' ? 'นิติบุคคล' : 'บุคคลทั่วไป';
        
        const htmlContent = `
            <div style="text-align: left; font-size: 0.95rem;">
                <div style="margin-bottom: 16px;">
                    <strong style="color: #1e40af;">ชื่อ:</strong>
                    <p style="margin: 4px 0 0 0; color: #374151;">${customer.name || '-'}</p>
                </div>
                <div style="margin-bottom: 16px;">
                    <strong style="color: #1e40af;">ประเภท:</strong>
                    <p style="margin: 4px 0 0 0; color: #374151;">${typeLabel}</p>
                </div>
                <div style="margin-bottom: 16px;">
                    <strong style="color: #1e40af;">เบอร์โทร:</strong>
                    <p style="margin: 4px 0 0 0; color: #374151;">${customer.phone || '-'}</p>
                </div>
                <div style="margin-bottom: 16px;">
                    <strong style="color: #1e40af;">อีเมล:</strong>
                    <p style="margin: 4px 0 0 0; color: #374151;">${customer.email || '-'}</p>
                </div>
                <div style="margin-bottom: 16px;">
                    <strong style="color: #1e40af;">ที่อยู่:</strong>
                    <p style="margin: 4px 0 0 0; color: #374151;">${customer.address || '-'}</p>
                </div>
                ${customer.notes ? `
                <div style="margin-bottom: 16px;">
                    <strong style="color: #1e40af;">หมายเหตุ:</strong>
                    <p style="margin: 4px 0 0 0; color: #374151;">${customer.notes}</p>
                </div>
                ` : ''}
                <div style="margin-bottom: 16px;">
                    <strong style="color: #1e40af;">โครงการที่ดำเนินการ:</strong>
                    <p style="margin: 4px 0 0 0; color: #374151;">${customer.totalProjects || 0} โครงการ</p>
                </div>
                <div>
                    <strong style="color: #1e40af;">ยอดใช้จ่ายรวม:</strong>
                    <p style="margin: 4px 0 0 0; color: #374151;">฿${(customer.totalSpent || 0).toLocaleString('th-TH')}</p>
                </div>
            </div>
        `;

        Swal.fire({
            title: 'รายละเอียดลูกค้า',
            html: htmlContent,
            icon: 'info',
            confirmButtonText: 'ตกลง',
            confirmButtonColor: '#1e40af',
            didOpen: (modal) => {
                const confirmButton = modal.querySelector('.swal2-confirm');
                if (confirmButton) {
                    confirmButton.style.borderRadius = '8px';
                    confirmButton.style.fontSize = '0.95rem';
                    confirmButton.style.fontWeight = '600';
                }
            }
        });
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
