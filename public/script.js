// ==================================
// 1. 요소(Element) 변수 선언
// ==================================
const balanceEl = document.getElementById('total-balance');
const formEl = document.getElementById('transaction-form');
const dateEl = document.getElementById('date');
const descriptionEl = document.getElementById('description');
const amountEl = document.getElementById('amount');
const categoryEl = document.getElementById('beomju-input'); // ID 변경됨
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
let assetChart = null;

// ==================================
// 3. 핵심 기능 함수
// ==================================

function renderAssetChart() {
    const chartCanvas = document.getElementById('assetChart');
    if (!chartCanvas) return;
    const ctx = chartCanvas.getContext('2d');

    // 기존 차트가 있으면 파괴
    if (assetChart) {
        assetChart.destroy();
    }

    const labels = assets.map(asset => asset.name);
    const data = assets.map(asset => asset.amount);

    assetChart = new Chart(ctx, {
        type: 'doughnut', // 도넛 모양의 원형 그래프
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [ // 색상은 원하시는 대로 추가/변경 가능
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                    '#9966FF', '#FF9F40'
                ],
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // 범례는 숨김
                }
            }
        }
    });

    // 차트에 마우스 이벤트 추가
    const detailsPopup = document.getElementById('asset-list-details');
    chartCanvas.addEventListener('mouseenter', () => {
        detailsPopup.innerHTML = assets.map(a => `<p><strong>${a.name}</strong>: ${a.amount.toLocaleString()}원</p>`).join('');
        detailsPopup.style.display = 'block';
    });
    chartCanvas.addEventListener('mouseleave', () => {
        detailsPopup.style.display = 'none';
    });
    // 모바일용 클릭 이벤트
    chartCanvas.addEventListener('click', () => {
        detailsPopup.innerHTML = assets.map(a => `<p><strong>${a.name}</strong>: ${a.amount.toLocaleString()}원</p>`).join('');
        detailsPopup.style.display = detailsPopup.style.display === 'block' ? 'none' : 'block';
    });
}

function formatToKoreanWon(number) {
    if (number === 0) return '0 원';

    const units = ['', '만', '억', '조'];
    let result = '';
    let unitIndex = 0;

    while (number > 0) {
        const part = number % 10000;
        if (part > 0) {
            const h = Math.floor(part / 1000);
            const t = Math.floor((part % 1000) / 100);
            const d = Math.floor((part % 100) / 10);
            const o = part % 10;

            let partStr = '';
            if (h > 0) partStr += `<span>${h}</span>천 `;
            if (t > 0) partStr += `<span>${t}</span>백 `;
            if (d > 0) partStr += `<span>${d}</span>십 `;
            if (o > 0) partStr += `<span>${o}</span>`;

            result = `${partStr} ${units[unitIndex]} ${result}`;
        }
        number = Math.floor(number / 10000);
        unitIndex++;
    }
    return result.trim() + ' 원';
}

// 로그인/로그아웃 상태에 따라 메뉴와 페이지 가시성 업데이트
function updateUIVisibility(isLoggedIn) {
    const pages = [assetManagementPage, statisticsPage, settingsPage];
    const menuItemsToToggle = document.querySelectorAll('.menu-item[data-page="statistics-page"], .menu-item[data-page="settings-page"]');

    // 모든 페이지 숨기기 및 메뉴 비활성화
    pages.forEach(page => page.style.display = 'none');
    menuItems.forEach(menu => menu.classList.remove('active'));

    if (isLoggedIn) {
        // 로그인 상태: 모든 메뉴 보이기 및 '자산 관리'를 기본으로 활성화
        menuItemsToToggle.forEach(item => item.style.display = 'block');
        assetManagementPage.style.display = 'block';
        document.querySelector('.menu-item[data-page="asset-management-page"]').classList.add('active');
    } else {
        // 로그아웃 상태: 일부 메뉴 숨기기 및 '자산 관리'만 표시
        menuItemsToToggle.forEach(item => item.style.display = 'none');
        assetManagementPage.style.display = 'block';
        document.querySelector('.menu-item[data-page="asset-management-page"]').classList.add('active');
    }
}

