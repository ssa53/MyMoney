const balanceEl = document.getElementById('total-balance');
const formEl = document.getElementById('transaction-form');
const dateEl = document.getElementById('date');
const descriptionEl = document.getElementById('description');
const amountEl = document.getElementById('amount');
const categoryEl = document.getElementById('category');
const clearDataBtn = document.getElementById('clear-data-btn');
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
const darkModeToggle = document.getElementById('dark-mode-toggle');
const userInfo = document.getElementById('user-info');

let transactions = [];
let assets = [];
let currentUser = null;

function updateAllUI() {
    listEl.innerHTML = '';
    assetListEl.innerHTML = '';
    let totalBalance = 0;
    assets.forEach(asset => {
        const assetItem = document.createElement('p');
        assetItem.innerHTML = `<strong>${asset.name}</strong>: 
            <span class="editable-amount" contenteditable="true" data-name="${asset.name}">${asset.amount.toLocaleString()}원</span>`;
        assetListEl.appendChild(assetItem);
        totalBalance += asset.amount;
    });
    const groupedTransactions = transactions.reduce((groups, transaction) => {
        const date = transaction.date;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(transaction);
        return groups;
    }, {});
    const today = new Date().toISOString().slice(0, 10);
    const sortedDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));
    sortedDates.forEach(date => {
        const dailyExpense = groupedTransactions[date].reduce((total, transaction) => {
            if (transaction.type === 'expense') {
                return total + transaction.amount;
            }
            return total;
        }, 0);
        const groupHeader = document.createElement('div');
        groupHeader.classList.add('date-group-header');
        groupHeader.innerHTML = `
            <h3>${date}</h3>
            <span class="daily-expense">지출: ${dailyExpense.toLocaleString()}원</span>
        `;
        groupHeader.setAttribute('data-date', date);
        listEl.appendChild(groupHeader);
        const groupBody = document.createElement('ul');
        groupBody.classList.add('transaction-group-body');
        if (date === today) {
            groupBody.style.display = 'block';
        } else {
            groupBody.style.display = 'none';
        }
        groupedTransactions[date].forEach(transaction => {
            const listItem = document.createElement('li');
            listItem.classList.add(transaction.type); 
            // MongoDB의 _id를 data-id로 사용합니다.
            listItem.setAttribute('data-id', transaction._id);
            listItem.innerHTML = `
                <span class="transaction-date" style="display:none;">${transaction.date}</span>
                <div>
                    <span class="transaction-description">${transaction.description}</span>
                    <span class="category-label">${transaction.category}</span>
                </div>
                <span class="transaction-amount">${transaction.amount.toLocaleString()}원</span>
                <button class="delete-btn">삭제</button>
            `;
            groupBody.appendChild(listItem);
            if (transaction.type === 'income') {
                totalBalance += transaction.amount;
            } else {
                totalBalance -= transaction.amount;
            }
        });
        listEl.appendChild(groupBody);
    });
    balanceEl.innerText = totalBalance.toLocaleString();
}

async function loadAllData() {
    try {
        const userResponse = await axios.get('/api/user'); // API 경로로 변경
        currentUser = userResponse.data;
        userInfo.innerHTML = `
            <p>안녕하세요, ${currentUser.nickname}님!</p>
            <a href="/api/logout" id="logout-link">로그아웃</a>        `;
        // 사용자 정보를 받은 후에 해당 사용자의 데이터를 요청합니다.
        const transactionResponse = await axios.get(`/api/transactions?userId=${currentUser.kakaoId}`);
        const assetResponse = await axios.get(`/api/assets?userId=${currentUser.kakaoId}`);
        transactions = transactionResponse.data;
        assets = assetResponse.data;

    } catch (error) {
        userInfo.innerHTML = `
            <p>로그인이 필요합니다.</p>
            <a href="/api/auth/kakao" id="login-link">카카오톡으로 로그인</a>        `;
        transactions = [];
        assets = [];
    }

    updateAllUI();
}

