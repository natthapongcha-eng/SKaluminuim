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
let profileCropState = null;

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

function readImageFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
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

function setProfileHydrated(isReady) {
    document.body.classList.toggle('profile-ready', !!isReady);
}

function ensureConfirmModal() {
    let modal = document.getElementById('appConfirmModal');
    if (modal) return modal;

    const html = `
        <div id="appConfirmModal" class="modal confirm-modal">
            <div class="modal-content confirm-modal-content small">
                <span class="close" id="confirmCloseBtn">&times;</span>
                <div class="confirm-modal-header">
                    <h3 id="confirmTitle">ยืนยันรายการ</h3>
                </div>
                <p id="confirmMessage" class="confirm-modal-message">คุณต้องการดำเนินการต่อหรือไม่?</p>
                <div class="confirm-modal-actions">
                    <button type="button" id="confirmCancelBtn" class="btn-secondary">ยกเลิก</button>
                    <button type="button" id="confirmOkBtn" class="btn-primary">ตกลง</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    modal = document.getElementById('appConfirmModal');
    return modal;
}

function showStyledConfirm({
    title = 'ยืนยันรายการ',
    message = 'คุณต้องการดำเนินการต่อหรือไม่?',
    confirmText = 'ตกลง',
    cancelText = 'ยกเลิก',
    variant = 'danger'
} = {}) {
    const modal = ensureConfirmModal();
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');
    const closeBtn = document.getElementById('confirmCloseBtn');

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (okBtn) okBtn.textContent = confirmText;
    if (cancelBtn) cancelBtn.textContent = cancelText;

    okBtn?.classList.remove('danger', 'info');
    if (variant === 'danger') okBtn?.classList.add('danger');
    if (variant === 'info') okBtn?.classList.add('info');

    openModal('appConfirmModal');

    return new Promise((resolve) => {
        const resolveAndCleanup = (result) => {
            closeModal('appConfirmModal');
            okBtn?.removeEventListener('click', onOk);
            cancelBtn?.removeEventListener('click', onCancel);
            closeBtn?.removeEventListener('click', onCancel);
            modal?.removeEventListener('click', onBackdropClick);
            resolve(result);
        };

        const onOk = () => resolveAndCleanup(true);
        const onCancel = () => resolveAndCleanup(false);
        const onBackdropClick = (event) => {
            if (event.target === modal) onCancel();
        };

        okBtn?.addEventListener('click', onOk);
        cancelBtn?.addEventListener('click', onCancel);
        closeBtn?.addEventListener('click', onCancel);
        modal?.addEventListener('click', onBackdropClick);
    });
}

function showProfileSaveSuccess(message = 'บันทึกข้อมูลเรียบร้อย') {
    const notice = document.getElementById('profileSaveNotice');
    const modalContent = document.querySelector('#userProfileModal .profile-modal-content');
    const avatar = document.getElementById('profileAvatarPreview');

    if (notice) {
        notice.textContent = message;
        notice.classList.add('active');
        setTimeout(() => notice.classList.remove('active'), 1800);
    }

    if (modalContent) {
        modalContent.classList.add('save-success');
        setTimeout(() => modalContent.classList.remove('save-success'), 900);
    }

    if (avatar) {
        avatar.classList.add('saved');
        setTimeout(() => avatar.classList.remove('saved'), 900);
    }
}

function ensureProfileImageViewerModal() {
    let modal = document.getElementById('profileImageViewerModal');
    if (modal) return modal;

    const html = `
        <div id="profileImageViewerModal" class="modal image-viewer">
            <div class="modal-content profile-image-viewer-content">
                <span class="close" id="closeProfileImageViewerModal">&times;</span>
                <h3>รูปโปรไฟล์</h3>
                <div class="image-viewer-container profile-image-viewer-container">
                    <img id="profileImageViewerPreview" src="" alt="Profile image preview">
                </div>
                <div class="modal-actions profile-image-viewer-actions">
                    <button type="button" id="openProfileImageCropBtn" class="btn-primary" style="display:none;">ครอบภาพ</button>
                    <button type="button" id="closeProfileImageViewerBtn" class="btn-secondary">ปิด</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    modal = document.getElementById('profileImageViewerModal');

    document.getElementById('closeProfileImageViewerModal')?.addEventListener('click', () => {
        closeModal('profileImageViewerModal');
    });

    document.getElementById('closeProfileImageViewerBtn')?.addEventListener('click', () => {
        closeModal('profileImageViewerModal');
    });

    document.getElementById('openProfileImageCropBtn')?.addEventListener('click', () => {
        const viewerImage = document.getElementById('profileImageViewerPreview');
        const src = viewerImage?.getAttribute('src') || '';
        if (!src) return;
        closeModal('profileImageViewerModal');
        openProfileCropModal(src);
    });

    return modal;
}