// 모든 UI(자산, 거래내역, 총 자산)를 다시 그리는 함수
function updateAllUI() {
    // ... (기존 updateAllUI 함수 내용은 동일)
    listEl.innerHTML = '';

    assets.forEach(asset => {
        const assetItem = document.createElement('p');
        assetItem.innerHTML = `<strong>${asset.name}</strong>: <span class="editable-amount" contenteditable="true" data-id="${asset._id}">${asset.amount.toLocaleString()}원</span>`;
        assetListEl.appendChild(assetItem);
    });

    const groupedTransactions = transactions.reduce((groups, transaction) => {
        const date = transaction.date;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(transaction);
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
        groupHeader.innerHTML = `<span>${date}</span> <span class="daily-expense">${dailyStatus}</span>`;
        groupHeader.setAttribute('data-date', date);
        listEl.appendChild(groupHeader);
        
        const groupBody = document.createElement('ul');
        groupBody.classList.add('transaction-group-body');
        groupBody.style.display = 'none'; // 기본적으로 닫힘

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

    // 총 자산 계산: 초기 자산 합계 + 모든 거래 내역 합계
    const transactionTotal = transactions.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0);
    const finalBalance = assets.reduce((sum, asset) => sum + asset.amount, 0);
    const koreanBalanceEl = document.getElementById('total-balance-korean');
    koreanBalanceEl.innerHTML = formatToKoreanWon(finalBalance);

    renderAssetChart();
}


// 통계 페이지 UI 업데이트
function updateStatisticsUI() {
    // ... (기존 updateStatisticsUI 함수 내용은 동일)
    yearlyListEl.innerHTML = '';
    monthlyListEl.innerHTML = '';
    dailyListEl.innerHTML = '';

    const monthlyData = {};
    const yearlyData = {};

    transactions.forEach(t => {
        const [year, month] = t.date.split('-');
        const amount = t.type === 'income' ? t.amount : -t.amount;
        
        const yearKey = `${year}년`;
        yearlyData[yearKey] = (yearlyData[yearKey] || 0) + amount;

        const monthKey = `${year}년 ${month}월`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + amount;
    });

    for (const year in yearlyData) {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${year}:</strong> ${yearlyData[year].toLocaleString()}원`;
        yearlyListEl.appendChild(item);
    }
    for (const month in monthlyData) {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${month}:</strong> ${monthlyData[month].toLocaleString()}원`;
        monthlyListEl.appendChild(item);
    }
}


// 다크 모드 적용/해제
function applyDarkMode(isDark) {
    if (isDark) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// ==================================
// 4. 데이터 로딩 및 초기화
// ==================================

// 페이지 로드 시 모든 데이터를 불러오는 메인 함수
async function loadAllData() {
    try {
        const userResponse = await axios.get('/user'); // '/api/user' -> '/user'
        currentUser = userResponse.data;
        userInfo.innerHTML = `<p>안녕하세요, ${currentUser.nickname}님!</p><a href="/logout" id="logout-link">로그아웃</a>`; // '/api/logout' -> '/logout'
        
        updateUIVisibility(true);

        const [transactionResponse, assetResponse] = await Promise.all([
            axios.get(`/api/transactions?userId=${currentUser.kakaoId}`),
            axios.get(`/api/assets?userId=${currentUser.kakaoId}`)
        ]);
        transactions = transactionResponse.data;
        assets = assetResponse.data;
        renderAssetChart();
    } catch (error) {
        userInfo.innerHTML = `<p>로그인이 필요합니다.</p><a href="/auth/kakao" class="kakao-login-btn">카카오톡으로 로그인</a>`; // '/api/auth/kakao' -> '/auth/kakao'
        updateUIVisibility(false);
        transactions = [];
        assets = [];
    }
    updateAllUI();
}

// 초기화 함수: 페이지가 처음 로드될 때 실행
function initialize() {
    // 다크 모드 설정 불러오기
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'enabled') {
        darkModeToggle.checked = true;
        applyDarkMode(true);
    }

    // 데이터 로드
    loadAllData();
}

// ==================================
// 5. 이벤트 리스너(Event Listeners)
// ==================================

// 메뉴 아이템 클릭 시 페이지 전환
menuItems.forEach(item => {
    item.addEventListener('click', () => {
        const pageId = item.getAttribute('data-page');
        if (!pageId) return;

        // 모든 페이지 숨기고 메뉴 비활성화
        [assetManagementPage, statisticsPage, settingsPage].forEach(page => page.style.display = 'none');
        menuItems.forEach(menu => menu.classList.remove('active'));
        
        // 클릭된 메뉴와 페이지 활성화
        const pageToShow = document.getElementById(pageId);
        if (pageToShow) {
            pageToShow.style.display = 'block';
            item.classList.add('active');
        }

        // 통계 페이지일 경우, 데이터 업데이트
        if (pageId === 'statistics-page') {
            updateStatisticsUI();
        }
    });
});

// 거래 내역 추가 폼 제출
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
        dateEl.valueAsDate = new Date(); // 날짜 오늘로 리셋
    } catch (error) {
        console.error("Error adding transaction:", error);
        alert("거래 내역 추가 중 오류가 발생했습니다.");
    }
});

// 자산 추가 폼 제출
addAssetFormEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentUser) return alert("로그인이 필요합니다.");

    const newAsset = { name: assetNameEl.value, amount: parseFloat(assetAmountEl.value) };

    try {
        const response = await axios.post('/api/assets', newAsset);
        assets.push(response.data);
        updateAllUI();
        addAssetFormEl.reset();
    } catch (error) {
        console.error("Error adding asset:", error);
        alert("자산 추가 중 오류가 발생했습니다.");
    }
});


