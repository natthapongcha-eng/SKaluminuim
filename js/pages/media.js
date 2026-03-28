/**
 * Media Page Controller
 * จัดการหน้ารูปภาพโครงการ
 */

document.addEventListener('DOMContentLoaded', function() {
    const STAGE_MAP = {
        before: 'before',
        during: 'during',
        after: 'after',
        'รูปก่อนติดตั้ง': 'before',
        'รูประหว่างติดตั้ง': 'during',
        'รูปหลังติดตั้ง': 'after'
    };

    function normalizeStage(stage) {
        return STAGE_MAP[String(stage || '').trim().toLowerCase()]
            || STAGE_MAP[String(stage || '').trim()]
            || 'before';
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function decodePotentiallyMojibakeName(value) {
        const text = String(value || '');
        if (!text) return '';

        const looksMojibake = /Ã.|Â|à¸|à¹|àº|ï¿½/.test(text);
        if (!looksMojibake) return text;

        if (typeof TextDecoder !== 'function') return text;

        try {
            const bytes = Uint8Array.from(Array.from(text).map(char => char.charCodeAt(0) & 0xff));
            const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
            if (!decoded || decoded.includes('�')) return text;
            return decoded;
        } catch (error) {
            return text;
        }
    }

    function extractRefId(refValue) {
        if (!refValue) return '';
        if (typeof refValue === 'string') return refValue.trim();
        if (typeof refValue === 'object') {
            const objectId = refValue._id || refValue.id;
            if (typeof objectId === 'string') return objectId.trim();
            if (objectId && typeof objectId.toString === 'function') {
                const text = objectId.toString().trim();
                return text === '[object Object]' ? '' : text;
            }
        }
        if (typeof refValue.toString === 'function') {
            const text = refValue.toString().trim();
            return text === '[object Object]' ? '' : text;
        }
        return '';
    }

    // State
    let projects = [];
    let quotations = [];
    let projectNameById = new Map();
    let mediaByProject = {};
    let mediaByQuotation = {};
    let currentMediaItems = [];
    let currentImageIndex = 0;

    // DOM Elements
    const filterProject = document.getElementById('filterProject');
    const filterMediaType = document.getElementById('filterMediaType');
    const filterMediaSource = document.getElementById('filterMediaSource');
    const uploadMediaBtn = document.getElementById('uploadMediaBtn');
    const uploadMediaModal = document.getElementById('uploadMediaModal');
    const uploadMediaForm = document.getElementById('uploadMediaForm');
    const mediaUploadType = document.getElementById('mediaUploadType');
    const mediaProjectGroup = document.getElementById('mediaProjectGroup');
    const mediaQuotationGroup = document.getElementById('mediaQuotationGroup');
    const mediaCategoryGroup = document.getElementById('mediaCategoryGroup');
    const mediaProject = document.getElementById('mediaProject');
    const mediaQuotation = document.getElementById('mediaQuotation');
    const mediaFiles = document.getElementById('mediaFiles');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const filePreview = document.getElementById('filePreview');
    const cancelUpload = document.getElementById('cancelUpload');
    const imageViewerModal = document.getElementById('imageViewerModal');
    const viewerImage = document.getElementById('viewerImage');
    const imageProjectName = document.getElementById('imageProjectName');
    const imageDate = document.getElementById('imageDate');
    const imageDescription = document.getElementById('imageDescription');
    const deleteSuccessModal = document.getElementById('deleteSuccessModal');
    const closeDeleteSuccessBtn = document.getElementById('closeDeleteSuccessBtn');
    const uploadSuccessModal = document.getElementById('uploadSuccessModal');
    const uploadSuccessMessage = document.getElementById('uploadSuccessMessage');
    const closeUploadSuccessBtn = document.getElementById('closeUploadSuccessBtn');
    const projectsGallery = document.querySelector('.projects-gallery');

    // Initialize
    init();

    async function init() {
        await Promise.all([loadProjects(), loadQuotations()]);
        await loadAllMedia();
        setupEventListeners();
    }

    // Load projects for dropdown and gallery
    async function loadProjects() {
        try {
            projects = await api.projects.getAll();
            projectNameById = new Map(
                projects.map(project => [String(project._id), project.name || `โครงการ ${project._id}`])
            );
            populateProjectDropdowns();
        } catch (error) {
            console.error('Error loading projects:', error);
            showToast('ไม่สามารถโหลดข้อมูลโครงการได้', 'error');
        }
    }

    async function loadQuotations() {
        try {
            quotations = await api.quotations.getAll();
            populateQuotationDropdown();
        } catch (error) {
            console.error('Error loading quotations:', error);
            showToast('ไม่สามารถโหลดข้อมูลใบเสนอราคาได้', 'error');
        }
    }

    function populateProjectDropdowns() {
        // Clear existing options (keep first "all" option)
        filterProject.innerHTML = '<option value="all">โครงการทั้งหมด</option>';
        mediaProject.innerHTML = '<option value="">เลือกโครงการ</option>';

        projects.forEach(project => {
            const name = project.name || `โครงการ ${project._id}`;
            
            filterProject.innerHTML += `<option value="${project._id}">${name}</option>`;
            mediaProject.innerHTML += `<option value="${project._id}">${name}</option>`;
        });
    }

    function populateQuotationDropdown() {
        if (!mediaQuotation) return;

        mediaQuotation.innerHTML = '<option value="">เลือกใบเสนอราคา</option>';
        quotations.forEach((quotation) => {
            const label = `${quotation.quotationNumber || '-'} - ${quotation.customerName || '-'}`;
            mediaQuotation.innerHTML += `<option value="${quotation._id}">${label}</option>`;
        });
    }

    function formatStorageSize(bytes) {
        const safeBytes = Number(bytes) || 0;
        const mb = safeBytes / (1024 * 1024);
        if (mb < 1024) return `${mb.toFixed(2)} MB`;
        const gb = mb / 1024;
        return `${gb.toFixed(2)} GB`;
    }

    // Update media statistics from currently loaded list (matches filters on screen)
    function loadMediaStats(mediaItems = []) {
        const renderableProjectMedia = mediaItems.filter(item => {
            const mediaType = String(item.mediaType || 'project');
            return mediaType !== 'quotation' && Boolean(extractRefId(item.projectId));
        });

        const renderableQuotationMedia = mediaItems.filter(item => {
            const mediaType = String(item.mediaType || 'project');
            return mediaType === 'quotation' && Boolean(extractRefId(item.quotationId));
        });

        const renderableMedia = [...renderableProjectMedia, ...renderableQuotationMedia];

        const totalMedia = renderableMedia.length;

        const projectSet = new Set(
            renderableProjectMedia
                .map(item => extractRefId(item.projectId))
                .filter(Boolean)
        );

        const totalSize = renderableMedia.reduce((sum, item) => sum + (Number(item.size) || 0), 0);

        const statCards = document.querySelectorAll('.stat-card');
        if (statCards[0]) statCards[0].querySelector('h3').textContent = String(totalMedia);
        if (statCards[1]) statCards[1].querySelector('h3').textContent = String(projectSet.size);
        if (statCards[2]) statCards[2].querySelector('h3').textContent = formatStorageSize(totalSize);
    }

    // Load all media grouped by project
    async function loadAllMedia() {
        try {
            projectsGallery.innerHTML = '<p class="loading">กำลังโหลด...</p>';
            const source = filterMediaSource?.value || 'all';
            const filters = {
                mediaType: source !== 'all' ? source : undefined,
                projectId: filterProject.value !== 'all' ? filterProject.value : undefined,
                stage: filterMediaType.value !== 'all' ? filterMediaType.value : undefined
            };

            if (source === 'quotation') {
                filters.projectId = undefined;
                filters.stage = undefined;
            }

            const query = new URLSearchParams(
                Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined))
            ).toString();
            const media = await api.request(`/media${query ? `?${query}` : ''}`);

            media.forEach(item => {
                item.originalName = decodePotentiallyMojibakeName(item.originalName || item.filename || '');
            });

            loadMediaStats(media);
            
            // Group media by project
            mediaByProject = {};
            mediaByQuotation = {};
            media.forEach(item => {
                const mediaType = String(item.mediaType || 'project');

                if (mediaType === 'quotation') {
                    const quotationId = extractRefId(item.quotationId);
                    if (!quotationId) return;

                    if (!mediaByQuotation[quotationId]) {
                        mediaByQuotation[quotationId] = {
                            quotation: item.quotationId,
                            attachments: []
                        };
                    }

                    mediaByQuotation[quotationId].attachments.push(item);
                    return;
                }

                const projectId = extractRefId(item.projectId);
                if (!projectId) {
                    return;
                }

                if (!mediaByProject[projectId]) {
                    mediaByProject[projectId] = {
                        project: item.projectId,
                        before: [],
                        during: [],
                        after: []
                    };
                }
                const stageKey = normalizeStage(item.stage);
                mediaByProject[projectId][stageKey].push(item);
            });

            renderGallery();
        } catch (error) {
            console.error('Error loading media:', error);
            projectsGallery.innerHTML = '<p class="no-data">ไม่สามารถโหลดข้อมูลได้</p>';
            loadMediaStats([]);
        }
    }

    function renderGallery() {
        if (Object.keys(mediaByProject).length === 0 && Object.keys(mediaByQuotation).length === 0) {
            projectsGallery.innerHTML = '<p class="no-data">ยังไม่มีรูปภาพ กดปุ่ม "อัปโหลดรูปภาพ" เพื่อเพิ่ม</p>';
            return;
        }

        projectsGallery.innerHTML = '';

        renderQuotationCards();
        renderProjectCards();

        setupProjectCardSelection();
        setupTabListeners();
    }

    function renderProjectCards() {
        if ((filterMediaSource?.value || 'all') === 'quotation') {
            return;
        }

        Object.entries(mediaByProject).forEach(([projectId, data]) => {
            const selectedStageFilter = filterMediaType.value;
            const isSingleStageFilter = ['before', 'during', 'after'].includes(selectedStageFilter);
            const visibleStage = isSingleStageFilter ? selectedStageFilter : 'before';
            const projectName = getProjectDisplayName(data.project, projectId);
            const totalImages = data.before.length + data.during.length + data.after.length;
            const stageMeta = [
                { key: 'before', label: 'ก่อนติดตั้ง', count: data.before.length },
                { key: 'during', label: 'ระหว่างติดตั้ง', count: data.during.length },
                { key: 'after', label: 'หลังติดตั้ง', count: data.after.length }
            ];
            const stagesToRender = isSingleStageFilter
                ? stageMeta.filter(stage => stage.key === selectedStageFilter)
                : stageMeta;

            const tabsHtml = stagesToRender
                .map(stage => `<button class="tab-btn ${visibleStage === stage.key ? 'active' : ''}" data-tab="${stage.key}-${projectId}">${stage.label} (${stage.count})</button>`)
                .join('');

            const gridsHtml = stagesToRender
                .map(stage => `
                <div class="media-grid ${visibleStage !== stage.key ? 'hidden' : ''}" id="${stage.key}-${projectId}" data-project="${projectId}" data-stage="${stage.key}">
                    ${renderMediaItems(data[stage.key], projectName)}
                    ${renderUploadPlaceholder(projectId, stage.key)}
                </div>
                `)
                .join('');

            const card = document.createElement('div');
            card.className = 'project-gallery-card';
            card.dataset.projectId = projectId;
            card.innerHTML = `
                <div class="project-gallery-header">
                    <h3>${projectName}</h3>
                    <span class="image-count">${totalImages} รูป</span>
                </div>
                
                <div class="media-tabs">
                    ${tabsHtml}
                </div>

                ${gridsHtml}
            `;

            projectsGallery.appendChild(card);
        });
    }

    function renderQuotationCards() {
        if ((filterMediaSource?.value || 'all') === 'project') {
            return;
        }

        Object.entries(mediaByQuotation).forEach(([quotationId, data]) => {
            const quotationNumber = data.quotation?.quotationNumber || quotationId;
            const customerName = data.quotation?.customerName || '-';

            const card = document.createElement('div');
            card.className = 'project-gallery-card';
            card.dataset.quotationId = quotationId;
            card.innerHTML = `
                <div class="project-gallery-header">
                    <h3>ใบเสนอราคา ${quotationNumber} (${customerName})</h3>
                    <span class="image-count">${data.attachments.length} รูป</span>
                </div>

                <div class="media-grid" id="quotation-${quotationId}" data-quotation="${quotationId}" data-stage="after">
                    ${renderMediaItems(data.attachments, `ใบเสนอราคา ${quotationNumber}`)}
                    ${renderQuotationUploadPlaceholder(quotationId)}
                </div>
            `;

            projectsGallery.appendChild(card);
        });
    }

    function setupProjectCardSelection() {
        document.querySelectorAll('.project-gallery-card').forEach(card => {
            const header = card.querySelector('.project-gallery-header');
            const projectId = card.dataset.projectId;

            if (!header || !projectId) return;

            header.style.cursor = 'pointer';
            header.title = 'คลิกเพื่อแสดงเฉพาะโครงการนี้';

            header.addEventListener('click', async () => {
                if (filterProject.value === projectId) return;
                filterProject.value = projectId;
                await loadAllMedia();
            });
        });
    }

    function getProjectDisplayName(projectRef, fallbackProjectId) {
        if (projectRef && typeof projectRef === 'object' && projectRef.name) {
            return projectRef.name;
        }

        const projectId = String(projectRef?._id || projectRef || fallbackProjectId || '');
        return projectNameById.get(projectId) || `โครงการ ${projectId}`;
    }

    function renderMediaItems(items, projectName = '') {
        return items.map((item, index) => `
            <div class="media-item" data-id="${item._id}" data-index="${index}" data-project-name="${escapeHtml(projectName)}" data-created-at="${escapeHtml(item.createdAt)}" data-description="${escapeHtml(item.description || '')}" data-file-type="${item.mimetype === 'application/pdf' ? 'pdf' : 'image'}" data-file-url="${escapeHtml(item.imageUrl || item.path || '')}">
                ${item.mimetype === 'application/pdf'
                    ? `<div class="media-file-preview pdf-preview"><span class="pdf-badge">PDF</span><p class="pdf-name">${escapeHtml(item.originalName || 'ไฟล์ PDF')}</p></div>`
                    : `<img src="${item.imageUrl || item.path}" alt="${item.originalName}" loading="lazy">`
                }
                <div class="media-overlay">
                    <button class="btn-icon view-btn" data-id="${item._id}">${item.mimetype === 'application/pdf' ? '📄' : '👁️'}</button>
                    <button class="btn-icon delete-btn" data-id="${item._id}">🗑️</button>
                </div>
                <p class="media-date">${formatDate(item.createdAt)}</p>
                ${item.description ? `<p class="media-description">${escapeHtml(item.description)}</p>` : ''}
            </div>
        `).join('');
    }

    function renderUploadPlaceholder(projectId, stage) {
        return `
            <div class="media-item upload-placeholder">
                <button class="btn-upload" data-project="${projectId}" data-stage="${stage}">
                    <span>➕</span>
                    <p>เพิ่มรูปภาพ</p>
                </button>
            </div>
        `;
    }

    function renderQuotationUploadPlaceholder(quotationId) {
        return `
            <div class="media-item upload-placeholder">
                <button class="btn-upload" data-quotation="${quotationId}">
                    <span>➕</span>
                    <p>เพิ่มรูปใบเสนอราคา</p>
                </button>
            </div>
        `;
    }

    function setupTabListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.target.dataset.tab;
                const card = e.target.closest('.project-gallery-card');
                
                // Toggle active tab button
                card.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Toggle visible grid
                card.querySelectorAll('.media-grid').forEach(grid => {
                    grid.classList.add('hidden');
                });
                card.querySelector(`#${tabId}`).classList.remove('hidden');
            });
        });

        // View buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const mediaItem = e.target.closest('.media-item');
                if (!mediaItem) return;

                if (mediaItem.dataset.fileType === 'pdf') {
                    const pdfUrl = mediaItem.dataset.fileUrl;
                    if (pdfUrl) {
                        window.open(pdfUrl, '_blank', 'noopener');
                    }
                    return;
                }

                openImageViewer(mediaItem);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteMedia(btn.dataset.id);
            });
        });

        // Quick upload placeholders
        document.querySelectorAll('.btn-upload').forEach(btn => {
            btn.addEventListener('click', () => {
                const projectId = btn.dataset.project;
                const stage = btn.dataset.stage;
                const quotationId = btn.dataset.quotation;
                openUploadModal(projectId, stage, quotationId);
            });
        });
    }

    function setupEventListeners() {
        // Filter changes
        filterMediaSource?.addEventListener('change', () => {
            const source = filterMediaSource.value;
            const isQuotationOnly = source === 'quotation';

            filterProject.disabled = isQuotationOnly;
            filterMediaType.disabled = isQuotationOnly;

            if (isQuotationOnly) {
                filterProject.value = 'all';
                filterMediaType.value = 'all';
            }

            loadAllMedia();
        });
        filterProject.addEventListener('change', loadAllMedia);
        filterMediaType.addEventListener('change', loadAllMedia);

        mediaUploadType?.addEventListener('change', () => {
            toggleUploadTypeFields();
        });

        // Upload button
        uploadMediaBtn.addEventListener('click', () => openUploadModal());

        // Modal close buttons
        document.querySelectorAll('.modal .close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (!modal) return;
                modal.classList.remove('active');
            });
        });

        // Cancel upload
        cancelUpload.addEventListener('click', () => {
            uploadMediaModal.classList.remove('active');
            resetUploadForm();
        });

        // Close delete success popup
        closeDeleteSuccessBtn?.addEventListener('click', () => {
            if (deleteSuccessModal) deleteSuccessModal.classList.remove('active');
        });

        closeUploadSuccessBtn?.addEventListener('click', () => {
            if (uploadSuccessModal) uploadSuccessModal.classList.remove('active');
        });

        // File upload area click
        fileUploadArea.addEventListener('click', () => mediaFiles.click());

        // File input change
        mediaFiles.addEventListener('change', handleFileSelect);

        // Drag and drop
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        });

        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.classList.remove('dragover');
        });

        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            mediaFiles.files = e.dataTransfer.files;
            handleFileSelect();
        });

        // Upload form submit
        uploadMediaForm.addEventListener('submit', handleUpload);

        // Image viewer navigation
        document.querySelector('.nav-btn.prev')?.addEventListener('click', () => navigateViewer(-1));
        document.querySelector('.nav-btn.next')?.addEventListener('click', () => navigateViewer(1));

        // Close modal on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });

        // Keyboard navigation in viewer
        document.addEventListener('keydown', (e) => {
            if (imageViewerModal.style.display === 'block') {
                if (e.key === 'ArrowLeft') navigateViewer(-1);
                if (e.key === 'ArrowRight') navigateViewer(1);
                if (e.key === 'Escape') imageViewerModal.style.display = 'none';
            }
        });

        toggleUploadTypeFields();
    }

    function toggleUploadTypeFields() {
        const isQuotation = mediaUploadType?.value === 'quotation';

        if (mediaProjectGroup) {
            mediaProjectGroup.style.display = isQuotation ? 'none' : 'block';
        }
        if (mediaCategoryGroup) {
            mediaCategoryGroup.style.display = isQuotation ? 'none' : 'block';
        }
        if (mediaQuotationGroup) {
            mediaQuotationGroup.style.display = isQuotation ? 'block' : 'none';
        }

        if (mediaProject) {
            mediaProject.required = !isQuotation;
        }
        const mediaCategory = document.getElementById('mediaCategory');
        if (mediaCategory) {
            mediaCategory.required = !isQuotation;
        }
        if (mediaQuotation) {
            mediaQuotation.required = isQuotation;
        }
    }

    function openUploadModal(projectId = '', stage = '', quotationId = '') {
        // main.js may set inline display:none when closing modals; clear it before reopening.
        uploadMediaModal.style.removeProperty('display');
        uploadMediaModal.classList.add('active');

        if (quotationId) {
            mediaUploadType.value = 'quotation';
            toggleUploadTypeFields();
            mediaQuotation.value = quotationId;
        } else {
            mediaUploadType.value = 'project';
            toggleUploadTypeFields();
            if (projectId) {
                mediaProject.value = projectId;
            }
            if (stage) {
                document.getElementById('mediaCategory').value = stage;
            }
        }
    }

    function handleFileSelect() {
        const files = mediaFiles.files;
        filePreview.innerHTML = '';

        Array.from(files).forEach((file, index) => {
            if (file.type === 'application/pdf') {
                const preview = document.createElement('div');
                preview.className = 'preview-item preview-file';
                preview.innerHTML = `
                    <div class="preview-file-icon">PDF</div>
                    <button type="button" class="remove-preview" data-index="${index}">×</button>
                    <p>${file.name}</p>
                `;
                filePreview.appendChild(preview);

                preview.querySelector('.remove-preview').addEventListener('click', (e) => {
                    e.stopPropagation();
                    preview.remove();
                });
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.createElement('div');
                preview.className = 'preview-item';
                preview.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}">
                    <button type="button" class="remove-preview" data-index="${index}">×</button>
                    <p>${file.name}</p>
                `;
                filePreview.appendChild(preview);
                
                // Remove preview handler
                preview.querySelector('.remove-preview').addEventListener('click', (e) => {
                    e.stopPropagation();
                    preview.remove();
                });
            };
            reader.readAsDataURL(file);
        });
    }

    async function handleUpload(e) {
        e.preventDefault();

        const uploadType = mediaUploadType?.value || 'project';
        const projectId = mediaProject.value;
        const quotationId = mediaQuotation?.value || '';
        const stage = document.getElementById('mediaCategory').value;
        const description = document.getElementById('mediaDescription').value;

        const hasRequiredContext = uploadType === 'quotation'
            ? Boolean(quotationId)
            : Boolean(projectId && stage);

        if (!hasRequiredContext || mediaFiles.files.length === 0) {
            showToast('กรุณากรอกข้อมูลให้ครบถ้วนและเลือกรูปภาพ', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('mediaType', uploadType);
        formData.append('description', description);

        if (uploadType === 'quotation') {
            formData.append('quotationId', quotationId);
        } else {
            formData.append('projectId', projectId);
            formData.append('stage', stage);
        }

        Array.from(mediaFiles.files).forEach(file => {
            formData.append('images', file);
        });

        try {
            const result = await api.request('/media/upload', {
                method: 'POST',
                body: formData
            });

            uploadMediaModal.classList.remove('active');
            resetUploadForm();
            await loadMediaStats();
            await loadAllMedia();
            showUploadSuccessModal(result.message || 'อัปโหลดสำเร็จ');
        } catch (error) {
            console.error('Upload error:', error);
            showToast('เกิดข้อผิดพลาดในการอัปโหลด: ' + error.message, 'error');
        }
    }

    function resetUploadForm() {
        uploadMediaForm.reset();
        if (mediaUploadType) {
            mediaUploadType.value = 'project';
        }
        toggleUploadTypeFields();
        filePreview.innerHTML = '';
    }

    async function deleteMedia(id) {
        let shouldDelete = false;

        if (typeof showStyledConfirm === 'function') {
            shouldDelete = await showStyledConfirm({
                title: 'ยืนยันการลบรูปภาพ',
                message: 'คุณต้องการลบรูปภาพนี้ใช่หรือไม่? การลบจะไม่สามารถกู้คืนได้',
                confirmText: 'ลบรูปภาพ',
                cancelText: 'ยกเลิก',
                variant: 'danger'
            });
        } else {
            shouldDelete = confirm('ต้องการลบรูปภาพนี้หรือไม่?');
        }

        if (!shouldDelete) return;

        try {
            await api.request(`/media/${id}`, { method: 'DELETE' });
            await loadMediaStats();
            await loadAllMedia();
            showDeleteSuccessModal();
        } catch (error) {
            console.error('Delete error:', error);
            showToast('เกิดข้อผิดพลาดในการลบ', 'error');
        }
    }

    function showDeleteSuccessModal() {
        if (deleteSuccessModal) {
            deleteSuccessModal.style.removeProperty('display');
            deleteSuccessModal.classList.add('active');
            return;
        }
        showToast('ลบรูปภาพสำเร็จ', 'success');
    }

    function showUploadSuccessModal(message) {
        if (uploadSuccessMessage) {
            uploadSuccessMessage.textContent = message || 'อัปโหลดรูปภาพสำเร็จ';
        }

        if (uploadSuccessModal) {
            uploadSuccessModal.style.removeProperty('display');
            uploadSuccessModal.classList.add('active');
            return;
        }

        showToast(message || 'อัปโหลดรูปภาพสำเร็จ', 'success');
    }

    function openImageViewer(mediaItem) {
        if (!mediaItem || mediaItem.dataset.fileType === 'pdf') {
            return;
        }

        const mediaGrid = mediaItem.closest('.media-grid');
        currentMediaItems = Array.from(mediaGrid.querySelectorAll('.media-item:not(.upload-placeholder)'))
            .filter((item) => item.dataset.fileType !== 'pdf');
        currentImageIndex = currentMediaItems.indexOf(mediaItem);

        if (currentMediaItems.length > 0 && currentImageIndex >= 0) {
            updateViewerInfo();
            imageViewerModal.style.display = 'block';
        }
    }

    function navigateViewer(direction) {
        currentImageIndex += direction;
        if (currentImageIndex < 0) currentImageIndex = currentMediaItems.length - 1;
        if (currentImageIndex >= currentMediaItems.length) currentImageIndex = 0;

        updateViewerInfo();
    }

    function updateViewerInfo() {
        if (!currentMediaItems.length || currentImageIndex < 0) return;

        const activeItem = currentMediaItems[currentImageIndex];
        const activeImage = activeItem.querySelector('img');
        if (!activeImage) return;

        viewerImage.src = activeImage.src;
        if (imageProjectName) {
            imageProjectName.textContent = activeItem.dataset.projectName || 'โครงการ...';
        }
        if (imageDate) {
            imageDate.textContent = `วันที่: ${formatDate(activeItem.dataset.createdAt) || '-'}`;
        }
        if (imageDescription) {
            const desc = activeItem.dataset.description || '';
            imageDescription.textContent = desc ? `หมายเหตุ: ${desc}` : 'หมายเหตุ: -';
        }
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
