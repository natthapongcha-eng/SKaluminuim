// ===== Global State =====
let currentUser = {
    id: '',
    role: 'CEO', // or 'EMPLOYEE'
    name: '',
    firstName: '',
    lastName: '',
    phone: '',
    profileImage: '',
    email: ''
};
let selectedProfileImageData = null;

// ===== Utility Functions =====
function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

function formatTime(date) {
    return new Intl.DateTimeFormat('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(date);
}

function getUserDisplayName(user) {
    const firstName = (user.firstName || '').trim();
    const lastName = (user.lastName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user.name || user.email || 'ไม่ระบุชื่อ';
}

function saveSessionUser(user) {
    const sessionSafeUser = {
        id: user.id,
        _id: user._id,
        role: user.role,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email
    };

    try {
        sessionStorage.setItem('user', JSON.stringify(sessionSafeUser));
    } catch (error) {
        console.warn('Unable to persist session user:', error);
    }
}

function getDefaultRoleIcon(role) {
    return role === 'CEO' ? 'images/ceo-icon.png' : 'images/employee-icon.png';
}

function getProfileImageStorageKey(user) {
    const email = (user?.email || '').trim().toLowerCase();
    if (!email) return null;
    return `profileImage:${email}`;
}

function saveLocalProfileImage(user, profileImage) {
    const key = getProfileImageStorageKey(user);
    if (!key) return;

    try {
        if (profileImage) {
            localStorage.setItem(key, profileImage);
        } else {
            localStorage.removeItem(key);
        }
    } catch (error) {
        console.warn('Unable to persist profile image locally:', error);
    }
}

function getLocalProfileImage(user) {
    const key = getProfileImageStorageKey(user);
    if (!key) return '';

    try {
        return localStorage.getItem(key) || '';
    } catch (error) {
        console.warn('Unable to read local profile image:', error);
        return '';
    }
}

function getUserAvatar(user) {
    const profileImage = user?.profileImage || getLocalProfileImage(user);
    return profileImage || getDefaultRoleIcon(user?.role);
}

function optimizeProfileImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const image = new Image();
            image.onload = function() {
                const maxSize = 512;
                const canvas = document.createElement('canvas');
                const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);

                const targetWidth = Math.round(image.width * ratio);
                const targetHeight = Math.round(image.height * ratio);

                canvas.width = targetWidth;
                canvas.height = targetHeight;

                const context = canvas.getContext('2d');
                if (!context) {
                    reject(new Error('ไม่สามารถประมวลผลรูปภาพได้'));
                    return;
                }

                context.drawImage(image, 0, 0, targetWidth, targetHeight);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
                resolve(dataUrl);
            };

            image.onerror = () => reject(new Error('ไฟล์รูปภาพไม่ถูกต้อง'));
            image.src = event.target?.result;
        };

        reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
        reader.readAsDataURL(file);
    });
}

// ===== Modal Functions =====
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.classList.remove('active');
        modal.style.display = 'none';
    });
}