// 거래 내역 그룹 토글 및 삭제 버튼 처리
listEl.addEventListener('click', async (event) => {
    // 날짜 그룹 헤더 클릭 시 토글
    const header = event.target.closest('.date-group-header');
    if (header) {
        const groupBody = header.nextElementSibling;
        if (groupBody) {
            groupBody.style.display = groupBody.style.display === 'none' ? 'block' : 'none';
        }
        return;
    }
    
    // 삭제 버튼 클릭
    if (event.target.classList.contains('delete-btn')) {
        const listItem = event.target.closest('li');
        const transactionId = listItem.dataset.id;
        if (confirm('정말 삭제하시겠습니까?')) {
            try {
                await axios.delete(`/api/transactions/${transactionId}`);
                transactions = transactions.filter(t => t._id !== transactionId);
                updateAllUI();
            } catch (error) {
                console.error("Error deleting transaction:", error);
                alert("삭제 중 오류가 발생했습니다.");
            }
        }
    }
});

// 자산 금액 수정
assetListEl.addEventListener('blur', async (event) => {
    if (event.target.classList.contains('editable-amount')) {
        const assetId = event.target.dataset.id;
        const newAmountStr = event.target.innerText.replace(/[^0-9]/g, '');
        const newAmount = parseInt(newAmountStr, 10) || 0;
        
        const assetToUpdate = assets.find(a => a._id === assetId);
        if (assetToUpdate && assetToUpdate.amount !== newAmount) {
            assetToUpdate.amount = newAmount;
            try {
                await axios.put(`/api/assets/${assetId}`, { amount: newAmount });
                updateAllUI(); // 전체 UI 다시 그리기
            } catch (error) {
                console.error("Error updating asset:", error);
                alert("자산 업데이트 중 오류가 발생했습니다.");
            }
        }
    }
}, true); // useCapture: true로 설정하여 blur 이벤트 감지

// 다크 모드 토글
darkModeToggle.addEventListener('change', () => {
    if (darkModeToggle.checked) {
        applyDarkMode(true);
        localStorage.setItem('darkMode', 'enabled');
    } else {
        applyDarkMode(false);
        localStorage.setItem('darkMode', 'disabled');
    }
});

// 모든 데이터 삭제
clearDataBtn.addEventListener('click', async () => {
    if (!currentUser) return alert("로그인이 필요합니다.");
    
    if (confirm('정말로 모든 거래내역과 자산을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        try {
            await axios.delete('/api/data');
            // localStorage는 다크모드 설정 때문에 남겨두고, 데이터만 초기화
            transactions = [];
            assets = [];
            updateAllUI();
        } catch (error) {
            console.error("Error clearing data:", error);
            alert("데이터 삭제 중 오류가 발생했습니다.");
        }
    }
});

// 거래 내역 아이템 클릭 시 수정 모드로 변경
listEl.addEventListener('click', (event) => {
    const target = event.target;
    if (!target.classList.contains('editable') || target.querySelector('input')) {
        return; // 수정 가능한 요소가 아니거나, 이미 수정 중이면 무시
    }

    const listItem = target.closest('li');
    const transactionId = listItem.dataset.id;
    const field = target.dataset.field;
    const currentValue = transactions.find(t => t._id === transactionId)[field];

    // 입력창 생성
    const input = document.createElement('input');
    input.type = (field === 'amount') ? 'text' : 'text';
    if (field === 'amount') {
        input.inputMode = 'numeric';
        input.pattern = '[0-9]*';
    }
    input.value = currentValue;
    input.style.width = `${target.offsetWidth + 20}px`; // 원래 너비보다 약간 넓게

    // 원래 텍스트를 입력창으로 교체
    target.innerHTML = '';
    target.appendChild(input);
    input.focus();

    // 입력창에서 포커스가 벗어나거나 Enter 키를 누르면 저장
    const saveUpdate = async () => {
        const newValue = (field === 'amount') ? parseFloat(input.value) || 0 : input.value;
        
        // 값이 변경되었을 때만 서버에 요청
        if (newValue !== currentValue) {
            try {
                // 서버에 업데이트 요청
                await axios.put(`/api/transactions/${transactionId}`, { [field]: newValue });
                
                // 프론트엔드 데이터 업데이트
                const transactionToUpdate = transactions.find(t => t._id === transactionId);
                transactionToUpdate[field] = newValue;

            } catch (error) {
                console.error('Error updating transaction:', error);
                alert('업데이트 중 오류가 발생했습니다.');
            }
        }
        // 전체 UI를 다시 그려서 원래대로 복구 및 최신 상태 반영
        updateAllUI();
    };

    input.addEventListener('blur', saveUpdate);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveUpdate();
        } else if (e.key === 'Escape') {
            // Esc 키를 누르면 취소하고 UI만 다시 그림
            updateAllUI();
        }
    });
});

// ==================================
// 6. 앱 시작
// ==================================
initialize();