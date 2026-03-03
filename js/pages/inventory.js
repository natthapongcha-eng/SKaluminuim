// ===== Inventory Page Controller =====
const InventoryPage = {
    items: [],
    currentItemId: null,
    stockAction: 'in', // 'in' or 'out'

    // Initialize inventory page
    async init() {
        await this.loadInventory();
        this.setupEventListeners();
    },

    // Load inventory from API
    async loadInventory() {
        try {
            const items = await api.inventory.getAll();
            this.items = items;
            this.renderInventoryTable(items);
            this.updateStats();
        } catch (error) {
            console.error('Error loading inventory:', error);
            // Use empty array if API fails
            this.items = [];
        }
    },

    // Render inventory table
    renderInventoryTable(items) {
        const tbody = document.getElementById('inventoryList');
        if (!tbody) return;

        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 40px; color: #666;">
                        ยังไม่มีข้อมูลวัสดุ คลิก "+ เพิ่มวัสดุใหม่" เพื่อเพิ่มวัสดุ
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = items.map(item => {
            const isLow = item.quantity <= item.minimumThreshold;
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
                    <td>
                        <button class="btn-icon stock-in-btn" title="รับเข้า" data-id="${item._id}">📥</button>
                        <button class="btn-icon stock-out-btn" title="เบิกออก" data-id="${item._id}">📤</button>
                        <button class="btn-icon edit-btn" title="แก้ไข" data-id="${item._id}">✏️</button>
                        <button class="btn-icon delete-btn" title="ลบ" data-id="${item._id}">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach event listeners to buttons
        this.attachRowEventListeners();
    },

    // Attach event listeners to table row buttons
    attachRowEventListeners() {
        // Stock In buttons
        document.querySelectorAll('.stock-in-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.openStockModal(id, 'in');
            });
        });

        // Stock Out buttons
        document.querySelectorAll('.stock-out-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.openStockModal(id, 'out');
            });
        });

        // Edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.editItem(id);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.deleteItem(id);
            });
        });
    },

    // Update stats cards
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

    // Setup event listeners
    setupEventListeners() {
        // Add Material Form
        const addMaterialForm = document.getElementById('addMaterialForm');
        if (addMaterialForm) {
            addMaterialForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.addMaterial();
            });
        }

        // Stock Form
        const stockForm = document.getElementById('stockForm');
        if (stockForm) {
            stockForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.processStock();
            });
        }

        // Search and Filter
        const searchInput = document.getElementById('searchMaterial');
        const filterType = document.getElementById('filterType');
        const filterStock = document.getElementById('filterStock');

        [searchInput, filterType, filterStock].forEach(el => {
            el?.addEventListener('input', () => this.filterInventory());
            el?.addEventListener('change', () => this.filterInventory());
        });
    },

    // Add new material
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
                // Update existing
                await api.inventory.update(this.currentItemId, formData);
                alert('แก้ไขวัสดุเรียบร้อย');
            } else {
                // Create new
                await api.inventory.create(formData);
                alert('เพิ่มวัสดุเรียบร้อย');
            }
            
            closeModal('addMaterialModal');
            document.getElementById('addMaterialForm').reset();
            this.currentItemId = null;
            await this.loadInventory();
        } catch (error) {
            console.error('Error saving material:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
        }
    },

    // Open stock modal
    openStockModal(id, action) {
        this.currentItemId = id;
        this.stockAction = action;
        
        const item = this.items.find(i => i._id === id);
        if (!item) return;

        document.getElementById('stockModalTitle').textContent = 
            action === 'in' ? 'รับวัสดุเข้า' : 'เบิกวัสดุออก';
        document.getElementById('stockMaterialName').value = item.name;
        document.getElementById('stockQuantity').value = '';
        document.getElementById('stockNote').value = '';
        
        const projectGroup = document.getElementById('stockProjectGroup');
        const projectSelect = document.getElementById('stockProject');

        if (projectGroup && projectSelect) {
            if (action === 'out') {
                projectGroup.style.display = 'block';
                this.loadProjectsForStock(projectSelect);
            } else {
                projectGroup.style.display = 'none';
                projectSelect.innerHTML = '<option value="">เลือกโปรเจกต์</option>';
            }
        }

        openModal('stockModal');
    },

    async loadProjectsForStock(selectElement) {
        try {
            const projects = await api.projects.getAll(); // กันกรณีได้ค่าแปลก ๆ ไม่ใช่ array ก็เลิกทำงาน ไม่ map ต่อ ปกติต้องได้ค้า array
            if (!Array.isArray(projects)) return;

            selectElement.innerHTML = '<option value="">เลือกโปรเจกต์</option>' +
                projects.map(p => {
                    const customerName = p.customerId?.customerName || 'ไม่ระบุลูกค้า';
                    const shortId = (p._id || '').slice(-6).toUpperCase();
                    return `<option value="${p._id}">${customerName} (${shortId})</option>`;
                }).join('');
        } catch (error) {
            console.error('Error loading projects for stock:', error);
            selectElement.innerHTML = '<option value="">โหลดรายชื่อโปรเจกต์ไม่สำเร็จ</option>';
        }
    },

    // Process stock in/out
    async processStock() {
        const quantityInput = document.getElementById('stockQuantity');
        const quantityValue = quantityInput ? quantityInput.value : '';
        /* 
        " line ตัวแปร quantityInput มีค่าไหม? (หา element เจอไหม?)"

        ถ้ามี (True): ให้ดึงค่าที่กรอก (.value) มาใส่ใน quantityValue
        ถ้าไม่มี (False): ให้ใส่ค่าเป็นข้อความว่าง '' แทน*/
        const quantity = Number(quantityValue);
        const note = document.getElementById('stockNote').value.trim();

        if (Number.isNaN(quantity) || quantity <= 0) {
            alert('กรุณาระบุจำนวนที่ถูกต้อง');
            return;
        }

        try {
            if (this.stockAction === 'in') {
                await api.inventory.stockIn(this.currentItemId, { quantity, reason: note });
            } else {
                const projectSelect = document.getElementById('stockProject');
                const projectId = projectSelect ? projectSelect.value : ''; //ดึงค่า id ของโปรเจกต์ที่เลือกมาใช้  ถ้าไม่มี selectElement หรือไม่ได้เลือกโปรเจกต์ จะได้ค่าเป็น '' แทน

                if (!projectId) {
                    alert('กรุณาเลือกโปรเจกต์ที่ใช้วัสดุ');
                    return;
                }

                await api.inventory.stockOut(this.currentItemId, { quantity, reason: note, projectId });
            }
            
            alert('บันทึกการเคลื่อนไหววัสดุเรียบร้อย');
            closeModal('stockModal');
            await this.loadInventory();
        } catch (error) {
            console.error('Error processing stock:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
        }
    },

    // Edit item
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
        
        openModal('addMaterialModal');
    },

    // Delete item
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

    // Filter inventory
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

    // Export to Excel
    exportToExcel() {
        const data = this.items.map(item => ({
            'รหัสวัสดุ': item._id.slice(-6).toUpperCase(),
            'ชื่อวัสดุ': item.name,
            'ประเภท': item.type === 'NEW' ? 'วัสดุใหม่' : 'เศษวัสดุ',
            'จำนวนคงเหลือ': item.quantity,
            'หน่วย': item.unit || 'ชิ้น',
            'ราคา/หน่วย': item.unitPrice,
            'จำนวนขั้นต่ำ': item.minimumThreshold || 10,
            'สถานะ': item.quantity <= (item.minimumThreshold || 10) ? 'ใกล้หมด' : 'ปกติ'
        }));

        ExportUtils.exportToExcel(data, 'inventory');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('addMaterialBtn')) {
        InventoryPage.init();
    }
    /*เมื่อ DOM โหลดเสร็จ → callback นี้ทำงาน
เช็คว่ามีปุ่ม #addMaterialBtn ไหม (เพื่อแน่ใจว่าอยู่หน้า Inventory)
ถ้ามี → เรียก InventoryPage.init()*/
});