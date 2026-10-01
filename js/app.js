// === STATE & CONFIG ===
const state = {
    token: localStorage.getItem('pos_token') || null,
    role: localStorage.getItem('pos_role') || null,
    apiUrl: localStorage.getItem('pos_api_url') || '',
    products: [],
    cart: [],
    kasData: {}
};

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    // Restore API URL in form if exists
    if (state.apiUrl) {
        document.getElementById('api-url').value = state.apiUrl;
    }

    if (state.token) {
        initApp();
    } else {
        showLogin();
    }
});

// === UTILITIES ===
function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
}

function getRawNumber(formattedString) {
    if (!formattedString) return 0;
    return parseInt(formattedString.toString().replace(/[^0-9]/g, ''), 10) || 0;
}

function formatRupiahInput(input) {
    let raw = getRawNumber(input.value);
    input.value = raw > 0 ? new Intl.NumberFormat('id-ID').format(raw) : '';
}

function showLoader() {
    document.getElementById('loader').classList.remove('hidden');
}

function hideLoader() {
    document.getElementById('loader').classList.add('hidden');
}

function showToast(title, message, isError = false) {
    const toast = document.getElementById('toast');
    const titleEl = document.getElementById('toast-title');
    const msgEl = document.getElementById('toast-msg');
    
    titleEl.textContent = title;
    msgEl.textContent = message;
    
    toast.className = `fixed top-5 right-5 z-50 transform transition-all duration-300 shadow-lg p-4 w-80 flex items-center justify-between border-l-4 rounded ${isError ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-green-500'}`;
    
    toast.classList.remove('translate-x-full', 'opacity-0');
    
    setTimeout(hideToast, 3000);
}

function hideToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('translate-x-full', 'opacity-0');
}

function showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// === API CALLER ===
async function callAPI(action, data = {}) {
    if (!state.apiUrl) {
        throw new Error("API URL belum diset!");
    }

    const payload = {
        action: action,
        token: state.token,
        data: data
    };
    try {
        const response = await fetch(state.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain', // Mencegah preflight CORS di GAS
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.status === 'error') {
            throw new Error(result.message);
        }
        return result;
    } catch (e) {
        // Membedakan error network (URL mati/salah) dengan error business logic
        if (e instanceof TypeError && e.message.includes("fetch")) {
            throw new Error("Koneksi gagal. URL API mungkin sudah usang atau tidak dapat diakses.");
        }
        throw e;
    }
}

// === AUTHENTICATION ===
function showLogin() {
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('login-container').classList.remove('hidden');
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const apiUrl = document.getElementById('api-url').value;

    if (!apiUrl) {
        showToast('Error', 'API URL harus diisi', true);
        return;
    }

    state.apiUrl = apiUrl;
    localStorage.setItem('pos_api_url', apiUrl);
    
    showLoader();
    try {
        const res = await callAPI('login', { username, password });
        
        state.token = res.token;
        state.role = res.role;
        localStorage.setItem('pos_token', res.token);
        localStorage.setItem('pos_role', res.role);
        
        initApp();
        showToast('Success', 'Login berhasil!');
    } catch (err) {
        showToast('Login Gagal', err.message, true);
    } finally {
        hideLoader();
    }
}

function logout() {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_role');
    state.token = null;
    state.role = null;
    showLogin();
}
function resetApiUrl() {
    document.getElementById('api-url').value = '';
    localStorage.removeItem('pos_api_url');
    state.apiUrl = '';
    document.getElementById('api-url').focus();
}

function initApp() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('user-info').textContent = `Role: ${state.role}`;
    
    // Role based access control
    const adminElements = document.querySelectorAll('.admin-only');
    if (state.role === 'Admin') {
        adminElements.forEach(el => el.classList.remove('hidden'));
    } else {
        adminElements.forEach(el => el.classList.add('hidden'));
    }

    // Load initial data
    loadProducts();
    if (state.role === 'Admin') {
        loadKas();
    }
    
    // Load initial data
    loadProducts();
    if (state.role === 'Admin') {
        loadKas();
    }
    
    showView('pos-view');
}