function ensureProfileModal() {
    let modal = document.getElementById('userProfileModal');
    if (modal) return modal;

    const modalHtml = `
        <div id="userProfileModal" class="modal">
            <div class="modal-content small">
                <span class="close" id="closeUserProfileModal">&times;</span>
                <h2>ข้อมูลโปรไฟล์</h2>

                <div class="profile-avatar-section">
                    <img id="profileAvatarPreview" class="profile-avatar-preview" src="images/ceo-icon.png" alt="Profile Avatar">
                </div>

                <div id="profileViewSection" class="profile-view-grid">
                    <div class="profile-field">
                        <label>ชื่อ</label>
                        <p id="profileViewFirstName">-</p>
                    </div>
                    <div class="profile-field">
                        <label>นามสกุล</label>
                        <p id="profileViewLastName">-</p>
                    </div>
                    <div class="profile-field">
                        <label>เบอร์โทร</label>
                        <p id="profileViewPhone">-</p>
                    </div>
                    <div class="profile-field">
                        <label>อีเมล</label>
                        <p id="profileViewEmail">-</p>
                    </div>
                    <div class="profile-field">
                        <label>ตำแหน่ง</label>
                        <p id="profileViewRole">-</p>
                    </div>
                </div>

                <form id="profileEditForm" style="display:none;">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="profileFirstName">ชื่อ</label>
                            <input type="text" id="profileFirstName" required>
                        </div>
                        <div class="form-group">
                            <label for="profileLastName">นามสกุล</label>
                            <input type="text" id="profileLastName" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="profilePhone">เบอร์โทร</label>
                        <input type="tel" id="profilePhone" placeholder="08xxxxxxxx">
                    </div>
                    <div class="form-group">
                        <label for="profileImageInput">รูปโปรไฟล์</label>
                        <input type="file" id="profileImageInput" accept="image/*">
                        <button type="button" id="removeProfileImageBtn" class="btn-secondary profile-remove-btn">ลบรูปโปรไฟล์</button>
                    </div>
                </form>

                <div class="modal-actions">
                    <button type="button" id="editProfileBtn" class="btn-secondary">แก้ไขข้อมูล</button>
                    <button type="button" id="cancelProfileEditBtn" class="btn-secondary" style="display:none;">ยกเลิก</button>
                    <button type="button" id="saveProfileBtn" class="btn-primary" style="display:none;">บันทึก</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modal = document.getElementById('userProfileModal');

    document.getElementById('closeUserProfileModal')?.addEventListener('click', () => {
        closeModal('userProfileModal');
    });

    return modal;
}

function renderProfileModal(user) {
    const profileViewFirstName = document.getElementById('profileViewFirstName');
    const profileViewLastName = document.getElementById('profileViewLastName');
    const profileViewPhone = document.getElementById('profileViewPhone');
    const profileViewEmail = document.getElementById('profileViewEmail');
    const profileViewRole = document.getElementById('profileViewRole');

    if (profileViewFirstName) profileViewFirstName.textContent = user.firstName || '-';
    if (profileViewLastName) profileViewLastName.textContent = user.lastName || '-';
    if (profileViewPhone) profileViewPhone.textContent = user.phone || '-';
    if (profileViewEmail) profileViewEmail.textContent = user.email || '-';
    if (profileViewRole) profileViewRole.textContent = user.role === 'CEO' ? 'CEO' : 'Employee';

    const profileFirstName = document.getElementById('profileFirstName');
    const profileLastName = document.getElementById('profileLastName');
    const profilePhone = document.getElementById('profilePhone');
    const profileAvatarPreview = document.getElementById('profileAvatarPreview');
    const profileImageInput = document.getElementById('profileImageInput');

    if (profileFirstName) profileFirstName.value = user.firstName || '';
    if (profileLastName) profileLastName.value = user.lastName || '';
    if (profilePhone) profilePhone.value = user.phone || '';
    if (profileAvatarPreview) profileAvatarPreview.src = getUserAvatar(user);
    if (profileImageInput) profileImageInput.value = '';
}

function setProfileEditMode(isEdit) {
    const profileViewSection = document.getElementById('profileViewSection');
    const profileEditForm = document.getElementById('profileEditForm');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const cancelProfileEditBtn = document.getElementById('cancelProfileEditBtn');
    const saveProfileBtn = document.getElementById('saveProfileBtn');

    if (profileViewSection) profileViewSection.style.display = isEdit ? 'none' : 'grid';
    if (profileEditForm) profileEditForm.style.display = isEdit ? 'block' : 'none';
    if (editProfileBtn) editProfileBtn.style.display = isEdit ? 'none' : 'inline-flex';
    if (cancelProfileEditBtn) cancelProfileEditBtn.style.display = isEdit ? 'inline-flex' : 'none';
    if (saveProfileBtn) saveProfileBtn.style.display = isEdit ? 'inline-flex' : 'none';
}

function initUserProfile(user) {
    if (!user || (!user.id && !user._id && !user.email)) return;

    const roleBoxes = document.querySelectorAll('#userRole');
    if (!roleBoxes.length) return;

    ensureProfileModal();
    renderProfileModal(currentUser);
    setProfileEditMode(false);

    roleBoxes.forEach(roleBox => {
        if (roleBox.dataset.profileReady === 'true') return;

        roleBox.classList.add('profile-trigger');
        roleBox.title = 'กดเพื่อดูข้อมูลโปรไฟล์';
        roleBox.addEventListener('click', function() {
            selectedProfileImageData = null;
            renderProfileModal(currentUser);
            setProfileEditMode(false);
            openModal('userProfileModal');
        });

        roleBox.dataset.profileReady = 'true';
    });

    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn && editProfileBtn.dataset.profileReady !== 'true') {
        editProfileBtn.addEventListener('click', function() {
            setProfileEditMode(true);
        });
        editProfileBtn.dataset.profileReady = 'true';
    }

    const cancelProfileEditBtn = document.getElementById('cancelProfileEditBtn');
    if (cancelProfileEditBtn && cancelProfileEditBtn.dataset.profileReady !== 'true') {
        cancelProfileEditBtn.addEventListener('click', function() {
            selectedProfileImageData = null;
            renderProfileModal(currentUser);
            setProfileEditMode(false);
        });
        cancelProfileEditBtn.dataset.profileReady = 'true';
    }

    const profileImageInput = document.getElementById('profileImageInput');
    if (profileImageInput && profileImageInput.dataset.profileReady !== 'true') {
        profileImageInput.addEventListener('change', async function() {
            const file = this.files?.[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
                this.value = '';
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                alert('ไฟล์รูปมีขนาดใหญ่เกินไป (สูงสุด 10MB)');
                this.value = '';
                return;
            }

            try {
                selectedProfileImageData = await optimizeProfileImage(file);
                const profileAvatarPreview = document.getElementById('profileAvatarPreview');
                if (profileAvatarPreview && selectedProfileImageData) {
                    profileAvatarPreview.src = selectedProfileImageData;
                }
            } catch (error) {
                alert(error.message || 'ไม่สามารถอัปโหลดรูปภาพได้');
                this.value = '';
            }
        });
        profileImageInput.dataset.profileReady = 'true';
    }

    const removeProfileImageBtn = document.getElementById('removeProfileImageBtn');
    if (removeProfileImageBtn && removeProfileImageBtn.dataset.profileReady !== 'true') {
        removeProfileImageBtn.addEventListener('click', function() {
            selectedProfileImageData = '';
            const profileAvatarPreview = document.getElementById('profileAvatarPreview');
            const profileImageInputEl = document.getElementById('profileImageInput');
            if (profileAvatarPreview) {
                profileAvatarPreview.src = getDefaultRoleIcon(currentUser.role);
            }
            if (profileImageInputEl) {
                profileImageInputEl.value = '';
            }
            saveLocalProfileImage(currentUser, '');
        });
        removeProfileImageBtn.dataset.profileReady = 'true';
    }

    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn && saveProfileBtn.dataset.profileReady !== 'true') {
        saveProfileBtn.addEventListener('click', async function() {
            const firstName = document.getElementById('profileFirstName')?.value.trim() || '';
            const lastName = document.getElementById('profileLastName')?.value.trim() || '';
            const phone = document.getElementById('profilePhone')?.value.trim() || '';
            const profileImage = selectedProfileImageData !== null
                ? selectedProfileImageData
                : (currentUser.profileImage || '');
            const userId = currentUser.id || currentUser._id;

            if (!firstName || !lastName) {
                alert('กรุณากรอกชื่อและนามสกุลให้ครบ');
                return;
            }

            const originalText = saveProfileBtn.textContent;
            saveProfileBtn.textContent = 'กำลังบันทึก...';
            saveProfileBtn.disabled = true;

            try {
                let response;
                if (userId) {
                    response = await api.auth.updateProfile(userId, { firstName, lastName, phone, profileImage });
                } else if (currentUser.email) {
                    response = await api.auth.updateProfileByEmail(currentUser.email, currentUser.role, { firstName, lastName, phone, profileImage });
                } else {
                    throw new Error('User identifier is missing');
                }

                if (response.success && response.user) {
                    currentUser = { ...currentUser, ...response.user };
                    if (selectedProfileImageData !== null) {
                        currentUser.profileImage = selectedProfileImageData;
                    }
                    saveLocalProfileImage(currentUser, currentUser.profileImage || '');
                    saveSessionUser(currentUser);
                    applyRBAC(currentUser);
                    renderProfileModal(currentUser);
                    selectedProfileImageData = null;
                    setProfileEditMode(false);
                    alert('บันทึกข้อมูลโปรไฟล์เรียบร้อย');
                } else {
                    alert(response.message || 'บันทึกข้อมูลไม่สำเร็จ');
                }
            } catch (error) {
                console.error('Update profile error:', error);
                alert(error.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
            } finally {
                saveProfileBtn.textContent = originalText;
                saveProfileBtn.disabled = false;
            }
        });
        saveProfileBtn.dataset.profileReady = 'true';
    }

    const userId = user.id || user._id;
    const profileRequest = userId
        ? api.auth.getProfile(userId)
        : api.auth.getProfileByEmail(user.email, user.role);

    profileRequest
        .then(response => {
            if (response.success && response.user) {
                currentUser = { ...currentUser, ...response.user };
                if (!currentUser.profileImage) {
                    currentUser.profileImage = getLocalProfileImage(currentUser);
                }
                saveLocalProfileImage(currentUser, currentUser.profileImage || '');
                saveSessionUser(currentUser);
                applyRBAC(currentUser);
                renderProfileModal(currentUser);
            }
        })
        .catch(error => {
            console.warn('Unable to load latest profile data:', error);
        });
}

// ===== Login Page =====
// Moved to DOMContentLoaded to prevent conflicts

// ===== Check Authentication =====
function checkAuth() {
    const userStr = sessionStorage.getItem('user');
    const path = window.location.pathname.toLowerCase();
    const isLoginPage = path.endsWith('index.html') || path.endsWith('/') || path === '';

    if (!userStr && !isLoginPage) {
        window.location.href = 'index.html';
        return null;
    }
    return userStr ? JSON.parse(userStr) : null;
}

// ===== Role-Based Access Control =====
function applyRBAC(user) {
    if (!user) return;

    currentUser = user;

    const userRoleElements = document.querySelectorAll('#userRole');
    userRoleElements.forEach(el => {
        const roleLabel = user.role === 'CEO' ? 'CEO' : 'Employee';
        const displayName = getUserDisplayName(user);
        const avatar = getUserAvatar(user);

        el.classList.add('role-profile-box');
        el.innerHTML = `
            <img src="${avatar}" alt="User Avatar" class="role-avatar">
            <span class="role-meta">
                <strong class="role-user-name">${displayName}</strong>
                <small class="role-user-role">${roleLabel}</small>
            </span>
        `;
    });

    // Hide CEO-only elements for employees
    if (user.role === 'EMPLOYEE') {
        const ceoOnlyElements = document.querySelectorAll('.ceo-only');
        ceoOnlyElements.forEach(el => {
            el.style.display = 'none';
        });
        
        const ceoOnlyFields = document.querySelectorAll('.ceo-only-field');
        ceoOnlyFields.forEach(el => {
            el.style.display = 'none';
        });
    }
}

// ===== Logout =====
// Moved to DOMContentLoaded

// ===== Dashboard Page =====
if (document.querySelector('.hero-section')) {
    // Animate stat cards on scroll
    const statCards = document.querySelectorAll('.stat-card');
    const observerOptions = {
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
            }
        });
    }, observerOptions);
    
    statCards.forEach(card => observer.observe(card));
}

// ===== Quotation Page =====
if (document.getElementById('createQuotationBtn')) {
    const createQuotationBtn = document.getElementById('createQuotationBtn');
    const addItemBtn = document.getElementById('addItemBtn');
    const addItemModal = document.getElementById('addItemModal');
    const addItemForm = document.getElementById('addItemForm');
    const cancelAddItem = document.getElementById('cancelAddItem');
    
    // Create new quotation
    createQuotationBtn?.addEventListener('click', function() {
        // Reset form
        document.getElementById('customerName').textContent = '';
        document.getElementById('customerAddress').textContent = '';
        document.getElementById('customerPhone').textContent = '';
        document.getElementById('quotationNumber').textContent = '001';
        
        const today = new Date();
        document.getElementById('quotationDate').textContent = formatDate(today);
        
        alert('สร้างใบเสนอราคาใหม่');
    });
    
    // Add item to quotation
    addItemBtn?.addEventListener('click', function() {
        openModal('addItemModal');
    });
    
    cancelAddItem?.addEventListener('click', function() {
        closeModal('addItemModal');
    });
    
    addItemForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const itemName = document.getElementById('itemName').value;
        const itemQuantity = document.getElementById('itemQuantity').value;
        const itemUnit = document.getElementById('itemUnit').value;
        const itemPrice = document.getElementById('itemPrice').value;
        const itemTotal = itemQuantity * itemPrice;
        
        // Add row to table
        const tbody = document.getElementById('quotationItems');
        const rowCount = tbody.querySelectorAll('tr:not(.add-item-row)').length + 1;
        
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>${rowCount}.</td>
            <td>${itemName}</td>
            <td>${itemQuantity}</td>
            <td>${itemUnit}</td>
            <td>${itemPrice}</td>
            <td>${itemTotal}</td>
        `;
        
        // Insert before add button row
        const addItemRow = tbody.querySelector('.add-item-row');
        tbody.insertBefore(newRow, addItemRow);
        
        // Update total
        updateQuotationTotal();
        
        // Close modal and reset form
        closeModal('addItemModal');
        addItemForm.reset();
    });
    
    // Save quotation
    document.getElementById('saveQuotationBtn')?.addEventListener('click', function() {
        alert('บันทึกใบเสนอราคาเรียบร้อย');
    });
    
    // Print quotation
    document.getElementById('printQuotationBtn')?.addEventListener('click', function() {
        window.print();
    });
    
    // Export PDF
    document.getElementById('exportPdfBtn')?.addEventListener('click', function() {
        alert('กำลังสร้างไฟล์ PDF... (ฟีเจอร์นี้จะเชื่อมต่อกับ backend ในภายหลัง)');
    });
    
    function updateQuotationTotal() {
        const tbody = document.getElementById('quotationItems');
        const rows = tbody.querySelectorAll('tr:not(.add-item-row)');
        let total = 0;
        
        rows.forEach(row => {
            const totalCell = row.cells[5];
            if (totalCell) {
                total += parseFloat(totalCell.textContent) || 0;
            }
        });
        
        document.getElementById('totalAmount').textContent = total.toLocaleString('th-TH');
    }
}