function ensureProfileImageCropModal() {
    let modal = document.getElementById('profileImageCropModal');
    if (modal) return modal;

    const html = `
        <div id="profileImageCropModal" class="modal profile-image-crop-modal">
            <div class="modal-content profile-image-crop-content">
                <span class="close" id="closeProfileImageCropModal">&times;</span>
                <h3>ครอบรูปโปรไฟล์</h3>
                <p class="profile-crop-subtitle">ลากรูปเพื่อจัดตำแหน่ง และใช้สไลด์เพื่อซูม</p>

                <div class="profile-crop-stage" id="profileCropStage">
                    <img id="profileCropImage" src="" alt="Crop preview">
                    <div class="profile-crop-frame" aria-hidden="true"></div>
                </div>

                <div class="profile-crop-controls">
                    <label for="profileCropZoom">ซูม</label>
                    <input id="profileCropZoom" type="range" min="1" max="3" step="0.01" value="1">
                </div>

                <div class="modal-actions">
                    <button type="button" id="resetProfileCropBtn" class="btn-secondary">รีเซ็ต</button>
                    <button type="button" id="cancelProfileCropBtn" class="btn-secondary">ยกเลิก</button>
                    <button type="button" id="applyProfileCropBtn" class="btn-primary">ใช้ภาพนี้</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    modal = document.getElementById('profileImageCropModal');

    const closeCrop = () => closeModal('profileImageCropModal');
    document.getElementById('closeProfileImageCropModal')?.addEventListener('click', closeCrop);
    document.getElementById('cancelProfileCropBtn')?.addEventListener('click', closeCrop);

    const cropStage = document.getElementById('profileCropStage');
    const cropImage = document.getElementById('profileCropImage');
    const zoomInput = document.getElementById('profileCropZoom');

    const onPointerDown = (event) => {
        if (!profileCropState || !cropStage || !cropImage) return;
        profileCropState.isDragging = true;
        profileCropState.startX = event.clientX;
        profileCropState.startY = event.clientY;
        profileCropState.startOffsetX = profileCropState.offsetX;
        profileCropState.startOffsetY = profileCropState.offsetY;
        cropStage.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event) => {
        if (!profileCropState || !profileCropState.isDragging) return;
        const dx = event.clientX - profileCropState.startX;
        const dy = event.clientY - profileCropState.startY;
        profileCropState.offsetX = profileCropState.startOffsetX + dx;
        profileCropState.offsetY = profileCropState.startOffsetY + dy;
        clampProfileCropOffsets();
        renderProfileCropImage();
    };

    const onPointerUp = (event) => {
        if (!profileCropState || !cropStage) return;
        profileCropState.isDragging = false;
        cropStage.releasePointerCapture?.(event.pointerId);
    };

    cropStage?.addEventListener('pointerdown', onPointerDown);
    cropStage?.addEventListener('pointermove', onPointerMove);
    cropStage?.addEventListener('pointerup', onPointerUp);
    cropStage?.addEventListener('pointerleave', onPointerUp);

    zoomInput?.addEventListener('input', () => {
        if (!profileCropState) return;
        const prevScale = profileCropState.scale;
        const nextScale = Math.max(profileCropState.minScale, Math.min(profileCropState.maxScale, Number(zoomInput.value || prevScale)));

        const centerX = profileCropState.cropSize / 2;
        const centerY = profileCropState.cropSize / 2;
        const imagePointX = (centerX - profileCropState.offsetX) / prevScale;
        const imagePointY = (centerY - profileCropState.offsetY) / prevScale;

        profileCropState.scale = nextScale;
        profileCropState.offsetX = centerX - (imagePointX * nextScale);
        profileCropState.offsetY = centerY - (imagePointY * nextScale);

        clampProfileCropOffsets();
        renderProfileCropImage();
    });

    document.getElementById('resetProfileCropBtn')?.addEventListener('click', () => {
        resetProfileCrop();
    });

    document.getElementById('applyProfileCropBtn')?.addEventListener('click', () => {
        applyProfileCrop();
    });

    return modal;
}

function clampProfileCropOffsets() {
    if (!profileCropState) return;

    const scaledWidth = profileCropState.imageWidth * profileCropState.scale;
    const scaledHeight = profileCropState.imageHeight * profileCropState.scale;

    const minX = profileCropState.cropSize - scaledWidth;
    const minY = profileCropState.cropSize - scaledHeight;

    profileCropState.offsetX = Math.min(0, Math.max(minX, profileCropState.offsetX));
    profileCropState.offsetY = Math.min(0, Math.max(minY, profileCropState.offsetY));
}

function renderProfileCropImage() {
    if (!profileCropState) return;
    const cropImage = document.getElementById('profileCropImage');
    if (!cropImage) return;

    const scaledWidth = profileCropState.imageWidth * profileCropState.scale;
    const scaledHeight = profileCropState.imageHeight * profileCropState.scale;

    cropImage.style.width = `${scaledWidth}px`;
    cropImage.style.height = `${scaledHeight}px`;
    cropImage.style.left = `${profileCropState.offsetX}px`;
    cropImage.style.top = `${profileCropState.offsetY}px`;
}

function resetProfileCrop() {
    if (!profileCropState) return;
    profileCropState.scale = profileCropState.minScale;
    profileCropState.offsetX = (profileCropState.cropSize - (profileCropState.imageWidth * profileCropState.scale)) / 2;
    profileCropState.offsetY = (profileCropState.cropSize - (profileCropState.imageHeight * profileCropState.scale)) / 2;

    const zoomInput = document.getElementById('profileCropZoom');
    if (zoomInput) {
        zoomInput.value = String(profileCropState.scale);
    }

    clampProfileCropOffsets();
    renderProfileCropImage();
}

function openProfileImageViewer(src, { canCrop = false } = {}) {
    if (!src) return;
    ensureProfileImageViewerModal();

    const preview = document.getElementById('profileImageViewerPreview');
    const cropBtn = document.getElementById('openProfileImageCropBtn');

    if (preview) preview.src = src;
    if (cropBtn) cropBtn.style.display = canCrop ? 'inline-flex' : 'none';

    openModal('profileImageViewerModal');
}

function openProfileCropModal(src) {
    if (!src) return;
    ensureProfileImageCropModal();

    const cropImage = document.getElementById('profileCropImage');
    const zoomInput = document.getElementById('profileCropZoom');
    if (!cropImage || !zoomInput) return;

    const image = new Image();
    image.onload = () => {
        const cropSize = 280;
        const minScale = Math.max(cropSize / image.width, cropSize / image.height);
        const maxScale = Math.max(minScale * 3, minScale + 0.2);

        profileCropState = {
            src,
            image,
            imageWidth: image.width,
            imageHeight: image.height,
            cropSize,
            minScale,
            maxScale,
            scale: minScale,
            offsetX: 0,
            offsetY: 0,
            isDragging: false,
            startX: 0,
            startY: 0,
            startOffsetX: 0,
            startOffsetY: 0
        };

        cropImage.src = src;
        zoomInput.min = String(minScale);
        zoomInput.max = String(maxScale);
        zoomInput.value = String(minScale);

        resetProfileCrop();
        openModal('profileImageCropModal');
    };

    image.onerror = () => {
        alert('ไม่สามารถโหลดรูปภาพเพื่อครอบได้');
    };

    image.src = src;
}

function applyProfileCrop() {
    if (!profileCropState) return;

    const canvas = document.createElement('canvas');
    const outputSize = 512;
    canvas.width = outputSize;
    canvas.height = outputSize;

    const context = canvas.getContext('2d');
    if (!context) {
        alert('ไม่สามารถประมวลผลรูปภาพได้');
        return;
    }

    const sourceX = Math.max(0, (-profileCropState.offsetX) / profileCropState.scale);
    const sourceY = Math.max(0, (-profileCropState.offsetY) / profileCropState.scale);
    const sourceSize = profileCropState.cropSize / profileCropState.scale;

    context.drawImage(
        profileCropState.image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        outputSize,
        outputSize
    );

    selectedProfileImageData = canvas.toDataURL('image/jpeg', 0.9);

    const preview = document.getElementById('profileAvatarPreview');
    if (preview && selectedProfileImageData) {
        preview.src = selectedProfileImageData;
    }

    closeModal('profileImageCropModal');
}

function ensureProfileModal() {
    let modal = document.getElementById('userProfileModal');
    if (modal) return modal;

    const modalHtml = `
        <div id="userProfileModal" class="modal">
            <div class="modal-content small profile-modal-content">
                <span class="close" id="closeUserProfileModal">&times;</span>
                <div class="profile-modal-header">
                    <h2>ข้อมูลโปรไฟล์</h2>
                    <p>อัปเดตข้อมูลส่วนตัวให้เป็นปัจจุบัน</p>
                </div>

                <div id="profileSaveNotice" class="profile-save-notice">บันทึกข้อมูลเรียบร้อย</div>

                <div class="profile-avatar-section">
                    <img id="profileAvatarPreview" class="profile-avatar-preview" src="images/ceo-icon.png" alt="Profile Avatar" title="กดเพื่อดูรูปใหญ่">
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

    const profileSaveNotice = document.getElementById('profileSaveNotice');
    if (profileSaveNotice) {
        profileSaveNotice.classList.remove('active');
    }
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
                const sourceDataUrl = await readImageFileAsDataURL(file);
                openProfileCropModal(sourceDataUrl);
            } catch (error) {
                alert(error.message || 'ไม่สามารถอัปโหลดรูปภาพได้');
                this.value = '';
            }
        });
        profileImageInput.dataset.profileReady = 'true';
    }

    const profileAvatarPreview = document.getElementById('profileAvatarPreview');
    if (profileAvatarPreview && profileAvatarPreview.dataset.profileReady !== 'true') {
        profileAvatarPreview.addEventListener('click', () => {
            const src = profileAvatarPreview.getAttribute('src') || '';
            if (!src) return;
            const isEditMode = document.getElementById('profileEditForm')?.style.display !== 'none';
            openProfileImageViewer(src, { canCrop: isEditMode });
        });
        profileAvatarPreview.dataset.profileReady = 'true';
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
                    showProfileSaveSuccess('บันทึกข้อมูลโปรไฟล์เรียบร้อย');
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

    setProfileHydrated(true);

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
    // Quotation page logic is handled by js/pages/quotation.js
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

    if (!isLoginPage) {
        setProfileHydrated(false);
    }

    // Check authentication (except on login page)
    if (!isLoginPage) {
        const user = checkAuth();
        if (user) {
            applyRBAC(user);
            initUserProfile(user);
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
    const announcementPublishNotice = document.getElementById('announcementPublishNotice');
    const announcementStartAt = document.getElementById('announcementStartAt');
    const announcementEndAt = document.getElementById('announcementEndAt');
    const increaseAnnouncementDaysBtn = document.getElementById('increaseAnnouncementDaysBtn');
    const decreaseAnnouncementDaysBtn = document.getElementById('decreaseAnnouncementDaysBtn');
    const increaseAnnouncementHoursBtn = document.getElementById('increaseAnnouncementHoursBtn');
    const decreaseAnnouncementHoursBtn = document.getElementById('decreaseAnnouncementHoursBtn');

    function formatDateTimeLocal(date) {
        const pad = value => String(value).padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    function parseDateTimeLocal(value) {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    function ensureAnnouncementScheduleDefaults() {
        if (!announcementStartAt || !announcementEndAt) return;
        if (!announcementStartAt.value) {
            const now = new Date();
            announcementStartAt.value = formatDateTimeLocal(now);
        }

        if (!announcementEndAt.value) {
            const end = new Date(parseDateTimeLocal(announcementStartAt.value)?.getTime() || Date.now());
            end.setDate(end.getDate() + 1);
            announcementEndAt.value = formatDateTimeLocal(end);
        }
    }

    function adjustAnnouncementEndBy({ days = 0, hours = 0 }) {
        if (!announcementStartAt || !announcementEndAt) return;
        ensureAnnouncementScheduleDefaults();

        const startDate = parseDateTimeLocal(announcementStartAt.value);
        const endDate = parseDateTimeLocal(announcementEndAt.value);
        if (!startDate || !endDate) return;

        endDate.setDate(endDate.getDate() + days);
        endDate.setHours(endDate.getHours() + hours);

        if (endDate <= startDate) {
            endDate.setTime(startDate.getTime() + 60 * 60 * 1000);
        }

        const maxEnd = new Date(startDate.getTime() + (7 * 24 * 60 * 60 * 1000));
        if (endDate > maxEnd) {
            endDate.setTime(maxEnd.getTime());
        }

        announcementEndAt.value = formatDateTimeLocal(endDate);
    }

    function formatAnnouncementRange(startAtValue, endAtValue) {
        const start = new Date(startAtValue);
        const end = new Date(endAtValue);
        const fmt = (date) => new Intl.DateTimeFormat('th-TH', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
        return `${fmt(start)} - ${fmt(end)}`;
    }

    function showAnnouncementPublishSuccess(message = 'ประกาศสำเร็จ') {
        if (announcementPublishNotice) {
            announcementPublishNotice.textContent = `✅ ${message}`;
            announcementPublishNotice.classList.add('active');
            setTimeout(() => announcementPublishNotice.classList.remove('active'), 2000);
        }

        if (announcementBanner) {
            announcementBanner.classList.add('announcement-success');
            setTimeout(() => announcementBanner.classList.remove('announcement-success'), 1200);
        }
    }

    function showAnnouncementDeleteSuccess(message = 'ลบประกาศเรียบร้อย') {
        if (announcementPublishNotice) {
            announcementPublishNotice.textContent = `🗑️ ${message}`;
            announcementPublishNotice.classList.add('active', 'delete');
            setTimeout(() => {
                announcementPublishNotice.classList.remove('active', 'delete');
            }, 1800);
        }

        if (announcementBanner) {
            announcementBanner.classList.add('announcement-delete-success');
            setTimeout(() => announcementBanner.classList.remove('announcement-delete-success'), 900);
        }
    }

    function renderAnnouncement(items) {
        if (!announcementBanner || !announcementContent) return;
        if (items?.length) {
            const safeItems = items
                .map(item => `
                    <div class="announcement-item" data-id="${item._id || ''}">
                        <div class="announcement-item-text">${item.content}</div>
                        <div class="announcement-item-meta">🕒 ${formatAnnouncementRange(item.startAt, item.endAt)}</div>
                        ${currentUser.role === 'CEO' ? `<button class="announcement-remove-item" data-id="${item._id || ''}" title="ลบประกาศนี้">✕</button>` : ''}
                    </div>
                `)
                .join('');

            announcementContent.innerHTML = `<div class="announcement-list">${safeItems}</div>`;
            announcementBanner.style.display = 'flex';
            announcementBanner.style.justifyContent = 'space-between';
            announcementBanner.style.alignItems = 'center';
            announcementBanner.style.background = '#fff6d6';
            announcementBanner.style.border = '1px solid #f0e1a8';
            announcementBanner.style.padding = '10px 12px';

            announcementContent.querySelectorAll('.announcement-remove-item').forEach(btn => {
                btn.addEventListener('click', async (event) => {
                    event.preventDefault();
                    const id = btn.dataset.id;
                    if (!id || currentUser.role !== 'CEO') return;
                    const isConfirmed = await showStyledConfirm({
                        title: 'ยืนยันการลบประกาศ',
                        message: 'ลบประกาศนี้ใช่หรือไม่?',
                        confirmText: 'ลบประกาศ',
                        cancelText: 'ยกเลิก',
                        variant: 'danger'
                    });
                    if (!isConfirmed) return;
                    try {
                        const announcementItem = btn.closest('.announcement-item');
                        if (announcementItem) {
                            announcementItem.classList.add('removing');
                            await new Promise(resolve => setTimeout(resolve, 220));
                        }
                        await api.announcement.deleteById(id);
                        await loadPublishedAnnouncement();
                        showAnnouncementDeleteSuccess('ลบประกาศเรียบร้อย');
                    } catch (error) {
                        alert(error.message || 'Unable to remove announcement');
                    }
                });
            });
        } else {
            announcementBanner.style.display = 'none';
            announcementContent.innerHTML = '';
        }
    }

    async function loadPublishedAnnouncement() {
        if (!announcementBanner) return;
        try {
            const response = await api.announcement.getCurrent();
            renderAnnouncement(response?.announcements || []);
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

    if (announcementPublishNotice) {
        announcementPublishNotice.classList.remove('active');
    }

    ensureAnnouncementScheduleDefaults();

    announcementStartAt?.addEventListener('change', function() {
        ensureAnnouncementScheduleDefaults();
        const start = parseDateTimeLocal(announcementStartAt.value);
        const end = parseDateTimeLocal(announcementEndAt?.value || '');
        if (!start || !announcementEndAt) return;

        if (!end || end <= start) {
            const fallbackEnd = new Date(start.getTime() + 60 * 60 * 1000);
            announcementEndAt.value = formatDateTimeLocal(fallbackEnd);
        }
    });

    increaseAnnouncementDaysBtn?.addEventListener('click', () => adjustAnnouncementEndBy({ days: 1 }));
    decreaseAnnouncementDaysBtn?.addEventListener('click', () => adjustAnnouncementEndBy({ days: -1 }));
    increaseAnnouncementHoursBtn?.addEventListener('click', () => adjustAnnouncementEndBy({ hours: 1 }));
    decreaseAnnouncementHoursBtn?.addEventListener('click', () => adjustAnnouncementEndBy({ hours: -1 }));

    loadPublishedAnnouncement();

    publishBtn?.addEventListener('click', async function() {
        const text = announcementText?.value.trim();
        if (!text) {
            alert('Please enter announcement text');
            return;
        }

        const startAt = parseDateTimeLocal(announcementStartAt?.value || '');
        const endAt = parseDateTimeLocal(announcementEndAt?.value || '');

        if (!startAt || !endAt) {
            alert('กรุณาระบุวันเวลาเริ่มและสิ้นสุดประกาศ');
            return;
        }

        if (endAt <= startAt) {
            alert('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
            return;
        }

        const maxDuration = 7 * 24 * 60 * 60 * 1000;
        if (endAt.getTime() - startAt.getTime() > maxDuration) {
            alert('ประกาศต้องมีระยะเวลาไม่เกิน 7 วัน');
            return;
        }

        const originalText = publishBtn.textContent;
        publishBtn.textContent = 'Publishing...';
        publishBtn.disabled = true;

        try {
            await api.announcement.publish(
                text,
                currentUser.role || 'CEO',
                startAt.toISOString(),
                endAt.toISOString()
            );
            localStorage.removeItem('siteAnnouncementDraft');
            if (announcementText) announcementText.value = '';
            ensureAnnouncementScheduleDefaults();
            await loadPublishedAnnouncement();
            showAnnouncementPublishSuccess('ประกาศเรียบร้อยแล้ว');
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
        const isConfirmed = await showStyledConfirm({
            title: 'ยืนยันการลบประกาศทั้งหมด',
            message: 'คุณต้องการลบประกาศทั้งหมดที่กำลังแสดงอยู่หรือไม่?',
            confirmText: 'ลบทั้งหมด',
            cancelText: 'ยกเลิก',
            variant: 'danger'
        });
        if (isConfirmed) {
            try {
                await api.announcement.clear();
                renderAnnouncement([]);
                showAnnouncementDeleteSuccess('ลบประกาศทั้งหมดเรียบร้อย');
            } catch (error) {
                alert(error.message || 'Unable to clear announcement');
            }
        }
    });
    
    // ===== Logout =====
    const logoutBtns = document.querySelectorAll('#logoutBtn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            const isConfirmed = await showStyledConfirm({
                title: 'ยืนยันการออกจากระบบ',
                message: 'คุณต้องการออกจากระบบหรือไม่?',
                confirmText: 'ออกจากระบบ',
                cancelText: 'อยู่ต่อ',
                variant: 'info'
            });
            if (isConfirmed) {
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