// === NAVIGATION ===
function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    
    // Desktop Nav
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('bg-white/20');
        el.classList.add('hover:bg-white/10');
    });
    
    // Mobile Nav
    document.querySelectorAll('.nav-item-mobile').forEach(el => {
        el.classList.remove('text-[#5B65FF]', 'bg-blue-50');
        el.classList.add('text-gray-400');
        const textSpan = el.querySelector('.nav-text');
        if(textSpan) textSpan.classList.add('hidden');
    });
    
    if (viewId === 'pos-view') {
        document.getElementById('nav-pos').classList.add('bg-white/20');
        document.getElementById('nav-pos').classList.remove('hover:bg-white/10');
        document.getElementById('nav-pos-mobile').classList.add('text-[#5B65FF]', 'bg-blue-50');
        document.getElementById('nav-pos-mobile').classList.remove('text-gray-400');
        const textSpan = document.getElementById('nav-pos-mobile').querySelector('.nav-text');
        if(textSpan) textSpan.classList.remove('hidden');
    }
    if (viewId === 'admin-view') {
        document.getElementById('nav-admin').classList.add('bg-white/20');
        document.getElementById('nav-admin').classList.remove('hover:bg-white/10');
        document.getElementById('nav-admin-mobile').classList.add('text-[#5B65FF]', 'bg-blue-50');
        document.getElementById('nav-admin-mobile').classList.remove('text-gray-400');
        const textSpan = document.getElementById('nav-admin-mobile').querySelector('.nav-text');
        if(textSpan) textSpan.classList.remove('hidden');
    }
    if (viewId === 'kas-view') {
        document.getElementById('nav-kas').classList.add('bg-white/20');
        document.getElementById('nav-kas').classList.remove('hover:bg-white/10');
        document.getElementById('nav-kas-mobile').classList.add('text-[#5B65FF]', 'bg-blue-50');
        document.getElementById('nav-kas-mobile').classList.remove('text-gray-400');
        const textSpan = document.getElementById('nav-kas-mobile').querySelector('.nav-text');
        if(textSpan) textSpan.classList.remove('hidden');
        loadKas(); // Refresh kas data when opened
    }
}

// === DATA LOADING ===
async function loadProducts() {
    showLoader();
    try {
        const res = await callAPI('getProducts');
        state.products = res.data || [];
        renderPOSProducts();
        renderAdminProducts();
    } catch (err) {
        showToast('Error', 'Gagal memuat produk: ' + err.message, true);
        if (err.message.includes("Unauthorized") || err.message.includes("Token") || err.message.includes("usang")) {
            logout();
        }
    } finally {
        hideLoader();
    }
}

async function loadKas() {
    if (state.role !== 'Admin') return;
    try {
        const res = await callAPI('getKas');
        state.kasData = res.data;
        renderKas();
    } catch (err) {
        console.error("Gagal memuat data kas", err);
    }
}

// === POS LOGIC ===
function renderPOSProducts(filterText = '') {
    const container = document.getElementById('pos-product-list');
    container.innerHTML = '';
    
    const filtered = state.products.filter(p => 
        p.name.toLowerCase().includes(filterText.toLowerCase()) || 
        p.code.toLowerCase().includes(filterText.toLowerCase())
    );

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = `border rounded-lg p-3 cursor-pointer hover:shadow-md transition bg-white flex flex-col ${p.stock <= 0 ? 'opacity-50' : ''}`;
        card.onclick = () => p.stock > 0 ? addToCart(p) : showToast('Stok Habis', `${p.name} tidak tersedia`, true);
        
        const imgUrl = p.imageUrl || 'https://via.placeholder.com/150?text=No+Image';
        
        card.innerHTML = `
            <img src="${imgUrl}" alt="${p.name}" class="w-full h-32 object-cover rounded-md mb-2">
            <h3 class="font-bold text-sm truncate">${p.name}</h3>
            <p class="text-xs text-gray-500 mb-1">${p.code} | Stok: ${p.stock}</p>
            <p class="text-blue-600 font-bold mt-auto">${formatRupiah(p.sellPrice)}</p>
        `;
        container.appendChild(card);
    });
}

function filterPOSProducts() {
    const text = document.getElementById('pos-search').value;
    renderPOSProducts(text);
}

function addToCart(product) {
    const existing = state.cart.find(item => item.kode === product.code);
    if (existing) {
        if (existing.qty < product.stock) {
            existing.qty += 1;
            existing.total_harga = existing.qty * existing.harga_satuan;
        } else {
            showToast('Peringatan', 'Jumlah melebihi stok yang ada!', true);
        }
    } else {
        state.cart.push({
            kode: product.code,
            nama: product.name,
            harga_satuan: product.sellPrice,
            qty: 1,
            total_harga: product.sellPrice
        });
    }
    renderCart();
}

