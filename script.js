let harData = null;

// File upload handlers
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    if (!file.name.endsWith('.har')) {
        alert('HARファイルを選択してください。');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            harData = JSON.parse(e.target.result);
            uploadArea.classList.add('uploaded');
            uploadArea.innerHTML = `
                <div class="uploaded-file">
                    <svg width="24" height="24" viewBox="0 0 24 24" class="icon-check">
                        <path d="M20 6L9 17l-5-5"></path>
                    </svg>
                    <span>${file.name}</span>
                </div>
            `;
        } catch (error) {
            alert('HARファイルの解析に失敗しました。');
            console.error(error);
        }
    };
    reader.readAsText(file);
}

// Tag input management
function addTagInput() {
    const tagInputs = document.getElementById('tagInputs');
    const newRow = document.createElement('div');
    newRow.className = 'tag-input-row fade-in';
    newRow.innerHTML = `
        <input type="text" class="tag-input" placeholder="例: gtag, fbq, _ga, GTM-XXXXX">
        <button class="btn btn-danger" onclick="removeTagInput(this)">削除</button>
    `;
    tagInputs.appendChild(newRow);
}

function removeTagInput(button) {
    const rows = document.querySelectorAll('.tag-input-row');
    if (rows.length > 1) {
        button.parentElement.remove();
    } else {
        alert('最低1つのタグ入力欄が必要です。');
    }
}

// Tag checking functionality
function checkTags() {
    if (!harData) {
        alert('先にHARファイルをアップロードしてください。');
        return;
    }

    const tagInputs = document.querySelectorAll('.tag-input');
    const tags = Array.from(tagInputs)
        .map(input => input.value.trim())
        .filter(tag => tag.length > 0);

    if (tags.length === 0) {
        alert('チェックするタグを入力してください。');
        return;
    }

    const results = analyzeTags(harData, tags);
    displayResults(results, tags);
}

function analyzeTags(har, tags) {
    const results = {};
    tags.forEach(tag => {
        results[tag] = [];
    });

    har.log.entries.forEach(entry => {
        const url = entry.request.url;
        const queryString = entry.request.queryString || [];
        
        tags.forEach(tag => {
            let found = false;
            const foundParams = [];

            // Check URL
            if (url.includes(tag)) {
                found = true;
            }

            // Check query parameters
            queryString.forEach(param => {
                if (param.name.includes(tag) || param.value.includes(tag)) {
                    found = true;
                    foundParams.push({
                        name: param.name,
                        value: param.value
                    });
                }
            });

            // Check POST data
            if (entry.request.postData && entry.request.postData.text) {
                const postText = entry.request.postData.text;
                if (postText.includes(tag)) {
                    found = true;
                }
            }

            if (found) {
                results[tag].push({
                    url: url,
                    method: entry.request.method,
                    status: entry.response.status,
                    foundParams: foundParams,
                    timestamp: new Date(entry.startedDateTime).toLocaleString()
                });
            }
        });
    });

    return results;
}

function displayResults(results, tags) {
    const resultsSection = document.getElementById('resultsSection');
    const summaryDiv = document.getElementById('summary');
    const resultsDiv = document.getElementById('results');

    // Display summary
    let totalFound = 0;
    let foundTags = 0;
    tags.forEach(tag => {
        if (results[tag].length > 0) {
            foundTags++;
            totalFound += results[tag].length;
        }
    });

    summaryDiv.innerHTML = `
        <div class="summary-item">
            <p class="summary-value">${tags.length}</p>
            <p class="summary-label">チェックしたタグ数</p>
        </div>
        <div class="summary-item">
            <p class="summary-value">${foundTags}</p>
            <p class="summary-label">発火が確認されたタグ</p>
        </div>
        <div class="summary-item">
            <p class="summary-value">${totalFound}</p>
            <p class="summary-label">総発火回数</p>
        </div>
    `;

    // Display detailed results
    resultsDiv.innerHTML = '';
    tags.forEach(tag => {
        const tagResult = document.createElement('div');
        tagResult.className = 'tag-result fade-in';
        
        const found = results[tag].length > 0;
        const header = document.createElement('div');
        header.className = `tag-header ${found ? 'found' : 'not-found'}`;
        header.innerHTML = `
            <div class="tag-info">
                <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <span class="tag-name">${tag}</span>
                <span class="status-badge ${found ? 'status-found' : 'status-not-found'}">
                    ${found ? `${results[tag].length}件発火` : '発火なし'}
                </span>
            </div>
        `;
        
        const details = document.createElement('div');
        details.className = 'tag-details';
        
        if (found) {
            results[tag].forEach((item, index) => {
                const methodClass = item.method.toLowerCase() === 'get' ? 'method-get' : 'method-post';
                const requestItem = document.createElement('div');
                requestItem.className = 'request-item';
                requestItem.innerHTML = `
                    <div>
                        <span class="request-method ${methodClass}">${item.method}</span>
                        <span class="request-url">${item.url}</span>
                    </div>
                    <div class="request-meta">
                        <div class="meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            ステータス: ${item.status}
                        </div>
                        <div class="meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            ${item.timestamp}
                        </div>
                    </div>
                    ${item.foundParams.length > 0 ? 
                        `<div class="request-params">
                            <strong>パラメータ:</strong> ${
                            item.foundParams.map(p => 
                                `<span class="param-name">${p.name}</span>=${p.value}`
                            ).join(', ')
                        }</div>` : ''
                    }
                `;
                details.appendChild(requestItem);
            });
        } else {
            details.innerHTML = '<div class="no-results">このタグの発火は検出されませんでした</div>';
        }
        
        header.addEventListener('click', () => {
            header.classList.toggle('expanded');
            details.classList.toggle('show');
        });
        
        tagResult.appendChild(header);
        tagResult.appendChild(details);
        resultsDiv.appendChild(tagResult);
    });

    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