// ===== Inventory Page =====
if (document.getElementById('addMaterialBtn')) {
    const addMaterialBtn = document.getElementById('addMaterialBtn');
    const addMaterialModal = document.getElementById('addMaterialModal');
    const addMaterialForm = document.getElementById('addMaterialForm');
    const cancelAddMaterial = document.getElementById('cancelAddMaterial');

    // Inventory page now uses js/pages/inventory.js for all logic.
    // Hereเราปล่อยให้ปุ่มเปิด/ปิด modal ถูกจัดการจากสคริปต์เฉพาะหน้านั้นแทน
    addMaterialBtn?.addEventListener('click', function() {
        openModal('addMaterialModal');
    });

    cancelAddMaterial?.addEventListener('click', function() {
        closeModal('addMaterialModal');
    });

    // Search and filter
    const searchMaterial = document.getElementById('searchMaterial');
    const filterType = document.getElementById('filterType');
    const filterStock = document.getElementById('filterStock');
    
    searchMaterial?.addEventListener('input', filterInventory);
    filterType?.addEventListener('change', filterInventory);
    filterStock?.addEventListener('change', filterInventory);
    
    function filterInventory() {
        // In real app, this would filter the table rows
        console.log('Filtering inventory...');
    }
}

// ===== Projects Page =====
if (document.getElementById('addProjectBtn')) {
    const addProjectBtn = document.getElementById('addProjectBtn');
    const addProjectModal = document.getElementById('addProjectModal');
    const addProjectForm = document.getElementById('addProjectForm');
    const cancelAddProject = document.getElementById('cancelAddProject');
    
    addProjectBtn?.addEventListener('click', function() {
        openModal('addProjectModal');
    });
    
    cancelAddProject?.addEventListener('click', function() {
        closeModal('addProjectModal');
    });
    
    addProjectForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        alert('สร้างโครงการเรียบร้อย');
        closeModal('addProjectModal');
        addProjectForm.reset();
    });
    
    // Add material to project
    document.getElementById('addMaterialToProject')?.addEventListener('click', function() {
        alert('เพิ่มวัสดุเข้าโครงการ (ฟีเจอร์นี้จะเชื่อมต่อกับระบบ inventory)');
    });
}

