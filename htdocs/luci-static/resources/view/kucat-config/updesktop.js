'use strict';
'require form';
'require fs';
'require rpc';
'require uci';
'require ui';
'require view';

var callAvailSpace = rpc.declare({
    object: 'luci.kucatconfig',
    method: 'space'
});

var callDelkucat = rpc.declare({
    object: 'luci.kucatconfig',
    method: 'del',          // 修改为正确的 RPC 方法
    params: ['filename'],
    expect: { '': {} }
});

var callRenamekucat = rpc.declare({
    object: 'luci.kucatconfig',
    method: 'rename',       // 修改为正确的 RPC 方法
    params: ['newname'],
    expect: { '': {} }
});

var callReadFile = rpc.declare({
    object: 'luci.kucatconfig',
    method: 'read_file',
    params: ['filename'],
    expect: { '': {} }
});

var bg_path = '/www/luci-static/resources/background/';

return view.extend({
    load: function() {
        return Promise.all([
            uci.load('kucat'),
            L.resolveDefault(callAvailSpace(), {}),
            L.resolveDefault(fs.list(bg_path), {})
        ]);
    },

    render: function(data) {
        var m, s, o;

        m = new form.Map('kucat', _(''), 
            _('Kucat theme Login background wallpaper upload and management.'));

        // 添加样式
        var style = E('style', {}, `
            /* 浏览模式切换 */
            .view-mode-toggle { margin: 0 15px; display: flex; }
            .view-mode-btn { padding: 8px 16px; background: #999; cursor: pointer; border-radius: 4px; }
            .view-mode-btn.active { background: #007cff; color: white; border-color: #007cff; }

            /* 网格布局 */
            .grid-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin: 0 15px; }
            .grid-item { border: 1px solid #ddd; border-radius: 8px; padding: 10px; background: white; cursor: pointer; transition: all 0.3s ease; position: relative; }
            .grid-item:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.1); transform: translateY(-2px); }
            .grid-item.selected { border-color: #007cff; background: #f0f8ff; }
            .grid-preview { width: 100%; height: 120px; object-fit: cover; border-radius: 4px; margin-bottom: 8px; }
            .grid-info { font-size: 12px; color: #666; }
            .grid-name { font-weight: bold; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

            /* 选择控制 */
            .selection-controls { margin: 0 15px; }
            .selection-info { margin-top: 12px; font-weight: bold; font-size: 14px; }
            .selection-batch-actions { display: flex; gap: 2px; align-items: center; flex-wrap: wrap; }
            .batch-action-btn { padding: 6px 12px; border: 1px solid #6c757d; background: #6c757d; color: white; border-radius: 4px; cursor: pointer; font-size: 12px; }
            .batch-action-btn:hover { background: #5a6268; border-color: #545b62; }
            .batch-action-btn.select-all { background: #28a745; border-color: #28a745; }
            .batch-action-btn.select-all:hover { background: #218838; border-color: #1e7e34; }
            .batch-action-btn.invert { background: #17a2b8; border-color: #17a2b8; }
            .batch-action-btn.invert:hover { background: #138496; border-color: #117a8b; }

            /* 复选框样式 */
            .file-checkbox { margin-right: 8px; }
            .grid-checkbox { position: absolute; top: 5px; left: 5px; z-index: 2; transform: scale(1.2); }

            /* 图片加载失败样式 */
            .image-error { width: 80px; height: 60px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px; border: 1px solid #ddd; border-radius: 3px; align-content: center; }
            .grid-image-error { width: 100%; height: 120px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px; border-radius: 4px; margin-bottom: 8px; }

            /* 预览模态框 */
            .preview-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 10000; }
            .preview-modal-content { max-width: 90%; max-height: 90%; background: white; padding: 20px; border-radius: 8px; text-align: center; }
            .preview-modal-image { max-width: 100%; max-height: 80vh; border-radius: 4px; }
            .preview-modal-close { position: absolute; top: 20px; right: 20px; border: none; border-radius: 50%; width: 40px!important; height: 40px; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
            .preview-modal-info { margin-top: 10px; color: #333; }
        `);

        var container = E('div', { 'class': 'cbi-map' });
        container.appendChild(style);

        container.appendChild(E('h3', _('Login Wallpaper Upload')));
        container.appendChild(E('div', { 'class': 'cbi-section-descr' }, [
            E('p', _('Available space: %1024.2mB').format(data[1].space * 1024)),
            E('p', _('You can upload files in formats such as gif/jpg/png/webp to create your favorite wallpapers')),
            E('p', _('Files will be uploaded to <code>%s</code>.').format(bg_path))
        ]));

        // 上传按钮
        var uploadBtn = E('button', {
            'class': 'btn cbi-button cbi-button-action',
            'style': 'margin: 10px 0;',
            'click': ui.createHandlerFn(this, function(ev) {
                var file = '/tmp/kucat_login_bg.tmp';
                return ui.uploadFile(file, ev.target).then(function(res) {
                    if (!res || !res.name) throw new Error(_('No file selected or upload failed'));
                    return L.resolveDefault(callRenamekucat(res.name), {}).then(function(ret) {
                        if (ret && ret.result === 0) {
                            ui.addNotification(null, E('p', _('File uploaded successfully!')));
                            setTimeout(() => location.reload(), 1000);
                        } else {
                            var errorMsg = ret ? (ret.error || 'Unknown error') : 'No response from server';
                            ui.addNotification(null, E('p', _('Failed to upload file: %s').format(errorMsg)));
                            return L.resolveDefault(fs.remove(file), {});
                        }
                    }).catch(function(rpcError) {
                        ui.addNotification(null, E('p', _('RPC call failed: %s').format(rpcError.message || rpcError)));
                        return L.resolveDefault(fs.remove(file), {});
                    });
                }).catch(function(e) {
                    ui.addNotification(null, E('p', _('Upload error: %s').format(e.message)));
                    return L.resolveDefault(fs.remove(file), {});
                });
            })
        }, _('Upload...'));
        
        container.appendChild(uploadBtn);

        var files = data[2] || [];
        if (files.length > 0) {
            container.appendChild(E('h3', _('Background file list')));

            // 浏览模式切换
            var viewModeToggle = E('div', { 'class': 'view-mode-toggle' }, [
                E('button', { 'class': 'view-mode-btn active', 'data-mode': 'list',
                    'click': ui.createHandlerFn(this, function(ev) {
                        document.querySelectorAll('.view-mode-btn').forEach(btn => btn.classList.remove('active'));
                        ev.target.classList.add('active');
                        listView.style.display = 'table';
                        gridView.style.display = 'none';
                        selectedFiles.clear();
                    }) }, _('List View')),
                E('button', { 'class': 'view-mode-btn', 'data-mode': 'grid',
                    'click': ui.createHandlerFn(this, function(ev) {
                        document.querySelectorAll('.view-mode-btn').forEach(btn => btn.classList.remove('active'));
                        ev.target.classList.add('active');
                        listView.style.display = 'none';
                        gridView.style.display = 'grid';
                        selectedFiles.clear();
                    }) }, _('Grid View'))
            ]);
            container.appendChild(viewModeToggle);

            var selectedFiles = new Set();
            var allFileNames = files.map(file => file.name);

            // 选择控制面板
            var selectionControls = E('div', { 'class': 'selection-controls' }, [
                E('div', { 'class': 'selection-batch-actions' }, [
                    E('button', { 'class': 'batch-action-btn select-all', 'click': function() {
                        selectedFiles.clear();
                        allFileNames.forEach(f => selectedFiles.add(f));
                        updateSelectionControls();
                        updateAllCheckboxes(true);
                    } }, _('Select All')),
                    E('button', { 'class': 'batch-action-btn invert', 'click': function() {
                        allFileNames.forEach(f => selectedFiles.has(f) ? selectedFiles.delete(f) : selectedFiles.add(f));
                        updateSelectionControls();
                        updateAllCheckboxes();
                    } }, _('Invert Selection')),
                    E('button', { 'class': 'batch-action-btn', 'click': function() {
                        selectedFiles.clear();
                        updateSelectionControls();
                        updateAllCheckboxes(false);
                    } }, _('Select None')),
                    E('button', { 'class': 'btn cbi-button cbi-button-remove', 'click': function() {
                        if (selectedFiles.size === 0) { ui.addNotification(null, E('p', _('Please select files to delete.'))); return; }
                        var filenames = Array.from(selectedFiles);
                        if (confirm(_('Are you sure you want to delete %d selected files?').format(selectedFiles.size))) {
                            Promise.all(filenames.map(f => L.resolveDefault(callDelkucat(f), {}))).then(results => {
                                var successCount = results.filter(r => r && r.result === 0).length;
                                ui.addNotification(null, E('p', successCount === filenames.length ? _('File deleted successfully!') : _('Some files failed to delete.')));
                                location.reload();
                            }).catch(err => ui.addNotification(null, E('p', _('Delete operation failed: %s').format(err.message))));
                        }
                    } }, _('Delete Selected')),
                    E('div', { 'class': 'selection-info' }, _('Selected: 0 files'))
                ])
            ]);
            container.appendChild(selectionControls);

            function updateAllCheckboxes(checked) {
                if (checked === true || checked === false) {
                    document.querySelectorAll('.file-checkbox, .grid-checkbox').forEach(cb => cb.checked = checked);
                    document.querySelectorAll('.grid-item').forEach(item => item.classList[checked ? 'add' : 'remove']('selected'));
                } else {
                    document.querySelectorAll('.file-checkbox, .grid-checkbox').forEach(cb => cb.checked = selectedFiles.has(cb.value));
                    document.querySelectorAll('.grid-item').forEach(item => {
                        var cb = item.querySelector('.grid-checkbox');
                        item.classList[selectedFiles.has(cb.value) ? 'add' : 'remove']('selected');
                    });
                }
            }

            function updateSelectionControls() {
                var info = selectionControls.querySelector('.selection-info');
                var selectedCount = selectedFiles.size;
                var totalCount = allFileNames.length;
                info.innerHTML = selectedCount === totalCount && totalCount > 0 ? _('Selected: <strong>All %d files</strong>').format(totalCount) : _('Selected: %d of %d files').format(selectedCount, totalCount);
            }

            // 列表视图
            var listView = E('table', { 'class': 'table cbi-section-table', 'style': 'display: table;' }, [
                E('tr', { 'class': 'tr table-titles' }, [
                    E('th', { 'class': 'th' }, [ _('Select') ]),
                    E('th', { 'class': 'th' }, [ _('Preview') ]),
                    E('th', { 'class': 'th' }, [ _('Filename') ]),
                    E('th', { 'class': 'th' }, [ _('Modified date') ]),
                    E('th', { 'class': 'th' }, [ _('Size') ])
                ])
            ]);

            // 网格视图
            var gridView = E('div', { 'class': 'grid-view', 'style': 'display: none;' });

            files.forEach(L.bind(function(file) {
                var previewUrl = '/luci-static/resources/background/' + file.name;
                var timestamp = new Date().getTime();

                // 列表行
                var row = E('tr', { 'class': 'tr' });
                var checkbox = E('input', { type: 'checkbox', class: 'file-checkbox', value: file.name,
                    'change': ui.createHandlerFn(this, ev => {
                        ev.target.checked ? selectedFiles.add(file.name) : selectedFiles.delete(file.name);
                        updateSelectionControls();
                    })
                });
                row.appendChild(E('td', { 'class': 'td' }, [ checkbox ]));
                row.appendChild(E('td', { 'class': 'td' }, [
                    E('div', { style: 'display: flex; justify-content: center;' }, [
                        E('img', { class: 'file-list-preview', src: previewUrl + '?t=' + timestamp, alt: file.name, title: _('Click to view larger preview'), style: 'cursor:pointer;width:80px;height:60px;object-fit:cover;',
                            'click': ui.createHandlerFn(this, () => showImagePreview(file, previewUrl)),
                            'onerror': "this.style.display='none'; this.nextElementSibling.style.display='block';"
                        }),
                        E('div', { class: 'image-error', style: 'display:none;' }, _('Unknown file'))
                    ])
                ]));
                row.appendChild(E('td', { 'class': 'td' }, [ file.name ]));
                row.appendChild(E('td', { 'class': 'td' }, [ new Date(file.mtime * 1000).toLocaleString() ]));
                row.appendChild(E('td', { 'class': 'td' }, [ String.format('%1024.2mB', file.size) ]));
                listView.appendChild(row);

                // 网格项
                var gridItem = E('div', { 'class': 'grid-item',
                    'click': ui.createHandlerFn(this, ev => { if (!ev.target.matches('input[type="checkbox"]')) showImagePreview(file, previewUrl); })
                });
                var gridCheckbox = E('input', { type: 'checkbox', class: 'grid-checkbox', value: file.name,
                    'change': ui.createHandlerFn(this, ev => {
                        ev.stopPropagation();
                        ev.target.checked ? selectedFiles.add(file.name) && gridItem.classList.add('selected') : selectedFiles.delete(file.name) && gridItem.classList.remove('selected');
                        updateSelectionControls();
                    })
                });
                var gridImageContainer = E('div', { style: 'position: relative;' }, [
                    E('img', { class: 'grid-preview', src: previewUrl + '?t=' + timestamp, alt: file.name, onerror: "this.style.display='none'; this.nextElementSibling.style.display='flex';" }),
                    E('div', { class: 'grid-image-error', style: 'display:none;' }, _('Unknown file'))
                ]);
                gridItem.appendChild(gridCheckbox);
                gridItem.appendChild(gridImageContainer);
                gridItem.appendChild(E('div', { class: 'grid-name' }, file.name));
                gridItem.appendChild(E('div', { class: 'grid-info' }, [ String.format('%1024.2mB', file.size), E('br'), new Date(file.mtime * 1000).toLocaleDateString() ]));
                gridView.appendChild(gridItem);

            }, this));

            container.appendChild(listView);
            container.appendChild(gridView);

            function showImagePreview(file, previewUrl) {
                var modal = E('div', { class: 'preview-modal' }, [
                    E('button', { class: 'preview-modal-close', click: () => modal.remove() }, '×'),
                    E('div', { class: 'preview-modal-content' }, [
                        E('img', { class: 'preview-modal-image', src: previewUrl + '?t=' + new Date().getTime(), alt: file.name,
                            onerror: "this.style.display='none'; this.parentNode.style.display='block';this.parentNode.removeChild(this);"
                        }),
                        E('div', { class: 'preview-modal-info' }, [
                            E('div', { style: 'font-weight:bold;' }, file.name),
                            E('div', { style: 'font-size:14px;color:#666;' }, String.format(_('Size: %1024.2mB, Modified: %s'), file.size, new Date(file.mtime*1000).toLocaleString()))
                        ])
                    ])
                ]);

                modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
                document.addEventListener('keydown', function closeOnEsc(e) { if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', closeOnEsc); } });
                document.body.appendChild(modal);
            }

        } else {
            container.appendChild(E('h3', _('Background file list')));
            container.appendChild(E('p', E('em', _('No files found.'))));
        }

        return container;
    },

    handleSaveApply: null,
    handleSave: null,
    handleReset: null
});
