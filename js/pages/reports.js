// ===== Reports Page Controller =====
const ReportsPage = {
    allProjects: [],
    currentReportType: 'revenue',
    chartInstance: null,

    // Month navigation state
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth(), // 0-indexed

    MONTH_NAMES: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],

    STATUS_LABELS: {
        'planning': 'วางแผน',
        'in-progress': 'กำลังดำเนินการ',
        'completed': 'เสร็จสิ้น',
        'cancelled': 'ยกเลิก'
    },

    PAYMENT_LABELS: {
        'unpaid': 'ยังไม่ชำระ',
        'partial': 'ชำระบางส่วน',
        'paid': 'ชำระแล้ว'
    },

    STATUS_BADGE: {
        'planning': 'badge-info',
        'in-progress': 'badge-warning',
        'completed': 'badge-success',
        'cancelled': 'badge-danger'
    },

    PAYMENT_BADGE: {
        'unpaid': 'badge-danger',
        'partial': 'badge-warning',
        'paid': 'badge-success'
    },

    async init() {
        await this.loadAllProjects();
        this.setupEventListeners();
        this.renderRevenueChart();
        this.updateCardsByMonth();
        this.renderRevenueTable();
    },

    async loadAllProjects() {
        try {
            const data = await api.reports.getDashboard();
            this.allProjects = data.projects || [];
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            try {
                const projects = await api.projects.getAll();
                this.allProjects = Array.isArray(projects) ? projects : [];
            } catch (fallbackError) {
                console.error('Fallback project load failed:', fallbackError);
                this.allProjects = [];
            }
        }
    },

    // ===== Month Navigation =====

    updateMonthLabel() {
        const label = document.getElementById('currentMonthLabel');
        if (label) {
            label.textContent = `${this.MONTH_NAMES[this.viewMonth]} ${this.viewYear + 543}`;
        }
    },

    goToPrevMonth() {
        this.viewMonth--;
        if (this.viewMonth < 0) {
            this.viewMonth = 11;
            this.viewYear--;
        }
        this.onMonthChanged();
    },

    goToNextMonth() {
        const now = new Date();
        // Don't go beyond current month
        if (this.viewYear > now.getFullYear() ||
            (this.viewYear === now.getFullYear() && this.viewMonth >= now.getMonth())) {
            return;
        }
        this.viewMonth++;
        if (this.viewMonth > 11) {
            this.viewMonth = 0;
            this.viewYear++;
        }
        this.onMonthChanged();
    },

    onMonthChanged() {
        this.updateMonthLabel();
        this.updateNextBtnState();
        this.renderRevenueChart();
        this.updateCardsByMonth();
        // Update revenue table filtered too
        if (this.currentReportType === 'revenue') {
            this.renderRevenueTable();
        }
    },

    updateNextBtnState() {
        const btn = document.getElementById('nextMonthBtn');
        if (!btn) return;
        const now = new Date();
        const isCurrentMonth = this.viewYear === now.getFullYear() && this.viewMonth === now.getMonth();
        btn.disabled = isCurrentMonth;
        btn.style.opacity = isCurrentMonth ? '0.3' : '1';
        btn.style.cursor = isCurrentMonth ? 'not-allowed' : 'pointer';
    },

    // ===== Cards: filtered by selected month =====

    updateCardsByMonth() {
        // Filter projects completed+paid in the selected month
        const monthProjects = this.allProjects.filter(p => {
            if (p.status !== 'completed' || p.paymentStatus !== 'paid') return false;
            const d = new Date(p.endDate || p.createdAt);
            return d.getFullYear() === this.viewYear && d.getMonth() === this.viewMonth;
        });

        const totalRevenue = monthProjects.reduce((sum, p) => sum + Number(p.totalPrice || 0), 0);
        const totalCost    = monthProjects.reduce((sum, p) => sum + Number(p.totalCost   || 0), 0);
        const totalProfit  = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        const cards = document.querySelectorAll('.summary-card');
        if (cards.length >= 4) {
            const monthLabel = `${this.MONTH_NAMES[this.viewMonth]} ${this.viewYear + 543}`;

            // Revenue
            const revenueAmount = cards[0].querySelector('.amount');
            const revenueTrend  = cards[0].querySelector('.trend');
            if (revenueAmount) revenueAmount.textContent = `฿${totalRevenue.toLocaleString('th-TH')}`;
            if (revenueTrend) {
                revenueTrend.className = 'trend neutral';
                revenueTrend.textContent = `โครงการเสร็จ+ชำระแล้ว ${monthLabel}`;
            }

            // Profit
            const profitAmount = cards[1].querySelector('.amount');
            const profitTrend  = cards[1].querySelector('.trend');
            if (profitAmount) profitAmount.textContent = `฿${totalProfit.toLocaleString('th-TH')}`;
            if (profitTrend) {
                profitTrend.className = totalProfit >= 0 ? 'trend up' : 'trend down';
                profitTrend.textContent = totalProfit >= 0 ? `↑ กำไรสุทธิ ${monthLabel}` : `↓ ขาดทุน ${monthLabel}`;
            }

            // Completed Projects
            const projectsAmount = cards[2].querySelector('.amount');
            const projectsTrend  = cards[2].querySelector('.trend');
            if (projectsAmount) projectsAmount.textContent = monthProjects.length;
            if (projectsTrend) {
                projectsTrend.className = 'trend neutral';
                projectsTrend.textContent = `สถานะเสร็จสิ้น+ชำระแล้ว ${monthLabel}`;
            }

            // Margin
            const marginAmount = cards[3].querySelector('.amount');
            const marginTrend  = cards[3].querySelector('.trend');
            if (marginAmount) marginAmount.textContent = `${profitMargin.toFixed(1)}%`;
            if (marginTrend) {
                marginTrend.className = profitMargin >= 20 ? 'trend up' : (profitMargin > 0 ? 'trend neutral' : 'trend down');
                marginTrend.textContent = `(กำไร / รายได้) × 100`;
            }
        }
    },

    // ===== Revenue Chart: show 6 months ending at viewMonth =====

    renderRevenueChart() {
        this.updateMonthLabel();
        this.updateNextBtnState();

        const canvas = document.getElementById('revenueChart');
        const mockEl = canvas?.parentElement?.querySelector('.chart-mock');
        if (!canvas) return;

        // Build the 6-month window ending at viewMonth/viewYear
        const months = [];
        for (let i = 5; i >= 0; i--) {
            let m = this.viewMonth - i;
            let y = this.viewYear;
            while (m < 0) { m += 12; y--; }
            months.push({ year: y, month: m, label: `${this.MONTH_NAMES[m]} ${y + 543}`, revenue: 0, profit: 0 });
        }

        // Sum revenue & profit per month
        const completedPaid = this.allProjects.filter(
            p => p.status === 'completed' && p.paymentStatus === 'paid'
        );
        completedPaid.forEach(p => {
            const d = new Date(p.endDate || p.createdAt);
            const slot = months.find(s => s.year === d.getFullYear() && s.month === d.getMonth());
            if (slot) {
                slot.revenue += Number(p.totalPrice || 0);
                slot.profit  += Number(p.totalPrice || 0) - Number(p.totalCost || 0);
            }
        });

        const labels       = months.map(s => s.label);
        const revenueData  = months.map(s => s.revenue);
        const profitData   = months.map(s => s.profit);
        const hasData      = revenueData.some(v => v > 0);

        if (!hasData) {
            if (mockEl) {
                mockEl.style.display = 'flex';
                mockEl.innerHTML = `<p>📊 ยังไม่มีข้อมูลรายได้</p><small>จะแสดงเมื่อมีโครงการเสร็จสิ้น+ชำระแล้ว</small>`;
            }
            canvas.style.display = 'none';
            return;
        }

        if (mockEl) mockEl.style.display = 'none';
        canvas.style.display = 'block';

        // Destroy old chart instance before re-creating
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }

        try {
            if (typeof Chart === 'undefined') {
                if (mockEl) {
                    mockEl.style.display = 'flex';
                    const summaryText = months.map(s => `${s.label}: ฿${(s.revenue / 1000).toFixed(0)}K`).join(' | ');
                    mockEl.innerHTML = `<p>📊 กราฟแสดงรายได้รายเดือน</p><small>${summaryText}</small>`;
                }
                canvas.style.display = 'none';
                return;
            }

            // Gradient fills
            const ctx = canvas.getContext('2d');
            const gradBlue = ctx.createLinearGradient(0, 0, 0, 320);
            gradBlue.addColorStop(0, 'rgba(30, 100, 255, 0.25)');
            gradBlue.addColorStop(1, 'rgba(30, 100, 255, 0)');

            const gradGold = ctx.createLinearGradient(0, 0, 0, 320);
            gradGold.addColorStop(0, 'rgba(234, 179, 8, 0.22)');
            gradGold.addColorStop(1, 'rgba(234, 179, 8, 0)');

            this.chartInstance = new Chart(canvas, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'รายได้',
                            data: revenueData,
                            borderColor: 'rgba(37, 99, 235, 1)',
                            backgroundColor: gradBlue,
                            borderWidth: 3,
                            pointRadius: 5,
                            pointBackgroundColor: 'rgba(37, 99, 235, 1)',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'กำไร',
                            data: profitData,
                            borderColor: 'rgba(234, 179, 8, 1)',
                            backgroundColor: gradGold,
                            borderWidth: 3,
                            pointRadius: 5,
                            pointBackgroundColor: 'rgba(234, 179, 8, 1)',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                pointStyle: 'circle',
                                padding: 20,
                                font: { size: 13, weight: '600' }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: ctx => ` ${ctx.dataset.label}: ฿${ctx.raw.toLocaleString('th-TH')}`
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            ticks: { font: { size: 12 } }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.06)' },
                            ticks: {
                                callback: v => `฿${(v / 1000).toFixed(0)}K`,
                                font: { size: 12 }
                            }
                        }
                    }
                }
            });
        } catch (e) {
            console.warn('Chart.js render failed:', e);
        }
    },

    // ===== Revenue Table =====

    renderRevenueTable() {
        const section = document.getElementById('revenueReport');
        if (!section) return;

        // Filter by selected month
        const completedPaid = this.allProjects.filter(p => {
            if (p.status !== 'completed' || p.paymentStatus !== 'paid') return false;
            const d = new Date(p.endDate || p.createdAt);
            return d.getFullYear() === this.viewYear && d.getMonth() === this.viewMonth;
        });

        let totalCost = 0, totalSell = 0, totalProfit = 0;
        let rowsHtml = '';

        if (completedPaid.length === 0) {
            rowsHtml = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#6b7280;">ยังไม่มีโครงการที่เสร็จสิ้นและชำระแล้วในเดือนนี้</td></tr>`;
        } else {
            completedPaid.forEach(p => {
                const cost   = Number(p.totalCost  || 0);
                const sell   = Number(p.totalPrice || 0);
                const profit = sell - cost;
                const margin = sell > 0 ? ((profit / sell) * 100).toFixed(1) : '0.0';
                const customerName = typeof p.customerId === 'object' ? (p.customerId?.name || '-') : '-';
                const endDate = p.endDate ? new Date(p.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

                totalCost   += cost;
                totalSell   += sell;
                totalProfit += profit;

                rowsHtml += `
                    <tr>
                        <td>${p.name || '-'}</td>
                        <td>${customerName}</td>
                        <td>${endDate}</td>
                        <td>฿${cost.toLocaleString('th-TH')}</td>
                        <td>฿${sell.toLocaleString('th-TH')}</td>
                        <td class="${profit >= 0 ? 'profit' : 'loss'}">฿${profit.toLocaleString('th-TH')}</td>
                        <td>${margin}%</td>
                        <td><span class="badge badge-success">ชำระแล้ว</span></td>
                    </tr>
                `;
            });
        }

        const overallMargin = totalSell > 0 ? ((totalProfit / totalSell) * 100).toFixed(1) : '0.0';
        const monthLabel = `${this.MONTH_NAMES[this.viewMonth]} ${this.viewYear + 543}`;

        section.innerHTML = `
            <h2>รายงานรายได้และกำไร — ${monthLabel}</h2>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>โครงการ</th>
                            <th>ลูกค้า</th>
                            <th>วันที่เสร็จ</th>
                            <th>ต้นทุน</th>
                            <th>ราคาขาย</th>
                            <th>กำไร</th>
                            <th>อัตรากำไร</th>
                            <th>สถานะชำระ</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                    ${completedPaid.length > 0 ? `
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="3"><strong>รวมทั้งหมด</strong></td>
                            <td><strong>฿${totalCost.toLocaleString('th-TH')}</strong></td>
                            <td><strong>฿${totalSell.toLocaleString('th-TH')}</strong></td>
                            <td class="${totalProfit >= 0 ? 'profit' : 'loss'}"><strong>฿${totalProfit.toLocaleString('th-TH')}</strong></td>
                            <td><strong>${overallMargin}%</strong></td>
                            <td>-</td>
                        </tr>
                    </tfoot>
                    ` : ''}
                </table>
            </div>
        `;
    },

    // ===== Projects Report =====

    renderProjectsReport() {
        const section = document.getElementById('projectsReport');
        if (!section) return;

        const statusGroups = {};
        this.allProjects.forEach(p => {
            const status = p.status || 'planning';
            if (!statusGroups[status]) statusGroups[status] = { count: 0, totalPrice: 0, totalProfit: 0 };
            statusGroups[status].count++;
            statusGroups[status].totalPrice  += Number(p.totalPrice || 0);
            statusGroups[status].totalProfit += Number(p.totalPrice || 0) - Number(p.totalCost || 0);
        });

        let rowsHtml = '';
        ['completed', 'in-progress', 'planning', 'cancelled'].forEach(status => {
            const group = statusGroups[status];
            if (!group) return;
            const badgeClass = this.STATUS_BADGE[status] || 'badge-info';
            const label = this.STATUS_LABELS[status] || status;
            rowsHtml += `
                <tr>
                    <td><span class="badge ${badgeClass}">${label}</span></td>
                    <td>${group.count}</td>
                    <td>฿${group.totalPrice.toLocaleString('th-TH')}</td>
                    <td class="${group.totalProfit >= 0 ? 'profit' : 'loss'}">฿${group.totalProfit.toLocaleString('th-TH')}</td>
                </tr>
            `;
        });

        if (this.allProjects.length === 0) {
            rowsHtml = `<tr><td colspan="4" style="text-align:center;padding:40px;color:#6b7280;">ยังไม่มีโครงการ</td></tr>`;
        }

        section.innerHTML = `
            <h2>รายงานสรุปโครงการ</h2>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>สถานะ</th>
                            <th>จำนวนโครงการ</th>
                            <th>มูลค่ารวม</th>
                            <th>กำไรรวม</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        `;
    },

    // ===== Inventory Report =====

    async renderInventoryReport() {
        const section = document.getElementById('inventoryReport');
        if (!section) return;

        try {
            const data = await api.reports.getInventory();
            const rawItems = data?.items || [];
            const items = rawItems.filter(item => {
                const qty = Number(item.quantity || 0);
                const min = Number(item.minimumThreshold || 0);
                return qty < min;
            });

            let rowsHtml = '';
            if (items.length === 0) {
                rowsHtml = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#6b7280;">✅ ไม่มีวัสดุที่ใกล้หมดในขณะนี้</td></tr>`;
            } else {
                items.forEach(item => {
                    const materialCode = item._id ? String(item._id).slice(-6).toUpperCase() : '-';
                    const qty = Number(item.quantity || 0);
                    const min = Number(item.minimumThreshold || 0);
                    const suggest = Math.max(0, min * 2 - qty);
                    rowsHtml += `
                        <tr class="warning-row">
                            <td><strong>${materialCode}</strong></td>
                            <td>${item.name || '-'}</td>
                            <td>${item.specification || '-'}</td>
                            <td>${qty.toLocaleString('th-TH')} ${item.unit || ''}</td>
                            <td>${min.toLocaleString('th-TH')} ${item.unit || ''}</td>
                            <td><span class="status-low">⚠️ ใกล้หมด</span></td>
                            <td>${suggest > 0 ? `${suggest.toLocaleString('th-TH')} ${item.unit || ''}` : '-'}</td>
                        </tr>
                    `;
                });
            }

            section.innerHTML = `
                <h2>รายงานวัสดุใกล้หมด (${items.length} รายการ)</h2>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>รหัสวัสดุ</th>
                                <th>ชื่อวัสดุ</th>
                                <th>รายละเอียด</th>
                                <th>จำนวนคงเหลือ</th>
                                <th>จำนวนขั้นต่ำ</th>
                                <th>สถานะ</th>
                                <th>แนะนำสั่งซื้อ</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('Error loading inventory report:', error);
            section.innerHTML = `<h2>รายงานวัสดุใกล้หมด</h2><p style="text-align:center;padding:40px;color:#6b7280;">ไม่สามารถโหลดข้อมูลได้</p>`;
        }
    },

    // ===== Attendance Report: แสดงเฉพาะคนที่มาสาย =====

    async renderAttendanceReport() {
        const section = document.getElementById('attendanceReport');
        if (!section) return;

        try {
            const data = await api.reports.getAttendance();
            const records = data?.records || [];

            // Filter only late records
            const lateRecords = records.filter(r => r.status === 'late');

            // Group late records by employee with dates
            const lateMap = new Map();
            lateRecords.forEach(r => {
                const name = r.employeeName || r.userName || (r.userId?.name) || '-';
                const key  = r.employeeId  || r.userId?._id || name;
                if (!lateMap.has(key)) {
                    lateMap.set(key, { name, lateDates: [] });
                }
                const dateStr = r.date
                    ? new Date(r.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '-';
                lateMap.get(key).lateDates.push(dateStr);
            });

            let rowsHtml = '';
            if (lateMap.size === 0) {
                rowsHtml = `<tr><td colspan="3" style="text-align:center;padding:40px;color:#6b7280;">✅ ไม่มีพนักงานที่มาสายในเดือนนี้</td></tr>`;
            } else {
                lateMap.forEach(emp => {
                    emp.lateDates.forEach((dateStr, idx) => {
                        rowsHtml += `
                            <tr>
                                ${idx === 0
                                    ? `<td rowspan="${emp.lateDates.length}" style="vertical-align:middle;font-weight:600;">${emp.name}</td>`
                                    : ''}
                                <td>${dateStr}</td>
                                <td><span class="badge badge-warning">มาสาย</span></td>
                            </tr>
                        `;
                    });
                });
            }

            section.innerHTML = `
                <h2>รายงานการมาสาย</h2>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>พนักงาน</th>
                                <th>วันที่มาสาย</th>
                                <th>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('Error loading attendance report:', error);
            section.innerHTML = `<h2>รายงานการมาสาย</h2><p style="text-align:center;padding:40px;color:#6b7280;">ไม่สามารถโหลดข้อมูลได้</p>`;
        }
    },

    // ===== Event Listeners =====

    setupEventListeners() {
        // Month navigation
        document.getElementById('prevMonthBtn')?.addEventListener('click', () => this.goToPrevMonth());
        document.getElementById('nextMonthBtn')?.addEventListener('click', () => this.goToNextMonth());

        // Tab buttons
        document.querySelectorAll('.reports-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                document.querySelectorAll('.reports-tabs .tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                document.querySelectorAll('.report-section').forEach(s => s.classList.remove('active'));
                this.currentReportType = e.target.dataset.report;

                switch (this.currentReportType) {
                    case 'revenue':
                        document.getElementById('revenueReport')?.classList.add('active');
                        this.renderRevenueTable();
                        break;
                    case 'projects':
                        document.getElementById('projectsReport')?.classList.add('active');
                        this.renderProjectsReport();
                        break;
                    case 'inventory':
                        document.getElementById('inventoryReport')?.classList.add('active');
                        await this.renderInventoryReport();
                        break;
                    case 'attendance':
                        document.getElementById('attendanceReport')?.classList.add('active');
                        await this.renderAttendanceReport();
                        break;
                }
            });
        });
    },

    // ===== Export =====

    async exportCurrentReport() {
        try {
            let exportData, filename;

            switch (this.currentReportType) {
                case 'revenue': {
                    const monthProjects = this.allProjects.filter(p => {
                        if (p.status !== 'completed' || p.paymentStatus !== 'paid') return false;
                        const d = new Date(p.endDate || p.createdAt);
                        return d.getFullYear() === this.viewYear && d.getMonth() === this.viewMonth;
                    });
                    exportData = monthProjects.map(p => {
                        const cost   = Number(p.totalCost  || 0);
                        const sell   = Number(p.totalPrice || 0);
                        const profit = sell - cost;
                        return {
                            'โครงการ':    p.name || '-',
                            'ลูกค้า':     typeof p.customerId === 'object' ? (p.customerId?.name || '-') : '-',
                            'ต้นทุน':     cost,
                            'ราคาขาย':    sell,
                            'กำไร':       profit,
                            'อัตรากำไร':  sell > 0 ? `${((profit / sell) * 100).toFixed(1)}%` : '0.0%',
                            'สถานะชำระ': 'ชำระแล้ว'
                        };
                    });
                    filename = 'revenue_report';
                    break;
                }
                case 'projects': {
                    exportData = this.allProjects.map(p => ({
                        'โครงการ': p.name || '-',
                        'ลูกค้า':  typeof p.customerId === 'object' ? (p.customerId?.name || '-') : '-',
                        'สถานะ':   this.STATUS_LABELS[p.status] || p.status || '-',
                        'ราคาขาย': Number(p.totalPrice || 0),
                        'ต้นทุน':  Number(p.totalCost  || 0),
                        'กำไร':    Number(p.totalPrice || 0) - Number(p.totalCost || 0),
                        'การชำระ': this.PAYMENT_LABELS[p.paymentStatus] || p.paymentStatus || '-'
                    }));
                    filename = 'projects_report';
                    break;
                }
                case 'inventory': {
                    const data = await api.reports.getInventory();
                    exportData = (data?.items || []).map(item => ({
                        'รหัสวัสดุ':    item._id ? String(item._id).slice(-6).toUpperCase() : '-',
                        'ชื่อวัสดุ':    item.name || '-',
                        'รายละเอียด':   item.specification || '-',
                        'คงเหลือ':      item.quantity,
                        'หน่วย':        item.unit || '',
                        'จำนวนขั้นต่ำ': item.minimumThreshold || 0,
                        'สถานะ':        'ใกล้หมด',
                        'แนะนำสั่งซื้อ': Math.max(0, (item.minimumThreshold || 0) * 2 - item.quantity)
                    }));
                    filename = 'low_stock_report';
                    break;
                }
                case 'attendance': {
                    const data = await api.reports.getAttendance();
                    const lateOnly = (data?.records || []).filter(r => r.status === 'late');
                    exportData = lateOnly.map(r => ({
                        'พนักงาน':    r.employeeName || r.userName || '-',
                        'วันที่มาสาย': r.date ? new Date(r.date).toLocaleDateString('th-TH') : '-',
                        'สถานะ':      'มาสาย'
                    }));
                    filename = 'late_attendance_report';
                    break;
                }
            }

            if (exportData && exportData.length > 0) {
                ExportUtils.exportToExcel(exportData, filename);
            } else {
                alert('ไม่มีข้อมูลสำหรับ Export');
            }
        } catch (error) {
            console.error('Error exporting report:', error);
            alert('เกิดข้อผิดพลาดในการ Export: ' + error.message);
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('revenueReport')) {
        ReportsPage.init();
    }
});
