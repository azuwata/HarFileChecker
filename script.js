let harData = null;
let lastResults = null; // CSV出力用に結果を保存

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
        <input type="text" class="tag-input" placeholder="例: gtag, fbq, _ga, GTM-XXXXX (スペースでAND検索)">
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
    lastResults = results; // 結果を保存
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
        const postText = entry.request.postData ? entry.request.postData.text : '';
        
        tags.forEach(tag => {
            // スペースで分割してAND検索のキーワードを取得
            const keywords = tag.trim().split(/\s+/).filter(k => k.length > 0);
            
            // 検索対象のテキストを結合
            const searchTarget = url + ' ' + 
                queryString.map(p => `${p.name}=${p.value}`).join(' ') + ' ' + 
                postText;
            
            // すべてのキーワードが含まれているかチェック
            const allKeywordsFound = keywords.every(keyword => 
                searchTarget.includes(keyword)
            );
            
            if (allKeywordsFound) {
                const foundParams = [];
                
                // どのパラメータにキーワードが含まれているか記録
                queryString.forEach(param => {
                    const paramText = `${param.name}=${param.value}`;
                    if (keywords.every(keyword => 
                        url.includes(keyword) || 
                        paramText.includes(keyword) || 
                        postText.includes(keyword)
                    )) {
                        // パラメータにいずれかのキーワードが含まれている場合
                        if (keywords.some(keyword => paramText.includes(keyword))) {
                            foundParams.push({
                                name: param.name,
                                value: param.value
                            });
                        }
                    }
                });
                
                results[tag].push({
                    url: url,
                    method: entry.request.method,
                    status: entry.response.status,
                    foundParams: foundParams,
                    timestamp: new Date(entry.startedDateTime).toLocaleString(),
                    postData: entry.request.postData ? entry.request.postData.text : null,
                    headers: entry.request.headers
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

// CSV出力機能
function exportToCSV() {
    if (!lastResults) {
        alert('エクスポートする結果がありません。');
        return;
    }

    // CSVヘッダー
    const headers = ['番号', 'フィルタ文字', 'リクエストURL', 'メソッド', 'ステータス', 'タイムスタンプ', 'パラメータ', 'ペイロードソース'];
    const rows = [headers];

    let rowNumber = 1;

    // 各タグの結果をCSV行に変換
    Object.entries(lastResults).forEach(([tag, entries]) => {
        entries.forEach(entry => {
            // パラメータを文字列に変換
            const params = entry.foundParams.length > 0 
                ? entry.foundParams.map(p => `${p.name}=${p.value}`).join('; ')
                : '';

            // ペイロードソースの取得
            let payloadSource = '';
            if (entry.postData) {
                // POSTデータの最初の100文字を取得（長すぎる場合は省略）
                payloadSource = entry.postData.length > 100 
                    ? entry.postData.substring(0, 100) + '...'
                    : entry.postData;
                // 改行を空白に置換
                payloadSource = payloadSource.replace(/[\r\n]+/g, ' ');
            }

            const row = [
                rowNumber++,
                tag,
                entry.url,
                entry.method,
                entry.status,
                entry.timestamp,
                params,
                payloadSource
            ];

            rows.push(row);
        });
    });

    // CSV文字列を生成
    const csvContent = rows.map(row => 
        row.map(cell => {
            // セル内にカンマ、改行、ダブルクォートが含まれる場合の処理
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
        }).join(',')
    ).join('\n');

    // BOMを追加（Excelで開いた時の文字化け対策）
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    // Blobを作成してダウンロード
    const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // ファイル名に現在の日時を含める
    const now = new Date();
    const dateStr = now.getFullYear() + 
                   ('0' + (now.getMonth() + 1)).slice(-2) + 
                   ('0' + now.getDate()).slice(-2) + 
                   '_' +
                   ('0' + now.getHours()).slice(-2) + 
                   ('0' + now.getMinutes()).slice(-2);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `har_tag_check_${dateStr}.csv`);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // メモリ解放
    URL.revokeObjectURL(url);
}