function updateStatisticsUI() {
    yearlyListEl.innerHTML = '';
    monthlyListEl.innerHTML = '';
    dailyListEl.innerHTML = '';
    const yearlyData = {};
    const monthlyData = {};
    const dailyData = {};
    transactions.forEach(t => {
        const [year, month, day] = t.date.split('-');
        const amount = t.type === 'income' ? t.amount : -t.amount;
        if (!yearlyData[year]) yearlyData[year] = 0;
        yearlyData[year] += amount;
        const monthKey = `${year}-${month}`;
        if (!monthlyData[monthKey]) monthlyData[monthKey] = 0;
        monthlyData[monthKey] += amount;
        const dayKey = `${year}-${month}-${day}`;
        if (!dailyData[dayKey]) dailyData[dayKey] = 0;
        dailyData[dayKey] = (dailyData[dayKey] || 0) + amount;
    });
    for (const year in yearlyData) {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${year}년:</strong> ${yearlyData[year].toLocaleString()}원`;
        yearlyListEl.appendChild(item);
    }
    for (const month in monthlyData) {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${month}월:</strong> ${monthlyData[month].toLocaleString()}원`;
        monthlyListEl.appendChild(item);
    }
    for (const day in dailyData) {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${day}일:</strong> ${dailyData[day].toLocaleString()}원`;
        dailyListEl.appendChild(item);
    }
}

assetListEl.addEventListener('input', async (event) => {
    const assetName = event.target.dataset.name;
    const newAmountStr = event.target.innerText.replace(/[^0-9]/g, '');
    const newAmount = parseInt(newAmountStr) || 0;
    const assetToUpdate = assets.find(a => a.name === assetName);
    if (assetToUpdate) {
        assetToUpdate.amount = newAmount;
        await axios.put(`/api/assets/${assetToUpdate._id}`, { amount: newAmount });
        updateAllUI();
    }
});

menuItems.forEach(item => {
    item.addEventListener('click', () => {
        const pages = [assetManagementPage, statisticsPage, settingsPage];
        pages.forEach(page => page.style.display = 'none');
        menuItems.forEach(menu => menu.classList.remove('active'));
        item.classList.add('active');
        if (item.textContent === '자산 관리') {
            assetManagementPage.style.display = 'block';
        } else if (item.textContent === '통계 보기') {
            statisticsPage.style.display = 'block';
            updateStatisticsUI();
        } else if (item.textContent === '환경설정') {
            settingsPage.style.display = 'block';
        }
    });
});

formEl.addEventListener('submit', async (event) => {
    event.preventDefault(); 
    if (!currentUser) {
        alert("로그인이 필요합니다.");
        return;
    }
    const date = dateEl.value;
    const description = descriptionEl.value;
    const amount = parseFloat(amountEl.value);
    const category = categoryEl.value;
    const type = typeEl.value;
    const newTransaction = {
        date: date,
        description: description,
        amount: amount,
        category: category,
        type: type
    };
    try {
        const response = await axios.post('/api/transactions', newTransaction);
        transactions.push(response.data);
        updateAllUI();
        formEl.reset();
    } catch (error) {
        console.error("Error adding transaction:", error);
    }
});

addAssetFormEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentUser) {
        alert("로그인이 필요합니다.");
        return;
    }
    const name = assetNameEl.value;
    const amount = parseFloat(assetAmountEl.value);
    const newAsset = {
        name: name,
        amount: amount
    };
    try {
        const response = await axios.post('/api/assets', newAsset);
        assets.push(response.data);
        updateAllUI();
        addAssetFormEl.reset();
    } catch (error) {
        console.error("Error adding asset:", error);
    }
});

listEl.addEventListener('click', async (event) => {
    const header = event.target.closest('.date-group-header');
    if (header) {
        const groupBody = header.nextElementSibling;
        if (groupBody) {
            groupBody.style.display = groupBody.style.display === 'none' ? 'block' : 'none';
        }
    } else if (event.target.classList.contains('delete-btn')) {
        const listItem = event.target.closest('li');
        const transactionId = listItem.dataset.id;
        if (confirm('정말 삭제하시겠습니까?')) {
            try {
                await axios.delete(`/api/transactions/${transactionId}`);
                transactions = transactions.filter(t => t._id !== transactionId);
                updateAllUI();
            } catch (error) {
                console.error("Error deleting transaction:", error);
            }
        }
    }
});


clearDataBtn.addEventListener('click', async () => {
    if (!currentUser) {
        alert("로그인이 필요합니다.");
        return;
    }
    if (confirm('정말로 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        try {
            await axios.delete('/api/data');
            localStorage.clear();
            window.location.reload();
        } catch (error) {
            console.error("Error clearing data:", error);
            alert("데이터 삭제 중 오류가 발생했습니다.");
        }
    }
});

function applyDarkMode(isDark) {
    if (isDark) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

const savedDarkMode = localStorage.getItem('darkMode');
if (savedDarkMode === 'enabled') {
    applyDarkMode(true);
    darkModeToggle.checked = true;
}

darkModeToggle.addEventListener('change', () => {
    if (darkModeToggle.checked) {
        applyDarkMode(true);
        localStorage.setItem('darkMode', 'enabled');
    } else {
        applyDarkMode(false);
        localStorage.setItem('darkMode', 'disabled');
    }
});


