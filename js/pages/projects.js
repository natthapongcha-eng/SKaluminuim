// ===== Projects Page Controller =====
const ProjectsPage = {
    projects: [],
    customers: [],
    materials: [],
    projectMaterials: [],
    selectedMaterial: null,
    currentProjectId: null,

    async init() {
        await Promise.all([
            this.loadProjects(),
            this.loadCustomers(),
            this.loadMaterials()
        ]);
        this.setupEventListeners();
        this.renderProjectMaterialsList();
    },

    async loadMaterials() {
        try {
            const mats = await api.inventory.getAll();
            this.materials = Array.isArray(mats) ? mats : [];
        } catch (error) {
            console.error('Error loading materials:', error);
            this.materials = [];
        }
    },

    renderSearchResults(results) {
        const tbody = document.querySelector('#materialSearchResults tbody');
        if (!tbody) return;

        const searchInput = document.getElementById('modalMaterialSearch');
        const isEmptyQuery = !searchInput || searchInput.value.trim() === '';

        if (!results || results.length === 0) {
            const msg = isEmptyQuery ? 'Type to search materials' : 'No materials found';
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="6" style="text-align:center;color:#666;">${msg}</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = results.map(item => `
            <tr data-id="${item._id}" class="search-row">
                <td>${String(item._id).slice(-6).toUpperCase()}</td>
                <td>${item.name || '-'}</td>
                <td>${item.specification || '-'}</td>
                <td>${item.type || '-'}</td>
                <td>${item.quantity || 0} ${item.unit || ''}</td>
                <td>${item.unit || ''}</td>
            </tr>
        `).join('');

        document.querySelectorAll('#materialSearchResults .search-row').forEach(row => {
            row.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.selectMaterialById(id);
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
        const priceInput = document.getElementById('projectMaterialPrice');

        if (this.selectedMaterial) {
            if (priceInput) priceInput.value = this.selectedMaterial.unitPrice || 0;
            if (preview) {
                preview.textContent = `Selected: ${this.selectedMaterial.name}` +
                    (this.selectedMaterial.specification ? ` (${this.selectedMaterial.specification})` : '');
            }
        } else if (preview) {
            preview.textContent = '';
        }
    },

    async openMaterialModal() {
        await this.loadMaterials();

        const searchInput = document.getElementById('modalMaterialSearch');
        const notFound = document.getElementById('materialNotFound');
        const noSelect = document.getElementById('materialNotSelected');
        const preview = document.getElementById('selectedMaterialPreview');
        const qtyInput = document.getElementById('projectMaterialQty');
        const priceInput = document.getElementById('projectMaterialPrice');

        if (searchInput) searchInput.value = '';
        if (notFound) notFound.style.display = 'none';
        if (noSelect) noSelect.style.display = 'none';
        if (preview) preview.textContent = '';
        if (qtyInput) qtyInput.value = '';
        if (priceInput) priceInput.value = '';

        this.selectedMaterial = null;
        this.renderSearchResults([]);
        openModal('addProjectMaterialModal');
    },

    addMaterialToProject() {
        const qty = parseFloat(document.getElementById('projectMaterialQty')?.value) || 0;

        if (!this.selectedMaterial) {
            const noSelect = document.getElementById('materialNotSelected');
            if (noSelect) noSelect.style.display = 'block';
            return;
        }

        if (qty <= 0) return;

        const mat = this.selectedMaterial;
        const price = parseFloat(document.getElementById('projectMaterialPrice')?.value) || Number(mat.unitPrice || 0);

        const item = {
            id: mat._id,
            sku: String(mat._id).slice(-6).toUpperCase(),
            name: mat.name || '-',
            spec: mat.specification || '',
            unit: mat.unit || '',
            qty,
            price,
            total: qty * price
        };

        this.projectMaterials.push(item);
        this.renderProjectMaterialsList();

        const qtyInput = document.getElementById('projectMaterialQty');
        const priceInput = document.getElementById('projectMaterialPrice');
        const preview = document.getElementById('selectedMaterialPreview');

        if (qtyInput) qtyInput.value = '';
        if (priceInput) priceInput.value = mat.unitPrice || 0;
        if (preview) preview.textContent = '';

        this.selectedMaterial = null;
        document.querySelectorAll('#materialSearchResults .search-row').forEach(r => r.classList.remove('selected'));
    },

    renderProjectMaterialsList() {
        const renderBody = (selector) => {
            const tbody = document.querySelector(`${selector} tbody`);
            if (!tbody) return;

            if (this.projectMaterials.length === 0) {
                tbody.innerHTML = `
                    <tr class="empty-state">
                        <td colspan="7">No materials added</td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = this.projectMaterials.map((m, i) => `
                <tr data-index="${i}">
                    <td>${m.sku}</td>
                    <td>${m.name}</td>
                    <td>${m.spec || '-'}</td>
                    <td>${m.qty} ${m.unit || ''}</td>
                    <td>THB ${Number(m.price || 0).toLocaleString('th-TH')}</td>
                    <td>THB ${Number(m.total || 0).toLocaleString('th-TH')}</td>
                    <td><button type="button" class="btn-icon remove-material-btn" data-index="${i}">x</button></td>
                </tr>
            `).join('');
        };

        renderBody('#projectMaterialsList');
        renderBody('#modalMaterialsList');
        this.attachMaterialRowEvents();
        this.updateCostFromMaterials();
    },

    attachMaterialRowEvents() {
        document.querySelectorAll('#projectMaterialsList .remove-material-btn, #modalMaterialsList .remove-material-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.index, 10);
                if (!Number.isNaN(idx)) {
                    this.projectMaterials.splice(idx, 1);
                    this.renderProjectMaterialsList();
                }
            });
        });
    },

    updateCostFromMaterials() {
        const sum = this.projectMaterials.reduce((a, m) => a + Number(m.total || 0), 0);
        const costInput = document.getElementById('projectCost');
        if (costInput) costInput.value = sum;
    },

    async loadProjects() {
        try {
            const projects = await api.projects.getAll();
            this.projects = Array.isArray(projects) ? projects : [];
            this.renderProjectsGrid(this.projects);
            this.updateStats();
        } catch (error) {
            console.error('Error loading projects:', error);
            this.projects = [];
            this.renderProjectsGrid([]);
            this.updateStats();
        }
    },

    async loadCustomers() {
        try {
            const customers = await api.customers.getAll();
            this.customers = Array.isArray(customers) ? customers : [];
            this.populateCustomerDropdown();
        } catch (error) {
            console.error('Error loading customers:', error);
            this.customers = [];
            this.populateCustomerDropdown();
        }
    },

    populateCustomerDropdown() {
        const select = document.getElementById('projectCustomer');
        if (!select) return;

        select.innerHTML = '<option value="">Select customer</option>' +
            this.customers.map(c => `<option value="${c._id}">${c.name || '-'}</option>`).join('');
    },

    renderProjectsGrid(projects) {
        const grid = document.querySelector('.projects-grid');
        if (!grid) return;

        if (!projects.length) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: #666;">
                    No projects yet. Click "+ Create Project" to start.
                </div>
            `;
            return;
        }

        grid.innerHTML = projects.map(project => {
            const customerName = project.customerId?.name || '-';
            const statusBadge = this.getStatusBadge(project.status);
            const paymentBadge = this.getPaymentBadge(project.paymentStatus);

            return `
                <div class="project-card" data-id="${project._id}">
                    <div class="project-header">
                        <h3>${project.name || `Project #${String(project._id).slice(-6)}`}</h3>
                        ${statusBadge}
                    </div>
                    <div class="project-info">
                        <p><strong>Customer:</strong> ${customerName}</p>
                        <p><strong>Team:</strong> ${project.team || '-'}</p>
                        <p><strong>Start:</strong> ${project.startDate ? new Date(project.startDate).toLocaleDateString('th-TH') : '-'}</p>
                        <p><strong>End:</strong> ${project.endDate ? new Date(project.endDate).toLocaleDateString('th-TH') : '-'}</p>
                        <p><strong>Created:</strong> ${project.createdAt ? new Date(project.createdAt).toLocaleDateString('th-TH') : '-'}</p>
                    </div>
                    <div class="project-cost">
                        <div class="cost-item">
                            <span>Cost:</span>
                            <span>THB ${Number(project.totalCost || 0).toLocaleString('th-TH')}</span>
                        </div>
                        <div class="cost-item">
                            <span>Sell:</span>
                            <span>THB ${Number(project.totalPrice || 0).toLocaleString('th-TH')}</span>
                        </div>
                        <div class="cost-item profit">
                            <span>Profit:</span>
                            <span>THB ${Number((project.totalPrice || 0) - (project.totalCost || 0)).toLocaleString('th-TH')}</span>
                        </div>
                    </div>
                    <div class="project-payment">${paymentBadge}</div>
                    <div class="project-actions">
                        <button class="btn-secondary view-btn" data-id="${project._id}">View</button>
                        <button class="btn-primary edit-btn" data-id="${project._id}">Edit</button>
                    </div>
                </div>
            `;
        }).join('');

        this.attachProjectEventListeners();
    },

    getStatusBadge(status) {
        const badges = {
            'planning': '<span class="badge badge-planning">Planning</span>',
            'in-progress': '<span class="badge badge-warning">In Progress</span>',
            'completed': '<span class="badge badge-success">Completed</span>',
            'cancelled': '<span class="badge badge-danger">Cancelled</span>'
        };

        return badges[status] || '<span class="badge">-</span>';
    },

    getPaymentBadge(paymentStatus) {
        const badges = {
            paid: '<span class="payment-status paid">Paid</span>',
            partial: '<span class="payment-status partial">Partial</span>',
            unpaid: '<span class="payment-status unpaid">Unpaid</span>'
        };

        return badges[paymentStatus] || badges.unpaid;
    },

    attachProjectEventListeners() {
        document.querySelectorAll('.project-card .edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.editProject(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.project-card .view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.viewProject(e.currentTarget.dataset.id));
        });
    },

    updateStats() {
        const total = this.projects.length;
        const inProgress = this.projects.filter(p => p.status === 'in-progress').length;
        const completed = this.projects.filter(p => p.status === 'completed').length;
        const totalRevenue = this.projects.reduce((sum, p) => sum + Number(p.totalPrice || 0), 0);

        const statCards = document.querySelectorAll('.stat-card .stat-info h3');
        if (statCards.length >= 4) {
            statCards[0].textContent = total;
            statCards[1].textContent = inProgress;
            statCards[2].textContent = completed;
            statCards[3].textContent = `THB ${(totalRevenue / 1000).toFixed(0)}K`;
        }
    },

    setupEventListeners() {
        const addProjectForm = document.getElementById('addProjectForm');
        addProjectForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProject();
        });

        document.querySelector('#addProjectModal .close')?.addEventListener('click', () => {
            closeModal('addProjectModal');
            this.projectMaterials = [];
            this.renderProjectMaterialsList();
        });

        document.querySelector('#addProjectMaterialModal .close')?.addEventListener('click', () => {
            closeModal('addProjectMaterialModal');
        });

        document.getElementById('addProjectBtn')?.addEventListener('click', () => {
            this.currentProjectId = null;
            this.projectMaterials = [];
            this.renderProjectMaterialsList();
            document.getElementById('addProjectForm')?.reset();
            openModal('addProjectModal');
        });

        document.getElementById('addMaterialToProject')?.addEventListener('click', () => this.openMaterialModal());

        document.getElementById('addProjectMaterialForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addMaterialToProject();
        });

        document.getElementById('doneProjectMaterials')?.addEventListener('click', () => {
            closeModal('addProjectMaterialModal');
        });

        document.getElementById('cancelAddProjectMaterial')?.addEventListener('click', () => {
            closeModal('addProjectMaterialModal');
        });

        document.getElementById('modalMaterialSearch')?.addEventListener('input', (e) => {
            this.filterMaterialOptions(e.target.value);
        });

        const searchInput = document.getElementById('searchProject');
        const filterPayment = document.getElementById('filterPaymentStatus');
        const filterStatus = document.getElementById('filterStatus');

        [searchInput, filterPayment, filterStatus].forEach(el => {
            el?.addEventListener('input', () => this.filterProjects());
            el?.addEventListener('change', () => this.filterProjects());
        });
    },

    async saveProject() {
        const name = document.getElementById('projectName')?.value?.trim();
        const customerId = document.getElementById('projectCustomer')?.value;

        if (!name) {
            alert('Please enter project name');
            return;
        }

        if (!customerId) {
            alert('Please select customer');
            return;
        }

        const formData = {
            name,
            customerId,
            totalPrice: 0,
            status: document.getElementById('projectStatus')?.value || 'planning',
            paymentStatus: document.getElementById('projectPaymentStatus')?.value || 'unpaid',
            team: document.getElementById('projectTeam')?.value || '',
            startDate: document.getElementById('projectStartDate')?.value || null,
            endDate: document.getElementById('projectEndDate')?.value || null,
            description: document.getElementById('projectDescription')?.value || '',
            materials: this.projectMaterials.map(item => ({ id: item.id, qty: item.qty }))
        };

        try {
            if (this.currentProjectId) {
                await api.projects.update(this.currentProjectId, formData);
                alert('Project updated');
            } else {
                await api.projects.create(formData);
                alert('Project created');
            }

            closeModal('addProjectModal');
            document.getElementById('addProjectForm')?.reset();
            this.projectMaterials = [];
            this.currentProjectId = null;
            this.renderProjectMaterialsList();
            await this.loadProjects();
        } catch (error) {
            console.error('Error saving project:', error);
            alert(`Error: ${error.message}`);
        }
    },

    editProject(id) {
        const project = this.projects.find(p => p._id === id);
        if (!project) return;

        this.currentProjectId = id;
        this.projectMaterials = Array.isArray(project.materials)
            ? project.materials.map(m => ({
                id: m.materialId || m.id,
                sku: String(m.materialId || m.id || '').slice(-6).toUpperCase(),
                name: m.name || '-',
                spec: m.specification || '',
                unit: m.unit || '',
                qty: Number(m.qty || 0),
                price: Number(m.unitPrice || 0),
                total: Number(m.total || 0)
            }))
            : [];

        this.renderProjectMaterialsList();

        const projectCustomer = typeof project.customerId === 'object' ? project.customerId?._id : project.customerId;

        const fields = {
            projectName: project.name,
            projectCustomer,
            projectTeam: project.team || '',
            projectStartDate: project.startDate ? String(project.startDate).split('T')[0] : '',
            projectEndDate: project.endDate ? String(project.endDate).split('T')[0] : '',
            projectCost: project.totalCost || 0,
            projectStatus: project.status,
            projectPaymentStatus: project.paymentStatus,
            projectDescription: project.description || ''
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const el = document.getElementById(fieldId);
            if (el && value !== undefined && value !== null) {
                el.value = value;
            }
        });

        openModal('addProjectModal');
    },

    viewProject(id) {
        const project = this.projects.find(p => p._id === id);
        if (!project) return;

        const customerName = project.customerId?.name || '-';
        alert(`Project details:\n\n${project.name || '-'}\nCustomer: ${customerName}\nTeam: ${project.team || '-'}\nStart: ${project.startDate ? new Date(project.startDate).toLocaleDateString('th-TH') : '-'}\nEnd: ${project.endDate ? new Date(project.endDate).toLocaleDateString('th-TH') : '-'}\nStatus: ${project.status || '-'}\nTotal cost: THB ${Number(project.totalCost || 0).toLocaleString('th-TH')}`);
    },

    filterProjects() {
        const search = document.getElementById('searchProject')?.value.toLowerCase() || '';
        const payment = document.getElementById('filterPaymentStatus')?.value || 'all';
        const status = document.getElementById('filterStatus')?.value || 'all';

        const filtered = this.projects.filter(project => {
            const projectName = String(project.name || '').toLowerCase();
            const customerName = String(project.customerId?.name || '').toLowerCase();
            const matchSearch = projectName.includes(search) || customerName.includes(search);
            const matchPayment = payment === 'all' || project.paymentStatus === payment;
            const matchStatus = status === 'all' || project.status === status;
            return matchSearch && matchPayment && matchStatus;
        });

        this.renderProjectsGrid(filtered);
    },

    filterMaterialOptions(query) {
        const normalized = String(query || '').trim().toLowerCase();
        const notFound = document.getElementById('materialNotFound');

        let filtered = this.materials;
        if (normalized) {
            filtered = this.materials.filter(m => String(m.name || '').toLowerCase().includes(normalized));
        }

        if (notFound) {
            notFound.style.display = filtered.length === 0 && normalized ? 'block' : 'none';
        }

        const noSelect = document.getElementById('materialNotSelected');
        if (noSelect) noSelect.style.display = 'none';

        this.renderSearchResults(filtered);
    },

    exportToExcel() {
        const data = this.projects.map(p => ({
            'Project Name': p.name || '-',
            'Customer': p.customerId?.name || '-',
            'Team': p.team || '-',
            'Start Date': p.startDate ? new Date(p.startDate).toLocaleDateString('th-TH') : '-',
            'End Date': p.endDate ? new Date(p.endDate).toLocaleDateString('th-TH') : '-',
            'Cost': p.totalCost || 0,
            'Selling Price': p.totalPrice || 0,
            'Profit': (p.totalPrice || 0) - (p.totalCost || 0),
            'Status': p.status || '-',
            'Payment': p.paymentStatus || 'unpaid'
        }));

        ExportUtils.exportToExcel(data, 'projects');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('addProjectBtn')) {
        ProjectsPage.init();
    }
});
