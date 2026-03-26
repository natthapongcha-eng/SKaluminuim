const AttendancePage = {
    currentUser: null,
    selectedDate: '',
    selectedEmployeeId: '',
    selectedEmployeeName: '',
    dayData: null,
    currentAction: 'in',
    editRecordId: '',
    serverTimeOffset: 0,
    hasServerTimeSync: false,
    clockTimerId: null,
    clockSyncTimerId: null,
    lastLateRefreshKey: '',
    lastAbsentRefreshKey: '',
    calendarInstance: null,
    loadedCalendarMonth: '',
    calendarSummaryByDate: {},
    uiRenderState: {
        timeText: '',
        dateText: '',
        checkInDisabled: null,
        checkInOpacity: '',
        checkInTitle: '',
        checkOutDisabled: null,
        checkOutOpacity: '',
        checkOutTitle: ''
    },
    lastCheckInTime: null,
    thaiMonthNames: [
        'มกราคม',
        'กุมภาพันธ์',
        'มีนาคม',
        'เมษายน',
        'พฤษภาคม',
        'มิถุนายน',
        'กรกฎาคม',
        'สิงหาคม',
        'กันยายน',
        'ตุลาคม',
        'พฤศจิกายน',
        'ธันวาคม'
    ],
    thaiHolidays2026: {
        '2026-01-01': 'วันขึ้นปีใหม่',
        '2026-01-02': 'วันหยุดชดเชยปีใหม่',
        '2026-02-16': 'วันมาฆบูชา (ชดเชย)',
        '2026-03-03': 'วันมาฆบูชา',
        '2026-04-06': 'วันจักรี',
        '2026-04-13': 'วันสงกรานต์',
        '2026-04-14': 'วันสงกรานต์',
        '2026-04-15': 'วันสงกรานต์',
        '2026-04-16': 'วันหยุดชดเชยสงกรานต์',
        '2026-05-01': 'วันแรงงานแห่งชาติ',
        '2026-05-04': 'วันฉัตรมงคล',
        '2026-05-11': 'วันพืชมงคล',
        '2026-05-31': 'วันวิสาขบูชา',
        '2026-06-01': 'วันหยุดชดเชยวันวิสาขบูชา',
        '2026-06-03': 'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี',
        '2026-07-10': 'วันอาสาฬหบูชา',
        '2026-07-11': 'วันเข้าพรรษา',
        '2026-07-13': 'วันหยุดชดเชยวันเข้าพรรษา',
        '2026-07-28': 'วันเฉลิมพระชนมพรรษา ร.10',
        '2026-08-12': 'วันแม่แห่งชาติ',
        '2026-10-12': 'วันหยุดชดเชยวันคล้ายวันสวรรคต ร.9',
        '2026-10-13': 'วันนวมินทรมหาราช',
        '2026-10-23': 'วันปิยมหาราช',
        '2026-12-05': 'วันพ่อแห่งชาติ',
        '2026-12-07': 'วันหยุดชดเชยวันพ่อแห่งชาติ',
        '2026-12-10': 'วันรัฐธรรมนูญ',
        '2026-12-31': 'วันสิ้นปี'
    },
    thaiHolidayEvents2026: [
        { title: 'วันขึ้นปีใหม่', start: '2026-01-01', backgroundColor: '#ffebee', textColor: '#d32f2f' },
        { title: 'วันหยุดชดเชยปีใหม่', start: '2026-01-02', backgroundColor: '#ffebee', textColor: '#d32f2f' },
        { title: 'วันมาฆบูชา', start: '2026-03-03', backgroundColor: '#fff9c4', textColor: '#fbc02d' },
        { title: 'วันจักรี', start: '2026-04-06', backgroundColor: '#fff9c4', textColor: '#fbc02d' },
        { title: 'วันสงกรานต์', start: '2026-04-13', end: '2026-04-16', backgroundColor: '#e1f5fe', textColor: '#0288d1' },
        { title: 'วันหยุดชดเชยสงกรานต์', start: '2026-04-16', backgroundColor: '#e1f5fe', textColor: '#0288d1' },
        { title: 'วันแรงงานแห่งชาติ', start: '2026-05-01', backgroundColor: '#ffebee', textColor: '#d32f2f' },
        { title: 'วันฉัตรมงคล', start: '2026-05-04', backgroundColor: '#fff9c4', textColor: '#fbc02d' },
        { title: 'วันพืชมงคล', start: '2026-05-11', backgroundColor: '#fff9c4', textColor: '#fbc02d' },
        { title: 'วันวิสาขบูชา', start: '2026-05-31', backgroundColor: '#fff9c4', textColor: '#fbc02d' },
        { title: 'วันหยุดชดเชยวิสาขบูชา', start: '2026-06-01', backgroundColor: '#fff9c4', textColor: '#fbc02d' },
        { title: 'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี', start: '2026-06-03', backgroundColor: '#fff9c4', textColor: '#fbc02d' },
        { title: 'วันอาสาฬหบูชา', start: '2026-07-10', backgroundColor: '#fff9c4', textColor: '#fbc02d' },
        { title: 'วันเข้าพรรษา', start: '2026-07-11', backgroundColor: '#fff9c4', textColor: '#fbc02d' },
        { title: 'วันหยุดชดเชยเข้าพรรษา', start: '2026-07-13', backgroundColor: '#fff9c4', textColor: '#fbc02d' },
        { title: 'วันเฉลิมพระชนมพรรษา ร.10', start: '2026-07-28', backgroundColor: '#fff9c4', textColor: '#fbc02d' },
        { title: 'วันแม่แห่งชาติ', start: '2026-08-12', backgroundColor: '#fff9c4', textColor: '#fbc02d' },
        { title: 'วันหยุดชดเชยวันคล้ายวันสวรรคต ร.9', start: '2026-10-12', backgroundColor: '#fff9c4', textColor: '#fbc02d' },
        { title: 'วันนวมินทรมหาราช', start: '2026-10-13', backgroundColor: '#fff9c4', textColor: '#fbc02d' },
        { title: 'วันปิยมหาราช', start: '2026-10-23', backgroundColor: '#fff9c4', textColor: '#fbc02d' },
        { title: 'วันพ่อแห่งชาติ', start: '2026-12-05', backgroundColor: '#fff9c4', textColor: '#fbc02d' },
        { title: 'วันหยุดชดเชยวันพ่อแห่งชาติ', start: '2026-12-07', backgroundColor: '#fff9c4', textColor: '#fbc02d' },
        { title: 'วันรัฐธรรมนูญ', start: '2026-12-10', backgroundColor: '#fff9c4', textColor: '#fbc02d' },
        { title: 'วันสิ้นปี', start: '2026-12-31', backgroundColor: '#ffebee', textColor: '#d32f2f' }
    ],

    initDate() {
        const now = this.getServerNow() || new Date();
        this.selectedDate = this.getDateKey(now);
        const input = document.getElementById('attendanceDateFilter');
        if (input) input.value = this.selectedDate;
    },

    normalizeRole(role) {
        return String(role || '').trim().toUpperCase();
    },

    isAuthorizedRole(role) {
        const r = this.normalizeRole(role);
        return r === 'CEO' || r === 'ADMIN';
    },

    escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    formatBuddhistDate(dateLike) {
        if (!dateLike) return '-';
        const date = new Date(dateLike);
        if (Number.isNaN(date.getTime())) return '-';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear() + 543;
        return `${day}/${month}/${year}`;
    },

    formatBuddhistMonthYear(dateLike) {
        const date = new Date(dateLike);
        if (Number.isNaN(date.getTime())) return '-';
        const monthName = this.thaiMonthNames[date.getMonth()] || '-';
        return `${monthName} ${date.getFullYear() + 543}`;
    },

    formatTime(dateLike) {
        if (!dateLike) return '-';
        const date = new Date(dateLike);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    },

    formatDateTimeLocal(dateLike) {
        if (!dateLike) return '';
        const date = new Date(dateLike);
        if (Number.isNaN(date.getTime())) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${d}T${hh}:${mm}`;
    },

    getDateKey(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    getMonthKey(dateLike) {
        const d = new Date(dateLike);
        if (Number.isNaN(d.getTime())) return '';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    },

    getDailyVisualStatus(counts = {}) {
        const absentCount = Number(counts.absent || 0);
        const lateCount = Number(counts.late || 0);
        const presentCount = Number(counts.present || 0);

        if (absentCount > 0) return 'absent';
        if (lateCount > 0) return 'late';
        if (presentCount > 0) return 'present';
        return '';
    },

    playCalendarTransition() {
        const container = document.getElementById('attendanceCalendar') || document.getElementById('fullCalendarDashboard');
        if (!container) return;
        container.classList.remove('is-month-switching');
        // Force reflow so animation can replay.
        void container.offsetWidth;
        container.classList.add('is-month-switching');
    },

    updateCalendarMonthTitle(dateLike) {
        const el = document.getElementById('calendarMonthTitle');
        if (!el) return;
        el.textContent = this.formatBuddhistMonthYear(dateLike);
    },

    async init() {
        this.currentUser = JSON.parse(sessionStorage.getItem('user') || 'null');
        if (!this.currentUser || !this.isAuthorizedRole(this.currentUser.role)) {
            alert('หน้านี้อนุญาตเฉพาะ CEO หรือ ADMIN');
            window.location.href = 'dashboard.html';
            return;
        }

        this.setupEventListeners();
        try {
            await this.syncTime();
        } catch (error) {
            // Keep page usable even if backend status endpoint is temporarily unavailable.
            console.warn('syncTime failed, fallback to local time:', error);
            this.hasServerTimeSync = false;
        }
        this.initDate();
        try {
            await this.initCalendar();
        } catch (error) {
            console.error('initCalendar failed:', error);
            const container = document.getElementById('attendanceCalendar') || document.getElementById('fullCalendarDashboard');
            if (container) {
                container.innerHTML = '<div class="calendar-load-error">ไม่สามารถแสดงปฏิทินได้ในขณะนี้</div>';
            }
        }
        this.startClock();
        await this.loadDayData().catch((error) => {
            console.warn('Initial loadDayData failed:', error);
        });
    },

    async syncTime() {
        const start = Date.now();
        const status = await api.getStatus();
        const end = Date.now();

        const serverDate = new Date(status?.serverTime);
        if (Number.isNaN(serverDate.getTime())) {
            throw new Error('Invalid server time');
        }

        const latency = (end - start) / 2;
        this.serverTimeOffset = serverDate.getTime() - (end - latency);
        this.hasServerTimeSync = true;
    },

    getServerNow() {
        if (!this.hasServerTimeSync) return null;
        return new Date(Date.now() + this.serverTimeOffset);
    },

    async loadCalendarSummary(monthKey) {
        if (!monthKey) return;

        try {
            const result = await api.attendance.getCalendarSummary(monthKey, {
                id: this.currentUser.id,
                role: this.currentUser.role
            });

            const nextMap = {};
            const days = Array.isArray(result?.days) ? result.days : [];
            for (const day of days) {
                if (!day?.date) continue;
                nextMap[day.date] = {
                    status: day.status || '',
                    counts: day.counts || {}
                };
            }

            this.calendarSummaryByDate = nextMap;
            this.loadedCalendarMonth = monthKey;
        } catch (error) {
            console.warn('loadCalendarSummary failed for month:', monthKey, error);
            this.calendarSummaryByDate = {};
            this.loadedCalendarMonth = monthKey;
        }
    },

    decorateCalendarCell(dayCellEl, dateLike) {
        const date = new Date(dateLike);
        if (Number.isNaN(date.getTime())) return;

        const dateKey = this.getDateKey(date);
        const holidayName = this.thaiHolidays2026[dateKey] || '';
        const summary = this.calendarSummaryByDate[dateKey] || null;

        if (date.getDay() === 0 || date.getDay() === 6) {
            dayCellEl.classList.add('attendance-weekend-cell');
        }

        const counts = summary?.counts || {};
        const presentCount = Number(counts.present || 0);
        const lateCount = Number(counts.late || 0);
        const absentCount = Number(counts.absent || 0);
        const visualStatus = this.getDailyVisualStatus(counts);

        if (visualStatus) {
            dayCellEl.classList.add(`attendance-status-${visualStatus}`);
        }

        const summaryText = document.createElement('div');
        summaryText.className = 'attendance-day-summary';
        summaryText.textContent = `มา:${presentCount} | สาย:${lateCount} | ขาด:${absentCount}`;
        dayCellEl.appendChild(summaryText);

        if (holidayName) {
            dayCellEl.classList.add('attendance-holiday-cell');
            const label = document.createElement('div');
            label.className = 'attendance-holiday-label';
            label.textContent = holidayName;
            dayCellEl.appendChild(label);
        }

        if (visualStatus) {
            const dot = document.createElement('span');
            dot.className = `attendance-day-dot ${visualStatus}`;
            dayCellEl.appendChild(dot);
        }

        if (holidayName || visualStatus) {
            const statusMap = {
                present: 'ปกติ',
                late: 'สาย',
                absent: 'ขาดงาน'
            };
            const statusText = visualStatus ? `สถานะ: ${statusMap[visualStatus] || visualStatus}` : '';
            dayCellEl.title = [holidayName, statusText].filter(Boolean).join(' | ');
        }
    },

    async initCalendar() {
        const container = document.getElementById('attendanceCalendar') || document.getElementById('fullCalendarDashboard');
        if (!container) {
            console.error('Calendar container not found. Expected #attendanceCalendar or #fullCalendarDashboard');
            return;
        }

        if (!window.FullCalendar) {
            container.innerHTML = '<div class="calendar-load-error">ไม่พบ FullCalendar กรุณาตรวจสอบการโหลดสคริปต์</div>';
            console.error('FullCalendar is not defined. Check script include in attendance.html');
            return;
        }

        const initialDate = this.selectedDate || this.getDateKey(this.getServerNow() || new Date());
        await this.loadCalendarSummary(this.getMonthKey(initialDate));

        this.calendarInstance = new window.FullCalendar.Calendar(container, {
            initialView: 'dayGridMonth',
            initialDate,
            locale: 'th',
            headerToolbar: false,
            height: 'parent',
            contentHeight: 'auto',
            expandRows: true,
            fixedWeekCount: true,
            showNonCurrentDates: true,
            events: this.thaiHolidayEvents2026,
            dayCellDidMount: (info) => {
                this.decorateCalendarCell(info.el, info.date);
            },
            dateClick: async (info) => {
                this.selectedDate = info.dateStr;
                const input = document.getElementById('attendanceDateFilter');
                if (input) input.value = info.dateStr;
                await this.loadDayData();
                await this.openDayDetailModal(info.dateStr);
            },
            datesSet: async (info) => {
                const monthAnchor = info.view.currentStart || info.start;
                const monthKey = this.getMonthKey(monthAnchor);
                this.updateCalendarMonthTitle(monthAnchor);
                this.playCalendarTransition();

                if (monthKey && monthKey !== this.loadedCalendarMonth) {
                    await this.loadCalendarSummary(monthKey).catch((error) => {
                        console.warn('datesSet summary refresh failed:', error);
                    });
                    this.calendarInstance.render();
                }
            }
        });

        this.calendarInstance.render();
        setTimeout(() => {
            const hasRenderedGrid = container.querySelector('.fc-view-harness');
            if (!hasRenderedGrid && this.calendarInstance) {
                this.calendarInstance.render();
            }
        }, 1000);
        this.updateCalendarMonthTitle(initialDate);
        this.setupCalendarControls();
    },

    setupCalendarControls() {
        document.getElementById('calendarPrevBtn')?.addEventListener('click', async () => {
            if (!this.calendarInstance) return;
            this.calendarInstance.prev();
            await this.handleCalendarMonthChanged();
        });

        document.getElementById('calendarNextBtn')?.addEventListener('click', async () => {
            if (!this.calendarInstance) return;
            this.calendarInstance.next();
            await this.handleCalendarMonthChanged();
        });

        document.getElementById('calendarTodayBtn')?.addEventListener('click', async () => {
            if (!this.calendarInstance) return;
            const today = this.getDateKey(this.getServerNow() || new Date());
            this.calendarInstance.today();
            this.selectedDate = today;
            const input = document.getElementById('attendanceDateFilter');
            if (input) input.value = today;
            await this.handleCalendarMonthChanged();
            await this.loadDayData();
        });
    },

    async handleCalendarMonthChanged() {
        if (!this.calendarInstance) return;
        const currentDate = this.calendarInstance.getDate();
        const monthKey = this.getMonthKey(currentDate);
        this.selectedDate = this.getDateKey(currentDate);
        const input = document.getElementById('attendanceDateFilter');
        if (input) input.value = this.selectedDate;
        this.updateCalendarMonthTitle(currentDate);
        await this.loadCalendarSummary(monthKey);
        await this.loadDayData();
        this.calendarInstance.render();
    },

    updateUIByTime(now) {
        const timeEl = document.getElementById('currentTime');
        const dateEl = document.getElementById('currentDateDisplay');
        const nextTimeText = now ? this.formatTime(now) : '--:--:--';
        const nextDateText = now ? this.formatBuddhistDate(now) : 'กำลังซิงก์เวลาเซิร์ฟเวอร์...';

        if (timeEl && this.uiRenderState.timeText !== nextTimeText) {
            timeEl.textContent = nextTimeText;
            this.uiRenderState.timeText = nextTimeText;
        }

        if (dateEl && this.uiRenderState.dateText !== nextDateText) {
            dateEl.textContent = nextDateText;
            this.uiRenderState.dateText = nextDateText;
        }
    },

    handleTimeMilestones(now) {
        if (!now || this.selectedDate !== this.getDateKey(now)) return;

        const hours = now.getHours();
        const minutes = now.getMinutes();
        const dateKey = this.getDateKey(now);

        if ((hours > 8 || (hours === 8 && minutes >= 1)) && this.lastLateRefreshKey !== dateKey) {
            this.lastLateRefreshKey = dateKey;
            this.loadDayData().catch(error => console.warn('Late milestone refresh failed:', error));
        }

        if ((hours > 11 || (hours === 11 && minutes >= 0)) && this.lastAbsentRefreshKey !== dateKey) {
            this.lastAbsentRefreshKey = dateKey;
            this.loadDayData().catch(error => console.warn('Absent milestone refresh failed:', error));
        }
    },

    startClock() {
        const tick = () => {
            const now = this.getServerNow();
            this.updateUIByTime(now);
            this.checkBusinessRules(now);
            this.handleTimeMilestones(now);
        };

        if (this.clockTimerId) clearInterval(this.clockTimerId);
        if (this.clockSyncTimerId) clearInterval(this.clockSyncTimerId);

        tick();
        this.clockTimerId = setInterval(tick, 1000);

        this.clockSyncTimerId = setInterval(async () => {
            try {
                await this.syncTime();
            } catch (error) {
                console.warn('Periodic syncTime failed:', error);
            }
        }, 600000);
    },

    checkBusinessRules(now) {
        const checkInBtn = document.getElementById('checkInBtn');
        const checkOutBtn = document.getElementById('checkOutBtn');

        let checkInDisabled = false;
        let checkInOpacity = '1';
        let checkInTitle = '';

        if (!now) {
            checkInDisabled = true;
            checkInOpacity = '0.5';
            checkInTitle = 'กำลังซิงก์เวลาเซิร์ฟเวอร์...';
        } else {
            const hours = now.getHours();
            if (hours < 7) {
                checkInDisabled = true;
                checkInOpacity = '0.5';
                checkInTitle = 'ระบบเปิดให้ลงเวลาตอน 07:00 น.';
            }
        }

        this.toggleButton(checkInBtn, !checkInDisabled, checkInOpacity, checkInTitle);

        let checkOutDisabled = false;
        let checkOutOpacity = '1';
        let checkOutTitle = '';

        if (!now) {
            checkOutDisabled = true;
            checkOutOpacity = '0.5';
            checkOutTitle = 'กำลังซิงก์เวลาเซิร์ฟเวอร์...';
        } else {
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const currentTimeValue = hours + (minutes / 60);

            if (currentTimeValue < 15.0) {
                checkOutDisabled = true;
                checkOutOpacity = '0.5';
                checkOutTitle = 'ไม่อนุญาตให้เช็กเอาต์ก่อน 15:00 น.';
            } else if (!this.lastCheckInTime) {
                checkOutDisabled = true;
                checkOutOpacity = '0.5';
                checkOutTitle = 'ต้องเช็กอินก่อน';
            } else {
                const minGapMinutes = 15;
                const timeSinceCheckIn = (now - this.lastCheckInTime) / (1000 * 60);

                if (timeSinceCheckIn < minGapMinutes) {
                    checkOutDisabled = true;
                    checkOutOpacity = '0.5';
                    const minutesRemaining = Math.ceil(minGapMinutes - timeSinceCheckIn);
                    checkOutTitle = `รอ ${minutesRemaining} นาทีถึง 15:30 น.`;
                }
            }
        }

        this.toggleButton(checkOutBtn, !checkOutDisabled, checkOutOpacity, checkOutTitle);
    },

    toggleButton(btn, isEnabled, opacity = '1', title = '') {
        if (!btn) return;

        if (btn.disabled !== !isEnabled) {
            btn.disabled = !isEnabled;
        }

        if (btn.style.opacity !== opacity) {
            btn.style.opacity = opacity;
        }

        if (btn.title !== title) {
            btn.title = title;
        }

        const stateKey = btn.id === 'checkInBtn' ? 'checkInBtn' : 'checkOutBtn';
        const stateMap = {
            checkInBtn: { disabled: 'checkInDisabled', opacity: 'checkInOpacity', title: 'checkInTitle' },
            checkOutBtn: { disabled: 'checkOutDisabled', opacity: 'checkOutOpacity', title: 'checkOutTitle' }
        };

        const keyMap = stateMap[stateKey];
        if (keyMap) {
            this.uiRenderState[keyMap.disabled] = !isEnabled;
            this.uiRenderState[keyMap.opacity] = opacity;
            this.uiRenderState[keyMap.title] = title;
        }
    },

    setCheckInTime(timestamp) {
        this.lastCheckInTime = timestamp ? new Date(timestamp) : new Date();
    },

    clearCheckInTime() {
        this.lastCheckInTime = null;
    },

    setButtonLoading(button, isLoading, loadingText = 'กำลังบันทึก...') {
        if (!button) return;

        if (isLoading) {
            if (!button.dataset.originalHtml) {
                button.dataset.originalHtml = button.innerHTML;
            }
            button.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span>${loadingText}`;
            button.disabled = true;
            button.classList.add('is-loading');
            return;
        }

        if (button.dataset.originalHtml) {
            button.innerHTML = button.dataset.originalHtml;
            delete button.dataset.originalHtml;
        }
        button.disabled = false;
        button.classList.remove('is-loading');
    },

    async loadDayData() {
        try {
            const response = await api.attendance.getDay(this.selectedDate, {
                id: this.currentUser.id,
                role: this.currentUser.role
            });
            this.dayData = response;

            const presentRows = this.dayData?.tabs?.present || [];
            const currentEmployeeRecord = presentRows.find(x => String(x.userId) === String(this.currentUser.id));
            if (currentEmployeeRecord && currentEmployeeRecord.checkIn && !currentEmployeeRecord.checkOut) {
                this.setCheckInTime(currentEmployeeRecord.checkIn);
            } else {
                this.clearCheckInTime();
            }

            this.renderAll();
        } catch (error) {
            console.error('loadDayData error:', error);
            alert(error.message || 'ไม่สามารถโหลดข้อมูล Attendance ได้');
        }
    },

    renderAll() {
        this.renderCards();
        this.renderEmployeeSelector();
        this.renderTodayStatus();
        this.renderTabs();
    },

    renderCards() {
        const stats = this.dayData?.stats || { total: 0, present: 0, late: 0, absent: 0 };
        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(value || 0);
        };
        set('statTotal', stats.total);
        set('statPresent', stats.present);
        set('statLate', stats.late);
        set('statAbsent', stats.absent);
    },

    renderEmployeeSelector() {
        const selector = document.getElementById('employeeSelector');
        if (!selector) return;

        const list = this.dayData?.availableEmployees || [];

        if (!list.length) {
            selector.innerHTML = '<option value="">ไม่มีพนักงานที่ยังไม่เช็กอิน</option>';
            this.selectedEmployeeId = '';
            this.selectedEmployeeName = '';
            return;
        }

        const leaders = list.filter(item => {
            const role = this.normalizeRole(item.role);
            return role === 'CEO' || role === 'ADMIN';
        });
        const employees = list.filter(item => this.normalizeRole(item.role) === 'EMPLOYEE');

        let html = '<option value="">-- เลือกพนักงาน --</option>';

        if (leaders.length) {
            html += `<optgroup label="ผู้บริหาร (CEO/ADMIN)">${leaders
                .map(item => `<option value="${item.id}">${this.escapeHtml(item.name)} (${this.escapeHtml(item.role)})</option>`)
                .join('')}</optgroup>`;
        }

        if (employees.length) {
            html += `<optgroup label="พนักงาน (Employee)">${employees
                .map(item => `<option value="${item.id}">${this.escapeHtml(item.name)} (${this.escapeHtml(item.role)})</option>`)
                .join('')}</optgroup>`;
        }

        selector.innerHTML = html;

        const currentRole = this.normalizeRole(this.currentUser.role);
        if (currentRole === 'CEO') {
            const me = list.find(x => String(x.id) === String(this.currentUser.id));
            const selected = me || list[0];
            selector.value = selected.id;
            this.selectedEmployeeId = selected.id;
            this.selectedEmployeeName = selected.name;
            return;
        }

        const found = list.find(x => String(x.id) === String(this.selectedEmployeeId));
        const selected = found || list[0];
        selector.value = selected.id;
        this.selectedEmployeeId = selected.id;
        this.selectedEmployeeName = selected.name;
    },

    renderTodayStatus() {
        const presentRows = this.dayData?.tabs?.present || [];
        const target = presentRows.find(x => String(x.userId) === String(this.currentUser.id));

        const checkInEl = document.getElementById('todayCheckIn');
        const statusEl = document.getElementById('todayStatusText');

        if (!target) {
            if (checkInEl) checkInEl.textContent = '-';
            if (statusEl) {
                statusEl.textContent = 'ยังไม่เข้างาน';
                statusEl.className = 'status-absent';
            }
            return;
        }

        if (checkInEl) checkInEl.textContent = this.formatTime(target.checkIn);

        if (statusEl) {
            if (!target.checkOut) {
                statusEl.textContent = 'กำลังทำงาน';
                statusEl.className = 'status-working';
            } else if (target.status === 'no_checkout') {
                statusEl.textContent = 'ไม่เช็กเอาต์';
                statusEl.className = 'status-no-checkout';
            } else if (target.status === 'late') {
                statusEl.textContent = 'มาสาย';
                statusEl.className = 'status-late';
            } else {
                statusEl.textContent = 'ปกติ';
                statusEl.className = 'status-present';
            }
        }
    },

    renderTabs() {
        const present = this.dayData?.tabs?.present || [];
        const absent = this.dayData?.tabs?.absent || [];
        const waiting = this.dayData?.tabs?.waiting || [];

        this.renderPresentRows(present);
        this.renderAbsentRows(absent);
        this.renderWaitingRows(waiting);
    },

    renderPresentRows(rows) {
        const tbody = document.getElementById('presentList');
        if (!tbody) return;

        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">ไม่มีข้อมูล</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(row => {
            const showEdit = row.status === 'no_checkout' || (!row.checkOut && !!row.checkIn);
            const statusHtml = !row.checkOut
                ? '<span class="status-working">กำลังทำงาน</span>'
                : row.status === 'no_checkout'
                    ? '<span class="status-no-checkout"><strong>ไม่เช็กเอาต์</strong></span>'
                    : row.status === 'late'
                        ? '<span class="status-late">สาย</span>'
                        : '<span class="status-present">ปกติ</span>';

            return `
                <tr>
                    <td>${this.formatBuddhistDate(row.date)}</td>
                    <td>${this.escapeHtml(row.userName || '-')}</td>
                    <td>${this.formatTime(row.checkIn)}</td>
                    <td>${row.checkOut ? this.formatTime(row.checkOut) : '-'}</td>
                    <td>${row.checkIn && row.checkOut ? Number(row.workHours || 0).toFixed(2) : '-'}</td>
                    <td>${statusHtml}</td>
                    <td>${this.escapeHtml(row.note || '-')}</td>
                    <td>${showEdit ? `<button class="btn-secondary btn-edit-attendance" data-id="${row._id}" data-checkin="${row.checkIn}">แก้ไข</button>` : '-'}</td>
                </tr>
            `;
        }).join('');
    },

    renderAbsentRows(rows) {
        const tbody = document.getElementById('absentList');
        if (!tbody) return;

        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">ไม่มีข้อมูล</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(row => `
            <tr>
                <td>${this.formatBuddhistDate(row.date)}</td>
                <td>${this.escapeHtml(row.userName || '-')}</td>
                <td><span class="status-absent">ขาดงาน</span></td>
                <td>${this.escapeHtml(row.note || '-')}</td>
            </tr>
        `).join('');
    },

    renderWaitingRows(rows) {
        const tbody = document.getElementById('waitingList');
        if (!tbody) return;

        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;">ไม่มีข้อมูล</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(row => `
            <tr>
                <td>${this.escapeHtml(row.name)}</td>
                <td><span class="status-working">รอเข้างาน</span></td>
            </tr>
        `).join('');
    },

    getSelectedEmployee() {
        const selector = document.getElementById('employeeSelector');
        if (!selector || !selector.value) return null;
        const name = selector.options[selector.selectedIndex]?.text || 'ไม่ระบุชื่อ';
        return {
            id: selector.value,
            name: name.replace(/\s*\(.+\)$/, '')
        };
    },

    async openDayDetailModal(dateStr) {
        try {
            const detail = await api.attendance.getDay(dateStr, {
                id: this.currentUser.id,
                role: this.currentUser.role
            });

            const summary = detail?.stats || { total: 0, present: 0, late: 0, absent: 0 };
            const presentRows = Array.isArray(detail?.tabs?.present) ? detail.tabs.present : [];
            const absentRows = Array.isArray(detail?.tabs?.absent) ? detail.tabs.absent : [];
            const waitingRows = Array.isArray(detail?.tabs?.waiting) ? detail.tabs.waiting : [];
            const users = Array.isArray(window.appState?.users) ? window.appState.users : [];
            const roleByUserId = new Map(
                users
                    .filter(user => user?.id || user?._id)
                    .map(user => [String(user.id || user._id), this.normalizeRole(user.role || 'EMPLOYEE')])
            );

            const titleEl = document.getElementById('dayDetailTitle');
            if (titleEl) {
                titleEl.textContent = `รายละเอียด Attendance วันที่ ${this.formatBuddhistDate(dateStr)}`;
            }

            const summaryEl = document.getElementById('dayDetailSummary');
            if (summaryEl) {
                summaryEl.innerHTML = `
                    <span>ทั้งหมด: <strong>${summary.total || 0}</strong></span>
                    <span>มาทำงาน: <strong>${summary.present || 0}</strong></span>
                    <span>สาย: <strong>${summary.late || 0}</strong></span>
                    <span>ขาดงาน: <strong>${summary.absent || 0}</strong></span>
                    <span>รอเข้างาน: <strong>${waitingRows.length}</strong></span>
                `;
            }

            const mergedRows = [
                ...presentRows.map(row => ({
                    userId: row.userId,
                    userName: row.userName,
                    checkIn: row.checkIn,
                    checkOut: row.checkOut,
                    status: row.status,
                    role: roleByUserId.get(String(row.userId || '')) || row.role || 'EMPLOYEE',
                    note: row.note || '-'
                })),
                ...absentRows.map(row => ({
                    userId: row.userId,
                    userName: row.userName,
                    checkIn: null,
                    checkOut: null,
                    status: 'absent',
                    role: roleByUserId.get(String(row.userId || '')) || row.role || 'EMPLOYEE',
                    note: row.note || '-'
                })),
                ...waitingRows.map(row => ({
                    userId: row.id,
                    userName: row.name,
                    checkIn: null,
                    checkOut: null,
                    status: 'waiting',
                    role: row.role || 'EMPLOYEE',
                    note: 'ยังไม่เช็กอิน'
                }))
            ];

            const leaders = mergedRows.filter(row => {
                const role = this.normalizeRole(row.role);
                return role === 'CEO' || role === 'ADMIN';
            });
            const employees = mergedRows.filter(row => this.normalizeRole(row.role) === 'EMPLOYEE');

            const renderRows = (rows, targetId) => {
                const rowsEl = document.getElementById(targetId);
                if (!rowsEl) return;

                if (!rows.length) {
                    rowsEl.innerHTML = '<tr><td colspan="5" style="text-align:center;">ไม่มีข้อมูล</td></tr>';
                    return;
                }

                rowsEl.innerHTML = rows.map(row => {
                    let statusText = 'ปกติ';
                    if (row.status === 'late') statusText = 'สาย';
                    if (row.status === 'absent') statusText = 'ขาดงาน';
                    if (row.status === 'no_checkout') statusText = 'ไม่เช็กเอาต์';
                    if (row.status === 'waiting') statusText = 'รอเข้างาน';

                    return `
                        <tr>
                            <td>${this.escapeHtml(row.userName || '-')}</td>
                            <td>${row.checkIn ? this.formatTime(row.checkIn) : '-'}</td>
                            <td>${row.checkOut ? this.formatTime(row.checkOut) : '-'}</td>
                            <td>${statusText}</td>
                            <td>${this.escapeHtml(row.note || '-')}</td>
                        </tr>
                    `;
                }).join('');
            };

            renderRows(leaders, 'dayDetailRowsLeadership');
            renderRows(employees, 'dayDetailRowsEmployee');

            openModal('dayDetailModal');
        } catch (error) {
            console.error('Failed to open day detail modal:', error);
            alert(error.message || 'ไม่สามารถโหลดรายละเอียดของวันได้');
        }
    },

    showAttendanceModal(action) {
        this.currentAction = action;
        const serverNow = this.getServerNow();
        if (!serverNow) {
            alert('กำลังซิงก์เวลาเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง');
            return;
        }

        if (action === 'in' && serverNow.getHours() < 7) {
            alert('ระบบเปิดให้เข้างานตอน 07:00 น.');
            return;
        }

        if (action === 'out') {
            const hours = serverNow.getHours();
            const minutes = serverNow.getMinutes();
            const currentTimeValue = hours + (minutes / 60);

            if (currentTimeValue < 15.0) {
                alert('ไม่อนุญาตให้เช็กเอาต์ก่อน 15:00 น.');
                return;
            }

            if (!this.lastCheckInTime) {
                alert('ต้องเช็กอินก่อน');
                return;
            }

            const minGapMinutes = 15;
            const timeSinceCheckIn = (serverNow - this.lastCheckInTime) / (1000 * 60);

            if (timeSinceCheckIn < minGapMinutes) {
                const minutesRemaining = Math.ceil(minGapMinutes - timeSinceCheckIn);
                alert(`โปรดรอ ${minutesRemaining} นาที ก่อนเช็กเอาต์`);
                return;
            }
        }

        const title = action === 'in' ? 'ยืนยันการเข้างาน' : 'ยืนยันการออกงาน';
        const message = action === 'in'
            ? 'คุณต้องการบันทึกเวลาเข้างานใช่หรือไม่?'
            : 'คุณต้องการบันทึกเวลาออกงานใช่หรือไม่?';

        const titleEl = document.getElementById('attendanceModalTitle');
        const messageEl = document.getElementById('attendanceModalMessage');
        const timeEl = document.getElementById('confirmTime');
        const dateEl = document.getElementById('confirmDate');

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        if (timeEl) timeEl.textContent = this.formatTime(serverNow);
        if (dateEl) dateEl.textContent = this.formatBuddhistDate(this.selectedDate);

        openModal('attendanceModal');
    },

    openEditModal(recordId, checkInTime) {
        this.editRecordId = recordId;
        const input = document.getElementById('editCheckoutTime');
        const note = document.getElementById('editAttendanceNote');

        const base = new Date(checkInTime);
        base.setHours(17, 0, 0, 0);

        if (input) input.value = this.formatDateTimeLocal(base);
        if (note) note.value = '';
        openModal('editAttendanceModal');
    },

    async submitAttendance() {
        const employee = this.getSelectedEmployee();
        if (!employee) {
            alert('กรุณาเลือกพนักงาน');
            return;
        }

        const note = document.getElementById('attendanceNote')?.value || '';
        const confirmBtn = document.getElementById('confirmAttendance');
        try {
            this.setButtonLoading(confirmBtn, true, 'กำลังบันทึก...');

            if (this.currentAction === 'in') {
                await api.attendance.checkIn(employee.id, employee.name, note, this.selectedDate, this.currentUser);
                this.setCheckInTime(this.getServerNow());
                alert('บันทึกเข้างานสำเร็จ');
            } else {
                await api.attendance.checkOut(employee.id, note, this.selectedDate, this.currentUser);
                this.clearCheckInTime();
                alert('บันทึกออกงานสำเร็จ');
            }

            closeModal('attendanceModal');
            const noteEl = document.getElementById('attendanceNote');
            if (noteEl) noteEl.value = '';
            await this.loadDayData();
        } catch (error) {
            alert(error.message || 'บันทึกข้อมูลไม่สำเร็จ');
        } finally {
            this.setButtonLoading(confirmBtn, false);
        }
    },

    async submitEditCheckout() {
        if (!this.editRecordId) return;

        const checkoutInput = document.getElementById('editCheckoutTime');
        const noteInput = document.getElementById('editAttendanceNote');
        const confirmBtn = document.getElementById('confirmEditAttendance');
        const checkOutTime = checkoutInput?.value;
        const note = noteInput?.value || '';

        if (!checkOutTime) {
            alert('กรุณาระบุเวลาเช็กเอาต์');
            return;
        }

        try {
            this.setButtonLoading(confirmBtn, true, 'กำลังบันทึก...');
            await api.attendance.updateCheckout(this.editRecordId, checkOutTime, note, this.currentUser);
            closeModal('editAttendanceModal');
            await this.loadDayData();
        } catch (error) {
            alert(error.message || 'แก้ไขข้อมูลไม่สำเร็จ');
        } finally {
            this.setButtonLoading(confirmBtn, false);
        }
    },

    setupTabs() {
        const buttons = document.querySelectorAll('[data-tab]');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(x => x.classList.remove('active'));
                btn.classList.add('active');

                const tab = btn.dataset.tab;
                document.getElementById('tab-present').style.display = tab === 'present' ? 'block' : 'none';
                document.getElementById('tab-absent').style.display = tab === 'absent' ? 'block' : 'none';
                document.getElementById('tab-waiting').style.display = tab === 'waiting' ? 'block' : 'none';
            });
        });
    },

    setupEventListeners() {
        this.setupTabs();

        document.getElementById('checkInBtn')?.addEventListener('click', () => this.showAttendanceModal('in'));
        document.getElementById('checkOutBtn')?.addEventListener('click', () => this.showAttendanceModal('out'));
        document.getElementById('confirmAttendance')?.addEventListener('click', () => this.submitAttendance());
        document.getElementById('cancelAttendance')?.addEventListener('click', () => closeModal('attendanceModal'));

        document.getElementById('attendanceDateFilter')?.addEventListener('change', async (e) => {
            if (!e.target.value || e.target.value === this.selectedDate) return;
            this.selectedDate = e.target.value;
            if (this.calendarInstance) {
                this.calendarInstance.gotoDate(this.selectedDate);
                await this.handleCalendarMonthChanged();
            }
            await this.loadDayData();
        });

        document.getElementById('employeeSelector')?.addEventListener('change', (e) => {
            const option = e.target.options[e.target.selectedIndex];
            this.selectedEmployeeId = e.target.value;
            this.selectedEmployeeName = (option?.text || '').replace(/\s*\(.+\)$/, '');
        });

        document.getElementById('closeDayDetailModal')?.addEventListener('click', () => closeModal('dayDetailModal'));
        document.getElementById('closeDayDetailBtn')?.addEventListener('click', () => closeModal('dayDetailModal'));

        document.addEventListener('click', (e) => {
            const target = e.target;
            if (target instanceof HTMLElement && target.classList.contains('btn-edit-attendance')) {
                const id = target.getAttribute('data-id');
                const checkIn = target.getAttribute('data-checkin');
                if (id && checkIn) {
                    this.openEditModal(id, checkIn);
                }
            }

        });

        document.getElementById('confirmEditAttendance')?.addEventListener('click', () => this.submitEditCheckout());
        document.getElementById('cancelEditAttendance')?.addEventListener('click', () => closeModal('editAttendanceModal'));
        document.getElementById('closeEditAttendanceModal')?.addEventListener('click', () => closeModal('editAttendanceModal'));
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const hasAttendancePage = document.getElementById('checkInBtn');
    const hasCalendarSlot = document.getElementById('attendanceCalendar') || document.getElementById('fullCalendarDashboard');
    if (hasAttendancePage && hasCalendarSlot) {
        AttendancePage.init();
    }
});
