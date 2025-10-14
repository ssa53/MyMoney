// ==================================
// 1. 요소(Element) 변수 선언
// ==================================
const balanceEl = document.getElementById('total-balance');
const formEl = document.getElementById('transaction-form');
const dateEl = document.getElementById('date');
const descriptionEl = document.getElementById('description');
const amountEl = document.getElementById('amount');
const categoryEl = document.getElementById('beomju-input');
const typeEl = document.getElementById('type');
const listEl = document.getElementById('transaction-list');

const addAssetFormEl = document.getElementById('add-asset-form');
const assetNameEl = document.getElementById('asset-name');
const assetAmountEl = document.getElementById('asset-amount');
const assetListEl = document.getElementById('asset-list');

const menuItems = document.querySelectorAll('.menu-item');
const assetManagementPage = document.getElementById('asset-management-page');
const statisticsPage = document.getElementById('statistics-page');
const settingsPage = document.getElementById('settings-page');

const yearlyListEl = document.getElementById('yearly-list');
const monthlyListEl = document.getElementById('monthly-list');
const dailyListEl = document.getElementById('daily-list');

const userInfo = document.getElementById('user-info');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const clearDataBtn = document.getElementById('clear-data-btn');

const editAssetsBtn = document.getElementById('edit-assets-btn');
const assetEditModal = document.getElementById('asset-edit-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalAssetList = document.getElementById('modal-asset-list');

const loadingSpinner = document.getElementById('loading-spinner');

const assetEmptyState = document.getElementById('asset-empty-state');
const transactionEmptyState = document.getElementById('transaction-empty-state');
const chartContainer = document.querySelector('.chart-container'); // 차트 컨테이너 변수 추가

// ==================================
// 2. 상태(State) 변수 선언
// ==================================
let transactions = [];
let assets = [];
let currentUser = null;
let assetChart = null; // ★★★ 차트 인스턴스를 저장할 변수 추가 ★★★

// ==================================
// 3. 핵심 기능 함수
// ==================================

// ★★★ 자산 현황 원형 그래프를 그리는 함수 추가 ★★★
function renderAssetChart() {
    if (!assetManagementPage) return;

    const chartCanvas = document.getElementById('assetChart');
    if (!chartCanvas) return;
    const ctx = chartCanvas.getContext('2d');

    if (assetChart) {
        assetChart.destroy();
    }

    const labels = assets.map(asset => asset.name);
    const data = assets.map(asset => asset.amount);

    assetChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                // ★★★ 수정된 툴팁 설정 ★★★
                tooltip: {
                    enabled: true, // 기본 툴팁을 다시 활성화
                    callbacks: {
                        // 툴팁에 표시될 내용을 직접 정의
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
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

// ★★★ 숫자를 한글 단위로 변환하는 함수 추가 ★★★
function formatToKoreanWon(number) {
    if (number === 0) return '0 <span class="won-unit">원</span>'; // 0일 때도 적용

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
    // ★★★ 마지막 '원'을 span으로 감싸서 반환 ★★★
    return result.trim() + ` <span class="won-unit">원</span>`;
}

// ★★★ 로그인 상태에 따라 UI 가시성을 제어하는 함수 추가 ★★★
function updateUIVisibility(isLoggedIn) {
    if (!assetManagementPage || !statisticsPage || !settingsPage) return;

    const pages = [assetManagementPage, statisticsPage, settingsPage];
    const menuItemsToToggle = document.querySelectorAll('.menu-item[data-page="statistics-page"], .menu-item[data-page="settings-page"]');
    
    pages.forEach(page => page.style.display = 'none');
    menuItems.forEach(menu => menu.classList.remove('active'));

    if (isLoggedIn) {
        menuItemsToToggle.forEach(item => item.style.display = 'block');
        assetManagementPage.style.display = 'block';
        document.querySelector('.menu-item[data-page="asset-management-page"]').classList.add('active');
    } else {
        menuItemsToToggle.forEach(item => item.style.display = 'none');
        assetManagementPage.style.display = 'block';
        document.querySelector('.menu-item[data-page="asset-management-page"]').classList.add('active');
    }
}

// 모든 UI를 다시 그리는 함수
function updateAllUI() {
    // ★★★ 1. 자산 목록 빈 상태 처리 ★★★
    // 자산이 하나도 없으면 안내 문구를 보여주고, 있으면 차트를 보여줍니다.
    if (assets.length === 0) {
        if (chartContainer) chartContainer.style.display = 'none';
        if (assetEmptyState) assetEmptyState.style.display = 'block';
    } else {
        if (chartContainer) chartContainer.style.display = 'block';
        if (assetEmptyState) assetEmptyState.style.display = 'none';
        renderAssetChart(); // 자산이 있을 때만 차트를 그립니다.
    }

    // ★★★ 2. 거래 내역 빈 상태 처리 ★★★
    // 거래 내역이 하나도 없으면 안내 문구를 보여주고, 있으면 목록을 보여줍니다.
    if (transactions.length === 0) {
        if (listEl) listEl.innerHTML = ''; // 목록을 깨끗하게 비웁니다.
        if (listEl) listEl.style.display = 'none';
        if (transactionEmptyState) transactionEmptyState.style.display = 'block';
    } else {
        if (listEl) listEl.style.display = 'block';
        if (transactionEmptyState) transactionEmptyState.style.display = 'none';
        
        // --- 거래 내역 목록 그리기 시작 ---
        listEl.innerHTML = ''; // 목록을 새로 그리기 전에 초기화합니다.
        
        const groupedTransactions = transactions.reduce((groups, t) => {
            if (!groups[t.date]) groups[t.date] = [];
            groups[t.date].push(t);
            return groups;
        }, {});

        const sortedDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

        sortedDates.forEach(date => {
            const dailyTotal = groupedTransactions[date].reduce((total, t) => t.type === 'expense' ? total - t.amount : total + t.amount, 0);
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
            listEl.appendChild(groupHeader);
            
            const groupBody = document.createElement('ul');
            groupBody.classList.add('transaction-group-body');
            groupBody.style.display = 'none';

            groupedTransactions[date].forEach(transaction => {
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
            listEl.appendChild(groupBody);
        });
        // --- 거래 내역 목록 그리기 끝 ---
    }

    // 3. 총 자산 (한글 포맷) 계산 및 표시
    // 이 부분은 데이터 유무와 상관없이 항상 계산되어야 합니다. (0원 표시)
    const finalBalance = assets.reduce((sum, asset) => sum + asset.amount, 0);
    const koreanBalanceEl = document.getElementById('total-balance-korean');
    if (koreanBalanceEl) {
        koreanBalanceEl.innerHTML = formatToKoreanWon(finalBalance);
    }
}


// 통계 페이지 UI 업데이트
function updateStatisticsUI() {
    const now = new Date();
    
    // 1. 기간별 거래 내역 필터링
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const weeklyTransactions = transactions.filter(t => new Date(t.date) >= startOfWeek);
    const monthlyTransactions = transactions.filter(t => new Date(t.date) >= startOfMonth);
    const yearlyTransactions = transactions.filter(t => new Date(t.date) >= startOfYear);

    // 2. 총 수입/지출 계산 헬퍼 함수
    const calculateTotals = (arr) => {
        return arr.reduce((totals, t) => {
            if (t.type === 'income') {
                totals.income += t.amount;
            } else {
                totals.expense += t.amount;
            }
            return totals;
        }, { income: 0, expense: 0 });
    };

    // 3. 각 카드에 데이터 업데이트
    const yearlyTotals = calculateTotals(yearlyTransactions);
    document.getElementById('yearly-income').innerText = yearlyTotals.income.toLocaleString() + '원';
    document.getElementById('yearly-expense').innerText = yearlyTotals.expense.toLocaleString() + '원';

    const monthlyTotals = calculateTotals(monthlyTransactions);
    document.getElementById('monthly-income').innerText = monthlyTotals.income.toLocaleString() + '원';
    document.getElementById('monthly-expense').innerText = monthlyTotals.expense.toLocaleString() + '원';

    const weeklyTotals = calculateTotals(weeklyTransactions);
    document.getElementById('weekly-income').innerText = weeklyTotals.income.toLocaleString() + '원';
    document.getElementById('weekly-expense').innerText = weeklyTotals.expense.toLocaleString() + '원';

    // 4. 상세 보기 숨기고, 요약 보기 보여주기 (초기 상태)
    document.querySelector('.stats-summary-container').style.display = 'flex';
    document.getElementById('stats-details-container').style.display = 'none';
}

// 다크 모드 적용/해제
function applyDarkMode(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
}

// ==================================
// 4. 데이터 로딩 및 초기화
// ==================================

// 페이지 로드 시 모든 데이터를 불러오는 메인 함수
async function loadAllData() {
    if (!userInfo) return;
    loadingSpinner.style.display = 'flex';
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

        updateUIVisibility(true);
        updateAllUI(); // ★★★ 데이터 로딩 성공 후 UI 업데이트 호출 위치 변경 ★★★

    } catch (error) {
        // ★★★ 로그인 실패(로그아웃) 시 UI를 제어하는 코드로 변경 ★★★
        userInfo.innerHTML = `<p>로그인이 필요합니다.</p><a href="/auth/kakao" class="kakao-login-btn">카카오톡으로 로그인</a>`;
        updateUIVisibility(false);
        transactions = [];
        assets = [];
        updateAllUI(); // 로그아웃 상태의 빈 UI를 그려줌
    }
    finally{
        loadingSpinner.style.display = 'none';
    }
}

// ★★★ 초기화 함수를 만들어 페이지 로드 시 실행할 작업들을 정리 ★★★
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
// 5. 이벤트 리스너(Event Listeners) - 한 곳으로 모아서 재배치
// ==================================

if (statisticsPage) {
    statisticsPage.addEventListener('click', (event) => {
        const card = event.target.closest('.stats-card');
        const backBtn = event.target.closest('#stats-back-btn');

        if (card) {
            const period = card.dataset.period;
            let title = '';
            let targetTransactions = [];

            const now = new Date();
            if (period === 'yearly') {
                title = `${now.getFullYear()}년 카테고리별 지출`;
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                targetTransactions = transactions.filter(t => new Date(t.date) >= startOfYear && t.type === 'expense');
            } else if (period === 'monthly') {
                title = `${now.getMonth() + 1}월 카테고리별 지출`;
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                targetTransactions = transactions.filter(t => new Date(t.date) >= startOfMonth && t.type === 'expense');
            } else if (period === 'weekly') {
                title = `이번 주 카테고리별 지출`;
                const startOfWeek = new Date(new Date().setDate(new Date().getDate() - new Date().getDay()));
                targetTransactions = transactions.filter(t => new Date(t.date) >= startOfWeek && t.type === 'expense');
            }

            const expensesByCategory = targetTransactions.reduce((map, t) => {
                map[t.category] = (map[t.category] || 0) + t.amount;
                return map;
            }, {});

            const detailsList = document.getElementById('stats-details-list');
            detailsList.innerHTML = ''; // 목록 초기화

            // 금액순으로 정렬
            const sortedCategories = Object.entries(expensesByCategory).sort(([, a], [, b]) => b - a);
            
            if (sortedCategories.length === 0) {
                 detailsList.innerHTML = '<li>해당 기간에 지출 내역이 없습니다.</li>';
            } else {
                sortedCategories.forEach(([category, amount]) => {
                    const li = document.createElement('li');
                    li.innerHTML = `<span>${category}</span> <strong>${amount.toLocaleString()}원</strong>`;
                    detailsList.appendChild(li);
                });
            }

            document.getElementById('stats-details-title').innerText = title;
            document.querySelector('.stats-summary-container').style.display = 'none';
            document.getElementById('stats-details-container').style.display = 'block';
        }

        if (backBtn) {
            document.querySelector('.stats-summary-container').style.display = 'flex';
            document.getElementById('stats-details-container').style.display = 'none';
        }
    });
}

function setupEventListeners() {
    if (menuItems) {
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const pageId = item.getAttribute('data-page');
                if (!pageId || !currentUser) return;

                [assetManagementPage, statisticsPage, settingsPage].forEach(page => page.style.display = 'none');
                menuItems.forEach(menu => menu.classList.remove('active'));
                
                const pageToShow = document.getElementById(pageId);
                if (pageToShow) {
                    pageToShow.style.display = 'block';
                    item.classList.add('active');
                }

                if (pageId === 'statistics-page') {
                    updateStatisticsUI();
                }
            });
        });
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
            // ... 자산 추가 폼 제출 로직 (기존과 동일)
        });
    }

    if (listEl) {
        listEl.addEventListener('click', (event) => {
            // 거래 내역 그룹 토글 로직
            const header = event.target.closest('.date-group-header');
            if (header) {
                header.classList.toggle('is-open');
                const groupBody = header.nextElementSibling;
                if (groupBody) groupBody.style.display = groupBody.style.display === 'none' ? 'block' : 'none';
                return;
            }
            
            // 거래 내역 삭제 로직
            if (event.target.classList.contains('delete-btn')) {
                // ... 삭제 로직 (기존과 동일)
            }

            // 거래 내역 수정 로직
            const target = event.target;
            if (target.classList.contains('editable') && !target.querySelector('input')) {
                // ... 수정 로직 (기존과 동일)
            }
        });
    }

    if (assetListEl) {
        assetListEl.addEventListener('blur', async (event) => {
             // ★★★ 자산 금액 수정 로직을 blur 이벤트로 변경하여 성능 개선 ★★★
            if (event.target.classList.contains('editable-amount')) {
                // ... 자산 금액 수정 로직 (기존과 동일)
            }
        }, true);
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
            // ... 모든 데이터 삭제 로직 (기존과 동일)
        });
    }
}