// ===== Customers Page =====
if (document.getElementById('addCustomerBtn')) {
    // Handled by js/pages/customers.js
}

// ===== Attendance Page =====
if (document.getElementById('checkInBtn')) {
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');
    const attendanceModal = document.getElementById('attendanceModal');
    const confirmAttendance = document.getElementById('confirmAttendance');
    const cancelAttendance = document.getElementById('cancelAttendance');
    
    // Update current time
    function updateCurrentTime() {
        const currentTimeEl = document.getElementById('currentTime');
        if (currentTimeEl) {
            const now = new Date();
            currentTimeEl.textContent = formatTime(now);
        }
    }
    
    setInterval(updateCurrentTime, 1000);
    updateCurrentTime();
    
    // Update current date display
    const currentDateDisplay = document.getElementById('currentDateDisplay');
    if (currentDateDisplay) {
        const now = new Date();
        const daysOfWeek = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
        const dayName = daysOfWeek[now.getDay()];
        currentDateDisplay.textContent = `วัน${dayName}ที่ ${formatDate(now)}`;
    }
    
    checkInBtn?.addEventListener('click', function() {
        document.getElementById('attendanceModalTitle').textContent = 'ยืนยันการเข้างาน';
        document.getElementById('attendanceModalMessage').textContent = 'คุณต้องการบันทึกเวลาเข้างานใช่หรือไม่?';
        
        const now = new Date();
        document.getElementById('confirmTime').textContent = formatTime(now);
        document.getElementById('confirmDate').textContent = formatDate(now);
        
        openModal('attendanceModal');
    });
    
    checkOutBtn?.addEventListener('click', function() {
        document.getElementById('attendanceModalTitle').textContent = 'ยืนยันการออกงาน';
        document.getElementById('attendanceModalMessage').textContent = 'คุณต้องการบันทึกเวลาออกงานใช่หรือไม่?';
        
        const now = new Date();
        document.getElementById('confirmTime').textContent = formatTime(now);
        document.getElementById('confirmDate').textContent = formatDate(now);
        
        openModal('attendanceModal');
    });
    
    confirmAttendance?.addEventListener('click', function() {
        const note = document.getElementById('attendanceNote').value;
        alert('บันทึกเวลาเรียบร้อย');
        closeModal('attendanceModal');
        document.getElementById('attendanceNote').value = '';
    });
    
    cancelAttendance?.addEventListener('click', function() {
        closeModal('attendanceModal');
    });
    
    // Export attendance
    document.getElementById('exportAttendanceBtn')?.addEventListener('click', function() {
        alert('กำลัง Export ไฟล์ Excel... (ฟีเจอร์นี้จะเชื่อมต่อกับ backend ในภายหลัง)');
    });
}

