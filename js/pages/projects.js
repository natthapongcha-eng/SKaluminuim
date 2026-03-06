// ===== Projects Page Controller =====
const ProjectsPage = {
    projects: [],
    customers: [],
    materials: [],            // list of inventory items
    projectMaterials: [],     // materials added to current project form
    selectedMaterial: null,   // item picked from search results
    currentProjectId: null,

    // Initialize projects page
    async init() {
        await Promise.all([
            this.loadProjects(),
            this.loadCustomers(),
            this.loadMaterials()
        ]);
        this.setupEventListeners();
    },

    // Load available materials from inventory for dropdown
    async loadMaterials() {
        try {
            const mats = await api.inventory.getAll();
            // ensure array
            this.materials = Array.isArray(mats) ? mats : [];
        } catch (error) {
            console.error('Error loading materials:', error);
            this.materials = [];
        }
    },

    // Render search results table based on materials list (or filtered subset)
    renderSearchResults(results) {
        const tbody = document.querySelector('#materialSearchResults tbody');
        if (!tbody) return;

        const searchInput = document.getElementById('modalMaterialSearch');
        const isEmptyQuery = !searchInput || searchInput.value.trim() === '';

        if (!results || results.length === 0) {
            const msg = isEmptyQuery ? 'พิมพ์ค้นหาเพื่อแสดงรายการ' : 'ไม่พบรายการ';
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="6" style="text-align:center;color:#666;">${msg}</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = results.map(item => {
            return `
                <tr data-id="${item._id}" class="search-row">
                    <td>${item._id.slice(-6).toUpperCase()}</td>
                    <td>${item.name}</td>
                    <td>${item.specification || '-'}</td>
                    <td>${item.type}</td>
                    <td>${item.quantity} ${item.unit || ''}</td>
                    <td>${item.unit || ''}</td>
                </tr>
            `;
        }).join('');

        // attach click listeners
        document.querySelectorAll('#materialSearchResults .search-row').forEach(row => {
            row.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.selectMaterialById(id);
                // highlight selected row
                document.querySelectorAll('#materialSearchResults .search-row').forEach(r => r.classList.remove('selected'));
                e.currentTarget.classList.add('selected');
            });
        });
    },

    selectMaterialById(id) {
        this.selectedMaterial = this.materials.find(m => m._id === id) || null;
        const noSelect = document.getElementById('materialNotSelected');
        if (noSelect) noSelect.style.display = 'none';
        const preview = document.getElementById('selectedMaterialPreview');
        if (this.selectedMaterial) {
            // prefill price
            const priceInput = document.getElementById('projectMaterialPrice');
            if (priceInput) priceInput.value = this.selectedMaterial.unitPrice || '';
            if (preview) {
                preview.textContent = `เลือก: ${this.selectedMaterial.name}` +
                    (this.selectedMaterial.specification ? ` (${this.selectedMaterial.specification})` : '');
            }
        } else {
            if (preview) preview.textContent = '';
        }
    },


    // Open the material modal and reset values
    async openMaterialModal() {
        // reload inventory each time so new items are available
        await this.loadMaterials();
        // clear search box and message
        const searchInput = document.getElementById('modalMaterialSearch');
        const notFound = document.getElementById('materialNotFound');
        const noSelect = document.getElementById('materialNotSelected');
        if (searchInput) searchInput.value = '';
        if (notFound) notFound.style.display = 'none';
        if (noSelect) noSelect.style.display = 'none';
        this.selectedMaterial = null;
        const preview = document.getElementById('selectedMaterialPreview');
        if (preview) preview.textContent = '';
        this.renderSearchResults([]);
        document.getElementById('projectMaterialQty').value = '';
        document.getElementById('projectMaterialPrice').value = '';
        openModal('addProjectMaterialModal');
    },

    // Add chosen material to projectMaterials array
    addMaterialToProject() {
        const qty = parseFloat(document.getElementById('projectMaterialQty').value) || 0;
        const price = parseFloat(document.getElementById('projectMaterialPrice').value) || 0;
        if (!this.selectedMaterial) {
            const noSelect = document.getElementById('materialNotSelected');
            if (noSelect) noSelect.style.display = 'block';
            return;
        }
        if (qty <= 0) return;

        const mat = this.selectedMaterial;
        const sku = mat._id.slice(-6).toUpperCase();
        const total = qty * price;

        this.projectMaterials.push({
            id: mat._id,
            sku,
            name: mat.name,
            spec: mat.specification || '',
            unit: mat.unit || '',
            qty,
            price,
            total
        });
        this.renderProjectMaterialsList();
        // keep modal open for next item, clear qty & price
        document.getElementById('projectMaterialQty').value = '';
        document.getElementById('projectMaterialPrice').value = mat.unitPrice || '';
        // clear selected item/highlight so user can choose again
        this.selectedMaterial = null;
        const preview = document.getElementById('selectedMaterialPreview');
        if (preview) preview.textContent = '';
        document.querySelectorAll('#materialSearchResults .search-row').forEach(r => r.classList.remove('selected'));
    },

    // Render rows inside materials table on project form and in modal
    renderProjectMaterialsList() {
        // helper to render a specific table body
        const renderBody = (selector) => {
            const tbody = document.querySelector(`${selector} tbody`);
            if (!tbody) return;
            if (this.projectMaterials.length === 0) {
                tbody.innerHTML = `
                    <tr class="empty-state">
                        <td colspan="6">ยังไม่มีวัสดุ</td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = this.projectMaterials.map((m, i) => `
                    <tr data-index="${i}">
                        <td>${m.sku}</td>
                        <td>${m.name}</td>
                        <td>${m.spec || '-'}</td>
                        <td>${m.qty} ${m.unit || ''}</td>
                        <td>฿${m.price.toLocaleString('th-TH')}</td>
                        <td>฿${m.total.toLocaleString('th-TH')}</td>
                        <td><button type="button" class="btn-icon remove-material-btn" data-index="${i}">✖️</button></td>
                    </tr>
                `).join('');
            }
        };

        renderBody('#projectMaterialsList');
        renderBody('#modalMaterialsList');

        this.attachMaterialRowEvents();
        this.updateCostFromMaterials();
    },

    attachMaterialRowEvents() {
        document.querySelectorAll('#projectMaterialsList .remove-material-btn, #modalMaterialsList .remove-material-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                if (!isNaN(idx)) {
                    this.projectMaterials.splice(idx, 1);
                    this.renderProjectMaterialsList();
                }
            });
        });
    },

    updateCostFromMaterials() {
        const sum = this.projectMaterials.reduce((a, m) => a + m.total, 0);
        const costInput = document.getElementById('projectCost');
        if (costInput) costInput.value = sum;
    },


    // Load projects from API
    async loadProjects() {
        try {
            const projects = await api.projects.getAll();
            console.log('Projects from API:', projects);
            this.projects = projects;
            this.renderProjectsGrid(projects);
            this.updateStats();
        } catch (error) {
            console.error('Error loading projects:', error);
            this.projects = [];
        }
    },

    // Load customers for dropdown
    async loadCustomers() {
        try {
            const customers = await api.customers.getAll();
            this.customers = customers;
            this.populateCustomerDropdown();
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    },

    // Populate customer dropdown in form
    populateCustomerDropdown() {
        const select = document.getElementById('projectCustomer');
        if (!select) return;

        select.innerHTML = '<option value="">เลือกลูกค้า</option>' +
            this.customers.map(c => {
                const displayName = c.name || c.companyName || 'ไม่ระบุ';
                return `<option value="${c._id}">${displayName}</option>`;
            }).join('');
    },

    // Render projects grid
    renderProjectsGrid(projects) {
        const grid = document.querySelector('.projects-grid');
        if (!grid) return;

        console.log('Rendering projects:', projects);

        if (projects.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: #666;">
                    ยังไม่มีโครงการ คลิก "+ สร้างโครงการใหม่" เพื่อเริ่มต้น
                </div>
            `;
            return;
        }

        grid.innerHTML = projects.map(project => {
            console.log('Project object:', project);
            console.log('customerId:', project.customerId);
            const statusBadge = this.getStatusBadge(project.status);
            const paymentBadge = this.getPaymentBadge(project.paymentStatus);
            const customerName = project.customerId?.name || project.customerId?.companyName || 'ไม่ระบุ';
            const teamName = project.team || 'ไม่ระบุ';
            const startDate = project.startDate 
                ? new Date(project.startDate).toLocaleDateString('th-TH') 
                : '-';
            
            return `
                <div class="project-card" data-id="${project._id}">
                    <div class="project-header">
                        <h3>${project.name || 'โครงการ #' + project._id.slice(-6)}</h3>
                        ${statusBadge}
                    </div>
                    <div class="project-info">
                        <p><strong>ลูกค้า:</strong> ${customerName}</p>
                        <p><strong>ทีมงาน:</strong> ${teamName}</p>
                        <p><strong>วันที่สร้าง:</strong> ${startDate}</p>
                    </div>
                    <div class="project-cost">
                        <div class="cost-item">
                            <span>ต้นทุน:</span>
                            <span>฿${(project.totalCost || 0).toLocaleString('th-TH')}</span>
                        </div>
                        <div class="cost-item">
                            <span>ราคาขาย:</span>
                            <span>฿${(project.totalPrice || 0).toLocaleString('th-TH')}</span>
                        </div>
                        <div class="cost-item profit">
                            <span>กำไร:</span>
                            <span>฿${((project.totalPrice || 0) - (project.totalCost || 0)).toLocaleString('th-TH')}</span>
                        </div>
                    </div>
                    <div class="project-payment">
                        ${paymentBadge}
                    </div>
                    <div class="project-actions">
                        <button class="btn-secondary view-btn" data-id="${project._id}">ดูรายละเอียด</button>
                        <button class="btn-primary edit-btn" data-id="${project._id}">แก้ไข</button>
                    </div>
                </div>
            `;
        }).join('');

        this.attachProjectEventListeners();
    },

    // Get status badge HTML
    getStatusBadge(status) {
        const badges = {
            'รอดำเนินการ': '<span class="badge badge-planning">รอดำเนินการ</span>',
            'กำลังดำเนินการ': '<span class="badge badge-warning">กำลังดำเนินการ</span>',
            'เสร็จสิ้น': '<span class="badge badge-success">เสร็จสิ้น</span>',
            'ยกเลิก': '<span class="badge badge-danger">ยกเลิก</span>'
        };
        return badges[status] || '<span class="badge">-</span>';
    },

    // Get payment status badge HTML
    getPaymentBadge(paymentStatus) {
        const badges = {
            'paid': '<span class="payment-status paid">✓ ชำระแล้ว</span>',
            'partial': '<span class="payment-status partial">⏳ ชำระบางส่วน</span>',
            'unpaid': '<span class="payment-status unpaid">✗ ยังไม่ชำระ</span>'
        };
        return badges[paymentStatus] || badges['unpaid'];
    },

    // Attach event listeners to project cards
    attachProjectEventListeners() {
        document.querySelectorAll('.project-card .edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.editProject(e.target.dataset.id);
            });
        });

        document.querySelectorAll('.project-card .view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.viewProject(e.target.dataset.id);
            });
        });
    },

    // Update stats cards
    updateStats() {
        const total = this.projects.length;
        const inProgress = this.projects.filter(p => p.status === 'กำลังดำเนินการ').length;
        const completed = this.projects.filter(p => p.status === 'เสร็จสิ้น').length;
        const totalRevenue = this.projects.reduce((sum, p) => sum + (p.totalPrice || 0), 0);

        const statCards = document.querySelectorAll('.stat-card .stat-info h3');
        if (statCards.length >= 4) {
            statCards[0].textContent = total;
            statCards[1].textContent = inProgress;
            statCards[2].textContent = completed;
            statCards[3].textContent = `฿${(totalRevenue / 1000).toFixed(0)}K`;
        }
    },

    // Setup event listeners
    setupEventListeners() {
        // Add Project Form
        const addProjectForm = document.getElementById('addProjectForm');
        if (addProjectForm) {
            addProjectForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveProject();
            });
        }

        // make sure closing modal clears material entries
        const addProjModalClose = document.querySelector('#addProjectModal .close');
        addProjModalClose?.addEventListener('click', () => {
            closeModal('addProjectModal');
            this.projectMaterials = [];
            this.renderProjectMaterialsList();
        });

        const materialModalClose = document.querySelector('#addProjectMaterialModal .close');
        materialModalClose?.addEventListener('click', () => {
            // behave like cancel: clear the temporary list and selected item
            this.projectMaterials = [];
            this.renderProjectMaterialsList();
            this.selectedMaterial = null;
            const preview = document.getElementById('selectedMaterialPreview');
            if (preview) preview.textContent = '';
            closeModal('addProjectMaterialModal');
        });

        // Add material button and modal interactions
        const addMaterialBtn = document.getElementById('addMaterialToProject');
        addMaterialBtn?.addEventListener('click', () => this.openMaterialModal());

        // When opening the create-project modal, make sure the material list is cleared
        const addProjBtn = document.getElementById('addProjectBtn');
        addProjBtn?.addEventListener('click', () => {
            this.projectMaterials = [];
            this.renderProjectMaterialsList();
            document.getElementById('addProjectForm')?.reset();
        });

        const addMaterialForm = document.getElementById('addProjectMaterialForm');
        addMaterialForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addMaterialToProject();
        });

        // after adding items, user can finish
        const doneBtn = document.getElementById('doneProjectMaterials');
        doneBtn?.addEventListener('click', () => {
            closeModal('addProjectMaterialModal');
        });

        // clear search filtering when modal opens
        const materialSearch = document.getElementById('modalMaterialSearch');
        materialSearch?.addEventListener('input', (e) => {
            this.filterMaterialOptions(e.target.value);
        });

        const cancelAddMaterial = document.getElementById('cancelAddProjectMaterial');
        cancelAddMaterial?.addEventListener('click', () => {
            // cancel will discard the whole selection
            this.projectMaterials = [];
            this.renderProjectMaterialsList();
            this.selectedMaterial = null;
            const preview = document.getElementById('selectedMaterialPreview');
            if (preview) preview.textContent = '';
            closeModal('addProjectMaterialModal');
        });



        // Search and Filter
        const searchInput = document.getElementById('searchProject');
        const filterPayment = document.getElementById('filterPaymentStatus');
        const filterStatus = document.getElementById('filterStatus');

        [searchInput, filterPayment, filterStatus].forEach(el => {
            el?.addEventListener('input', () => this.filterProjects());
            el?.addEventListener('change', () => this.filterProjects());
        });
    },

    // Save project (create or update)
    async saveProject() {
        // make sure cost matches materials list
        this.updateCostFromMaterials();
        const formData = {
            name: document.getElementById('projectName')?.value || '',
            customerId: document.getElementById('projectCustomer')?.value || null,
            team: document.getElementById('projectTeam')?.value || '',
            startDate: document.getElementById('projectStartDate')?.value || null,
            endDate: document.getElementById('projectEndDate')?.value || null,
            totalCost: parseFloat(document.getElementById('projectCost')?.value) || 0,
            totalPrice: 0,  // will be set later in Quotation
            status: document.getElementById('projectStatus')?.value || 'รอดำเนินการ',
            paymentStatus: document.getElementById('projectPaymentStatus')?.value || 'unpaid',
            description: document.getElementById('projectDescription')?.value,
            materials: this.projectMaterials // may be persisted later
        };

        try {
            if (this.currentProjectId) {
                await api.projects.update(this.currentProjectId, formData);
                alert('แก้ไขโครงการเรียบร้อย');
            } else {
                await api.projects.create(formData);
                alert('สร้างโครงการเรียบร้อย');
            }
            
            closeModal('addProjectModal');
            document.getElementById('addProjectForm')?.reset();
            // clear material list
            this.projectMaterials = [];
            this.renderProjectMaterialsList();
            this.currentProjectId = null;
            await this.loadProjects();
        } catch (error) {
            console.error('Error saving project:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
        }
    },

    // Edit project
    editProject(id) {
        const project = this.projects.find(p => p._id === id);
        if (!project) return;

        this.currentProjectId = id;

        // reset any existing material entries
        this.projectMaterials = [];
        this.renderProjectMaterialsList();

        // Fill form with project data
        const fields = {
            'projectName': project.name,
            'projectCustomer': project.customerId?._id || project.customerId,
            'projectTeam': project.team,
            'projectStartDate': project.startDate?.split('T')[0],
            'projectEndDate': project.endDate?.split('T')[0],
            'projectCost': project.totalCost,
            'projectStatus': project.status,
            'projectPaymentStatus': project.paymentStatus,
            'projectDescription': project.description
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const el = document.getElementById(fieldId);
            if (el && value !== undefined) el.value = value;
        });

        openModal('addProjectModal');
    },

    // View project details
    viewProject(id) {
        const project = this.projects.find(p => p._id === id);
        if (!project) return;

        const customerName = project.customerId?.name || project.customerId?.companyName || '-';
        const detailsText = `
รายละเอียดโครงการ:

ชื่อโครงการ: ${project.name || '-'}
ลูกค้า: ${customerName}
ทีมงาน: ${project.team || '-'}
วันเริ่ม: ${project.startDate ? new Date(project.startDate).toLocaleDateString('th-TH') : '-'}
วันสิ้นสุด: ${project.endDate ? new Date(project.endDate).toLocaleDateString('th-TH') : '-'}
สถานะ: ${project.status}
ราคา: ฿${(project.totalPrice || 0).toLocaleString('th-TH')}
        `;
        alert(detailsText);
    },

    // Filter projects
    filterProjects() {
        const search = document.getElementById('searchProject')?.value.toLowerCase() || '';
        const payment = document.getElementById('filterPaymentStatus')?.value || 'all';
        const status = document.getElementById('filterStatus')?.value || 'all';

        const filtered = this.projects.filter(project => {
            const customerNameToSearch = project.customerId?.name || project.customerId?.companyName || '';
            const matchSearch = (project.name || '').toLowerCase().includes(search) ||
                               customerNameToSearch.toLowerCase().includes(search);
            const matchPayment = payment === 'all' || project.paymentStatus === payment;
            const matchStatus = status === 'all' || project.status === status;
            
            return matchSearch && matchPayment && matchStatus;
        });

        this.renderProjectsGrid(filtered);
    },

    // Filter materials options inside modal based on search query and render table
    filterMaterialOptions(query) {
        const normalized = query.trim().toLowerCase();
        const notFound = document.getElementById('materialNotFound');
        let filtered = this.materials;
        if (normalized) {
            filtered = this.materials.filter(m => m.name.toLowerCase().includes(normalized));
        }
        if (filtered.length === 0 && normalized) {
            if (notFound) notFound.style.display = 'block';
        } else if (notFound) {
            notFound.style.display = 'none';
        }
        // hide selection warning when query changes
        const noSelect = document.getElementById('materialNotSelected');
        if (noSelect) noSelect.style.display = 'none';
        this.renderSearchResults(filtered);
    },

    // Export to Excel
    exportToExcel() {
        const data = this.projects.map(p => ({
            'ชื่อโครงการ': p.name,
            'ลูกค้า': p.customerId?.name || p.customerId?.companyName || '-',
            'ทีมงาน': p.team || '-',
            'วันเริ่ม': p.startDate ? new Date(p.startDate).toLocaleDateString('th-TH') : '-',
            'วันเสร็จ': p.endDate ? new Date(p.endDate).toLocaleDateString('th-TH') : '-',
            'ต้นทุน': p.totalCost || 0,
            'ราคาขาย': p.totalPrice || 0,
            'กำไร': (p.totalPrice || 0) - (p.totalCost || 0),
            'สถานะ': p.status,
            'การชำระเงิน': p.paymentStatus === 'paid' ? 'ชำระแล้ว' : (p.paymentStatus === 'partial' ? 'ชำระบางส่วน' : 'ยังไม่ชำระ')
        }));

        ExportUtils.exportToExcel(data, 'projects');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('addProjectBtn')) {
        ProjectsPage.init();
    }
});