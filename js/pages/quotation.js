// ===== Quotation Page Controller =====
const QuotationPage = {
    quotations: [],
    currentQuotation: null,
    customers: [],
    inventoryItems: [],
    quotationItems: [],
    pendingQuotationItems: [],
    filteredInventoryItems: [],
    selectedInventoryItem: null,

    // Initialize quotation page
    async init() {
        await Promise.all([
            this.loadCustomers(),
            this.loadInventory()
        ]);
        this.setupEventListeners();
        this.initNewQuotation();
    },

    // Load customers for selection
    async loadCustomers() {
        try {
            this.customers = await api.customers.getAll();
            this.populateCustomerSelect();
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    },

    // Load inventory items for item selection
    async loadInventory() {
        try {
            this.inventoryItems = await api.inventory.getAll();
            this.populateItemSelect();
        } catch (error) {
            console.error('Error loading inventory:', error);
        }
    },

    // Populate customer select
    populateCustomerSelect() {
        const select = document.getElementById('selectCustomer');
        if (!select) return;

        select.innerHTML = '<option value="">เลือกลูกค้า</option>' +
            this.customers.map(c => `
                <option value="${c._id}" 
                    data-name="${c.name}" 
                    data-address="${c.address || ''}" 
                    data-phone="${c.phone || ''}">
                    ${c.name}
                </option>
            `).join('');
    },

    // Populate item select in modal
    populateItemSelect() {
        this.renderInventoryCatalog('');
    },

    normalizeName(name) {
        return String(name || '').trim().toLowerCase();
    },

    formatMaterialType(type) {
        const normalizedType = String(type || '').trim().toUpperCase();
        if (normalizedType === 'NEW') return 'วัสดุใหม่';
        if (normalizedType === 'SCRAP') return 'เศษวัสดุ';
        return type || '-';
    },

    roundMoney(value) {
        const numeric = Number(value || 0);
        return Math.round(numeric * 100) / 100;
    },

    getCustomerUnitPrice(item) {
        const unitPrice = Number(item?.unitPrice ?? item?.pricePerUnit ?? 0);
        const profitPerUnit = Number(item?.profitPerUnit || 0);
        return this.roundMoney(unitPrice + profitPerUnit);
    },

    getItemNetTotal(item) {
        const quantity = Number(item?.quantity || 0);
        return this.roundMoney(quantity * this.getCustomerUnitPrice(item));
    },

    renderInventoryCatalog(query) {
        const tbody = document.getElementById('inventoryCatalogBody');
        if (!tbody) return;

        const q = this.normalizeName(query);
        this.filteredInventoryItems = this.inventoryItems.filter(item => {
            if (!q) return true;
            const sku = this.normalizeName((item._id || '').slice(-6).toUpperCase());
            const name = this.normalizeName(item.name);
            const spec = this.normalizeName(item.specification || '');
            return sku.includes(q) || name.includes(q) || spec.includes(q);
        });

        if (this.filteredInventoryItems.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="6" style="padding: 12px; text-align: center; color: #6b7280;">ไม่พบวัสดุที่ค้นหา</td></tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredInventoryItems.map(item => {
            const sku = (item._id || '').slice(-6).toUpperCase();
            const unit = item.unit || 'ชิ้น';
            const quantity = Number(item.quantity || 0).toLocaleString('th-TH');
            const isSelected = this.selectedInventoryItem?._id === item._id;
            return `
                <tr class="inventory-catalog-row ${isSelected ? 'selected' : ''}" data-id="${item._id}" style="cursor:pointer; background:${isSelected ? '#e0ecff' : '#fff'};">
                    <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${sku}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${item.name || '-'}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${item.specification || '-'}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align:center;">${this.formatMaterialType(item.type)}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align:right;">${quantity}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align:center;">${unit}</td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.inventory-catalog-row').forEach(row => {
            row.addEventListener('click', () => {
                const id = row.dataset.id;
                const selected = this.inventoryItems.find(item => item._id === id);
                if (!selected) return;
                this.selectedInventoryItem = selected;
                const priceInput = document.getElementById('cartUnitPrice');
                if (priceInput) {
                    const unitPrice = selected.unitPrice ?? selected.pricePerUnit ?? 0;
                    priceInput.value = String(unitPrice);
                }
                this.renderInventoryCatalog(document.getElementById('inventorySearchInput')?.value || '');
            });
        });
    },

    // Initialize new quotation
    async initNewQuotation() {
        this.quotationItems = [];
        this.pendingQuotationItems = [];
        
        // Reset additional profit input in modal

        
        // Get next quotation number
        try {
            const result = await api.quotations.getNextNumber();
            const quotationNumberInput = document.getElementById('quotationNumber');
            if (quotationNumberInput) {
                quotationNumberInput.value = result.quotationNumber || result.number || 'QT-001';
            }
        } catch (error) {
            const quotationNumberInput = document.getElementById('quotationNumber');
            if (quotationNumberInput) {
                quotationNumberInput.value = 'QT-001';
            }
        }

        // Set current date
        const today = new Date();
        document.getElementById('quotationDate').textContent = today.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        this.renderQuotationItems();
        this.updateQuotationTotal();
        this.resetPaymentFields();
    },

    resetPaymentFields() {
        document.querySelectorAll('input[name="paymentStatus"]').forEach((radio) => {
            radio.checked = false;
        });

        const paymentDateInput = document.getElementById('paymentDate');
        if (paymentDateInput) paymentDateInput.value = '';

        const paymentNoteInput = document.getElementById('paymentNote');
        if (paymentNoteInput) paymentNoteInput.value = '';
    },

    // Setup event listeners
    setupEventListeners() {
        // Customer selection
        const selectCustomer = document.getElementById('selectCustomer');
        selectCustomer?.addEventListener('change', (e) => {
            const option = e.target.selectedOptions[0];
            if (option && option.value) {
                document.getElementById('customerName').textContent = option.dataset.name || '';
                document.getElementById('customerAddress').textContent = option.dataset.address || '';
                document.getElementById('customerPhone').textContent = option.dataset.phone || '';
            }
        });

        // Add item form
        const addItemForm = document.getElementById('addItemForm');
        if (addItemForm) {
            addItemForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addItemToQuotation();
            });
        }

        document.getElementById('addItemBtn')?.addEventListener('click', () => {
            this.openAddItemModal();
        });

        document.getElementById('closeAddItemModal')?.addEventListener('click', () => {
            this.closeAddItemModal();
        });
        document.getElementById('cancelAddItemModal')?.addEventListener('click', () => {
            this.closeAddItemModal();
        });
        document.getElementById('confirmAddItemsBtn')?.addEventListener('click', () => {
            this.commitPendingItemsToQuotation();
        });

        const inventorySearchInput = document.getElementById('inventorySearchInput');
        inventorySearchInput?.addEventListener('input', () => {
            this.renderInventoryCatalog(inventorySearchInput.value || '');
        });

        // Create new quotation button
        document.getElementById('createQuotationBtn')?.addEventListener('click', async () => {
            let shouldCreate = false;

            if (typeof showStyledConfirm === 'function') {
                shouldCreate = await showStyledConfirm({
                    title: 'สร้างใบเสนอราคาใหม่',
                    message: 'สร้างใบเสนอราคาใหม่? ข้อมูลปัจจุบันจะถูกล้าง',
                    confirmText: 'สร้างใหม่',
                    cancelText: 'ยกเลิก',
                    variant: 'info'
                });
            } else {
                shouldCreate = window.confirm('สร้างใบเสนอราคาใหม่? ข้อมูลปัจจุบันจะถูกล้าง');
            }

            if (shouldCreate) {
                this.initNewQuotation();
                document.getElementById('customerName').textContent = '';
                document.getElementById('customerAddress').textContent = '';
                document.getElementById('customerPhone').textContent = '';
                document.getElementById('selectCustomer').value = '';
            }
        });

        // Save quotation
        document.getElementById('saveQuotationBtn')?.addEventListener('click', () => {
            this.saveQuotation();
        });

        // Print quotation
        document.getElementById('printQuotationBtn')?.addEventListener('click', () => {
            this.printQuotation();
        });
    },

    // Add item to quotation
    addItemToQuotation() {
        const quantityInput = document.getElementById('cartQuantity');
        const priceInput = document.getElementById('cartUnitPrice');
        const quantity = parseFloat(quantityInput?.value ?? '') || 0;
        const unitPrice = parseFloat(priceInput?.value ?? '') || 0;

        if (!this.selectedInventoryItem) {
            alert('กรุณาเลือกวัสดุจากรายการวัสดุจากคลัง');
            return;
        }

        const name = (this.selectedInventoryItem.name || '').trim();
        const unit = this.selectedInventoryItem.unit || 'ชิ้น';
        const specification = this.selectedInventoryItem.specification || '-';
        const sku = (this.selectedInventoryItem._id || '').slice(-6).toUpperCase();

        if (!name || !quantity || !unit || !unitPrice) {
            alert('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        const incomingTotal = quantity * unitPrice;
        const existingPendingItem = this.pendingQuotationItems.find(item => item.sku === sku);

        if (existingPendingItem) {
            const mergedQuantity = Number(existingPendingItem.quantity || 0) + quantity;
            const mergedTotal = Number(existingPendingItem.total || 0) + incomingTotal;

            existingPendingItem.quantity = mergedQuantity;
            existingPendingItem.total = mergedTotal;
            existingPendingItem.unitPrice = mergedQuantity > 0 ? (mergedTotal / mergedQuantity) : 0;
        } else {
            this.pendingQuotationItems.push({
                sku,
                name,
                specification,
                quantity,
                unit,
                unitPrice,
                total: incomingTotal,
                profitPerUnit: 0
            });
        }

        this.renderPendingCart();
        this.clearItemEntryFields();
    },

    openAddItemModal() {
        this.pendingQuotationItems = [];
        this.renderPendingCart();
        this.clearItemEntryFields();
        this.populateItemSelect();
        openModal('addItemModal');
    },

    closeAddItemModal() {
        this.pendingQuotationItems = [];
        this.renderPendingCart();
        this.clearItemEntryFields();
        closeModal('addItemModal');
    },

    clearItemEntryFields() {
        const searchInput = document.getElementById('inventorySearchInput');
        const quantityInput = document.getElementById('cartQuantity');
        const priceInput = document.getElementById('cartUnitPrice');

        if (searchInput) searchInput.value = '';
        if (quantityInput) quantityInput.value = '';
        if (priceInput) priceInput.value = '';
        this.selectedInventoryItem = null;
        this.renderInventoryCatalog('');
    },

    renderPendingCart() {
        const list = document.getElementById('pendingItemsTableBody');
        const summary = document.getElementById('pendingCartSummary');
        if (!list || !summary) return;

        if (this.pendingQuotationItems.length === 0) {
            list.innerHTML = '<tr><td colspan="7" style="padding: 10px; text-align: center; color: #6b7280;">ยังไม่มีรายการที่เลือก</td></tr>';
            summary.textContent = 'รวม 0 รายการ | ฿0';
            return;
        }

        list.innerHTML = this.pendingQuotationItems.map((item, index) => `
            <tr>
                <td style="padding: 8px; border-bottom:1px solid #e5e7eb;">${item.sku || '-'}</td>
                <td style="padding: 8px; border-bottom:1px solid #e5e7eb;">${item.name}</td>
                <td style="padding: 8px; border-bottom:1px solid #e5e7eb;">${item.specification || '-'}</td>
                <td style="padding: 8px; border-bottom:1px solid #e5e7eb; text-align:right;">${Number(item.quantity).toLocaleString('th-TH')} ${item.unit}</td>
                <td style="padding: 8px; border-bottom:1px solid #e5e7eb; text-align:right;">฿${Number(item.unitPrice).toLocaleString('th-TH')}</td>
                <td style="padding: 8px; border-bottom:1px solid #e5e7eb; text-align:right;">฿${Number(item.total).toLocaleString('th-TH')}</td>
                <td style="padding: 8px; border-bottom:1px solid #e5e7eb; text-align:center;"><button type="button" class="pending-item-remove-btn" data-index="${index}" style="border:none; background:#fee2e2; color:#b91c1c; border-radius:6px; padding:4px 7px; cursor:pointer;">✕</button></td>
            </tr>
        `).join('');

        const pendingTotal = this.pendingQuotationItems.reduce((sum, item) => sum + (item.total || 0), 0);
        summary.textContent = `รวม ${this.pendingQuotationItems.length} รายการ | ฿${pendingTotal.toLocaleString('th-TH')}`;

        list.querySelectorAll('.pending-item-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = Number(e.currentTarget.dataset.index);
                if (!Number.isInteger(index)) return;
                this.pendingQuotationItems.splice(index, 1);
                this.renderPendingCart();
            });
        });
    },

    commitPendingItemsToQuotation() {
        if (this.pendingQuotationItems.length === 0) {
            alert('กรุณาเพิ่มรายการลงตะกร้าก่อนกดตกลง');
            return;
        }

        this.pendingQuotationItems.forEach((pendingItem) => {
            const existingItem = this.quotationItems.find(item => item.sku === pendingItem.sku);

            if (existingItem) {
                const mergedQuantity = Number(existingItem.quantity || 0) + Number(pendingItem.quantity || 0);
                const mergedTotal = Number(existingItem.total || 0) + Number(pendingItem.total || 0);

                existingItem.quantity = mergedQuantity;
                existingItem.total = mergedTotal;
                existingItem.unitPrice = mergedQuantity > 0 ? (mergedTotal / mergedQuantity) : 0;
            } else {
                this.quotationItems.push({ ...pendingItem });
            }
        });

        this.pendingQuotationItems = [];
        this.renderQuotationItems();
        this.closeAddItemModal();
    },

    // Render quotation items table
    renderQuotationItems() {
        const tbody = document.getElementById('quotationItems');
        if (!tbody) return;

        let html = this.quotationItems.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td>
                    <input
                        type="text"
                        inputmode="decimal"
                        class="quotation-item-edit quotation-item-edit-number"
                        data-index="${index}"
                        data-field="quantity"
                        value="${item.quantity}"
                    >
                </td>
                <td>
                    <input
                        type="text"
                        class="quotation-item-edit quotation-item-edit-unit"
                        data-index="${index}"
                        data-field="unit"
                        value="${item.unit}"
                    >
                </td>
                <td>
                    <input
                        type="text"
                        inputmode="decimal"
                        class="quotation-item-edit quotation-item-edit-number quotation-unit-price-field"
                        data-index="${index}"
                        data-field="netUnitPrice"
                        value="${this.getCustomerUnitPrice(item)}"
                    >
                </td>
                <td>
                    <input
                        type="text"
                        inputmode="decimal"
                        class="quotation-item-edit quotation-item-edit-number"
                        data-index="${index}"
                        data-field="profitPerUnit"
                        value="${item.profitPerUnit || 0}"
                    >
                </td>
                <td class="item-total-cell" data-index="${index}">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                        <span class="item-total-value" data-index="${index}">${this.getItemNetTotal(item).toLocaleString('th-TH')}</span>
                        <button
                            type="button"
                            class="item-remove-btn no-print"
                            data-index="${index}"
                            title="ลบรายการ"
                            style="border:none; background:#fee2e2; color:#b91c1c; border-radius:6px; padding:4px 8px; cursor:pointer; font-weight:700;"
                        >
                            ลบ
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html;

        // Update total
        this.updateQuotationTotal();

        // Attach edit listeners
        document.querySelectorAll('.quotation-item-edit').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index, 10);
                const field = e.target.dataset.field;
                const item = this.quotationItems[index];
                if (!item || !field) return;

                const numericValue = parseFloat(String(e.target.value || '').replace(/,/g, ''));

                if (field === 'quantity') {
                    const quantity = numericValue;
                    item.quantity = Number.isFinite(quantity) && quantity >= 0 ? quantity : 0;
                    e.target.value = item.quantity;
                } else if (field === 'netUnitPrice') {
                    const netUnitPrice = numericValue;
                    const normalizedNetPrice = Number.isFinite(netUnitPrice) && netUnitPrice >= 0 ? this.roundMoney(netUnitPrice) : 0;
                    const currentProfitPerUnit = Number(item.profitPerUnit || 0);
                    item.unitPrice = this.roundMoney(Math.max(0, normalizedNetPrice - currentProfitPerUnit));
                    e.target.value = normalizedNetPrice;
                } else if (field === 'profitPerUnit') {
                    const profitPerUnit = numericValue;
                    item.profitPerUnit = Number.isFinite(profitPerUnit) && profitPerUnit >= 0 ? this.roundMoney(profitPerUnit) : 0;
                    e.target.value = item.profitPerUnit;
                    const netPriceInput = document.querySelector(`.quotation-item-edit[data-index="${index}"][data-field="netUnitPrice"]`);
                    if (netPriceInput) {
                        netPriceInput.value = this.getCustomerUnitPrice(item);
                    }
                } else if (field === 'unit') {
                    item.unit = (e.target.value || '').trim();
                }

                item.total = (item.quantity || 0) * (item.unitPrice || 0);
                const totalCell = document.querySelector(`.item-total-value[data-index="${index}"]`);
                if (totalCell) {
                    totalCell.textContent = this.getItemNetTotal(item).toLocaleString('th-TH');
                }
                this.updateQuotationTotal();
            });
        });

        // Attach remove listeners
        document.querySelectorAll('.item-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = Number(e.currentTarget.dataset.index);
                if (!Number.isInteger(index)) return;
                this.removeItem(index);
            });
        });
    },

    // Remove item from quotation
    removeItem(index) {
        this.quotationItems.splice(index, 1);
        this.renderQuotationItems();
    },

    // Update quotation total
    updateQuotationTotal() {
        const total = this.quotationItems.reduce((sum, item) => sum + item.total, 0);
        
        document.getElementById('totalAmount').textContent = total.toLocaleString('th-TH');
        
        // Update item-by-item profit breakdown
        const itemBreakdownSection = document.getElementById('itemProfitBreakdownSection');
        if (itemBreakdownSection) {
            const hasProfit = this.quotationItems.some(item => (item.profitPerUnit || 0) > 0);
            
            if (hasProfit) {
                itemBreakdownSection.style.display = 'block';
                
                const breakdownList = document.getElementById('itemBreakdownList');
                let totalProfit = 0;
                let totalNetPrice = 0;
                
                breakdownList.innerHTML = this.quotationItems.map(item => {
                    const quantity = item.quantity || 1;
                    const costPerUnit = item.unitPrice || 0;
                    const profitPerUnit = item.profitPerUnit || 0;
                    const netPricePerUnit = costPerUnit + profitPerUnit;
                    const itemName = `${item.name || '-'}`;
                    const profitTotal = profitPerUnit * quantity;
                    const netPriceTotal = netPricePerUnit * quantity;
                    
                    totalProfit += profitTotal;
                    totalNetPrice += netPriceTotal;
                    
                    return `
                        <div style="padding: 8px; background: #f9fafb; border-radius: 4px; font-size: 0.9rem;">
                            <div style="display: flex; justify-content: space-between;">
                                <span>${itemName}:</span>
                                <span style="font-weight: 600;">${costPerUnit.toLocaleString('th-TH', { maximumFractionDigits: 2 })} + ${profitPerUnit.toLocaleString('th-TH', { maximumFractionDigits: 2 })} = ${netPricePerUnit.toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท</span>
                            </div>
                            <div style="font-size: 0.85rem; color: #666; text-align: right; margin-top: 4px;">
                                <span>(เพิ่ม ${profitTotal.toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท)</span>
                            </div>
                        </div>
                    `;
                }).join('');
                
                // Update totals
                document.getElementById('totalProfitDisplay').textContent = totalProfit.toLocaleString('th-TH', { maximumFractionDigits: 2 });
                document.getElementById('totalNetPrice').textContent = totalNetPrice.toLocaleString('th-TH', { maximumFractionDigits: 2 });
            } else {
                itemBreakdownSection.style.display = 'none';
            }
        }

        // Update summary
        const subtotal = total;
        const grandTotal = subtotal;

        const summaryEl = document.getElementById('quotationSummary');
        if (summaryEl) {
            summaryEl.innerHTML = `
                <div class="summary-row">
                    <span>รวมเป็นเงิน:</span>
                    <span>฿${subtotal.toLocaleString('th-TH')}</span>
                </div>
                <div class="summary-row total">
                    <span>รวมทั้งสิ้น:</span>
                    <span>฿${grandTotal.toLocaleString('th-TH', { maximumFractionDigits: 2 })}</span>
                </div>
            `;
        }
    },

    // Save quotation
    async saveQuotation() {
        if (this.quotationItems.length === 0) {
            alert('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ');
            return;
        }

        const customerName = document.getElementById('customerName')?.textContent;
        if (!customerName) {
            alert('กรุณาเลือกลูกค้า');
            return;
        }

        const subtotal = this.quotationItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
        const totalProfit = this.quotationItems.reduce(
            (sum, item) => sum + (Number(item.profitPerUnit || 0) * Number(item.quantity || 0)),
            0
        );
        const totalNetPrice = subtotal + totalProfit;

        const quotationData = {
            quotationNumber: document.getElementById('quotationNumber')?.value || 'QT-001',
            customerId: document.getElementById('selectCustomer')?.value || null,
            customerName: customerName,
            customerAddress: document.getElementById('customerAddress')?.textContent,
            customerPhone: document.getElementById('customerPhone')?.textContent,
            items: this.quotationItems.map(item => ({
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                pricePerUnit: item.unitPrice ?? item.pricePerUnit ?? 0,
                total: item.total,
                profitPerUnit: Number(item.profitPerUnit || 0)
            })),
            subtotal,
            totalProfit,
            totalNetPrice,
            totalAmount: totalNetPrice,
            status: 'draft',
            createdBy: JSON.parse(sessionStorage.getItem('user'))?.id
        };

        try {
            await api.quotations.create(quotationData);
            alert('บันทึกใบเสนอราคาเรียบร้อย');
        } catch (error) {
            console.error('Error saving quotation:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
        }
    },

    // Print quotation
    printQuotation() {
        window.print();
    },

    // Export to PDF
    async exportToPDF() {
        if (this.quotationItems.length === 0) {
            alert('กรุณาเพิ่มรายการสินค้าก่อน Export PDF');
            return;
        }

        if (!window.ExportUtils || typeof window.ExportUtils.exportPrintSnapshotPdf !== 'function') {
            alert('ระบบ Export PDF ยังไม่พร้อมใช้งาน กรุณารีเฟรชหน้าอีกครั้ง');
            return;
        }

        const quotationNumberInput = document.getElementById('quotationNumber');
        const quotationNumber = quotationNumberInput?.value || quotationNumberInput?.textContent || 'QT-001';

        try {
            await ExportUtils.exportPrintSnapshotPdf('printableArea', `quotation_${quotationNumber}.pdf`);
        } catch (error) {
            console.error('Export snapshot failed, fallback to print:', error);
            window.print();
        }
    },

    // Get valid until date (30 days from now)
    getValidUntilDate() {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('createQuotationBtn')) {
        QuotationPage.init();
    }
});