// ===== Media Page =====
if (document.getElementById('uploadMediaBtn')) {
    const uploadMediaBtn = document.getElementById('uploadMediaBtn');
    const uploadMediaModal = document.getElementById('uploadMediaModal');
    const uploadMediaForm = document.getElementById('uploadMediaForm');
    const cancelUpload = document.getElementById('cancelUpload');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const mediaFiles = document.getElementById('mediaFiles');
    const filePreview = document.getElementById('filePreview');
    
    uploadMediaBtn?.addEventListener('click', function() {
        openModal('uploadMediaModal');
    });
    
    cancelUpload?.addEventListener('click', function() {
        closeModal('uploadMediaModal');
    });
    
    // Click to select files
    fileUploadArea?.addEventListener('click', function() {
        mediaFiles.click();
    });
    
    // Drag and drop
    fileUploadArea?.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = 'var(--primary-blue)';
        this.style.background = 'var(--gray-50)';
    });
    
    fileUploadArea?.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.style.borderColor = 'var(--gray-400)';
        this.style.background = '';
    });
    
    fileUploadArea?.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = 'var(--gray-400)';
        this.style.background = '';
        
        const files = e.dataTransfer.files;
        handleFiles(files);
    });
    
    mediaFiles?.addEventListener('change', function() {
        handleFiles(this.files);
    });
    
    function handleFiles(files) {
        filePreview.innerHTML = '';
        
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    filePreview.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    uploadMediaForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        alert('อัปโหลดรูปภาพเรียบร้อย');
        closeModal('uploadMediaModal');
        uploadMediaForm.reset();
        filePreview.innerHTML = '';
    });
    
    // Image viewer
    const imageViewerModal = document.getElementById('imageViewerModal');
    
    document.querySelectorAll('.media-item img').forEach(img => {
        img.addEventListener('click', function() {
            document.getElementById('viewerImage').src = this.src;
            openModal('imageViewerModal');
        });
    });
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all tabs
            this.parentElement.querySelectorAll('.tab-btn').forEach(t => {
                t.classList.remove('active');
            });
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show corresponding content
            const tabId = this.dataset.tab;
            // In real app, this would show/hide content
            console.log('Switching to tab:', tabId);
        });
    });
}

