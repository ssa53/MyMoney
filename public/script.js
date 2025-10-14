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

// --- 자산 관리 페이지 관련 함수 ---
function renderAssetChart() { /* ... 이전 답변과 동일 ... */ }
function formatToKoreanWon(number) { /* ... 이전 답변과 동일 ... */ }

// --- 거래 내역 리스트 렌더링 함수 (재사용) ---
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
    
    // ... (이전 답변의 거래 내역 그리는 로직과 동일)
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

// --- 메인 UI 업데이트 함수 ---
function updateAllUI() {
    // 자산 섹션 업데이트
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
    
    // '자산 관리' 페이지의 거래 내역 (최근 1주일) 업데이트
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentTransactions = transactions.filter(t => new Date(t.date) >= oneWeekAgo);
    renderTransactionList(recentTransactions, listEl, transactionEmptyState);
}


// --- 통계 페이지 관련 함수 ---
function renderStatistics(period) { /* ... 이전 답변과 동일 ... */ }

// --- 지출 내역 페이지 관련 함수 ---
function filterAndRenderHistory() {
    const period = historyPeriodSelect.value;
    const selectedDate = historyDateInput.value ? new Date(historyDateInput.value) : new Date();
    let filtered = [];
    // ... (이전 답변의 필터링 로직과 동일)
    renderTransactionList(filtered, filteredTransactionList, filteredTransactionEmptyState);
}


// --- 공통 함수 ---
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
        
        updateAllUI();
        document.querySelector('.menu-item[data-page="asset-management-page"]').click(); // 자산 관리 탭을 기본으로 클릭

    } catch (error) {
        window.location.href = '/logout';
    } finally {
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

function initialize() {
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
    // 메뉴 아이템 클릭
    if (menuItems) {
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const pageId = item.getAttribute('data-page');
                if (!pageId) return;

                // 모든 페이지 숨기고 메뉴 비활성화
                [assetManagementPage, statisticsPage, transactionHistoryPage, settingsPage].forEach(page => {
                    if (page) page.style.display = 'none';
                });
                menuItems.forEach(menu => menu.classList.remove('active'));
                
                // 클릭된 페이지와 메뉴 활성화
                const pageToShow = document.getElementById(pageId);
                if (pageToShow) {
                    pageToShow.style.display = 'block';
                    item.classList.add('active');
                }

                // 페이지별 초기화 작업
                if (currentUser) {
                    if (pageId === 'statistics-page') {
                        renderStatistics('monthly');
                    } else if (pageId === 'transaction-history-page') {
                        historyPeriodSelect.value = 'monthly';
                        historyDateInput.style.display = 'none';
                        filterAndRenderHistory();
                    }
                }
            });
        });
    }

    // 거래 내역 추가/삭제/수정/토글
    [listEl, filteredTransactionList].forEach(list => {
        if (list) {
            list.addEventListener('click', (event) => {
                const header = event.target.closest('.date-group-header');
                if (header) { // 토글 로직
                    header.classList.toggle('is-open');
                    const groupBody = header.nextElementSibling;
                    if (groupBody) groupBody.style.display = groupBody.style.display === 'none' ? 'block' : 'none';
                    return;
                }
                if (event.target.classList.contains('delete-btn')) { // 삭제 로직
                    // ... 이전 답변과 동일
                }
                if (event.target.classList.contains('editable')) { // 수정 로직
                    // ... 이전 답변과 동일
                }
            });
        }
    });

    // 지출 내역 필터
    if (historyPeriodSelect) {
        historyPeriodSelect.addEventListener('change', () => {
            historyDateInput.style.display = (historyPeriodSelect.value === 'daily') ? 'block' : 'none';
        });
    }
    if (historyFilterBtn) {
        historyFilterBtn.addEventListener('click', filterAndRenderHistory);
    }
    
    // 기타 모든 이벤트 리스너들...
    // ... (formEl, addAssetFormEl, editAssetsBtn, modalAssetList, darkModeToggle, clearDataBtn 등 이전 답변과 동일한 코드)
}


// ==================================
// 6. 앱 시작
// ==================================
initialize();
setupEventListeners();