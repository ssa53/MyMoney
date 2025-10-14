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
    if (!assetManagementPage) return; // 자산 관리 페이지가 없으면 실행 안 함

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
            plugins: { legend: { display: false } },
            tooltip: {
                enabled: false
            }
        }
    });

    const detailsPopup = document.getElementById('asset-list-details');
    if (detailsPopup) {
        chartCanvas.onmouseenter = () => {
            detailsPopup.innerHTML = assets.map(a => `<p><strong>${a.name}</strong>: ${a.amount.toLocaleString()}원</p>`).join('');
            detailsPopup.style.display = 'block';
        };
        chartCanvas.onmouseleave = () => {
            detailsPopup.style.display = 'none';
        };
        chartCanvas.onclick = () => {
            detailsPopup.style.display = detailsPopup.style.display === 'block' ? 'none' : 'block';
        };
    }
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
    if (!listEl) return;
    listEl.innerHTML = '';
    
    // ★★★ 기존 자산 목록 그리던 코드 삭제됨 ★★★

    const groupedTransactions = transactions.reduce((groups, t) => {
        if (!groups[t.date]) groups[t.date] = [];
        groups[t.date].push(t);
        return groups;
    }, {});

    const sortedDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));
    sortedDates.forEach(date => {
        // ... (거래 내역 리스트 그리는 로직은 기존과 거의 동일)
        const dailyTotal = groupedTransactions[date].reduce((total, t) => t.type === 'expense' ? total - t.amount : total + t.amount, 0);
        let dailyStatus = '';
        if (dailyTotal > 0) dailyStatus = `수입: ${dailyTotal.toLocaleString()}원`;
        else if (dailyTotal < 0) dailyStatus = `지출: ${(-dailyTotal).toLocaleString()}원`;

        const groupHeader = document.createElement('div');
        groupHeader.classList.add('date-group-header');
        groupHeader.innerHTML = `<span>${date}</span><span class="daily-expense">${dailyStatus}</span>`;
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

    // ★★★ 총 자산 계산 로직 변경: 초기 자산의 합계만 표시 ★★★
    const finalBalance = assets.reduce((sum, asset) => sum + asset.amount, 0);
    const koreanBalanceEl = document.getElementById('total-balance-korean');
    if (koreanBalanceEl) {
        koreanBalanceEl.innerHTML = formatToKoreanWon(finalBalance);
    }
    
    // ★★★ 자산 현황 원형 그래프 그리기 함수 호출 추가 ★★★
    renderAssetChart();
}


// 통계 페이지 UI 업데이트
function updateStatisticsUI() {
    // ... (기존과 동일)
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

// ==================================
// 6. 앱 시작
// ==================================
initialize();
setupEventListeners(); // ★★★ 이벤트 리스너 설정 함수 호출 추가 ★★★