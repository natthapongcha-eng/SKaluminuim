// ===== Inventory Page Controller =====
const InventoryPage = {
    items: [],
    currentItemId: null,
    stockAction: 'in', // 'in' or 'out'

    async init() {
        this.prepareStockOutModal();
        this.ensureGeneralUseColumn();
        await this.loadInventory();
        this.setupEventListeners();
    },

    async loadInventory() {
        try {
            const items = await api.inventory.getAll();
            this.items = items;
            this.renderInventoryTable(items);
            this.updateStats();
        } catch (error) {
            console.error('Error loading inventory:', error);
            this.items = [];
        }
    },

    renderInventoryTable(items) {
        const tbody = document.getElementById('inventoryList');
        if (!tbody) return;

        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align: center; padding: 40px; color: #666;">
                        ยังไม่มีข้อมูลวัสดุ คลิก "+ เพิ่มวัสดุใหม่" เพื่อเพิ่มวัสดุ
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = items.map(item => {
            const isLow = item.quantity <= (item.minimumThreshold || 10);
            const typeLabel = item.type === 'NEW' ? 'วัสดุใหม่' : 'เศษวัสดุ';
            const typeBadge = item.type === 'NEW' ? 'badge-new' : 'badge-scrap';

            return `
                <tr data-id="${item._id}">
                    <td>${item._id.slice(-6).toUpperCase()}</td>
                    <td>${item.name}</td>
                    <td>${item.specification || '-'}</td>
                    <td><span class="badge ${typeBadge}">${typeLabel}</span></td>
                    <td>${item.quantity}</td>
                    <td>${item.unit || 'ชิ้น'}</td>
                    <td>${item.unitPrice?.toLocaleString('th-TH') || 0}</td>
                    <td>${item.minimumThreshold || 10}</td>
                    <td><span class="${isLow ? 'status-low' : 'status-normal'}">${isLow ? 'ใกล้หมด' : 'ปกติ'}</span></td>
                    <td>${(item.generalUseQuantity || 0).toLocaleString('th-TH')}</td>
                    <td>
                        <button class="btn-icon stock-in-btn" title="รับเข้า" data-id="${item._id}">📥</button>
                        <button class="btn-icon stock-out-btn" title="เบิกออก" data-id="${item._id}">📤</button>
                        <button class="btn-icon edit-btn" title="แก้ไข" data-id="${item._id}">✏️</button>
                        <button class="btn-icon delete-btn" title="ลบ" data-id="${item._id}">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');

        this.attachRowEventListeners();
    },

    attachRowEventListeners() {
        document.querySelectorAll('.stock-in-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.openStockModal(id, 'in');
            });
        });

        document.querySelectorAll('.stock-out-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.openStockModal(id, 'out');
            });
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.editItem(id);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.deleteItem(id);
            });
        });
    },

    updateStats() {
        const totalItems = this.items.length;
        const lowStock = this.items.filter(i => i.quantity <= (i.minimumThreshold || 10)).length;
        const normalStock = totalItems - lowStock;

        const statCards = document.querySelectorAll('.stat-card .stat-info h3');
        if (statCards.length >= 3) {
            statCards[0].textContent = totalItems;
            statCards[1].textContent = lowStock;
            statCards[2].textContent = normalStock;
        }
    },

    ensureGeneralUseColumn() {
        const headerRow = document.querySelector('.data-table thead tr');
        if (!headerRow) return;

        const headers = Array.from(headerRow.querySelectorAll('th'));
        const hasGeneralUseColumn = headers.some(th => th.textContent.trim() === 'ใช้งานทั่วไป');
        if (hasGeneralUseColumn) return;

        const statusHeader = headers.find(th => th.textContent.trim() === 'สถานะ');
        if (!statusHeader) return;

        const generalUseHeader = document.createElement('th');
        generalUseHeader.textContent = 'ใช้งานทั่วไป';
        statusHeader.insertAdjacentElement('afterend', generalUseHeader);
    },

    prepareStockOutModal() {
        const projectGroup = document.getElementById('stockProjectGroup');
        const projectSelect = document.getElementById('stockProject');
        if (projectGroup) projectGroup.style.display = 'none';
        if (projectSelect) {
            projectSelect.value = '';
            projectSelect.required = false;
        }
    },

    getCurrentActor() {
        try {
            const raw = sessionStorage.getItem('user');
            const user = raw ? JSON.parse(raw) : null;
            if (!user || typeof user !== 'object') return { id: '', name: '' };

            const firstName = String(user.firstName || '').trim();
            const lastName = String(user.lastName || '').trim();
            const fullName = `${firstName} ${lastName}`.trim();

            return {
                id: user.id || user._id || '',
                name: fullName || user.name || user.email || ''
            };
        } catch (error) {
            return { id: '', name: '' };
        }
    },

    setupEventListeners() {
        const addMaterialBtn = document.getElementById('addMaterialBtn');
        addMaterialBtn?.addEventListener('click', () => {
            this.currentItemId = null;
            this.setAddMaterialModalTitle('เพิ่มวัสดุใหม่');
        });

        const addMaterialForm = document.getElementById('addMaterialForm');
        if (addMaterialForm) {
            addMaterialForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.addMaterial();
            });
        }

        const stockForm = document.getElementById('stockForm');
        if (stockForm) {
            stockForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.processStock();
            });
        }

        const cancelStockBtn = document.getElementById('cancelStock');
        cancelStockBtn?.addEventListener('click', () => {
            closeModal('stockModal');
        });

        const searchInput = document.getElementById('searchMaterial');
        const filterType = document.getElementById('filterType');
        const filterStock = document.getElementById('filterStock');

        [searchInput, filterType, filterStock].forEach(el => {
            el?.addEventListener('input', () => this.filterInventory());
            el?.addEventListener('change', () => this.filterInventory());
        });
    },

    async addMaterial() {
        const formData = {
            name: document.getElementById('materialName').value,
            specification: document.getElementById('materialSpecification').value,
            type: document.getElementById('materialType').value,
            quantity: parseInt(document.getElementById('materialQuantity').value) || 0,
            unit: document.getElementById('materialUnit').value || 'ชิ้น',
            unitPrice: parseFloat(document.getElementById('materialPrice').value) || 0,
            minimumThreshold: parseInt(document.getElementById('materialMinimum').value) || 10
        };

        try {
            if (this.currentItemId) {
                await api.inventory.update(this.currentItemId, formData);
                alert('แก้ไขวัสดุเรียบร้อย');
            } else {
                await api.inventory.create(formData);
                alert('เพิ่มวัสดุเรียบร้อย');
            }

            closeModal('addMaterialModal');
            document.getElementById('addMaterialForm').reset();
            this.currentItemId = null;
            this.setAddMaterialModalTitle('เพิ่มวัสดุใหม่');
            await this.loadInventory();
        } catch (error) {
            console.error('Error saving material:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
        }
    },

    setAddMaterialModalTitle(title) {
        const titleElement = document.querySelector('#addMaterialModal h2');
        if (titleElement) {
            titleElement.textContent = title;
        }
    },

    openStockModal(id, action) {
        this.currentItemId = id;
        this.stockAction = action;

        const item = this.items.find(i => i._id === id);
        if (!item) return;

        document.getElementById('stockModalTitle').textContent = action === 'in' ? 'รับวัสดุเข้า' : 'เบิกวัสดุออก';
        document.getElementById('stockMaterialName').value = item.name;
        document.getElementById('stockQuantity').value = '';
        document.getElementById('stockNote').value = '';
        this.prepareStockOutModal();

        openModal('stockModal');
    },

    async processStock() {
        const quantityInput = document.getElementById('stockQuantity');
        const quantity = Number(quantityInput ? quantityInput.value : '');
        const note = document.getElementById('stockNote').value.trim();

        if (Number.isNaN(quantity) || quantity <= 0) {
            alert('กรุณาระบุจำนวนที่ถูกต้อง');
            return;
        }

        try {
            const actor = this.getCurrentActor();
            if (this.stockAction === 'in') {
                await api.inventory.stockIn(this.currentItemId, {
                    quantity,
                    reason: note,
                    userId: actor.id,
                    createdByName: actor.name
                });
            } else {
                await api.inventory.stockOut(this.currentItemId, {
                    quantity,
                    reason: note,
                    userId: actor.id,
                    createdByName: actor.name
                });
            }

            alert('บันทึกการเคลื่อนไหววัสดุเรียบร้อย');
            closeModal('stockModal');
            await this.loadInventory();
        } catch (error) {
            console.error('Error processing stock:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
        }
    },

    editItem(id) {
        const item = this.items.find(i => i._id === id);
        if (!item) return;

        this.currentItemId = id;

        document.getElementById('materialName').value = item.name;
        document.getElementById('materialSpecification').value = item.specification || '';
        document.getElementById('materialType').value = item.type;
        document.getElementById('materialQuantity').value = item.quantity;
        document.getElementById('materialUnit').value = item.unit || 'ชิ้น';
        document.getElementById('materialPrice').value = item.unitPrice;
        document.getElementById('materialMinimum').value = item.minimumThreshold || 10;

        this.setAddMaterialModalTitle('แก้ไขวัสดุ');
        openModal('addMaterialModal');
    },

    async deleteItem(id) {
        if (!confirm('ต้องการลบวัสดุนี้หรือไม่?')) return;

        try {
            await api.inventory.delete(id);
            alert('ลบวัสดุเรียบร้อย');
            await this.loadInventory();
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
        }
    },

    filterInventory() {
        const search = document.getElementById('searchMaterial')?.value.toLowerCase() || '';
        const type = document.getElementById('filterType')?.value || 'all';
        const stock = document.getElementById('filterStock')?.value || 'all';

        const filtered = this.items.filter(item => {
            const matchSearch = item.name.toLowerCase().includes(search) ||
                                (item.specification || '').toLowerCase().includes(search);
            const matchType = type === 'all' || item.type === type;
            const isLow = item.quantity <= (item.minimumThreshold || 10);
            const matchStock = stock === 'all' ||
                (stock === 'low' && isLow) ||
                (stock === 'normal' && !isLow);

            return matchSearch && matchType && matchStock;
        });

        this.renderInventoryTable(filtered);
    },

    exportToExcel() {
        const data = this.items.map(item => ({
            'รหัสวัสดุ': item._id.slice(-6).toUpperCase(),
            'ชื่อวัสดุ': item.name,
            'ประเภท': item.type === 'NEW' ? 'วัสดุใหม่' : 'เศษวัสดุ',
            'จำนวนคงเหลือ': item.quantity,
            'หน่วย': item.unit || 'ชิ้น',
            'ราคา/หน่วย': item.unitPrice,
            'จำนวนขั้นต่ำ': item.minimumThreshold || 10,
            'สถานะ': item.quantity <= (item.minimumThreshold || 10) ? 'ใกล้หมด' : 'ปกติ',
            'ใช้งานทั่วไป': item.generalUseQuantity || 0
        }));

        ExportUtils.exportToExcel(data, 'inventory');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('addMaterialBtn')) {
        InventoryPage.init();
    }
});
