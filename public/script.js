// ==================================
// 1. 요소(Element) 변수 선언
// ==================================
// 공통 요소
const userInfo = document.getElementById('user-info');
const loadingSpinner = document.getElementById('loading-spinner');
const menuItems = document.querySelectorAll('.menu-item');

// 자산 관리 페이지 요소
const assetManagementPage = document.getElementById('asset-management-page');
const koreanBalanceEl = document.getElementById('total-balance-korean');
const chartContainer = document.querySelector('.chart-container');
const assetChartCanvas = document.getElementById('assetChart');
const assetEmptyState = document.getElementById('asset-empty-state');
const addAssetFormEl = document.getElementById('add-asset-form');
const assetNameEl = document.getElementById('asset-name');
const assetAmountEl = document.getElementById('asset-amount');
const formEl = document.getElementById('transaction-form');
const dateEl = document.getElementById('date');
const amountEl = document.getElementById('amount');
const descriptionEl = document.getElementById('description');
const categoryEl = document.getElementById('beomju-input');
const typeEl = document.getElementById('type');
const transactionEmptyState = document.getElementById('transaction-empty-state');
const listEl = document.getElementById('transaction-list');

// 자산 수정 팝업 요소
const editAssetsBtn = document.getElementById('edit-assets-btn');
const assetEditModal = document.getElementById('asset-edit-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalAssetList = document.getElementById('modal-asset-list');

// 통계 보기 페이지 요소
const statisticsPage = document.getElementById('statistics-page');
const statsTabs = document.querySelector('.stats-tabs');
const categoryExpenseChartCanvas = document.getElementById('category-expense-chart');

// 지출 내역 페이지 요소
const transactionHistoryPage = document.getElementById('transaction-history-page');
const historyPeriodSelect = document.getElementById('history-period-select');
const historyDateInput = document.getElementById('history-date-input');
const historyFilterBtn = document.getElementById('history-filter-btn');
const filteredTransactionList = document.getElementById('filtered-transaction-list');
const filteredTransactionEmptyState = document.getElementById('filtered-transaction-empty-state');

// 환경설정 페이지 요소
const settingsPage = document.getElementById('settings-page');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const clearDataBtn = document.getElementById('clear-data-btn');


// ==================================
// 2. 상태(State) 변수 선언
// ==================================
let transactions = [];
let assets = [];
let currentUser = null;
let assetChart = null;
let categoryExpenseChart = null;


// ==================================
// 3. 핵심 기능 함수 (Rendering & Logic)
// ==================================

function renderAssetChart() {
    if (!assetManagementPage || !assetChartCanvas) return;
    const ctx = assetChartCanvas.getContext('2d');
    if (assetChart) {
        assetChart.destroy();
    }
    assetChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: assets.map(asset => asset.name),
            datasets: [{
                data: assets.map(asset => asset.amount),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed !== null) {
                                label += context.parsed.toLocaleString() + '원';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function formatToKoreanWon(number) {
    if (number === 0) return '0 <span class="won-unit">원</span>';
    const units = ['', '만', '억', '조'];
    let result = '';
    let unitIndex = 0;
    while (number > 0) {
        const part = number % 10000;
        if (part > 0) {
            let partStr = '';
            const h = Math.floor(part / 1000);
            const t = Math.floor((part % 1000) / 100);
            const d = Math.floor((part % 100) / 10);
            const o = part % 10;
            if (h > 0) partStr += `<span>${h}</span>천 `;
            if (t > 0) partStr += `<span>${t}</span>백 `;
            if (d > 0) partStr += `<span>${d}</span>십 `;
            if (o > 0) partStr += `<span>${o}</span>`;
            result = `${partStr.trim()} ${units[unitIndex]} ${result}`;
        }
        number = Math.floor(number / 10000);
        unitIndex++;
    }
    return result.trim() + ` <span class="won-unit">원</span>`;
}

function renderTransactionList(targetTransactions, targetListEl, targetEmptyStateEl) {
    if (!targetListEl) return;
    targetListEl.innerHTML = '';

    if (!targetTransactions || targetTransactions.length === 0) {
        targetListEl.style.display = 'none';
        if (targetEmptyStateEl) targetEmptyStateEl.style.display = 'block';
        return;
    } 
    
    targetListEl.style.display = 'block';
    if (targetEmptyStateEl) targetEmptyStateEl.style.display = 'none';
    
    const grouped = targetTransactions.reduce((groups, t) => {
        (groups[t.date] = groups[t.date] || []).push(t);
        return groups;
    }, {});

    Object.keys(grouped).sort((a,b) => b.localeCompare(a)).forEach(date => {
        const dailyTotal = grouped[date].reduce((total, t) => t.type === 'expense' ? total - t.amount : total + t.amount, 0);
        let dailyStatus = '';
        if (dailyTotal > 0) dailyStatus = `수입: ${dailyTotal.toLocaleString()}원`;
        else if (dailyTotal < 0) dailyStatus = `지출: ${(-dailyTotal).toLocaleString()}원`;

        const groupHeader = document.createElement('div');
        groupHeader.classList.add('date-group-header');
        groupHeader.innerHTML = `
            <div class="date-header-left">
                <span class="toggle-icon"></span>
                <span>${date}</span>
            </div>
            <span class="daily-expense">${dailyStatus}</span>
        `;
        targetListEl.appendChild(groupHeader);
        
        const groupBody = document.createElement('ul');
        groupBody.classList.add('transaction-group-body');
        groupBody.style.display = 'none';

        grouped[date].forEach(transaction => {
            const listItem = document.createElement('li');
            listItem.classList.add(transaction.type);
            listItem.setAttribute('data-id', transaction._id);
            listItem.innerHTML = `
                <div>
                    <span class="transaction-description editable" data-field="description">${transaction.description}</span>
                    <span class="category-label editable" data-field="category">${transaction.category}</span>
                </div>
                <div class="transaction-amount-container">
                    <span class="transaction-amount editable" data-field="amount">${transaction.amount.toLocaleString()}</span>
                    <span style="color: ${transaction.type === 'expense' ? '#dc3545' : '#28a745'}; font-weight: bold;">원</span>
                    <button class="delete-btn">삭제</button>
                </div>
            `;
            groupBody.appendChild(listItem);
        });
        targetListEl.appendChild(groupBody);
    });
}

function updateAllUI() {
    if (assets.length === 0) {
        if (chartContainer) chartContainer.style.display = 'none';
        if (assetEmptyState) assetEmptyState.style.display = 'block';
    } else {
        if (chartContainer) chartContainer.style.display = 'block';
        if (assetEmptyState) assetEmptyState.style.display = 'none';
        renderAssetChart();
    }
    const finalBalance = assets.reduce((sum, asset) => sum + asset.amount, 0);
    if (koreanBalanceEl) {
        koreanBalanceEl.innerHTML = formatToKoreanWon(finalBalance);
    }
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(new Date().getDate() - 7);
    const recentTransactions = transactions.filter(t => new Date(t.date) >= oneWeekAgo);
    renderTransactionList(recentTransactions, listEl, transactionEmptyState);
}

function renderStatistics(period) { 
    if (!statisticsPage) return;
    
    document.querySelectorAll('.stats-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === period);
    });

    const now = new Date();
    let currentPeriodStart, previousPeriodStart, previousPeriodEnd;

    if (period === 'weekly') {
        currentPeriodStart = new Date(now);
        currentPeriodStart.setDate(now.getDate() - now.getDay());
        previousPeriodStart = new Date(currentPeriodStart);
        previousPeriodStart.setDate(currentPeriodStart.getDate() - 7);
        previousPeriodEnd = new Date(now);
        previousPeriodEnd.setDate(now.getDate() - 7);
    } else if (period === 'monthly') {
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousPeriodEnd = new Date(now);
        previousPeriodEnd.setMonth(now.getMonth() - 1);
    } else { // yearly
        currentPeriodStart = new Date(now.getFullYear(), 0, 1);
    }

    const currentTransactions = transactions.filter(t => new Date(t.date) >= currentPeriodStart);
    let previousTransactions = [];
    if (period !== 'yearly') {
        previousTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= previousPeriodStart && tDate <= previousPeriodEnd;
        });
    }

    const currentTotals = currentTransactions.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + t.amount;
        return acc;
    }, { income: 0, expense: 0 });

    const previousExpenseTotal = previousTransactions.reduce((sum, t) => t.type === 'expense' ? sum + t.amount : sum, 0);

    document.getElementById('stats-income').innerText = currentTotals.income.toLocaleString() + '원';
    document.getElementById('stats-expense').innerText = currentTotals.expense.toLocaleString() + '원';

    const comparisonEl = document.getElementById('stats-comparison');
    if (period !== 'yearly') {
        const diff = currentTotals.expense - previousExpenseTotal;
        const periodText = period === 'weekly' ? '지난 주' : '지난 달';
        if (previousExpenseTotal === 0 && currentTotals.expense > 0) {
            comparisonEl.innerHTML = `${periodText} 대비 지출이 발생했습니다.`;
            comparisonEl.style.color = '#dc3545';
        } else if (previousExpenseTotal > 0) {
            const percentage = Math.round((diff / previousExpenseTotal) * 100);
            if (diff > 0) {
                comparisonEl.innerHTML = `${periodText} 대비 <strong>+${diff.toLocaleString()}원</strong> (↑${percentage}%) 더 사용했어요.`;
                comparisonEl.style.color = '#dc3545';
            } else {
                comparisonEl.innerHTML = `${periodText} 대비 <strong>${(-diff).toLocaleString()}원</strong> (↓${-percentage}%) 아꼈어요!`;
                comparisonEl.style.color = '#28a745';
            }
        } else {
            comparisonEl.innerHTML = `지난 기간에 지출이 없었어요.`;
            comparisonEl.style.color = '#777';
        }
    } else {
        comparisonEl.innerHTML = '';
    }

    const expensesByCategory = currentTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});

    const statsEmptyState = document.getElementById('stats-empty-state');
    if (Object.keys(expensesByCategory).length === 0) {
        if(statsEmptyState) statsEmptyState.style.display = 'block';
        if (categoryExpenseChart) categoryExpenseChart.destroy();
        if(categoryExpenseChartCanvas) categoryExpenseChartCanvas.style.display = 'none';
    } else {
        if(statsEmptyState) statsEmptyState.style.display = 'none';
        if(categoryExpenseChartCanvas) categoryExpenseChartCanvas.style.display = 'block';

        const sortedCategories = Object.entries(expensesByCategory).sort(([, a], [, b]) => b - a);
        const labels = sortedCategories.map(item => item[0]);
        const data = sortedCategories.map(item => item[1]);

        if (categoryExpenseChart) {
            categoryExpenseChart.destroy();
        }
        categoryExpenseChart = new Chart(categoryExpenseChartCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FFCD56'],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                }
            }
        });
    }
}

