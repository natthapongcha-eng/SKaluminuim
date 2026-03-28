// ===== Reports Page Controller =====
const ReportsPage = {
    dashboardData: null,
    allProjects: [],
    currentReportType: 'revenue',

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
        await this.loadDashboardData();
        this.setupEventListeners();
        this.renderRevenueTable();
        this.renderCharts();
    },

    async loadDashboardData() {
        try {
            const data = await api.reports.getDashboard();
            this.dashboardData = data;
            this.allProjects = data.projects || [];
            this.updateSummaryCards(data);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Fallback: load project data directly
            try {
                const projects = await api.projects.getAll();
                this.allProjects = Array.isArray(projects) ? projects : [];
                this.computeAndUpdateCards();
            } catch (fallbackError) {
                console.error('Fallback project load failed:', fallbackError);
            }
        }
    },

    computeAndUpdateCards() {
        const completedPaid = this.allProjects.filter(
            p => p.status === 'completed' && p.paymentStatus === 'paid'
        );

        const totalRevenue = completedPaid.reduce((sum, p) => sum + Number(p.totalPrice || 0), 0);
        const totalCost = completedPaid.reduce((sum, p) => sum + Number(p.totalCost || 0), 0);
        const totalProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        this.updateSummaryCards({
            totalRevenue,
            totalProfit,
            profitMargin,
            completedProjects: completedPaid.length
        });
    },

    updateSummaryCards(data) {
        if (!data) return;

        const cards = document.querySelectorAll('.summary-card');
        if (cards.length >= 4) {
            // Revenue card
            const revenueAmount = cards[0].querySelector('.amount');
            const revenueTrend = cards[0].querySelector('.trend');
            if (revenueAmount) revenueAmount.textContent = `฿${(data.totalRevenue || 0).toLocaleString('th-TH')}`;
            if (revenueTrend) {
                revenueTrend.className = 'trend neutral';
                revenueTrend.textContent = `จากโครงการเสร็จสิ้น+ชำระแล้ว`;
            }

            // Profit card
            const profitAmount = cards[1].querySelector('.amount');
            const profitTrend = cards[1].querySelector('.trend');
            if (profitAmount) profitAmount.textContent = `฿${(data.totalProfit || 0).toLocaleString('th-TH')}`;
            if (profitTrend) {
                profitTrend.className = data.totalProfit >= 0 ? 'trend up' : 'trend down';
                profitTrend.textContent = data.totalProfit >= 0 ? '↑ กำไรสุทธิจากทุกโครงการที่เสร็จ' : '↓ ขาดทุนสุทธิ';
            }

            // Completed Projects card
            const projectsAmount = cards[2].querySelector('.amount');
            const projectsTrend = cards[2].querySelector('.trend');
            if (projectsAmount) projectsAmount.textContent = data.completedProjects || 0;
            if (projectsTrend) {
                projectsTrend.className = 'trend neutral';
                projectsTrend.textContent = `สถานะเสร็จสิ้น + ชำระแล้ว`;
            }

            // Margin card
            const marginAmount = cards[3].querySelector('.amount');
            const marginTrend = cards[3].querySelector('.trend');
            if (marginAmount) marginAmount.textContent = `${(data.profitMargin || 0).toFixed(1)}%`;
            if (marginTrend) {
                const margin = data.profitMargin || 0;
                marginTrend.className = margin >= 20 ? 'trend up' : (margin > 0 ? 'trend neutral' : 'trend down');
                marginTrend.textContent = `(กำไร / รายได้) × 100`;
            }
        }
    },

    renderRevenueTable() {
        const section = document.getElementById('revenueReport');
        if (!section) return;

        const completedPaid = this.allProjects.filter(
            p => p.status === 'completed' && p.paymentStatus === 'paid'
        );

        let totalCost = 0;
        let totalSell = 0;
        let totalProfit = 0;

        let rowsHtml = '';
        if (completedPaid.length === 0) {
            rowsHtml = `<tr><td colspan="8" style="text-align: center; padding: 40px; color: #6b7280;">ยังไม่มีโครงการที่เสร็จสิ้นและชำระแล้ว</td></tr>`;
        } else {
            completedPaid.forEach(p => {
                const cost = Number(p.totalCost || 0);
                const sell = Number(p.totalPrice || 0);
                const profit = sell - cost;
                const margin = sell > 0 ? ((profit / sell) * 100).toFixed(1) : '0.0';
                const customerName = typeof p.customerId === 'object' ? (p.customerId?.name || '-') : '-';
                const endDate = p.endDate ? new Date(p.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

                totalCost += cost;
                totalSell += sell;
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

        section.innerHTML = `
            <h2>รายงานรายได้และกำไร</h2>
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
                    <tbody>
                        ${rowsHtml}
                    </tbody>
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

    renderProjectsReport() {
        const section = document.getElementById('projectsReport');
        if (!section) return;

        // Group by status
        const statusGroups = {};
        this.allProjects.forEach(p => {
            const status = p.status || 'planning';
            if (!statusGroups[status]) {
                statusGroups[status] = { count: 0, totalPrice: 0, totalProfit: 0 };
            }
            statusGroups[status].count++;
            statusGroups[status].totalPrice += Number(p.totalPrice || 0);
            statusGroups[status].totalProfit += Number(p.totalPrice || 0) - Number(p.totalCost || 0);
        });

        let rowsHtml = '';
        const statusOrder = ['completed', 'in-progress', 'planning', 'cancelled'];
        statusOrder.forEach(status => {
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
            rowsHtml = `<tr><td colspan="4" style="text-align: center; padding: 40px; color: #6b7280;">ยังไม่มีโครงการ</td></tr>`;
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
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    },

    async renderInventoryReport() {
        const section = document.getElementById('inventoryReport');
        if (!section) return;

        try {
            const data = await api.reports.getInventory();
            const rawItems = data?.items || [];

            // Client-side safety filter: only items where quantity < minimumThreshold
            const items = rawItems.filter(item => {
                const qty = Number(item.quantity || 0);
                const minThreshold = Number(item.minimumThreshold || 0);
                return qty < minThreshold;
            });
            let rowsHtml = '';
            if (items.length === 0) {
                rowsHtml = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: #6b7280;">✅ ไม่มีวัสดุที่ใกล้หมดในขณะนี้</td></tr>`;
            } else {
                items.forEach(item => {
                    const materialCode = item._id ? String(item._id).slice(-6).toUpperCase() : '-';
                    const qty = Number(item.quantity || 0);
                    const minThreshold = Number(item.minimumThreshold || 0);
                    const suggestOrder = Math.max(0, minThreshold * 2 - qty);

                    rowsHtml += `
                        <tr class="warning-row">
                            <td><strong>${materialCode}</strong></td>
                            <td>${item.name || '-'}</td>
                            <td>${item.specification || '-'}</td>
                            <td>${qty.toLocaleString('th-TH')} ${item.unit || ''}</td>
                            <td>${minThreshold.toLocaleString('th-TH')} ${item.unit || ''}</td>
                            <td><span class="status-low">⚠️ ใกล้หมด</span></td>
                            <td>${suggestOrder > 0 ? `${suggestOrder.toLocaleString('th-TH')} ${item.unit || ''}` : '-'}</td>
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
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('Error loading inventory report:', error);
            section.innerHTML = `<h2>รายงานวัสดุใกล้หมด</h2><p style="text-align:center;padding:40px;color:#6b7280;">ไม่สามารถโหลดข้อมูลได้</p>`;
        }
    },

    async renderAttendanceReport() {
        const section = document.getElementById('attendanceReport');
        if (!section) return;

        try {
            const data = await api.reports.getAttendance();
            const records = data?.records || [];

            // Group records by employee
            const employeeMap = new Map();
            records.forEach(r => {
                const employeeName = r.employeeName || r.userName || (r.userId?.name) || '-';
                const key = r.employeeId || r.userId?._id || employeeName;
                if (!employeeMap.has(key)) {
                    employeeMap.set(key, {
                        name: employeeName,
                        workDays: 0,
                        lateDays: 0,
                        totalHours: 0
                    });
                }
                const emp = employeeMap.get(key);
                emp.workDays++;
                if (r.status === 'late') emp.lateDays++;
                emp.totalHours += Number(r.workHours || 0);
            });

            let rowsHtml = '';
            if (employeeMap.size === 0) {
                rowsHtml = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #6b7280;">ไม่มีข้อมูลการลงเวลา</td></tr>`;
            } else {
                employeeMap.forEach(emp => {
                    const avgHours = emp.workDays > 0 ? (emp.totalHours / emp.workDays).toFixed(1) : '0.0';
                    const rating = emp.lateDays <= 1 ? 'ดีมาก' : (emp.lateDays <= 3 ? 'ดี' : 'พอใช้');
                    const ratingBadge = emp.lateDays <= 1 ? 'badge-success' : (emp.lateDays <= 3 ? 'badge-info' : 'badge-warning');

                    rowsHtml += `
                        <tr>
                            <td>${emp.name}</td>
                            <td>${emp.workDays} วัน</td>
                            <td>${emp.lateDays} ครั้ง</td>
                            <td>-</td>
                            <td>${emp.totalHours.toFixed(1)} ชม.</td>
                            <td><span class="badge ${ratingBadge}">${rating}</span></td>
                        </tr>
                    `;
                });
            }

            section.innerHTML = `
                <h2>รายงานสรุปเวลาทำงานพนักงาน</h2>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>พนักงาน</th>
                                <th>วันที่มา</th>
                                <th>มาสาย</th>
                                <th>ขาดงาน</th>
                                <th>ชั่วโมงทำงาน</th>
                                <th>ประเมิน</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('Error loading attendance report:', error);
            section.innerHTML = `<h2>รายงานเวลาทำงาน</h2><p style="text-align:center;padding:40px;color:#6b7280;">ไม่สามารถโหลดข้อมูลได้</p>`;
        }
    },

    renderCharts() {
        this.renderRevenueChart();
        this.renderProfitChart();
    },

    renderRevenueChart() {
        const canvas = document.getElementById('revenueChart');
        const mockEl = canvas?.parentElement?.querySelector('.chart-mock');
        if (!canvas) return;

        // Group completed+paid projects by month
        const completedPaid = this.allProjects.filter(
            p => p.status === 'completed' && p.paymentStatus === 'paid'
        );

        const monthlyRevenue = {};
        const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

        completedPaid.forEach(p => {
            const date = new Date(p.endDate || p.createdAt);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = `${monthNames[date.getMonth()]} ${date.getFullYear() + 543}`;
            if (!monthlyRevenue[key]) {
                monthlyRevenue[key] = { label, revenue: 0 };
            }
            monthlyRevenue[key].revenue += Number(p.totalPrice || 0);
        });

        const sortedKeys = Object.keys(monthlyRevenue).sort();
        const last6 = sortedKeys.slice(-6);

        if (last6.length === 0) {
            if (mockEl) {
                mockEl.innerHTML = `<p>📊 ยังไม่มีข้อมูลรายได้</p><small>จะแสดงเมื่อมีโครงการเสร็จสิ้น+ชำระแล้ว</small>`;
            }
            return;
        }

        const labels = last6.map(k => monthlyRevenue[k].label);
        const values = last6.map(k => monthlyRevenue[k].revenue);

        if (mockEl) mockEl.style.display = 'none';

        try {
            if (typeof Chart === 'undefined') {
                // Chart.js not loaded: show text summary
                if (mockEl) {
                    mockEl.style.display = 'block';
                    const summaryText = last6.map(k => `${monthlyRevenue[k].label}: ฿${(monthlyRevenue[k].revenue / 1000).toFixed(0)}K`).join(' | ');
                    mockEl.innerHTML = `<p>📊 กราฟแสดงรายได้รายเดือน</p><small>${summaryText}</small>`;
                }
                return;
            }

            new Chart(canvas, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'รายได้ (บาท)',
                        data: values,
                        backgroundColor: 'rgba(30, 64, 175, 0.7)',
                        borderColor: 'rgba(30, 64, 175, 1)',
                        borderWidth: 1,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { callback: v => `฿${(v / 1000).toFixed(0)}K` } }
                    }
                }
            });
        } catch (e) {
            console.warn('Chart.js render failed:', e);
        }
    },

    renderProfitChart() {
        const canvas = document.getElementById('profitChart');
        const mockEl = canvas?.parentElement?.querySelector('.chart-mock');
        if (!canvas) return;

        const completedPaid = this.allProjects.filter(
            p => p.status === 'completed' && p.paymentStatus === 'paid'
        );

        const totalRevenue = completedPaid.reduce((sum, p) => sum + Number(p.totalPrice || 0), 0);
        const totalCost = completedPaid.reduce((sum, p) => sum + Number(p.totalCost || 0), 0);
        const totalProfit = totalRevenue - totalCost;
        const marginPct = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

        if (completedPaid.length === 0) {
            if (mockEl) {
                mockEl.innerHTML = `<p>📈 ยังไม่มีข้อมูลกำไร</p><small>จะแสดงเมื่อมีโครงการเสร็จสิ้น+ชำระแล้ว</small>`;
            }
            return;
        }

        if (mockEl) mockEl.style.display = 'none';

        try {
            if (typeof Chart === 'undefined') {
                if (mockEl) {
                    mockEl.style.display = 'block';
                    mockEl.innerHTML = `<p>📈 กราฟเปรียบเทียบรายได้และกำไร</p><small>รายได้: ฿${(totalRevenue / 1000).toFixed(0)}K | กำไร: ฿${(totalProfit / 1000).toFixed(0)}K | อัตรา: ${marginPct}%</small>`;
                }
                return;
            }

            new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels: ['ต้นทุน', 'กำไร'],
                    datasets: [{
                        data: [totalCost, Math.max(0, totalProfit)],
                        backgroundColor: ['#ef4444', '#22c55e'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' },
                        title: {
                            display: true,
                            text: `อัตรากำไร: ${marginPct}%`,
                            font: { size: 16, weight: 'bold' }
                        }
                    }
                }
            });
        } catch (e) {
            console.warn('Chart.js render failed:', e);
        }
    },

    setupEventListeners() {
        document.getElementById('reportPeriod')?.addEventListener('change', async () => {
            await this.loadDashboardData();
            this.renderRevenueTable();
            this.renderCharts();
        });

        document.getElementById('exportReportBtn')?.addEventListener('click', () => {
            this.exportCurrentReport();
        });

        document.querySelectorAll('.reports-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                document.querySelectorAll('.reports-tabs .tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                // Show/hide sections
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

    async exportCurrentReport() {
        try {
            let exportData;
            let filename;

            switch (this.currentReportType) {
                case 'revenue': {
                    const completedPaid = this.allProjects.filter(
                        p => p.status === 'completed' && p.paymentStatus === 'paid'
                    );
                    exportData = completedPaid.map(p => {
                        const cost = Number(p.totalCost || 0);
                        const sell = Number(p.totalPrice || 0);
                        const profit = sell - cost;
                        const margin = sell > 0 ? ((profit / sell) * 100).toFixed(1) : '0.0';
                        return {
                            'โครงการ': p.name || '-',
                            'ลูกค้า': typeof p.customerId === 'object' ? (p.customerId?.name || '-') : '-',
                            'ต้นทุน': cost,
                            'ราคาขาย': sell,
                            'กำไร': profit,
                            'อัตรากำไร': `${margin}%`,
                            'สถานะชำระ': 'ชำระแล้ว'
                        };
                    });
                    filename = 'revenue_report';
                    break;
                }
                case 'projects': {
                    exportData = this.allProjects.map(p => ({
                        'โครงการ': p.name || '-',
                        'ลูกค้า': typeof p.customerId === 'object' ? (p.customerId?.name || '-') : '-',
                        'สถานะ': this.STATUS_LABELS[p.status] || p.status || '-',
                        'ราคาขาย': Number(p.totalPrice || 0),
                        'ต้นทุน': Number(p.totalCost || 0),
                        'กำไร': Number(p.totalPrice || 0) - Number(p.totalCost || 0),
                        'การชำระ': this.PAYMENT_LABELS[p.paymentStatus] || p.paymentStatus || '-'
                    }));
                    filename = 'projects_report';
                    break;
                }
                case 'inventory': {
                    const data = await api.reports.getInventory();
                    exportData = (data?.items || []).map(item => ({
                        'รหัสวัสดุ': item._id ? String(item._id).slice(-6).toUpperCase() : '-',
                        'ชื่อวัสดุ': item.name || '-',
                        'รายละเอียด': item.specification || '-',
                        'คงเหลือ': item.quantity,
                        'หน่วย': item.unit || '',
                        'จำนวนขั้นต่ำ': item.minimumThreshold || 0,
                        'สถานะ': 'ใกล้หมด',
                        'แนะนำสั่งซื้อ': Math.max(0, (item.minimumThreshold || 0) * 2 - item.quantity)
                    }));
                    filename = 'low_stock_report';
                    break;
                }
                case 'attendance': {
                    const data = await api.reports.getAttendance();
                    exportData = (data?.records || []).map(r => ({
                        'พนักงาน': r.employeeName || r.userName || '-',
                        'วันที่': r.date ? new Date(r.date).toLocaleDateString('th-TH') : '-',
                        'สถานะ': r.status || '-',
                        'ชั่วโมงทำงาน': r.workHours || 0
                    }));
                    filename = 'attendance_report';
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
    if (document.getElementById('exportReportBtn')) {
        ReportsPage.init();
    }
});