// ===== Reports Page =====
if (document.getElementById('exportReportBtn')) {
    const exportReportBtn = document.getElementById('exportReportBtn');
    const reportPeriod = document.getElementById('reportPeriod');
    
    exportReportBtn?.addEventListener('click', function() {
        alert('กำลัง Export รายงาน... (ฟีเจอร์นี้จะเชื่อมต่อกับ backend ในภายหลัง)');
    });
    
    reportPeriod?.addEventListener('change', function() {
        if (this.value === 'custom') {
            alert('กรุณาเลือกช่วงเวลา');
        }
    });
    
    // Report tabs
    document.querySelectorAll('.reports-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all tabs
            this.parentElement.querySelectorAll('.tab-btn').forEach(t => {
                t.classList.remove('active');
            });
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Hide all report sections
            document.querySelectorAll('.report-section').forEach(section => {
                section.classList.remove('active');
            });
            
            // Show corresponding report section
            const reportType = this.dataset.report;
            const reportSection = document.getElementById(reportType + 'Report');
            if (reportSection) {
                reportSection.classList.add('active');
            }
        });
    });
}

// ===== Close modal on outside click =====
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        closeAllModals();
    }
});

// ===== Close modal with close button =====
document.querySelectorAll('.modal .close').forEach(closeBtn => {
    closeBtn.addEventListener('click', function() {
        const modal = this.closest('.modal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    });
});

// ===== Initialize on page load =====
document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname.toLowerCase();
    const isLoginPage = path.endsWith('index.html') || path.endsWith('/') || path === '';

    // Check authentication (except on login page)
    if (!isLoginPage) {
        const user = checkAuth();
        if (user) {
            applyRBAC(user);
            initUserProfile(user);
        }
    } else {
        // If already logged in and on login page, redirect to dashboard
        const userStr = sessionStorage.getItem('user');
        if (userStr) {
            window.location.href = 'dashboard.html';
        }
    }

    // ===== Login Page Logic =====
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // ปกติฟอร์ม HTML พอส่งข้อมูลเสร็จมันจะทำการ Reload หน้าใหม่ บรรทัดนี้สั่งให้มันอยู่เฉยๆ เพื่อให้ JavaScript จัดการเอง
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;
            
            if (email && password && role) {
                const btn = loginForm.querySelector('button[type="submit"]');
                const originalText = btn.textContent;
                btn.textContent = 'กำลังเข้าสู่ระบบ...';
                btn.disabled = true;
                
                try {
                    // Call API for login
                    const response = await api.auth.login(email, password, role);
                    // await จะบอกให้โปรแกรม "หยุดรอ" ที่บรรทัดนี้ก่อน จนกว่าจะได้คำตอบจาก Server จริงๆ ถึงจะเอาคำตอบนั้นไปเก็บไว้ในตัวแปร 
                    if (response.success) {
                        // Store user info in sessionStorage
                        saveSessionUser(response.user);
                        
                        // Redirect to dashboard
                        window.location.href = 'dashboard.html';
                    } else {
                        alert(response.message || 'เข้าสู่ระบบไม่สำเร็จ');
                        btn.textContent = originalText;
                        btn.disabled = false;
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
                    btn.textContent = originalText;
                    btn.disabled = false;
                }
            } else {
                alert('กรุณากรอกข้อมูลให้ครบถ้วน');
            }
        });
    }
    
    // Animate elements on scroll
    const animatedElements = document.querySelectorAll('.stat-card, .policy-card, .project-card');
    
    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    entry.target.style.transition = 'all 0.6s ease';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);
            }
        });
    }, { threshold: 0.1 });
    
    animatedElements.forEach(el => scrollObserver.observe(el));
    
    // Add smooth scroll behavior
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ===== Announcement (publish/load) =====
    const announcementBanner = document.getElementById('siteAnnouncementBanner');
    const announcementContent = announcementBanner ? announcementBanner.querySelector('.announcement-content') : null;
    const publishBtn = document.getElementById('publishAnnouncementBtn');
    const saveDraftBtn = document.getElementById('saveDraftAnnouncementBtn');
    const clearBtn = document.getElementById('clearAnnouncementBtn');
    const announcementText = document.getElementById('announcementText');

    function renderAnnouncement(text) {
        if (!announcementBanner || !announcementContent) return;
        if (text) {
            announcementContent.textContent = text;
            announcementBanner.style.display = 'flex';
            announcementBanner.style.justifyContent = 'space-between';
            announcementBanner.style.alignItems = 'center';
            announcementBanner.style.background = '#fff6d6';
            announcementBanner.style.border = '1px solid #f0e1a8';
            announcementBanner.style.padding = '10px 12px';
        } else {
            announcementBanner.style.display = 'none';
        }
    }

    async function loadPublishedAnnouncement() {
        if (!announcementBanner) return;
        try {
            const response = await api.announcement.getCurrent();
            renderAnnouncement(response?.announcement || null);
        } catch (error) {
            console.warn('Unable to load announcement from server:', error);
        }
    }

    // Load draft into editor if present
    try {
        const draft = localStorage.getItem('siteAnnouncementDraft');
        if (announcementText && draft) announcementText.value = draft;
    } catch (e) {
        console.warn('LocalStorage unavailable for announcements', e);
    }

    if (clearBtn) {
        clearBtn.style.display = currentUser.role === 'CEO' ? '' : 'none';
    }

    loadPublishedAnnouncement();

    publishBtn?.addEventListener('click', async function() {
        const text = announcementText?.value.trim();
        if (!text) {
            alert('Please enter announcement text');
            return;
        }

        const originalText = publishBtn.textContent;
        publishBtn.textContent = 'Publishing...';
        publishBtn.disabled = true;

        try {
            const response = await api.announcement.publish(text, currentUser.role || 'CEO');
            localStorage.removeItem('siteAnnouncementDraft');
            renderAnnouncement(response?.announcement || text);
            alert('Announcement published');
        } catch (error) {
            alert(error.message || 'Unable to publish announcement');
        } finally {
            publishBtn.textContent = originalText;
            publishBtn.disabled = false;
        }
    });

    saveDraftBtn?.addEventListener('click', function() {
        const text = announcementText?.value || '';
        localStorage.setItem('siteAnnouncementDraft', text);
        alert('Draft saved');
    });

    clearBtn?.addEventListener('click', async function() {
        if (!announcementBanner) return;
        if (currentUser.role !== 'CEO') return;
        if (confirm('Are you sure you want to clear the announcement?')) {
            try {
                await api.announcement.clear();
                renderAnnouncement(null);
            } catch (error) {
                alert(error.message || 'Unable to clear announcement');
            }
        }
    });
    
    // ===== Logout =====
    const logoutBtns = document.querySelectorAll('#logoutBtn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
                sessionStorage.removeItem('user');
                window.location.href = 'index.html';
            }
        });
    });

    console.log('SK Aluminium System Initialized');
    console.log('Current User:', currentUser);
});

// ===== Service Worker Registration (for future PWA support) =====
if ('serviceWorker' in navigator) {
    // Will be implemented later for offline support
    console.log('Service Worker support detected');
}