function filterAndRenderHistory() {
    if (!transactionHistoryPage) return;
    const period = historyPeriodSelect.value;
    const selectedDate = historyDateInput.value ? new Date(historyDateInput.value) : new Date();
    let filtered = [];

    if (period === 'all') {
        filtered = transactions;
    } else if (period === 'daily') {
        const dayStr = selectedDate.toISOString().split('T')[0];
        filtered = transactions.filter(t => t.date === dayStr);
    } else if (period === 'weekly') {
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        filtered = transactions.filter(t => new Date(t.date) >= startOfWeek && new Date(t.date) <= endOfWeek);
    } else if (period === 'monthly') {
        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        filtered = transactions.filter(t => new Date(t.date) >= startOfMonth && new Date(t.date) <= endOfMonth);
    } else if (period === 'yearly') {
        const startOfYear = new Date(selectedDate.getFullYear(), 0, 1);
        const endOfYear = new Date(selectedDate.getFullYear(), 11, 31);
        filtered = transactions.filter(t => new Date(t.date) >= startOfYear && new Date(t.date) <= endOfYear);
    }
    renderTransactionList(filtered, filteredTransactionList, filteredTransactionEmptyState);
}

function applyDarkMode(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
}

// ==================================
// 4. 데이터 로딩 및 초기화
// ==================================
async function loadAllData() {
    if (!userInfo) return;
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
    try {
        const userResponse = await axios.get('/user');
        currentUser = userResponse.data;
        userInfo.innerHTML = `<p>안녕하세요, ${currentUser.nickname}님!</p><a href="/logout" id="logout-link">로그아웃</a>`;
        
        const [transactionResponse, assetResponse] = await Promise.all([
            axios.get(`/api/transactions?userId=${currentUser.kakaoId}`),
            axios.get(`/api/assets?userId=${currentUser.kakaoId}`)
        ]);
        transactions = transactionResponse.data;
        assets = assetResponse.data;
        
        document.querySelector('.menu-item[data-page="asset-management-page"]').click();

    } catch (error) {
        console.error("세션 만료 또는 사용자 정보 로드 실패. 로그아웃합니다.", error);
        window.location.href = '/logout';
    } finally {
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

function initialize() {
    setupEventListeners();
    if (darkModeToggle) {
        const savedDarkMode = localStorage.getItem('darkMode');
        if (savedDarkMode === 'enabled') {
            darkModeToggle.checked = true;
            applyDarkMode(true);
        }
    }
    loadAllData();
}

// ==================================
// 5. 이벤트 리스너(Event Listeners)
// ==================================
function setupEventListeners() {
    if (menuItems.length) {
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const pageId = item.getAttribute('data-page');
                if (!pageId) return;

                const allPages = [assetManagementPage, statisticsPage, transactionHistoryPage, settingsPage];
                allPages.forEach(page => {
                    if (page) page.style.display = 'none';
                });
                menuItems.forEach(menu => menu.classList.remove('active'));
                
                const pageToShow = document.getElementById(pageId);
                if (pageToShow) {
                    pageToShow.style.display = 'block';
                    item.classList.add('active');
                }

                if (pageId === 'asset-management-page') {
                    updateAllUI();
                } else if (currentUser) {
                    if (pageId === 'statistics-page') {
                        renderStatistics('monthly');
                    } else if (pageId === 'transaction-history-page') {
                        if (historyPeriodSelect) historyPeriodSelect.value = 'monthly';
                        if (historyDateInput) {
                            historyDateInput.valueAsDate = new Date();
                            historyDateInput.style.display = 'none';
                        }
                        filterAndRenderHistory();
                    }
                }
            });
        });
    }

    [listEl, filteredTransactionList].forEach(list => {
        if (list) {
            list.addEventListener('click', (event) => {
                const header = event.target.closest('.date-group-header');
                if (header) {
                    header.classList.toggle('is-open');
                    const groupBody = header.nextElementSibling;
                    if (groupBody) groupBody.style.display = groupBody.style.display === 'none' ? 'block' : 'none';
                    return;
                }
                if (event.target.classList.contains('delete-btn')) {
                    const listItem = event.target.closest('li');
                    const transactionId = listItem.dataset.id;
                    if (confirm('정말 삭제하시겠습니까?')) {
                        axios.delete(`/api/transactions/${transactionId}`).then(() => {
                            transactions = transactions.filter(t => t._id !== transactionId);
                            if (document.querySelector('.menu-item.active').dataset.page === 'asset-management-page') {
                                updateAllUI();
                            } else {
                                filterAndRenderHistory();
                            }
                        }).catch(err => console.error(err));
                    }
                }
                const target = event.target;
                if (target.classList.contains('editable') && !target.querySelector('input')) {
                    const listItem = target.closest('li');
                    const transactionId = listItem.dataset.id;
                    const field = target.dataset.field;
                    const currentValue = transactions.find(t => t._id === transactionId)[field];
                    const input = document.createElement('input');
                    input.type = (field === 'amount') ? 'text' : 'text';
                    if (field === 'amount') {
                        input.inputMode = 'numeric';
                        input.pattern = '[0-9]*';
                    }
                    input.value = currentValue;
                    input.style.width = `${target.offsetWidth + 20}px`;
                    target.innerHTML = '';
                    target.appendChild(input);
                    input.focus();
                    const saveUpdate = async () => {
                        const newValue = (field === 'amount') ? parseFloat(input.value) || 0 : input.value;
                        if (newValue !== currentValue) {
                            try {
                                await axios.put(`/api/transactions/${transactionId}`, { [field]: newValue });
                                const transactionToUpdate = transactions.find(t => t._id === transactionId);
                                transactionToUpdate[field] = newValue;
                            } catch (error) {
                                console.error('Error updating transaction:', error);
                            }
                        }
                        if (document.querySelector('.menu-item.active').dataset.page === 'asset-management-page') {
                            updateAllUI();
                        } else {
                            filterAndRenderHistory();
                        }
                    };
                    input.addEventListener('blur', saveUpdate);
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') saveUpdate();
                        else if (e.key === 'Escape') {
                            if (document.querySelector('.menu-item.active').dataset.page === 'asset-management-page') {
                                updateAllUI();
                            } else {
                                filterAndRenderHistory();
                            }
                        }
                    });
                }
            });
        }
    });

    if (historyPeriodSelect) {
        historyPeriodSelect.addEventListener('change', () => {
            historyDateInput.style.display = (historyPeriodSelect.value === 'daily') ? 'block' : 'none';
        });
    }
    if (historyFilterBtn) {
        historyFilterBtn.addEventListener('click', filterAndRenderHistory);
    }
    
    if (formEl) {
        formEl.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!currentUser) return alert("로그인이 필요합니다.");
            const newTransaction = {
                date: dateEl.value,
                description: descriptionEl.value,
                amount: parseFloat(amountEl.value),
                category: categoryEl.value,
                type: typeEl.value
            };
            try {
                const response = await axios.post('/api/transactions', newTransaction);
                transactions.push(response.data);
                updateAllUI();
                formEl.reset();
                if(dateEl) dateEl.valueAsDate = new Date();
            } catch (error) {
                console.error("Error adding transaction:", error);
            }
        });
    }
    if (addAssetFormEl) {
        addAssetFormEl.addEventListener('submit', async (event) => {
            event.preventDefault();
            if(!currentUser) return;
            const newAsset = { name: assetNameEl.value, amount: parseFloat(assetAmountEl.value) };
            try {
                const response = await axios.post('/api/assets', newAsset);
                assets.push(response.data);
                updateAllUI();
                addAssetFormEl.reset();
            } catch (error) {
                console.error("Error adding asset:", error);
            }
        });
    }

    if (editAssetsBtn) {
        editAssetsBtn.addEventListener('click', () => {
            modalAssetList.innerHTML = '';
            assets.forEach(asset => {
                const item = document.createElement('li');
                item.classList.add('modal-asset-item');
                item.dataset.id = asset._id;
                item.innerHTML = `
                    <span>${asset.name}</span>
                    <input type="text" value="${asset.amount}" inputmode="numeric" pattern="[0-9]*">
                    <button class="delete-btn">삭제</button>
                `;
                modalAssetList.appendChild(item);
            });
            assetEditModal.style.display = 'flex';
        });
    }
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            assetEditModal.style.display = 'none';
            updateAllUI(); 
        });
    }
    if (modalAssetList) {
        modalAssetList.addEventListener('click', async (event) => {
            if (event.target.classList.contains('delete-btn')) {
                const item = event.target.closest('li');
                const assetId = item.dataset.id;
                if (confirm('이 자산을 정말 삭제하시겠습니까?')) {
                    try {
                        await axios.delete(`/api/assets/${assetId}`);
                        assets = assets.filter(a => a._id !== assetId);
                        item.remove();
                    } catch (error) {
                        alert('삭제 중 오류가 발생했습니다.');
                    }
                }
            }
        });
        modalAssetList.addEventListener('change', async (event) => {
            if (event.target.tagName === 'INPUT') {
                const item = event.target.closest('li');
                const assetId = item.dataset.id;
                const newAmount = parseFloat(event.target.value) || 0;
                try {
                    await axios.put(`/api/assets/${assetId}`, { amount: newAmount });
                    const assetToUpdate = assets.find(a => a._id === assetId);
                    if(assetToUpdate) assetToUpdate.amount = newAmount;
                } catch (error) {
                    alert('금액 수정 중 오류가 발생했습니다.');
                }
            }
        });
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            const isDark = darkModeToggle.checked;
            applyDarkMode(isDark);
            localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
        });
    }
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', async () => {
            if (!currentUser) return alert("로그인이 필요합니다.");
            if (confirm('정말로 모든 거래내역과 자산을 삭제하시겠습니까?')) {
                try {
                    await axios.delete('/api/data');
                    transactions = [];
                    assets = [];
                    updateAllUI();
                } catch (error) {
                    alert("데이터 삭제 중 오류가 발생했습니다.");
                }
            }
        });
    }
}

// ==================================
// 6. 앱 시작
// ==================================
initialize();