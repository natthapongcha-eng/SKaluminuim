// ===== Global State =====
let currentUser = {
    role: 'CEO', // or 'EMPLOYEE'
    name: '',
    email: ''
};

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
    const span = el.querySelector('span');
    const img = el.querySelector('img');

    // 1. จัดการตัวกล่องหุ้ม (Container) ให้อยู่แถวเดียวกันและกึ่งกลาง
    el.style.display = 'flex';
    el.style.alignItems = 'center'; // จัดให้รูปกับข้อความกลางเท่ากันในแนวตั้ง
    el.style.gap = '10px';          // เว้นระยะห่างระหว่างรูปกับข้อความ

    if (span) {
        span.textContent = user.role === 'CEO' ? 'CEO' : 'Employee';
        // มั่นใจว่า span ไม่มีความสูงเกินจำเป็น
        span.style.lineHeight = '1'; 
    }

    if (img) {
        img.src = user.role === 'CEO'
            ? 'images/ceo-icon.png'
            : 'images/employee-icon.png';
        
        // 2. ปรับขนาดรูปให้พอดี (แนะนำ 24px - 30px ตามภาพใหม่ของคุณ)
        img.style.width = '30px'; 
        img.style.height = '30px';
        img.style.objectFit = 'contain';
        img.style.display = 'block';
        img.style.margin = '0'; // ล้างค่า margin ที่อาจทำให้เบี้ยว
    }
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

    // Check authentication (except on login page)
    if (!isLoginPage) {
        const user = checkAuth();
        if (user) {
            applyRBAC(user);
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
                        sessionStorage.setItem('user', JSON.stringify(response.user));
                        
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

    // Load published announcement
    try {
        const storedAnnouncement = localStorage.getItem('siteAnnouncement');
        if (storedAnnouncement) renderAnnouncement(storedAnnouncement);

        // Load draft into editor if present
        const draft = localStorage.getItem('siteAnnouncementDraft');
        if (announcementText && draft) announcementText.value = draft;
    } catch (e) {
        console.warn('LocalStorage unavailable for announcements', e);
    }

    publishBtn?.addEventListener('click', function() {
        const text = announcementText?.value.trim();
        if (!text) {
            alert('Please enter announcement text');
            return;
        }
        localStorage.setItem('siteAnnouncement', text);
        localStorage.removeItem('siteAnnouncementDraft');
        renderAnnouncement(text);
        alert('Announcement published');
    });

    saveDraftBtn?.addEventListener('click', function() {
        const text = announcementText?.value || '';
        localStorage.setItem('siteAnnouncementDraft', text);
        alert('Draft saved');
    });

    clearBtn?.addEventListener('click', function() {
        if (!announcementBanner) return;
        if (confirm('Are you sure you want to clear the announcement?')) {
            localStorage.removeItem('siteAnnouncement');
            renderAnnouncement(null);
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