// '자산 현황 수정' 버튼 클릭 시 팝업 열기
if (editAssetsBtn) {
    editAssetsBtn.addEventListener('click', () => {
        // 현재 자산 목록으로 팝업 내용 채우기
        modalAssetList.innerHTML = ''; // 기존 목록 초기화
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

// 팝업 '완료' 버튼 클릭 시 팝업 닫기
if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
        assetEditModal.style.display = 'none';
        // 변경사항을 즉시 반영하기 위해 UI 새로고침
        updateAllUI(); 
    });
}

// 팝업 내부에서 수정/삭제 이벤트 처리
if (modalAssetList) {
    modalAssetList.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const item = event.target.closest('li');
            const assetId = item.dataset.id;
            if (confirm('이 자산을 정말 삭제하시겠습니까?')) {
                try {
                    await axios.delete(`/api/assets/${assetId}`);
                    assets = assets.filter(a => a._id !== assetId);
                    item.remove(); // 화면에서 바로 삭제
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
                assetToUpdate.amount = newAmount;
            } catch (error) {
                alert('금액 수정 중 오류가 발생했습니다.');
            }
        }
    });
}

// ==================================
// 6. 앱 시작
// ==================================
initialize();
setupEventListeners(); // ★★★ 이벤트 리스너 설정 함수 호출 추가 ★★★