function updateCartQty(index, change) {
    const item = state.cart[index];
    const product = state.products.find(p => p.code === item.kode);
    
    let newQty = item.qty + change;
    if (newQty > 0 && newQty <= product.stock) {
        item.qty = newQty;
        item.total_harga = item.qty * item.harga_satuan;
    } else if (newQty > product.stock) {
         showToast('Peringatan', 'Jumlah melebihi stok yang ada!', true);
    }
    renderCart();
}

function removeFromCart(index) {
    state.cart.splice(index, 1);
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const emptyMsg = document.getElementById('empty-cart-msg');
    const totalDisplay = document.getElementById('cart-total-display');
    const btnCheckout = document.getElementById('btn-checkout');
    
    container.innerHTML = '';
    
    if (state.cart.length === 0) {
        emptyMsg.style.display = 'block';
        totalDisplay.textContent = 'Rp 0';
        btnCheckout.disabled = true;
        return;
    }
    
    emptyMsg.style.display = 'none';
    btnCheckout.disabled = false;
    
    let total = 0;
    
    state.cart.forEach((item, index) => {
        total += item.total_harga;
        const el = document.createElement('div');
        el.className = 'flex justify-between items-center bg-[#F5F6FA] rounded-2xl p-4 mb-3 transition-all hover:bg-blue-50';
        el.innerHTML = `
            <div class="flex-grow w-1/2 pr-2">
                <p class="font-bold text-sm text-gray-800 truncate">${item.nama}</p>
                <p class="text-xs text-[#5B65FF] font-medium">${formatRupiah(item.harga_satuan)}</p>
            </div>
            <div class="flex items-center space-x-2 bg-white rounded-xl p-1 shadow-sm mr-3">
                <button onclick="updateCartQty(${index}, -1)" class="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-bold transition-colors">-</button>
                <input type="number" onchange="setCartQty(${index}, this.value)" value="${item.qty}" class="w-10 text-sm font-bold text-center text-gray-800 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-[#5B65FF] rounded px-1 hide-arrows">
                <button onclick="updateCartQty(${index}, 1)" class="w-7 h-7 flex items-center justify-center bg-[#5B65FF] hover:bg-[#4A55FF] text-white rounded-lg font-bold transition-colors">+</button>
            </div>
            <div class="text-right flex flex-col items-end w-1/4">
                <p class="font-bold text-sm text-gray-800">${formatRupiah(item.total_harga)}</p>
                <button onclick="removeFromCart(${index})" class="text-xs text-red-500 mt-1 hover:text-red-700 font-medium transition-colors">Hapus</button>
            </div>
        `;
        container.appendChild(el);
    });
    
    totalDisplay.textContent = formatRupiah(total);
}

async function processCheckout() {
    if (state.cart.length === 0) return;
    
    const totalBelanja = state.cart.reduce((sum, item) => sum + item.total_harga, 0);
    
    showLoader();
    try {
        const res = await callAPI('processTransaction', {
            cart: state.cart,
            totalBelanja: totalBelanja
        });
        
        showToast('Sukses', `Transaksi berhasil! ID: ${res.transactionId}`);
        state.cart = [];
        renderCart();
        loadProducts(); // Refresh stock
        if(state.role === 'Admin') loadKas(); // Refresh Kas
    } catch (err) {
        showToast('Gagal', err.message, true);
    } finally {
        hideLoader();
    }
}

