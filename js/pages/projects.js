// ===== Projects Page Controller =====
const ProjectsPage = {
    projects: [],
    customers: [],
    quotations: [],
    materials: [],
    projectMaterials: [],
    selectedMaterial: null,
    currentProjectId: null,
    currentProjectStatus: null,
    currentStatusProjectId: null,
    menuEventsBound: false,
    pendingActions: new Set(),
    isSyncingFromQuotation: false,
    isManualCostOverride: false,
    STATUS_LABELS: {
        planning: '\u0e27\u0e32\u0e07\u0e41\u0e1c\u0e19',
        'in-progress': '\u0e01\u0e33\u0e25\u0e31\u0e07\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23',
        completed: '\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e2a\u0e34\u0e49\u0e19',
        cancelled: '\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01'
    },
    PAYMENT_LABELS: {
        paid: '\u0e0a\u0e33\u0e23\u0e30\u0e41\u0e25\u0e49\u0e27',
        partial: '\u0e0a\u0e33\u0e23\u0e30\u0e1a\u0e32\u0e07\u0e2a\u0e48\u0e27\u0e19',
        unpaid: '\u0e04\u0e49\u0e32\u0e07\u0e0a\u0e33\u0e23\u0e30'
    },

    async init() {
        await Promise.all([
            this.loadProjects(),
            this.loadCustomers(),
            this.loadQuotations(),
            this.loadMaterials()
        ]);
        this.localizeStatusLabels();
        this.setupEventListeners();
        this.bindGlobalMenuHandlers();
        this.renderProjectMaterialsList();
    },

    bindGlobalMenuHandlers() {
        if (this.menuEventsBound) return;
        this.menuEventsBound = true;

        document.addEventListener('click', (event) => {
            const insideMenu = event.target.closest('.project-action-menu-wrap');
            if (!insideMenu) {
                this.closeAllActionMenus();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeAllActionMenus();
            }
        });
    },

    closeAllActionMenus() {
        document.querySelectorAll('.project-action-menu-wrap.open').forEach((menu) => {
            menu.classList.remove('open');
        });
    },

    localizeStatusLabels() {
        ['filterStatus', 'statusUpdateValue'].forEach((id) => {
            const select = document.getElementById(id);
            if (!select) return;
            Array.from(select.options).forEach((opt) => {
                if (opt.value === 'all') return;
                if (this.STATUS_LABELS[opt.value]) {
                    opt.textContent = this.STATUS_LABELS[opt.value];
                }
            });
        });

        ['filterPaymentStatus', 'statusPaymentValue'].forEach((id) => {
            const select = document.getElementById(id);
            if (!select) return;
            Array.from(select.options).forEach((opt) => {
                if (opt.value === 'all') return;
                if (this.PAYMENT_LABELS[opt.value]) {
                    opt.textContent = this.PAYMENT_LABELS[opt.value];
                }
            });
        });
    },

    notify(message, type = 'success') {
        let toast = document.getElementById('projectToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'projectToast';
            toast.className = 'project-toast';
            document.body.appendChild(toast);
        }

        toast.classList.remove('success', 'error', 'info', 'active');
        toast.classList.add(type);
        toast.textContent = message;
        requestAnimationFrame(() => toast.classList.add('active'));

        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => toast.classList.remove('active'), 2400);
    },

    async confirm(options) {
        if (typeof showStyledConfirm === 'function') {
            return showStyledConfirm(options);
        }
        return window.confirm(options?.message || 'Confirm?');
    },

    getCurrentUserId() {
        if (typeof currentUser === 'undefined') return null;
        return currentUser.id || currentUser._id || null;
    },

    resolveMaterialCode(item) {
        if (!item || typeof item !== 'object') return '-';

        const directCode = item.materialCode || item.code || item.itemCode || item.sku;
        if (directCode) {
            const normalized = String(directCode).trim();
            if (normalized) return normalized;
        }

        const idSource = item.materialId || item.id || item._id;
        const idText = String(idSource || '').trim();
        if (idText) {
            return idText.slice(-6).toUpperCase();
        }

        return '-';
    },

    setProjectActionState(projectId, disabled) {
        const card = document.querySelector(`.project-card[data-id="${projectId}"]`);
        if (!card) return;
        card.querySelectorAll('button').forEach(btn => {
            btn.disabled = !!disabled;
            btn.classList.toggle('is-busy', !!disabled);
        });
    },

    async withActionLock(actionKey, projectId, work) {
        if (this.pendingActions.has(actionKey)) {
            return null;
        }

        this.pendingActions.add(actionKey);
        if (projectId) this.setProjectActionState(projectId, true);

        try {
            return await work();
        } finally {
            this.pendingActions.delete(actionKey);
            if (projectId) this.setProjectActionState(projectId, false);
        }
    },

    async applyManualStockOut(project) {
        const materials = Array.isArray(project?.materials) ? project.materials : [];
        for (const item of materials) {
            const materialId = item.materialId || item.id;
            const qty = Number(item.qty || 0);
            if (!materialId || qty <= 0) continue;

            try {
                await api.inventory.stockOut(materialId, {
                    quantity: qty,
                    reason: 'Auto stock-out from project status update (fallback mode)',
                    projectId: project._id,
                    userId: this.getCurrentUserId()
                });
            } catch (error) {
                const itemName = item.name || materialId;
                throw new Error(`ตัดสต๊อกไม่สำเร็จ: ${itemName} (${error.message})`);
            }
        }
    },

    async applyManualStockRestore(project) {
        const materials = Array.isArray(project?.materials) ? project.materials : [];
        for (const item of materials) {
            const materialId = item.materialId || item.id;
            const qty = Number(item.qty || 0);
            if (!materialId || qty <= 0) continue;

            try {
                await api.inventory.stockIn(materialId, {
                    quantity: qty,
                    reason: 'Auto stock-restore from project cancel (fallback mode)',
                    userId: this.getCurrentUserId()
                });
            } catch (error) {
                const itemName = item.name || materialId;
                throw new Error(`คืนสต๊อกไม่สำเร็จ: ${itemName} (${error.message})`);
            }
        }
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
                <td>${this.resolveMaterialCode(item)}</td>
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
        const isMaterialLocked = this.currentProjectId
            && ['in-progress', 'completed'].includes(this.currentProjectStatus || '');
        if (isMaterialLocked) {
            this.notify('ไม่สามารถเพิ่มวัสดุได้ เมื่อโครงการอยู่ระหว่างดำเนินการหรือเสร็จสิ้น', 'error');
            return;
        }

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
            sku: this.resolveMaterialCode(mat),
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
                const isMaterialLocked = this.currentProjectId
                    && ['in-progress', 'completed'].includes(this.currentProjectStatus || '');
                if (isMaterialLocked) {
                    this.notify('ไม่สามารถลบวัสดุได้ เมื่อโครงการอยู่ระหว่างดำเนินการหรือเสร็จสิ้น', 'error');
                    return;
                }
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
        if (!costInput) return;

        const hasTypedValue = String(costInput.value || '').trim() !== '';
        if (this.isManualCostOverride || hasTypedValue) return;

        costInput.value = sum;
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
            this.populateQuotationDropdown();
        } catch (error) {
            console.error('Error loading customers:', error);
            this.customers = [];
            this.populateCustomerDropdown();
            this.populateQuotationDropdown();
        }
    },

    async loadQuotations() {
        try {
            const quotations = await api.quotations.getAll();
            this.quotations = Array.isArray(quotations) ? quotations : [];
            this.populateQuotationDropdown();
        } catch (error) {
            console.error('Error loading quotations:', error);
            this.quotations = [];
            this.populateQuotationDropdown();
        }
    },

    populateCustomerDropdown() {
        const select = document.getElementById('projectCustomer');
        if (!select) return;

        select.innerHTML = '<option value="">Select customer</option>' +
            this.customers.map(c => `<option value="${c._id}">${c.name || '-'}</option>`).join('');
    },

    getQuotationCustomerId(quotation) {
        const directId = typeof quotation?.customerId === 'object'
            ? quotation?.customerId?._id
            : quotation?.customerId;
        if (directId) return String(directId);

        if (quotation?.customer) return String(quotation.customer);

        const quotationCustomerName = String(quotation?.customerName || '').trim().toLowerCase();
        if (!quotationCustomerName) return '';

        const matchedCustomer = this.customers.find((customer) => {
            return String(customer?.name || '').trim().toLowerCase() === quotationCustomerName;
        });

        return matchedCustomer ? String(matchedCustomer._id) : '';
    },

    getQuotationNetPrice(quotation) {
        const explicitNetPrice = Number(quotation?.totalNetPrice);
        if (Number.isFinite(explicitNetPrice)) {
            return Math.max(0, explicitNetPrice);
        }

        const items = Array.isArray(quotation?.items) ? quotation.items : [];
        if (items.length > 0) {
            const costSubtotal = items.reduce((sum, item) => {
                const qty = Number(item?.quantity || 0);
                const lineTotal = Number(item?.total);
                if (Number.isFinite(lineTotal)) return sum + lineTotal;
                return sum + (qty * Number(item?.pricePerUnit || 0));
            }, 0);

            const totalProfitFromItems = items.reduce((sum, item) => {
                const qty = Number(item?.quantity || 0);
                return sum + (qty * Number(item?.profitPerUnit || 0));
            }, 0);

            const totalProfitFromQuotation = Number(quotation?.totalProfit);
            const totalProfit = totalProfitFromItems > 0
                ? totalProfitFromItems
                : (Number.isFinite(totalProfitFromQuotation) ? totalProfitFromQuotation : 0);

            const discount = Number(quotation?.discount || 0);
            return Math.max(0, costSubtotal + totalProfit - (Number.isFinite(discount) ? discount : 0));
        }

        const subtotal = Number(quotation?.subtotal);
        const totalProfit = Number(quotation?.totalProfit || 0);
        const discount = Number(quotation?.discount || 0);
        if (Number.isFinite(subtotal)) {
            return Math.max(0, subtotal + (Number.isFinite(totalProfit) ? totalProfit : 0) - (Number.isFinite(discount) ? discount : 0));
        }

        const totalAmount = Number(quotation?.totalAmount);
        if (Number.isFinite(totalAmount)) {
            return Math.max(0, totalAmount);
        }

        return 0;
    },

    populateQuotationDropdown() {
        const select = document.getElementById('projectQuotation');
        if (!select) return;

        const selectedCustomerId = document.getElementById('projectCustomer')?.value || '';
        const sortedQuotations = [...this.quotations].sort((a, b) => {
            if (!selectedCustomerId) return 0;
            const aMatch = String(this.getQuotationCustomerId(a) || '') === String(selectedCustomerId);
            const bMatch = String(this.getQuotationCustomerId(b) || '') === String(selectedCustomerId);
            if (aMatch === bMatch) return 0;
            return aMatch ? -1 : 1;
        });

        const options = sortedQuotations.map((q) => {
            const number = q.quotationNumber || '-';
            const netPrice = this.getQuotationNetPrice(q);
            const net = netPrice.toLocaleString('th-TH');
            const customerName = typeof q.customerId === 'object'
                ? (q.customerId?.name || q.customerName || '-')
                : (q.customerName || '-');
            return `<option value="${q._id}" data-net-price="${netPrice}">${number} - ${customerName} (THB ${net})</option>`;
        }).join('');

        const currentValue = select.dataset.currentValue || select.value || '';
        select.innerHTML = '<option value="">ไม่ผูกใบเสนอราคา</option>' + options;

        if (currentValue && sortedQuotations.some(q => String(q._id) === String(currentValue))) {
            select.value = currentValue;
        } else {
            select.value = '';
        }

    },

    findMaterialForQuotationItem(item) {
        const qName = String(item?.name || '').trim().toLowerCase();
        const qUnit = String(item?.unit || '').trim().toLowerCase();
        if (!qName) return null;

        const exact = this.materials.find((m) => {
            const mName = String(m?.name || '').trim().toLowerCase();
            const mUnit = String(m?.unit || '').trim().toLowerCase();
            return mName === qName && (!qUnit || mUnit === qUnit);
        });
        if (exact) return exact;

        return this.materials.find((m) => String(m?.name || '').trim().toLowerCase() === qName) || null;
    },

    applyQuotationToProjectFields(quotation) {
        if (!quotation) return;

        const quotationSelect = document.getElementById('projectQuotation');
        const customerSelect = document.getElementById('projectCustomer');
        const nameInput = document.getElementById('projectName');
        const descInput = document.getElementById('projectDescription');
        const customerId = this.getQuotationCustomerId(quotation);

        if (customerSelect && customerId) {
            this.isSyncingFromQuotation = true;
            customerSelect.value = String(customerId);
            this.populateQuotationDropdown();
            if (quotationSelect) {
                quotationSelect.dataset.currentValue = String(quotation._id || '');
                quotationSelect.value = String(quotation._id || '');
            }
            this.isSyncingFromQuotation = false;
        }

        if (nameInput && !nameInput.value.trim()) {
            nameInput.value = quotation.quotationNumber ? `Project ${quotation.quotationNumber}` : 'Project จากใบเสนอราคา';
        }

        const quotationItems = Array.isArray(quotation.items) ? quotation.items : [];
        const mappedMaterials = [];
        const unmatchedItems = [];

        quotationItems.forEach((item) => {
            const qty = Number(item?.quantity || 0);
            if (!Number.isFinite(qty) || qty <= 0) return;

            const matched = this.findMaterialForQuotationItem(item);
            if (!matched) {
                unmatchedItems.push(item?.name || '-');
                return;
            }

            const unitPrice = Number(matched.unitPrice || 0);
            mappedMaterials.push({
                id: matched._id,
                sku: this.resolveMaterialCode(matched),
                name: matched.name || '-',
                spec: matched.specification || '',
                unit: matched.unit || item.unit || '',
                qty,
                price: unitPrice,
                total: qty * unitPrice
            });
        });

        this.projectMaterials = mappedMaterials;
        this.renderProjectMaterialsList();

        if (descInput && !descInput.value.trim()) {
            const quoteLabel = quotation.quotationNumber ? `อ้างอิงใบเสนอราคา ${quotation.quotationNumber}` : 'อ้างอิงใบเสนอราคา';
            descInput.value = quoteLabel;
        }

        if (unmatchedItems.length > 0) {
            this.notify(`จับคู่วัสดุจากใบเสนอราคาไม่ได้ ${unmatchedItems.length} รายการ`, 'info');
        }
    },

    handleQuotationChange(options = {}) {
        const { shouldAutofill = true } = options;
        const quotationSelect = document.getElementById('projectQuotation');
        const sellInput = document.getElementById('projectSellPrice');
        if (!quotationSelect || !sellInput) return;

        const selectedOption = quotationSelect.selectedOptions?.[0];
        const netPrice = Number(selectedOption?.dataset?.netPrice || 0);
        sellInput.value = Number.isFinite(netPrice) ? netPrice : 0;

        if (!shouldAutofill) return;

        const quotationId = quotationSelect.value;
        if (!quotationId) return;

        const quotation = this.quotations.find((q) => String(q._id) === String(quotationId));
        if (!quotation) return;

        this.applyQuotationToProjectFields(quotation);
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
            const totalCost = Math.max(0, Number(project.totalCost || 0));
            const totalPrice = Math.max(0, Number(project.totalPrice || 0));
            const profit = totalPrice - totalCost;
            const profitClass = profit < 0 ? 'loss' : '';
            const isSuccessful = project.status === 'completed' && project.paymentStatus === 'paid';
            const cancelLocked = isSuccessful;

            return `
                <div class="project-card" data-id="${project._id}">
                    <div class="project-header">
                        <h3>${project.name || `Project #${String(project._id).slice(-6)}`}</h3>
                        ${statusBadge}
                    </div>
                    <div class="project-action-menu-wrap project-action-menu-wrap-top" data-id="${project._id}">
                        <button class="project-action-menu-toggle" data-id="${project._id}" aria-label="เปิดเมนูการจัดการ" title="เมนูการจัดการ">
                            <span></span><span></span><span></span>
                        </button>
                        <div class="project-action-menu">
                            <button class="project-menu-item view-btn" data-id="${project._id}" data-tooltip="ดูรายการวัสดุและจำนวนที่ใช้" title="ดูวัสดุ">
                                <span class="icon-char">\u{1F441}</span><span>ดูวัสดุ</span>
                            </button>
                            <button class="project-menu-item edit-btn" data-id="${project._id}" data-tooltip="แก้ไขข้อมูลพื้นฐานของโครงการ" title="แก้ไขข้อมูลโครงการ">
                                <span class="icon-char">\u270E</span><span>แก้ไข</span>
                            </button>
                            <button class="project-menu-item status-btn" data-id="${project._id}" data-tooltip="เปลี่ยนสถานะโครงการและสถานะชำระเงิน" title="อัปเดตสถานะโครงการ">
                                <span class="icon-char">\u21BB</span><span>อัปเดตสถานะ</span>
                            </button>
                            <button class="project-menu-item cancel-btn" data-id="${project._id}" data-tooltip="${cancelLocked ? 'โครงการเสร็จสิ้นและชำระแล้ว ไม่สามารถยกเลิกได้' : 'ยกเลิกโครงการและคืนสต๊อก'}" title="${cancelLocked ? 'โครงการเสร็จสิ้นและชำระแล้ว ไม่สามารถยกเลิกได้' : 'ยกเลิกโครงการและคืนสต๊อก'}" ${cancelLocked ? 'disabled' : ''}>
                                <span class="icon-char">\u21A9</span><span>ยกเลิกโครงการ</span>
                            </button>
                            <button class="project-menu-item delete-btn danger" data-id="${project._id}" data-tooltip="ลบโครงการถาวร" title="ลบโครงการ">
                                <span class="icon-char">\u{1F5D1}</span><span>ลบโครงการ</span>
                            </button>
                        </div>
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
                            <span>THB ${totalCost.toLocaleString('th-TH')}</span>
                        </div>
                        <div class="cost-item">
                            <span>Sell:</span>
                            <span>THB ${totalPrice.toLocaleString('th-TH')}</span>
                        </div>
                        <div class="cost-item profit ${profitClass}">
                            <span>Profit:</span>
                            <span>THB ${profit.toLocaleString('th-TH')}</span>
                        </div>
                    </div>
                    <div class="project-payment">${paymentBadge}</div>
                </div>
            `;
        }).join('');

        this.attachProjectEventListeners();
    },

    getStatusBadge(status) {
        const badges = {
            planning: `<span class="badge badge-planning">${this.STATUS_LABELS.planning}</span>`,
            'in-progress': `<span class="badge badge-warning">${this.STATUS_LABELS['in-progress']}</span>`,
            completed: `<span class="badge badge-success">${this.STATUS_LABELS.completed}</span>`,
            cancelled: `<span class="badge badge-danger">${this.STATUS_LABELS.cancelled}</span>`
        };

        return badges[status] || '<span class="badge">-</span>';
    },

    getPaymentBadge(paymentStatus) {
        const badges = {
            paid: `<span class="payment-status paid">${this.PAYMENT_LABELS.paid}</span>`,
            partial: `<span class="payment-status partial">${this.PAYMENT_LABELS.partial}</span>`,
            unpaid: `<span class="payment-status unpaid">${this.PAYMENT_LABELS.unpaid}</span>`
        };

        return badges[paymentStatus] || badges.unpaid;
    },

    attachProjectEventListeners() {
        document.querySelectorAll('.project-action-menu-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const wrap = e.currentTarget.closest('.project-action-menu-wrap');
                if (!wrap) return;
                const isOpen = wrap.classList.contains('open');
                this.closeAllActionMenus();
                if (!isOpen) {
                    wrap.classList.add('open');
                }
            });
        });

        document.querySelectorAll('.project-card .edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.editProject(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.project-card .view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.viewProject(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.project-card .status-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.openStatusModal(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.project-card .cancel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.cancelProject(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.project-card .delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteProject(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.project-action-menu .project-menu-item').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllActionMenus());
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

        document.getElementById('statusUpdateForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitStatusUpdate();
        });

        document.querySelector('#addProjectModal .close')?.addEventListener('click', () => {
            this.closeProjectFormModal();
        });

        document.querySelector('#addProjectMaterialModal .close')?.addEventListener('click', () => {
            closeModal('addProjectMaterialModal');
        });

        document.querySelector('#projectDetailsModal .close')?.addEventListener('click', () => {
            closeModal('projectDetailsModal');
        });

        document.querySelector('#statusUpdateModal .close')?.addEventListener('click', () => {
            closeModal('statusUpdateModal');
        });

        document.getElementById('closeProjectDetailsBtn')?.addEventListener('click', () => {
            closeModal('projectDetailsModal');
        });

        document.getElementById('cancelStatusUpdate')?.addEventListener('click', () => {
            closeModal('statusUpdateModal');
        });

        document.getElementById('cancelAddProject')?.addEventListener('click', () => {
            this.closeProjectFormModal();
        });

        document.getElementById('addProjectBtn')?.addEventListener('click', () => {
            this.currentProjectId = null;
            this.currentProjectStatus = null;
            this.isManualCostOverride = false;
            this.projectMaterials = [];
            this.renderProjectMaterialsList();
            document.getElementById('addProjectForm')?.reset();
            const quotationSelect = document.getElementById('projectQuotation');
            if (quotationSelect) {
                quotationSelect.dataset.currentValue = '';
            }
            this.populateQuotationDropdown();
            this.handleQuotationChange({ shouldAutofill: false });
            const submitBtn = document.querySelector('#addProjectForm button[type="submit"]');
            if (submitBtn) submitBtn.textContent = '\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e42\u0e04\u0e23\u0e07\u0e01\u0e32\u0e23';
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

        document.getElementById('projectCustomer')?.addEventListener('change', () => {
            const quotationSelect = document.getElementById('projectQuotation');
            if (quotationSelect && !this.isSyncingFromQuotation) {
                quotationSelect.dataset.currentValue = '';
            }
            this.populateQuotationDropdown();
            if (!this.isSyncingFromQuotation) {
                this.handleQuotationChange({ shouldAutofill: false });
            }
        });

        document.getElementById('projectQuotation')?.addEventListener('change', () => {
            this.handleQuotationChange({ shouldAutofill: true });
        });

        document.getElementById('projectCost')?.addEventListener('input', () => {
            this.isManualCostOverride = true;
        });

        document.getElementById('projectCost')?.addEventListener('change', () => {
            this.isManualCostOverride = true;
        });

        const searchInput = document.getElementById('searchProject');
        const filterPayment = document.getElementById('filterPaymentStatus');
        const filterStatus = document.getElementById('filterStatus');

        [searchInput, filterPayment, filterStatus].forEach(el => {
            el?.addEventListener('input', () => this.filterProjects());
            el?.addEventListener('change', () => this.filterProjects());
        });
    },

    closeProjectFormModal() {
        closeModal('addProjectModal');
        this.currentProjectId = null;
        this.currentProjectStatus = null;
        this.isManualCostOverride = false;
        this.projectMaterials = [];
        const quotationSelect = document.getElementById('projectQuotation');
        if (quotationSelect) {
            quotationSelect.dataset.currentValue = '';
        }
        this.renderProjectMaterialsList();
        this.populateQuotationDropdown();
        this.handleQuotationChange({ shouldAutofill: false });
    },

    async saveProject() {
        const name = document.getElementById('projectName')?.value?.trim();
        const customerId = document.getElementById('projectCustomer')?.value;
        const parsedCost = parseFloat(document.getElementById('projectCost')?.value);
        const totalCost = Number.isFinite(parsedCost) && parsedCost >= 0 ? parsedCost : 0;

        if (!name) {
            this.notify('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e01\u0e23\u0e2d\u0e01\u0e0a\u0e37\u0e48\u0e2d\u0e42\u0e04\u0e23\u0e07\u0e01\u0e32\u0e23', 'error');
            return;
        }

        if (!customerId) {
            this.notify('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32', 'error');
            return;
        }

        const quotationId = document.getElementById('projectQuotation')?.value || null;
        const linkedQuotation = quotationId
            ? this.quotations.find((q) => String(q._id) === String(quotationId))
            : null;
        const linkedQuotationNetPrice = linkedQuotation ? this.getQuotationNetPrice(linkedQuotation) : NaN;
        const fallbackSellPrice = Number(document.getElementById('projectSellPrice')?.value || 0);
        const totalPrice = Number.isFinite(linkedQuotationNetPrice) && linkedQuotationNetPrice > 0
            ? linkedQuotationNetPrice
            : fallbackSellPrice;

        const formData = {
            name,
            customerId,
            quotationId,
            totalCost,
            totalPrice,
            team: document.getElementById('projectTeam')?.value || '',
            startDate: document.getElementById('projectStartDate')?.value || null,
            endDate: document.getElementById('projectEndDate')?.value || null,
            description: document.getElementById('projectDescription')?.value || '',
            materials: this.projectMaterials.map(item => ({ id: item.id, qty: item.qty }))
        };

        await this.withActionLock(`save:${this.currentProjectId || 'new'}`, null, async () => {
            try {
                if (this.currentProjectId) {
                    await api.projects.update(this.currentProjectId, formData);
                    this.notify('\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e01\u0e32\u0e23\u0e41\u0e01\u0e49\u0e44\u0e02\u0e42\u0e04\u0e23\u0e07\u0e01\u0e32\u0e23\u0e41\u0e25\u0e49\u0e27');
                } else {
                    await api.projects.create(formData);
                    this.notify('\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e42\u0e04\u0e23\u0e07\u0e01\u0e32\u0e23\u0e41\u0e25\u0e49\u0e27');
                }

                this.closeProjectFormModal();
                document.getElementById('addProjectForm')?.reset();
                await this.loadProjects();
            } catch (error) {
                console.error('Error saving project:', error);
                this.notify(error.message || '\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e42\u0e04\u0e23\u0e07\u0e01\u0e32\u0e23\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08', 'error');
            }
        });
    },

    editProject(id) {
        const project = this.projects.find(p => p._id === id);
        if (!project) return;

        this.currentProjectId = id;
        this.currentProjectStatus = project.status || null;
        this.isManualCostOverride = true;
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
            projectSellPrice: Number(project.totalPrice || 0),
            projectTeam: project.team || '',
            projectStartDate: project.startDate ? String(project.startDate).split('T')[0] : '',
            projectEndDate: project.endDate ? String(project.endDate).split('T')[0] : '',
            projectCost: project.totalCost || 0,
            projectDescription: project.description || ''
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const el = document.getElementById(fieldId);
            if (el && value !== undefined && value !== null) {
                el.value = value;
            }
        });

        const quotationSelect = document.getElementById('projectQuotation');
        const projectQuotation = typeof project.quotationId === 'object' ? project.quotationId?._id : project.quotationId;
        if (quotationSelect) {
            quotationSelect.dataset.currentValue = projectQuotation ? String(projectQuotation) : '';
        }
        this.populateQuotationDropdown();
        this.handleQuotationChange({ shouldAutofill: false });

        const submitBtn = document.querySelector('#addProjectForm button[type="submit"]');
        if (submitBtn) submitBtn.textContent = '\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e42\u0e04\u0e23\u0e07\u0e01\u0e32\u0e23';

        openModal('addProjectModal');
    },

    viewProject(id) {
        const project = this.projects.find(p => p._id === id);
        if (!project) return;

        this.openProjectDetailsModal(project);
    },

    openProjectDetailsModal(project) {
        const customerName = project.customerId?.name || '-';
        const detailTitle = document.getElementById('projectDetailTitle');
        const detailMeta = document.getElementById('projectDetailMeta');
        const detailSummary = document.getElementById('projectDetailSummary');
        const detailMaterials = document.getElementById('projectDetailMaterials');

        if (detailTitle) {
            detailTitle.textContent = project.name || 'Project Details';
        }

        if (detailMeta) {
            detailMeta.innerHTML = `
                <span><strong>Customer:</strong> ${customerName}</span>
                <span><strong>Team:</strong> ${project.team || '-'}</span>
                <span><strong>Start:</strong> ${project.startDate ? new Date(project.startDate).toLocaleDateString('th-TH') : '-'}</span>
                <span><strong>End:</strong> ${project.endDate ? new Date(project.endDate).toLocaleDateString('th-TH') : '-'}</span>
                <span><strong>Status:</strong> ${this.STATUS_LABELS[project.status] || '-'}</span>
                <span><strong>Payment:</strong> ${this.PAYMENT_LABELS[project.paymentStatus] || '-'}</span>
            `;
        }

        const materialItems = Array.isArray(project.materials) ? project.materials : [];
        const totalQty = materialItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
        const totalCost = Math.max(0, Number(project.totalCost || 0));

        if (detailSummary) {
            detailSummary.innerHTML = `
                <div class="project-detail-stat">
                    <span>Materials</span>
                    <strong>${materialItems.length} items</strong>
                </div>
                <div class="project-detail-stat">
                    <span>Total Quantity</span>
                    <strong>${totalQty.toLocaleString('th-TH')}</strong>
                </div>
                <div class="project-detail-stat">
                    <span>Total Cost</span>
                    <strong>THB ${totalCost.toLocaleString('th-TH')}</strong>
                </div>
            `;
        }

        if (detailMaterials) {
            if (!materialItems.length) {
                detailMaterials.innerHTML = `
                    <tr>
                        <td colspan="5" class="empty-materials">No materials in this project</td>
                    </tr>
                `;
            } else {
                detailMaterials.innerHTML = materialItems.map((item) => `
                    <tr>
                        <td>${this.resolveMaterialCode(item)}</td>
                        <td>${item.name || '-'}</td>
                        <td>${item.specification || '-'}</td>
                        <td>${Number(item.qty || 0).toLocaleString('th-TH')} ${item.unit || ''}</td>
                        <td>THB ${Number(item.total || 0).toLocaleString('th-TH')}</td>
                    </tr>
                `).join('');
            }
        }

        openModal('projectDetailsModal');
    },

    openStatusModal(id) {
        const project = this.projects.find(p => p._id === id);
        if (!project) return;

        this.currentStatusProjectId = id;

        const title = document.getElementById('statusProjectTitle');
        if (title) {
            title.textContent = `${project.name || 'Project'} (${this.STATUS_LABELS[project.status] || '-'})`;
        }

        const statusEl = document.getElementById('statusUpdateValue');
        const paymentEl = document.getElementById('statusPaymentValue');
        if (statusEl) statusEl.value = project.status || 'planning';
        if (paymentEl) paymentEl.value = project.paymentStatus || 'unpaid';

        openModal('statusUpdateModal');
    },

    async submitStatusUpdate() {
        if (!this.currentStatusProjectId) return;

        const currentProject = this.projects.find(p => p._id === this.currentStatusProjectId);
        if (!currentProject) return;
        const status = document.getElementById('statusUpdateValue')?.value || 'planning';
        const paymentStatus = document.getElementById('statusPaymentValue')?.value || 'unpaid';

        const confirmed = await this.confirm({
            title: '\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e2a\u0e16\u0e32\u0e19\u0e30',
            message: '\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e01\u0e32\u0e23\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e42\u0e04\u0e23\u0e07\u0e01\u0e32\u0e23\u0e2b\u0e23\u0e37\u0e2d\u0e44\u0e21\u0e48?',
            confirmText: '\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15',
            cancelText: '\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01',
            variant: 'info'
        });
        if (!confirmed) return;

        await this.withActionLock(`status:${this.currentStatusProjectId}`, this.currentStatusProjectId, async () => {
            try {
                const updated = await api.projects.updateStatus(this.currentStatusProjectId, {
                    status,
                    paymentStatus,
                    userId: this.getCurrentUserId()
                });

                // If backend is old and status endpoint fell back to PUT, sync inventory manually.
                if (updated?.__fallbackUsed) {
                    const wasInProgress = currentProject.status === 'in-progress';
                    const wasCancelled = currentProject.status === 'cancelled';
                    const toInProgress = status === 'in-progress';
                    const toCancelled = status === 'cancelled';

                    if (!wasInProgress && toInProgress) {
                        await this.applyManualStockOut(currentProject);
                    }
                    if (!wasCancelled && toCancelled) {
                        await this.applyManualStockRestore(currentProject);
                    }
                }

                closeModal('statusUpdateModal');
                this.notify('\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e41\u0e25\u0e49\u0e27');
                await this.loadProjects();
            } catch (error) {
                console.error('Error updating status:', error);
                this.notify(error.message || '\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08', 'error');
            }
        });
    },

    async cancelProject(id) {
        const project = this.projects.find(p => p._id === id);
        if (!project) return;
        if (project.status === 'completed' && project.paymentStatus === 'paid') {
            this.notify('โครงการเสร็จสิ้นและชำระเงินแล้ว ไม่สามารถยกเลิกได้', 'error');
            return;
        }

        const confirmed = await this.confirm({
            title: '\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e42\u0e04\u0e23\u0e07\u0e01\u0e32\u0e23',
            message: '\u0e01\u0e23\u0e13\u0e35\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e08\u0e30\u0e04\u0e37\u0e19\u0e2a\u0e15\u0e4a\u0e2d\u0e01\u0e17\u0e35\u0e48\u0e40\u0e04\u0e22\u0e15\u0e31\u0e14\u0e44\u0e1b\u0e41\u0e25\u0e49\u0e27 \u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e2b\u0e23\u0e37\u0e2d\u0e44\u0e21\u0e48?',
            confirmText: '\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e42\u0e04\u0e23\u0e07\u0e01\u0e32\u0e23',
            cancelText: '\u0e01\u0e25\u0e31\u0e1a',
            variant: 'danger'
        });
        if (!confirmed) return;

        await this.withActionLock(`cancel:${id}`, id, async () => {
            try {
                const updated = await api.projects.cancel(id, { userId: this.getCurrentUserId() });

                if (updated?.__fallbackUsed) {
                    await this.applyManualStockRestore(project);
                }

                this.notify('\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e42\u0e04\u0e23\u0e07\u0e01\u0e32\u0e23\u0e41\u0e25\u0e30\u0e04\u0e37\u0e19\u0e2a\u0e15\u0e4a\u0e2d\u0e01\u0e41\u0e25\u0e49\u0e27');
                await this.loadProjects();
            } catch (error) {
                console.error('Error cancelling project:', error);
                this.notify(error.message || '\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e42\u0e04\u0e23\u0e07\u0e01\u0e32\u0e23\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08', 'error');
            }
        });
    },

    async deleteProject(id) {
        const project = this.projects.find(p => p._id === id);
        if (!project) return;

        const confirmed = await this.confirm({
            title: 'Delete Project',
            message: `Do you want to delete "${project.name || 'this project'}"?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger'
        });
        if (!confirmed) return;

        await this.withActionLock(`delete:${id}`, id, async () => {
            try {
                await api.projects.delete(id);
                this.notify('Project deleted');
                await this.loadProjects();
            } catch (error) {
                console.error('Error deleting project:', error);
                this.notify(error.message || 'Unable to delete project', 'error');
            }
        });
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

