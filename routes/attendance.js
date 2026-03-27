const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Attendance = require('../models/Attendance');

const USER_COLLECTIONS = ['users', 'user'];
const START_CHECK_IN_HOUR = 7;
const CHECK_IN_CLOSE_HOUR = 8;
const CHECK_IN_CLOSE_MINUTE = 0;
const LATE_THRESHOLD_HOUR = 8;
const ABSENT_CUTOFF_HOUR = 11;
const AUTO_CHECK_OUT_HOUR = 17;

function normalizeRole(role) {
    return String(role || '').trim().toUpperCase();
}

function isAllowedRole(role) {
    const value = normalizeRole(role);
    return value === 'CEO' || value === 'ADMIN';
}

function getActorRole(req) {
    return normalizeRole(req.headers['x-user-role'] || req.query.actorRole || req.body.actorRole);
}

function getActorId(req) {
    return String(req.headers['x-user-id'] || req.query.actorId || req.body.actorId || '').trim();
}

async function findActorById(actorId) {
    const objectId = toObjectId(actorId);
    if (!objectId) return null;

    for (const collectionName of USER_COLLECTIONS) {
        try {
            const doc = await Attendance.db.collection(collectionName).findOne(
                { _id: objectId },
                { projection: { _id: 1, role: 1, email: 1, name: 1, firstName: 1, lastName: 1 } }
            );
            if (doc) {
                return mapUser(doc);
            }
        } catch (error) {
            continue;
        }
    }

    return null;
}

async function ensureAccess(req, res) {
    const actorId = getActorId(req);
    const claimedRole = getActorRole(req);

    if (!actorId) {
        res.status(401).json({ success: false, message: 'Unauthorized: actorId is required' });
        return null;
    }

    const actor = await findActorById(actorId);
    if (!actor) {
        res.status(401).json({ success: false, message: 'Unauthorized: actor not found' });
        return null;
    }

    if (!isAllowedRole(actor.role)) {
        res.status(403).json({ success: false, message: 'Forbidden: CEO/ADMIN only' });
        return null;
    }

    if (claimedRole && claimedRole !== actor.role) {
        res.status(403).json({ success: false, message: 'Forbidden: role mismatch' });
        return null;
    }

    return actor;
}

function toObjectId(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return new mongoose.Types.ObjectId(id);
}

