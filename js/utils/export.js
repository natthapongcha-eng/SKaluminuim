// ===== Export Utilities =====
// Using SheetJS (xlsx) for Excel and html2pdf.js for PDF

const ExportUtils = {
    // Load an external script once and reuse it.
    loadScriptOnce: function(win, src) {
        return new Promise((resolve, reject) => {
            const existing = win.document.querySelector(`script[src="${src}"]`);
            if (existing) {
                if (typeof win.html2pdf !== 'undefined') {
                    resolve();
                } else {
                    existing.addEventListener('load', () => resolve(), { once: true });
                    existing.addEventListener('error', () => reject(new Error('โหลดสคริปต์ไม่สำเร็จ')), { once: true });
                }
                return;
            }

            const script = win.document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('โหลดสคริปต์ไม่สำเร็จ'));
            win.document.head.appendChild(script);
        });
    },

    // Try loading script from multiple sources until one works.
    loadScriptFromAny: async function(win, sources) {
        let lastError = null;
        for (const src of sources) {
            try {
                await this.loadScriptOnce(win, src);
                return;
            } catch (error) {
                lastError = error;
            }
        }
        throw lastError || new Error('โหลดสคริปต์ไม่สำเร็จ');
    },

    ensureHtml2Pdf: async function(win) {
        if (typeof win.html2pdf !== 'undefined') return;
        await this.loadScriptFromAny(win, [
            'js/vendor/html2pdf.bundle.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
            'https://unpkg.com/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js',
            'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js'
        ]);
        if (typeof win.html2pdf === 'undefined') {
            throw new Error('ไม่พบ html2pdf หลังโหลดสคริปต์');
        }
    },

    // Clone element while preserving current form state (selected dates, input values, checked states).
    cloneHtmlWithFormState: function(element) {
        const clone = element.cloneNode(true);
        const sourceControls = element.querySelectorAll('input, select, textarea');
        const cloneControls = clone.querySelectorAll('input, select, textarea');

        sourceControls.forEach((source, index) => {
            const target = cloneControls[index];
            if (!target) return;

            if (source instanceof HTMLInputElement && (source.type === 'checkbox' || source.type === 'radio')) {
                target.checked = source.checked;
                if (source.checked) {
                    target.setAttribute('checked', 'checked');
                } else {
                    target.removeAttribute('checked');
                }
                return;
            }

            if (source instanceof HTMLSelectElement && target instanceof HTMLSelectElement) {
                target.value = source.value;
                Array.from(target.options).forEach((opt, optIndex) => {
                    opt.selected = Boolean(source.options[optIndex]?.selected);
                    if (opt.selected) {
                        opt.setAttribute('selected', 'selected');
                    } else {
                        opt.removeAttribute('selected');
                    }
                });
                return;
            }

            if (source instanceof HTMLTextAreaElement && target instanceof HTMLTextAreaElement) {
                target.value = source.value;
                target.textContent = source.value;
                return;
            }

            if (source instanceof HTMLInputElement && target instanceof HTMLInputElement) {
                target.value = source.value;
                target.setAttribute('value', source.value);
            }
        });

        return clone.outerHTML;
    },

    // Export table data to Excel
    exportToExcel: function(data, filename = 'export') {
        if (!data || data.length === 0) {
            alert('ไม่มีข้อมูลสำหรับ Export');
            return;
        }

        // Create worksheet
        let csvContent = '\uFEFF'; // UTF-8 BOM for Thai support
        
        // Get headers from first row keys
        const headers = Object.keys(data[0]);
        csvContent += headers.join(',') + '\n';
        
        // Add data rows
        data.forEach(row => {
            const values = headers.map(h => {
                let val = row[h] || '';
                // Escape commas and quotes
                if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                    val = '"' + val.replace(/"/g, '""') + '"';
                }
                return val;
            });
            csvContent += values.join(',') + '\n';
        });
        
        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // Export element to PDF
    exportToPDF: function(elementId, filename = 'export') {
        const printableElement = document.getElementById(elementId);
        if (!printableElement) {
            alert('ไม่พบข้อมูลสำหรับ Export');
            return;
        }

        // Reuse page styles so exported PDF matches print layout as closely as possible.
        const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .map(link => `<link rel="stylesheet" href="${link.href}">`)
            .join('');

        const inlineStyles = Array.from(document.querySelectorAll('style'))
            .map(style => `<style>${style.textContent || ''}</style>`)
            .join('');

        const bodyClass = document.body?.className || '';
        const clonedHTML = element.outerHTML;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('เบราว์เซอร์บล็อกหน้าต่างใหม่ กรุณาอนุญาต Pop-up ก่อน Export PDF');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${filename}</title>
                ${styleLinks}
                ${inlineStyles}
                <style>
                    .sidebar, .content-header, .quotation-actions, .modal, .no-print {
                        display: none !important;
                    }
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                </style>
            </head>
            <body class="${bodyClass}">
                ${clonedHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 500);
    },

    // Export element as downloadable PDF using print layout styles.
    exportUsingPrintLayout: async function(elementId, filename = 'export.pdf', options = {}) {
        const element = document.getElementById(elementId);
        if (!element) {
            alert('ไม่พบข้อมูลสำหรับ Export');
            return;
        }

        const autoDownload = options.autoDownload !== false;

        const exportWindow = window.open('', '_blank');
        if (!exportWindow) {
            alert('เบราว์เซอร์บล็อกหน้าต่างใหม่ กรุณาอนุญาต Pop-up ก่อน Export PDF');
            return;
        }

        const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .map(link => `<link rel="stylesheet" href="${link.href}">`)
            .join('');

        // Convert print media rules to apply in export window rendering context.
        const inlineStyles = Array.from(document.querySelectorAll('style'))
            .map(style => {
                const css = (style.textContent || '').replace(/@media\s+print/gi, '@media all');
                return `<style>${css}</style>`;
            })
            .join('');

        const safeFilename = String(filename || 'export.pdf').endsWith('.pdf')
            ? String(filename || 'export.pdf')
            : `${filename}.pdf`;

        // Apply print-time transformations before cloning (e.g., replace inputs with plain text).
        let clonedHTML = '';
        try {
            window.dispatchEvent(new Event('beforeprint'));
            clonedHTML = this.cloneHtmlWithFormState(element);
        } finally {
            window.dispatchEvent(new Event('afterprint'));
        }

        exportWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <base href="${document.baseURI}">
                <title>${safeFilename}</title>
                ${styleLinks}
                ${inlineStyles}
                <style>
                    body {
                        margin: 0;
                        background: #f3f4f6;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .export-toolbar {
                        position: sticky;
                        top: 0;
                        z-index: 9999;
                        display: flex;
                        gap: 8px;
                        justify-content: center;
                        padding: 12px;
                        background: #111827;
                    }
                    .export-toolbar button {
                        border: none;
                        padding: 8px 14px;
                        border-radius: 8px;
                        font-size: 14px;
                        cursor: pointer;
                    }
                    #downloadPdfBtn {
                        background: #1e40af;
                        color: #fff;
                    }
                    #printPreviewBtn {
                        background: #fff;
                        color: #111827;
                    }
                    #exportPreviewRoot {
                        padding: 10px 0 24px;
                    }
                    @media print {
                        .export-toolbar {
                            display: none !important;
                        }
                        #exportPreviewRoot {
                            padding: 0 !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="export-toolbar">
                    <button id="downloadPdfBtn" type="button">ดาวน์โหลด PDF</button>
                    <button id="printPreviewBtn" type="button">พิมพ์</button>
                </div>
                <div id="exportPreviewRoot">
                    ${clonedHTML}
                </div>
            </body>
            </html>
        `);
        exportWindow.document.close();

        const exportElement = exportWindow.document.getElementById(elementId);
        const downloadBtn = exportWindow.document.getElementById('downloadPdfBtn');
        const printBtn = exportWindow.document.getElementById('printPreviewBtn');
        const fileName = safeFilename;

        const downloadPdf = async () => {
            if (!downloadBtn || !exportElement) return;
            downloadBtn.disabled = true;
            downloadBtn.textContent = 'กำลังสร้าง PDF...';
            try {
                if (exportWindow.document.fonts && exportWindow.document.fonts.ready) {
                    await exportWindow.document.fonts.ready;
                }
                await new Promise(resolve => setTimeout(resolve, 250));

                await this.ensureHtml2Pdf(exportWindow);

                const options = {
                    margin: [0, 0, 0, 0],
                    filename: fileName,
                    image: { type: 'jpeg', quality: 1 },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: '#ffffff'
                    },
                    jsPDF: {
                        unit: 'mm',
                        format: 'a4',
                        orientation: 'portrait'
                    },
                    pagebreak: {
                        mode: ['css', 'legacy']
                    }
                };

                await exportWindow.html2pdf().set(options).from(exportElement).save();
                downloadBtn.textContent = 'ดาวน์โหลด PDF อีกครั้ง';
            } catch (err) {
                console.error('Export PDF error:', err);
                downloadBtn.textContent = 'ดาวน์โหลด PDF';
                alert('โหลด PDF ไม่สำเร็จ กดปุ่ม "พิมพ์" แล้วเลือก Save as PDF ชั่วคราวได้');
            } finally {
                downloadBtn.disabled = false;
            }
        };

        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadPdf);
        }
        if (printBtn) {
            printBtn.addEventListener('click', () => exportWindow.print());
        }

        if (autoDownload) {
            setTimeout(() => {
                downloadPdf();
            }, 150);
        }
    },

    // Export directly from current page without popup window.
    exportUsingPrintLayoutDirect: async function(elementId, filename = 'export.pdf') {
        const element = document.getElementById(elementId);
        if (!element) {
            alert('ไม่พบข้อมูลสำหรับ Export');
            return;
        }

        const safeFilename = String(filename || 'export.pdf').endsWith('.pdf')
            ? String(filename || 'export.pdf')
            : `${filename}.pdf`;

        const injectedStyles = [];
        const originalScrollX = window.scrollX || window.pageXOffset || 0;
        const originalScrollY = window.scrollY || window.pageYOffset || 0;
        let printModeActivated = false;
        try {
            await this.ensureHtml2Pdf(window);

            // Make print rules apply during canvas rendering.
            document.querySelectorAll('style').forEach(style => {
                const css = (style.textContent || '').replace(/@media\s+print/gi, '@media all');
                const styleTag = document.createElement('style');
                styleTag.setAttribute('data-export-print-style', 'true');
                styleTag.textContent = css;
                document.head.appendChild(styleTag);
                injectedStyles.push(styleTag);
            });

            // Activate print-mode transformations on current DOM so exported PDF matches print preview.
            window.dispatchEvent(new Event('beforeprint'));
            printModeActivated = true;

            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }

            // Ensure watermark image is loaded before canvas capture.
            await new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => resolve();
                img.src = 'uploads/media/Sk.jpg';
            });

            // Capture from top-left consistently to avoid clipped/missing header in PDF.
            window.scrollTo(0, 0);
            await new Promise(resolve => setTimeout(resolve, 200));

            // Render only printable area and neutralize current scroll to avoid top blank space.
            const targetElement = element;

            const options = {
                margin: [0, 0, 0, 0],
                filename: safeFilename,
                image: { type: 'png', quality: 1 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    scrollX: 0,
                    scrollY: 0,
                    windowWidth: Math.max(targetElement.scrollWidth, targetElement.clientWidth),
                    windowHeight: Math.max(targetElement.scrollHeight, targetElement.clientHeight)
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait'
                },
                pagebreak: {
                    mode: ['css', 'legacy']
                }
            };

            await window.html2pdf().set(options).from(targetElement).save();
        } catch (error) {
            console.error('Export PDF error:', error);
            alert('โหลด PDF ไม่สำเร็จ กดปุ่ม "พิมพ์" แล้วเลือก Save as PDF ชั่วคราวได้');
        } finally {
            window.scrollTo(originalScrollX, originalScrollY);
            if (printModeActivated) {
                window.dispatchEvent(new Event('afterprint'));
            }
            injectedStyles.forEach(styleTag => styleTag.remove());
        }
    },

    // Export by rasterizing print layout to image first, then packing image pages into PDF.
    // This keeps visual output closer to print preview (font/position) at the cost of selectable text.
    exportPrintSnapshotPdf: async function(elementId, filename = 'export.pdf') {
        const element = document.getElementById(elementId);
        if (!element) {
            alert('ไม่พบข้อมูลสำหรับ Export');
            return;
        }

        const safeFilename = String(filename || 'export.pdf').endsWith('.pdf')
            ? String(filename || 'export.pdf')
            : `${filename}.pdf`;

        const injectedStyles = [];
        const originalScrollX = window.scrollX || window.pageXOffset || 0;
        const originalScrollY = window.scrollY || window.pageYOffset || 0;
        let captureHost = null;
        let targetElement = element;
        let printModeActivated = false;

        try {
            await this.ensureHtml2Pdf(window);

            document.querySelectorAll('style').forEach(style => {
                const css = (style.textContent || '').replace(/@media\s+print/gi, '@media all');
                const styleTag = document.createElement('style');
                styleTag.setAttribute('data-export-print-style', 'true');
                styleTag.textContent = css;
                document.head.appendChild(styleTag);
                injectedStyles.push(styleTag);
            });

            window.dispatchEvent(new Event('beforeprint'));
            printModeActivated = true;

            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }

            window.scrollTo(0, 0);
            await new Promise(resolve => setTimeout(resolve, 220));

            // Render from a detached-at-left clone to avoid x-offset clipping from app layout/sidebar.
            captureHost = document.createElement('div');
            captureHost.setAttribute('data-export-capture-host', 'true');
            captureHost.style.position = 'fixed';
            captureHost.style.left = '0';
            captureHost.style.top = '0';
            captureHost.style.width = 'auto';
            captureHost.style.background = '#ffffff';
            captureHost.style.opacity = '1';
            captureHost.style.pointerEvents = 'none';
            captureHost.style.zIndex = '-1';

            captureHost.innerHTML = this.cloneHtmlWithFormState(element);
            document.body.appendChild(captureHost);

            targetElement = captureHost.firstElementChild || element;

            const contentWidthPx = Math.max(targetElement.scrollWidth, targetElement.clientWidth, 1);
            const a4HeightPxAtCurrentWidth = contentWidthPx * (297 / 210);

            // Measure bottom of meaningful content instead of container height.
            // This avoids false page 2 when container/flex/min-height leaves extra blank area.
            const contentNodes = Array.from(targetElement.children).filter(node => {
                if (!(node instanceof HTMLElement)) return false;
                if (node.classList.contains('print-watermark')) return false;
                const style = window.getComputedStyle(node);
                if (style.display === 'none' || style.visibility === 'hidden') return false;
                return true;
            });

            const contentBottomPx = contentNodes.reduce((maxBottom, node) => {
                const bottom = node.offsetTop + node.offsetHeight;
                return Math.max(maxBottom, bottom);
            }, 0);

            const quotationRowCount = targetElement.querySelectorAll('#quotationItems tr, tbody#quotationItems tr').length;

            // html2canvas/html2pdf can overflow by a few pixels; tolerate small overflow and keep single page.
            const shouldForceSinglePage = quotationRowCount <= 8 || contentBottomPx <= (a4HeightPxAtCurrentWidth + 80);

            const exportWithScale = async (scale) => {
                const options = {
                    margin: [0, 0, 0, 0],
                    filename: safeFilename,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: {
                        scale,
                        useCORS: true,
                        backgroundColor: '#ffffff',
                        scrollX: 0,
                        scrollY: 0,
                        windowWidth: Math.max(targetElement.scrollWidth, targetElement.clientWidth),
                        windowHeight: Math.max(targetElement.scrollHeight, targetElement.clientHeight)
                    },
                    jsPDF: {
                        unit: 'mm',
                        format: 'a4',
                        orientation: 'portrait'
                    },
                    pagebreak: {
                        mode: ['css']
                    }
                };

                const worker = window.html2pdf().set(options).from(targetElement).toPdf();
                const pdf = await worker.get('pdf');

                if (shouldForceSinglePage && pdf.internal.getNumberOfPages() > 1) {
                    for (let page = pdf.internal.getNumberOfPages(); page > 1; page -= 1) {
                        pdf.deletePage(page);
                    }
                }

                // Save from the edited jsPDF instance directly to prevent worker from regenerating extra pages.
                pdf.save(safeFilename);
            };

            try {
                await exportWithScale(1.8);
            } catch (firstError) {
                console.warn('Export snapshot retry with lower scale:', firstError);
                await exportWithScale(1.35);
            }
        } catch (error) {
            console.error('Export print snapshot PDF error:', error);
            alert('โหลด PDF ไม่สำเร็จ กดปุ่ม "พิมพ์" แล้วเลือก Save as PDF ชั่วคราวได้');
        } finally {
            if (captureHost && captureHost.parentNode) {
                captureHost.parentNode.removeChild(captureHost);
            }
            window.scrollTo(originalScrollX, originalScrollY);
            if (printModeActivated) {
                window.dispatchEvent(new Event('afterprint'));
            }
            injectedStyles.forEach(styleTag => styleTag.remove());
        }
    },

    // Export quotation to PDF with better formatting
    exportQuotationToPDF: function(quotationData) {
        const printWindow = window.open('', '_blank');
        const items = quotationData.items || [];
        const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        
        let itemsHTML = items.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${item.unit}</td>
                <td>${item.unitPrice.toLocaleString('th-TH')}</td>
                <td>${(item.quantity * item.unitPrice).toLocaleString('th-TH')}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>ใบเสนอราคา - ${quotationData.quotationNumber}</title>
                <style>
                    @page { size: A4; margin: 15mm; }
                    body { 
                        font-family: 'Sarabun', 'Segoe UI', sans-serif; 
                        line-height: 1.6;
                        color: #333;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        border-bottom: 3px solid #1e40af;
                        padding-bottom: 20px;
                        margin-bottom: 25px;
                    }
                    .company-info h1 { 
                        color: #1e40af; 
                        margin: 0;
                        font-size: 28px;
                    }
                    .company-info p { margin: 5px 0; color: #666; }
                    .doc-title { text-align: right; }
                    .doc-title h2 { 
                        color: #1e40af; 
                        margin: 0;
                        font-size: 26px;
                    }
                    .doc-title p { margin: 5px 0; }
                    .customer-box {
                        display: flex;
                        justify-content: space-between;
                        background: #f7fafc;
                        padding: 20px;
                        border-radius: 8px;
                        margin-bottom: 25px;
                    }
                    .customer-box h3 { margin: 0 0 10px 0; color: #1e40af; }
                    .customer-box p { margin: 5px 0; }
                    .doc-info { text-align: right; }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin: 25px 0;
                    }
                    th { 
                        background: #1e40af; 
                        color: white; 
                        padding: 14px; 
                        text-align: center;
                    }
                    th:nth-child(2) { text-align: left; }
                    td { 
                        padding: 12px 14px; 
                        border-bottom: 1px solid #e2e8f0;
                        text-align: center;
                    }
                    td:nth-child(2) { text-align: left; }
                    td:nth-child(5), td:nth-child(6) { text-align: right; }
                    tr:nth-child(even) { background: #f7fafc; }
                    .summary {
                        margin-top: 30px;
                        text-align: right;
                    }
                    .summary-row {
                        display: flex;
                        justify-content: flex-end;
                        padding: 8px 0;
                        font-size: 14px;
                    }
                    .summary-row span:first-child { 
                        margin-right: 100px;
                        color: #666;
                    }
                    .summary-row.total {
                        font-size: 20px;
                        font-weight: bold;
                        color: #1e40af;
                        border-top: 2px solid #1e40af;
                        padding-top: 15px;
                        margin-top: 10px;
                    }
                    .footer {
                        margin-top: 60px;
                        display: flex;
                        justify-content: space-between;
                    }
                    .signature-box {
                        width: 200px;
                        text-align: center;
                    }
                    .signature-line {
                        border-top: 1px solid #333;
                        margin-top: 60px;
                        padding-top: 10px;
                    }
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-info">
                        <h1>บริษัท SK Aluminium</h1>
                        <p>ที่อยู่: KU SRC University</p>
                        <p>หมายเลขผู้เสียภาษี: 1234567890</p>
                        <p>โทร: +123-456-7890</p>
                    </div>
                    <div class="doc-title">
                        <h2>ใบเสนอราคา</h2>
                        <p>Quotation</p>
                    </div>
                </div>
                
                <div class="customer-box">
                    <div class="customer-info">
                        <h3>ลูกค้า: ${quotationData.customerName || '-'}</h3>
                        <p>ที่อยู่: ${quotationData.customerAddress || '-'}</p>
                        <p>เบอร์โทร: ${quotationData.customerPhone || '-'}</p>
                    </div>
                    <div class="doc-info">
                        <p><strong>เลขที่:</strong> ${quotationData.quotationNumber || '-'}</p>
                        <p><strong>วันที่:</strong> ${quotationData.date || new Date().toLocaleDateString('th-TH')}</p>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px;">ลำดับ</th>
                            <th>รายการ</th>
                            <th style="width: 80px;">จำนวน</th>
                            <th style="width: 80px;">หน่วย</th>
                            <th style="width: 100px;">ราคา/หน่วย</th>
                            <th style="width: 120px;">รวม</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                </table>
                
                <div class="summary">
                    <div class="summary-row total">
                        <span>ราคาทั้งหมด:</span>
                        <span>฿${total.toLocaleString('th-TH')}</span>
                    </div>
                </div>
                
                <div class="footer">
                    <div class="signature-box">
                        <div class="signature-line">ผู้เสนอราคา</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line">ผู้อนุมัติ</div>
                    </div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
        }, 500);
    },

    // Format date for display
    formatDate: function(date) {
        return new Date(date).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Format currency
    formatCurrency: function(amount) {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 0
        }).format(amount);
    }
};

// Make available globally
window.ExportUtils = ExportUtils;
