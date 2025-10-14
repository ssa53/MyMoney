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
let assetChart = null;

// ==================================
// 3. 핵심 기능 함수
// ==================================

// [이전 답변들에서 추가했던 모든 함수들 (updateUIVisibility, updateAllUI, formatToKoreanWon, renderAssetChart, applyDarkMode 등) 이 여기에 포함되어 있다고 가정합니다. 만약 없다면 이전 답변들을 참고하여 이 섹션에 추가해주세요.]
// ... (여기에 이전 함수들 복붙) ...
// 아래에서는 단순화된 버전으로 다시 제공합니다.

function updateUIVisibility(isLoggedIn) {
    if (!assetManagementPage || !statisticsPage || !settingsPage) return; // 페이지 요소가 없으면 실행 중단

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

function updateAllUI() {
    if (!listEl) return;
    // ... 이전 답변의 updateAllUI 내용 ...
}

function applyDarkMode(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
}


// ==================================
// 4. 데이터 로딩 및 초기화
// ==================================

async function loadAllData() {
    // userInfo 요소가 없으면(login.html 이면) 아무것도 안함
    if (!userInfo) return;

    try {
        const userResponse = await axios.get('/user');
        currentUser = userResponse.data;
        userInfo.innerHTML = `<p>안녕하세요, ${currentUser.nickname}님!</p><a href="/logout" id="logout-link">로그아웃</a>`;
        
        // 데이터 로딩 로직은 로그인된 페이지에서만 필요
        const [transactionResponse, assetResponse] = await Promise.all([
            axios.get(`/api/transactions?userId=${currentUser.kakaoId}`),
            axios.get(`/api/assets?userId=${currentUser.kakaoId}`)
        ]);
        transactions = transactionResponse.data;
        assets = assetResponse.data;
        
        updateUIVisibility(true);
        updateAllUI();

    } catch (error) {
        // 에러 발생 시(로그아웃 상태) 로그인 버튼 표시
        userInfo.innerHTML = `<p>로그인이 필요합니다.</p><a href="/auth/kakao" class="kakao-login-btn">카카오톡으로 로그인</a>`;
        updateUIVisibility(false);
        // 로그아웃 상태에서는 거래내역 등이 없으므로 UI를 초기화할 필요 없음
    }
}

function initialize() {
    // 다크모드 토글이 있을 때만 관련 로직 실행
    if (darkModeToggle) {
        const savedDarkMode = localStorage.getItem('darkMode');
        if (savedDarkMode === 'enabled') {
            darkModeToggle.checked = true;
            applyDarkMode(true);
        }
    }
    // 데이터 로드 시작
    loadAllData();
}

// ==================================
// 5. 이벤트 리스너(Event Listeners)
// ==================================
// ★★★ 모든 addEventListener 앞에 'if (요소)' 안전장치 추가 ★★★

if (menuItems) {
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            // ... 페이지 전환 로직 ...
        });
    });
}

if (formEl) {
    formEl.addEventListener('submit', async (event) => {
        // ... 거래 내역 추가 로직 ...
    });
}

if (addAssetFormEl) {
    addAssetFormEl.addEventListener('submit', async (event) => {
        // ... 자산 추가 로직 ...
    });
}

if (listEl) {
    listEl.addEventListener('click', async (event) => {
        // ... 거래 내역 삭제 및 수정 로직 ...
    });
}

if (assetListEl) {
    assetListEl.addEventListener('blur', async (event) => {
        // ... 자산 금액 수정 로직 ...
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
        // ... 모든 데이터 삭제 로직 ...
    });
}


// ==================================
// 6. 앱 시작
// ==================================
initialize();