function getDayStart(dateLike) {
    const d = new Date(dateLike);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function getDayEnd(dateLike) {
    const d = new Date(dateLike);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function parseDateInput(dateInput) {
    if (!dateInput) return getDayStart(new Date());
    const parsed = new Date(`${dateInput}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return getDayStart(new Date());
    return getDayStart(parsed);
}

function parseMonthInput(monthInput) {
    const raw = String(monthInput || '').trim();
    const match = raw.match(/^(\d{4})-(\d{2})$/);

    const now = new Date();
    const year = match ? Number(match[1]) : now.getFullYear();
    const month = match ? Number(match[2]) : now.getMonth() + 1;

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        const fallbackStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const fallbackEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return {
            monthStart: fallbackStart,
            monthEnd: fallbackEnd,
            monthKey: `${fallbackStart.getFullYear()}-${String(fallbackStart.getMonth() + 1).padStart(2, '0')}`
        };
    }

    const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    return {
        monthStart,
        monthEnd,
        monthKey: `${year}-${String(month).padStart(2, '0')}`
    };
}

function toIsoDateKey(dateLike) {
    const d = new Date(dateLike);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function getCalendarStatusPriority(status) {
    if (status === 'absent') return 3;
    if (status === 'late') return 2;
    if (status === 'present' || status === 'no_checkout') return 1;
    return 0;
}

function inferCalendarDayStatus(records) {
    let bestStatus = '';
    let bestPriority = 0;

    for (const record of records) {
        const status = String(record.status || '').trim();
        const priority = getCalendarStatusPriority(status);
        if (priority > bestPriority) {
            bestPriority = priority;
            bestStatus = status;
        }
    }

    if (bestStatus === 'no_checkout') return 'present';
    return bestStatus || 'present';
}

function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function hasPassedAbsentCutoff(targetDate, now) {
    if (targetDate < getDayStart(now)) return true;
    if (!isSameDay(targetDate, now)) return false;
    return now.getHours() >= ABSENT_CUTOFF_HOUR;
}

function isDayClosed(targetDate, now) {
    if (targetDate < getDayStart(now)) return true;
    if (!isSameDay(targetDate, now)) return false;
    return now.getHours() === 23 && now.getMinutes() >= 59;
}

function computeWorkHours(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    const hours = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60);
    return hours > 0 ? Number(hours.toFixed(2)) : 0;
}

function inferStatusFromCheckIn(checkInDate) {
    const h = checkInDate.getHours();
    const m = checkInDate.getMinutes();
    if (h > ABSENT_CUTOFF_HOUR || (h === ABSENT_CUTOFF_HOUR && m > 0)) {
        return 'absent';
    }
    if (h > LATE_THRESHOLD_HOUR || (h === LATE_THRESHOLD_HOUR && m > 0)) {
        return 'late';
    }
    return 'present';
}

function inferStatusFromEditedTimes(checkInDate, checkOutDate) {
    if (!checkInDate) return 'absent';

    const h = checkInDate.getHours();
    const m = checkInDate.getMinutes();
    const minutesFromMidnight = (h * 60) + m;
    const lateThresholdMinutes = 8 * 60;
    const absentThresholdMinutes = 11 * 60;

    let status = 'present';
    if (minutesFromMidnight > absentThresholdMinutes) {
        status = 'absent';
    } else if (minutesFromMidnight > lateThresholdMinutes) {
        status = 'late';
    }

    if (status !== 'absent' && checkInDate && !checkOutDate) {
        return 'no_checkout';
    }

    return status;
}

function isWithinCheckInWindow(now) {
    const hour = now.getHours();
    const minute = now.getMinutes();
    if (hour < START_CHECK_IN_HOUR) return false;
    if (hour > CHECK_IN_CLOSE_HOUR) return false;
    if (hour === CHECK_IN_CLOSE_HOUR && minute > CHECK_IN_CLOSE_MINUTE) return false;
    return true;
}

function mapUser(doc) {
    const firstName = String(doc.firstName || '').trim();
    const lastName = String(doc.lastName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const name = fullName || doc.name || doc.email || 'ไม่ระบุชื่อ';
    return {
        id: String(doc._id),
        name,
        email: doc.email || '',
        role: normalizeRole(doc.role || 'EMPLOYEE')
    };
}

async function loadUsersFromCollection(name) {
    try {
        const docs = await Attendance.db.collection(name)
            .find({}, { projection: { email: 1, name: 1, firstName: 1, lastName: 1, role: 1 } })
            .toArray();
        return docs.map(mapUser);
    } catch (error) {
        return [];
    }
}

async function loadAllUsers() {
    const all = [];
    for (const collectionName of USER_COLLECTIONS) {
        const users = await loadUsersFromCollection(collectionName);
        all.push(...users);
    }

    const dedupByEmail = new Map();
    for (const user of all) {
        const key = String(user.email || user.id).toLowerCase();
        if (!dedupByEmail.has(key)) {
            dedupByEmail.set(key, user);
        }
    }

    return Array.from(dedupByEmail.values());
}

function sortUsersWithCeoFirst(users, actor) {
    const list = [...users].sort((a, b) => a.name.localeCompare(b.name, 'th'));
    if (!actor || normalizeRole(actor.role) !== 'CEO') return list;

    const actorKey = String(actor.id || '').toLowerCase();
    const idx = list.findIndex(item => String(item.id).toLowerCase() === actorKey);
    if (idx <= 0) return list;

    const [self] = list.splice(idx, 1);
    return [self, ...list];
}

async function applyDailyAutomation(targetDate) {
    const now = new Date();
    const dayStart = getDayStart(targetDate);
    const dayEnd = getDayEnd(targetDate);

    if (hasPassedAbsentCutoff(dayStart, now)) {
        const users = await loadAllUsers();
        const eligible = users.filter(u => ['EMPLOYEE', 'ADMIN', 'CEO'].includes(u.role));

        const existing = await Attendance.find({ date: dayStart }).select('userId').lean();
        const existingIds = new Set(existing.map(item => String(item.userId)));

        const missingUsers = eligible.filter(user => !existingIds.has(String(user.id)));
        if (missingUsers.length) {
            const absentDocs = missingUsers.map(user => ({
                userId: toObjectId(user.id),
                userName: user.name,
                date: dayStart,
                status: 'absent',
                note: 'ระบบตัดขาดงานอัตโนมัติ 11:00 น.'
            })).filter(doc => !!doc.userId);

            if (absentDocs.length) {
                await Attendance.insertMany(absentDocs, { ordered: false }).catch(() => null);
            }
        }
    }

    if (isDayClosed(dayStart, now)) {
        const openRecords = await Attendance.find({
            date: dayStart,
            checkIn: { $ne: null },
            $or: [{ checkOut: null }, { checkOut: { $exists: false } }]
        });

        for (const rec of openRecords) {
            const autoOut = new Date(dayStart);
            autoOut.setHours(AUTO_CHECK_OUT_HOUR, 0, 0, 0);
            rec.checkOut = autoOut;
            rec.workHours = computeWorkHours(rec.checkIn, autoOut);
            rec.status = 'no_checkout';
            rec.note = [rec.note, 'ระบบปิดเวลาอัตโนมัติ (ไม่เช็กเอาต์)'].filter(Boolean).join(' | ');
            await rec.save();
        }
    }

    const records = await Attendance.find({ date: dayStart }).sort({ userName: 1 }).lean();
    const users = await loadAllUsers();
    return { records, users, dayStart, dayEnd };
}

function buildSummary(records, users) {
    const presentRecords = records.filter(r => !!r.checkIn);
    const absentRecords = records.filter(r => r.status === 'absent');
    const checkedInIds = new Set(presentRecords.map(r => String(r.userId)));
    const absentIds = new Set(absentRecords.map(r => String(r.userId)));

    const waitingUsers = users
        .filter(u => ['EMPLOYEE', 'ADMIN', 'CEO'].includes(u.role))
        .filter(u => !checkedInIds.has(String(u.id)))
        .filter(u => !absentIds.has(String(u.id)))
        .map(u => ({ id: u.id, name: u.name, role: u.role }));

    const availableEmployees = waitingUsers;

    return {
        stats: {
            total: records.length,
            present: records.filter(r => r.status === 'present' || r.status === 'no_checkout').length,
            late: records.filter(r => r.status === 'late').length,
            absent: absentRecords.length
        },
        presentRecords,
        absentRecords,
        waitingUsers,
        availableEmployees
    };
}

router.get('/day', async (req, res) => {
    try {
        const actorAccess = await ensureAccess(req, res);
        if (!actorAccess) return;

        const date = parseDateInput(req.query.date);
        const actor = {
            id: actorAccess.id,
            role: actorAccess.role
        };

        const { records, users } = await applyDailyAutomation(date);
        const summary = buildSummary(records, users);

        res.json({
            success: true,
            date,
            records,
            stats: summary.stats,
            tabs: {
                present: summary.presentRecords,
                absent: summary.absentRecords,
                waiting: summary.waitingUsers
            },
            availableEmployees: sortUsersWithCeoFirst(summary.availableEmployees, actor)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/employees/available', async (req, res) => {
    try {
        const actorAccess = await ensureAccess(req, res);
        if (!actorAccess) return;

        const date = parseDateInput(req.query.date);
        const actor = {
            id: actorAccess.id,
            role: actorAccess.role
        };

        const { records, users } = await applyDailyAutomation(date);
        const summary = buildSummary(records, users);

        res.json({
            success: true,
            data: sortUsersWithCeoFirst(summary.availableEmployees, actor)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/calendar/summary', async (req, res) => {
    try {
        const actorAccess = await ensureAccess(req, res);
        if (!actorAccess) return;

        const { monthStart, monthEnd, monthKey } = parseMonthInput(req.query.month);
        const records = await Attendance.find({
            date: { $gte: monthStart, $lte: monthEnd }
        }).select('date status').lean();

        const grouped = new Map();
        for (const record of records) {
            const key = toIsoDateKey(record.date);
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(record);
        }

        const days = Array.from(grouped.entries())
            .map(([date, dayRecords]) => {
                const counts = {
                    present: dayRecords.filter(r => r.status === 'present' || r.status === 'no_checkout').length,
                    late: dayRecords.filter(r => r.status === 'late').length,
                    absent: dayRecords.filter(r => r.status === 'absent').length
                };

                return {
                    date,
                    status: inferCalendarDayStatus(dayRecords),
                    counts
                };
            })
            .sort((a, b) => a.date.localeCompare(b.date));

        res.json({
            success: true,
            month: monthKey,
            days
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/check-in', async (req, res) => {
    try {
        const actorAccess = await ensureAccess(req, res);
        if (!actorAccess) return;

        const { employeeId, employeeName, note = '', date } = req.body;

        const userId = toObjectId(employeeId);
        if (!userId) {
            return res.status(400).json({ success: false, message: 'Invalid employeeId' });
        }

        const dayStart = parseDateInput(date);
        const now = new Date();

        if (!isSameDay(dayStart, now)) {
            return res.status(400).json({ success: false, message: 'Check-in allowed for today only' });
        }

        if (!isWithinCheckInWindow(now)) {
            return res.status(400).json({ success: false, message: 'Check-in allowed only between 07:00-08:00' });
        }

        await applyDailyAutomation(dayStart);

        const existing = await Attendance.findOne({ userId, date: dayStart });
        if (existing && existing.status === 'absent') {
            return res.status(400).json({ success: false, message: 'Cannot check in after absent cutoff' });
        }

        if (existing && existing.checkIn) {
            return res.status(400).json({ success: false, message: 'Already checked in for this date' });
        }

        const checkInTime = isSameDay(dayStart, now)
            ? now
            : new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), START_CHECK_IN_HOUR, 0, 0, 0);

        if (existing) {
            existing.checkIn = checkInTime;
            existing.status = inferStatusFromCheckIn(checkInTime);
            existing.note = [existing.note, note].filter(Boolean).join(' | ');
            await existing.save();
            return res.json({ success: true, record: existing });
        }

        const record = new Attendance({
            userId,
            userName: employeeName || 'ไม่ระบุชื่อ',
            date: dayStart,
            checkIn: checkInTime,
            status: inferStatusFromCheckIn(checkInTime),
            note
        });

        await record.save();
        res.status(201).json({ success: true, record });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.post('/check-out', async (req, res) => {
    try {
        const actorAccess = await ensureAccess(req, res);
        if (!actorAccess) return;

        const { employeeId, note = '', date } = req.body;
        const userId = toObjectId(employeeId);
        if (!userId) {
            return res.status(400).json({ success: false, message: 'Invalid employeeId' });
        }

        const dayStart = parseDateInput(date);
        await applyDailyAutomation(dayStart);

        const record = await Attendance.findOne({ userId, date: dayStart });
        if (!record || !record.checkIn) {
            return res.status(400).json({ success: false, message: 'No check-in record found for selected date' });
        }

        if (record.checkOut) {
            return res.status(400).json({ success: false, message: 'Already checked out' });
        }

        const now = new Date();
        const checkOutTime = isSameDay(dayStart, now)
            ? now
            : new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), AUTO_CHECK_OUT_HOUR, 0, 0, 0);

        record.checkOut = checkOutTime;
        record.workHours = computeWorkHours(record.checkIn, checkOutTime);
        if (record.status === 'no_checkout') {
            record.status = inferStatusFromCheckIn(new Date(record.checkIn));
        }
        record.note = [record.note, note].filter(Boolean).join(' | ');
        await record.save();

        res.json({ success: true, record });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.put('/:id/time', async (req, res) => {
    try {
        const actorAccess = await ensureAccess(req, res);
        if (!actorAccess) return;

        const {
            checkIn,
            checkOut,
            checkInTime,
            checkOutTime,
            note = '',
            actorId = '',
            actorName = ''
        } = req.body;

        if (!String(actorId).trim()) {
            return res.status(400).json({ success: false, message: 'actorId is required in request body' });
        }

        const incomingCheckIn = checkInTime || checkIn;
        const incomingCheckOut = checkOutTime ?? checkOut;

        if (!incomingCheckIn) {
            return res.status(400).json({ success: false, message: 'checkIn is required' });
        }

        const record = await Attendance.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }

        const parsedIn = new Date(incomingCheckIn);
        if (Number.isNaN(parsedIn.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid checkIn format' });
        }

        let parsedOut = null;
        if (incomingCheckOut) {
            parsedOut = new Date(incomingCheckOut);
            if (Number.isNaN(parsedOut.getTime())) {
                return res.status(400).json({ success: false, message: 'Invalid checkOut format' });
            }

            if (parsedOut <= parsedIn) {
                return res.status(400).json({ success: false, message: 'checkOut must be after checkIn' });
            }
        }

        record.checkIn = parsedIn;
        record.checkOut = parsedOut;
        record.workHours = parsedOut ? computeWorkHours(parsedIn, parsedOut) : 0;
        record.status = inferStatusFromEditedTimes(parsedIn, parsedOut);
        record.note = [record.note, note].filter(Boolean).join(' | ');
        record.updatedBy = String(actorId).trim();
        record.adjustedBy = `${actorName || actorAccess.name || 'SYSTEM'} (${actorAccess.role})`;
        record.adjustedReason = note || 'แก้ไขเวลาเช็กอิน/เช็กเอาต์ย้อนหลัง';
        record.adjustedAt = new Date();
        await record.save();

        res.json({ success: true, record });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.put('/:id/checkout', async (req, res) => {
    try {
        const actorAccess = await ensureAccess(req, res);
        if (!actorAccess) return;

        const { checkOutTime, note = '', actorName = '' } = req.body;
        if (!checkOutTime) {
            return res.status(400).json({ success: false, message: 'checkOutTime is required' });
        }

        const record = await Attendance.findById(req.params.id);
        if (!record || !record.checkIn) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }

        const parsedOut = new Date(checkOutTime);
        if (Number.isNaN(parsedOut.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid checkOutTime format' });
        }

        if (parsedOut <= new Date(record.checkIn)) {
            return res.status(400).json({ success: false, message: 'checkOutTime must be after checkIn' });
        }

        record.checkOut = parsedOut;
        record.workHours = computeWorkHours(record.checkIn, parsedOut);
        record.status = inferStatusFromCheckIn(new Date(record.checkIn));
        record.note = [record.note, note].filter(Boolean).join(' | ');
        record.adjustedBy = `${actorName || actorAccess.name || 'SYSTEM'} (${actorAccess.role})`;
        record.adjustedReason = note || 'แก้ไขเวลาเช็กเอาต์ย้อนหลัง';
        record.adjustedAt = new Date();
        await record.save();

        res.json({ success: true, record });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const actorAccess = await ensureAccess(req, res);
        if (!actorAccess) return;

        const record = await Attendance.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }

        await Attendance.deleteOne({ _id: record._id });

        res.json({
            success: true,
            message: 'Attendance record deleted',
            deletedId: String(record._id)
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Backward-compatible list endpoint
router.get('/', async (req, res) => {
    try {
        const actorAccess = await ensureAccess(req, res);
        if (!actorAccess) return;

        const date = parseDateInput(req.query.date);
        const { records } = await applyDailyAutomation(date);
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Backward-compatible get today's attendance for a user
router.get('/today/:userId', async (req, res) => {
    try {
        const actorAccess = await ensureAccess(req, res);
        if (!actorAccess) return;

        const today = getDayStart(new Date());
        const record = await Attendance.findOne({
            userId: req.params.userId,
            date: today
        });

        res.json(record || { checkedIn: false });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/stats/summary', async (req, res) => {
    try {
        const actorAccess = await ensureAccess(req, res);
        if (!actorAccess) return;

        const date = parseDateInput(req.query.date);
        const { records, users } = await applyDailyAutomation(date);
        const summary = buildSummary(records, users);
        res.json(summary.stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