// === ADMIN (STOK) LOGIC ===
function renderAdminProducts(filterText = '') {
    const tbody = document.getElementById('admin-product-table');
    tbody.innerHTML = '';
    
    const filtered = state.products.filter(p => 
        p.name.toLowerCase().includes(filterText.toLowerCase()) || 
        p.code.toLowerCase().includes(filterText.toLowerCase())
    );

    filtered.forEach(p => {
        const tr = document.createElement('tr');
        const imgUrl = p.imageUrl || 'https://via.placeholder.com/50?text=No+Img';
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap"><img src="${imgUrl}" class="h-10 w-10 rounded-md object-cover"></td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${p.code}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${p.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm ${p.stock <= 5 ? 'text-red-500 font-bold' : ''}">${p.stock}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatRupiah(p.buyPrice)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatRupiah(p.sellPrice)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick='editProduct(${JSON.stringify(p)})' class="text-blue-600 hover:text-blue-900">Edit</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterAdminProducts() {
    const text = document.getElementById('admin-search').value;
    renderAdminProducts(text);
}

function openProductModal() {
    document.getElementById('product-form').reset();
    document.getElementById('prod-code').readOnly = false;
    document.getElementById('prod-image-url').value = '';
    document.getElementById('product-modal-title').textContent = 'Tambah Barang Baru';
    showModal('product-modal');
}

function editProduct(product) {
    document.getElementById('prod-code').value = product.code;
    document.getElementById('prod-code').readOnly = true; // Code as PK, disabled edit
    document.getElementById('prod-name').value = product.name;
    document.getElementById('prod-stock').value = product.stock;
    document.getElementById('prod-buy-price').value = formatRupiah(product.buyPrice).replace('Rp', '').trim();
    document.getElementById('prod-sell-price').value = formatRupiah(product.sellPrice).replace('Rp', '').trim();
    document.getElementById('prod-image-url').value = product.imageUrl || '';
    
    document.getElementById('product-modal-title').textContent = 'Edit Barang';
    showModal('product-modal');
}

async function saveProduct(e) {
    e.preventDefault();
    
    const code = document.getElementById('prod-code').value;
    const name = document.getElementById('prod-name').value;
    const stock = parseInt(document.getElementById('prod-stock').value, 10);
    const buyPrice = getRawNumber(document.getElementById('prod-buy-price').value);
    const sellPrice = getRawNumber(document.getElementById('prod-sell-price').value);
    const imageUrl = document.getElementById('prod-image-url').value;
    
    const fileInput = document.getElementById('prod-image');
    let imageBase64 = null;
    let imageFileName = null;
    
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        imageFileName = file.name;
        imageBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    const payload = { code, name, stock, buyPrice, sellPrice, imageUrl, imageBase64, imageFileName };
    
    showLoader();
    try {
        await callAPI('saveProduct', payload);
        showToast('Sukses', 'Data barang berhasil disimpan');
        closeModal('product-modal');
        loadProducts(); // Refresh list
    } catch (err) {
        showToast('Gagal', err.message, true);
    } finally {
        hideLoader();
    }
}

// === KAS LOGIC ===
function renderKas() {
    if (!state.kasData) return;
    
    document.getElementById('current-kas-display').textContent = formatRupiah(state.kasData.saldoTerakhir || 0);
    
    const tbody = document.getElementById('kas-history-table');
    tbody.innerHTML = '';
    
    if (state.kasData.mutasi && state.kasData.mutasi.length > 0) {
        state.kasData.mutasi.forEach(row => {
            const tr = document.createElement('tr');
            
            // Basic date format
            let dateStr = row.tanggal;
            try {
                const d = new Date(row.tanggal);
                if (!isNaN(d)) {
                    dateStr = d.toLocaleString('id-ID', {day: 'numeric', month: 'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
                }
            } catch(e){}

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm">${dateStr}</td>
                <td class="px-6 py-4 text-sm">${row.keterangan}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600">${formatRupiah(row.masuk)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600">${formatRupiah(row.keluar)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold">${formatRupiah(row.saldoAkhir)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row.user}</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
         tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-sm text-gray-500">Belum ada histori kas.</td></tr>';
    }
}

function openKasModal() {
    document.getElementById('kas-form').reset();
    let current = state.kasData ? (state.kasData.saldoTerakhir || 0) : 0;
    document.getElementById('kas-new-saldo').value = formatRupiah(current).replace('Rp', '').trim();
    showModal('kas-modal');
}

async function saveKas(e) {
    e.preventDefault();
    const newSaldo = getRawNumber(document.getElementById('kas-new-saldo').value);
    const notes = document.getElementById('kas-notes').value;
    
    showLoader();
    try {
        await callAPI('setKasManual', { newSaldo, notes });
        showToast('Sukses', 'Saldo kas berhasil disesuaikan');
        closeModal('kas-modal');
        loadKas();
    } catch (err) {
        showToast('Gagal', err.message, true);
    } finally {
        hideLoader();
    }
}
