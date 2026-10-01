// === STATE & CONFIG ===
const state = {
    token: localStorage.getItem('pos_token') || null,
    role: localStorage.getItem('pos_role') || null,
    apiUrl: localStorage.getItem('pos_api_url') || '',
    products: [],
    posCurrentPage: 1,
    posItemsPerPage: 20,
    sessions: {}, // Format: { "Plat Nomer": [{kode, nama, qty, ...}] }
    activeSession: null,
    penjualan: [],
    availablePenjualanSheets: [],
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
    loadSessions();
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
    if (viewId === 'penjualan-view') {
        document.getElementById('nav-penjualan').classList.add('bg-white/20');
        document.getElementById('nav-penjualan').classList.remove('hover:bg-white/10');
        document.getElementById('nav-penjualan-mobile').classList.add('text-[#5B65FF]', 'bg-blue-50');
        document.getElementById('nav-penjualan-mobile').classList.remove('text-gray-400');
        const textSpan = document.getElementById('nav-penjualan-mobile').querySelector('.nav-text');
        if(textSpan) textSpan.classList.remove('hidden');
        
        if (!state.availablePenjualanSheets) {
            loadPenjualanSheets();
        }
        loadPenjualan();
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
async function loadSessions() {
    try {
        const res = await callAPI('getSessions');
        state.sessions = res.data || {};
        renderSessionDropdown();
        
        const sessionNames = Object.keys(state.sessions);
        if (sessionNames.length > 0 && !state.activeSession) {
            switchSession(sessionNames[0]);
        }
    } catch (err) {
        console.error("Gagal memuat sesi aktif", err);
    }
}



async function loadPenjualanSheets() {
    if (state.role !== 'Admin') return;
    try {
        const res = await callAPI('getPenjualanSheets');
        state.availablePenjualanSheets = res.data || [];
        
        const select = document.getElementById('penjualan-month');
        if (!select) return;
        select.innerHTML = '';
        state.availablePenjualanSheets.forEach(sheet => {
            const opt = document.createElement('option');
            opt.value = sheet;
            let label = sheet;
            if (sheet === "Penjualan") label = "Bulan Ini";
            else label = sheet.replace('Penjualan_', '').replace(/_/g, ' ');
            opt.textContent = label;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error("Gagal memuat list sheet penjualan", err);
    }
}

async function loadPenjualan(sheetName = "Penjualan") {
    if (state.role !== 'Admin') return;
    showLoader();
    try {
        const res = await callAPI('getPenjualan', { sheetName });
        state.penjualan = res.data || [];
        renderPenjualan();
    } catch (err) {
        console.error("Gagal memuat data penjualan", err);
    } finally {
        hideLoader();
    }
}

// === POS SESSIONS & CART LOGIC ===

function renderSessionDropdown() {
    const select = document.getElementById('session-select');
    select.innerHTML = '<option value="">Pilih atau Buat Sesi Baru...</option>';
    
    Object.keys(state.sessions).forEach(sesi => {
        const opt = document.createElement('option');
        opt.value = sesi;
        opt.textContent = sesi;
        if (sesi === state.activeSession) opt.selected = true;
        select.appendChild(opt);
    });
}

function createNewSession() {
    const platNo = prompt("Masukkan Sesi / Nomer Plat Kendaraan:");
    if (!platNo || platNo.trim() === "") return;
    
    const sesiName = platNo.trim().toUpperCase();
    if (!state.sessions[sesiName]) {
        state.sessions[sesiName] = [];
        renderSessionDropdown();
    }
    switchSession(sesiName);
}

function switchSession(sesiName) {
    state.activeSession = sesiName;
    document.getElementById('session-select').value = sesiName;
    renderCart();
}

async function syncActiveSession() {
    if (!state.activeSession) return;
    
    const payload = {
        sesi: state.activeSession,
        cart: state.sessions[state.activeSession]
    };
    
    try {
        // Background sync, no loader needed to not block UI
        await callAPI('syncSession', payload);
    } catch (err) {
        console.error("Gagal sinkronisasi sesi ke database", err);
        showToast('Error', 'Gagal menyimpan draf sesi ke server', true);
    }
}

function renderPOSProducts(filterText = '') {
    const container = document.getElementById('pos-product-list');
    container.innerHTML = '';
    
    const filtered = state.products.filter(p => 
        p.name.toLowerCase().includes(filterText.toLowerCase()) || 
        p.code.toLowerCase().includes(filterText.toLowerCase())
    );

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / state.posItemsPerPage) || 1;
    
    // Pastikan current page tidak melebihi total pages (akibat filter)
    if (state.posCurrentPage > totalPages) {
        state.posCurrentPage = 1;
    }

    const startIdx = (state.posCurrentPage - 1) * state.posItemsPerPage;
    const paginated = filtered.slice(startIdx, startIdx + state.posItemsPerPage);

    paginated.forEach(p => {
        const card = document.createElement('div');
        card.className = `p-4 cursor-pointer hover:shadow-xl transition-all transform hover:-translate-y-1 bg-[#F5F6FA] flex flex-col rounded-2xl ${p.stock <= 0 ? 'opacity-50 grayscale' : ''}`;
        card.onclick = () => p.stock > 0 ? addToCart(p) : showToast('Stok Habis', `${p.name} tidak tersedia`, true);
        
        const imgUrl = p.imageUrl || 'https://via.placeholder.com/150?text=No+Image';
        
        card.innerHTML = `
            <img src="${imgUrl}" alt="${p.name}" class="w-full h-32 object-cover rounded-xl mb-3 shadow-sm">
            <h3 class="font-bold text-sm text-gray-800 leading-tight mb-1">${p.name}</h3>
            <p class="text-xs text-gray-500 mb-1">${p.code} &bull; Stok: <span class="font-bold ${p.stock <= 5 ? 'text-red-500' : ''}">${p.stock}</span></p>
            <p class="text-[#5B65FF] font-extrabold mt-auto pt-2 text-lg">${formatRupiah(p.sellPrice)}</p>
        `;
        container.appendChild(card);
    });
    
    renderPOSPagination(totalPages);
}

function renderPOSPagination(totalPages) {
    const paginationContainer = document.getElementById('pos-pagination');
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');
    const pageInfo = document.getElementById('pos-page-info');
    
    // Jika barang kurang dari batas per halaman, sembunyikan navigasi
    if (totalPages <= 1) {
        paginationContainer.classList.add('hidden');
        return;
    }
    
    paginationContainer.classList.remove('hidden');
    pageInfo.textContent = `Hal ${state.posCurrentPage} / ${totalPages}`;
    
    btnPrev.disabled = state.posCurrentPage === 1;
    btnNext.disabled = state.posCurrentPage === totalPages;
    
    btnPrev.onclick = () => {
        if (state.posCurrentPage > 1) {
            state.posCurrentPage--;
            renderPOSProducts(document.getElementById('pos-search').value);
        }
    };
    
    btnNext.onclick = () => {
        if (state.posCurrentPage < totalPages) {
            state.posCurrentPage++;
            renderPOSProducts(document.getElementById('pos-search').value);
        }
    };
}

function filterPOSProducts() {
    state.posCurrentPage = 1; // Reset halaman ke 1 setiap kali mencari
    const text = document.getElementById('pos-search').value;
    renderPOSProducts(text);
}
function addToCart(product) {
    if (!state.activeSession) {
        showToast('Peringatan', 'Silakan pilih atau buat Sesi/Plat Nomer terlebih dahulu!', true);
        return;
    }

    const activeCart = state.sessions[state.activeSession];
    const existing = activeCart.find(item => item.kode === product.code);
    
    if (existing) {
        if (existing.qty < product.stock) {
            existing.qty += 1;
            existing.total_harga = existing.qty * existing.harga_satuan;
            showToast('Ditambahkan', `${product.name} ditambah jumlahnya di Sesi ${state.activeSession}`);
        } else {
            showToast('Peringatan', 'Jumlah melebihi stok yang ada!', true);
            return;
        }
    } else {
        activeCart.push({
            kode: product.code,
            nama: product.name,
            harga_satuan: product.sellPrice,
            qty: 1,
            total_harga: product.sellPrice
        });
        showToast('Sukses', `${product.name} dimasukkan ke Sesi ${state.activeSession}`);
    }
    
    renderCart();
    syncActiveSession();
}

function setCartQty(index, value) {
    if (!state.activeSession) return;
    const activeCart = state.sessions[state.activeSession];
    const item = activeCart[index];
    const product = state.products.find(p => p.code === item.kode);
    
    let newQty = parseInt(value, 10) || 1;
    if (newQty <= 0) newQty = 1;
    
    if (newQty <= product.stock) {
        item.qty = newQty;
        item.total_harga = item.qty * item.harga_satuan;
    } else {
        item.qty = product.stock;
        item.total_harga = item.qty * item.harga_satuan;
        showToast('Peringatan', `Stok maksimal hanya ${product.stock}!`, true);
    }
    renderCart();
    syncActiveSession();
}

function updateCartQty(index, change) {
    if (!state.activeSession) return;
    const activeCart = state.sessions[state.activeSession];
    const item = activeCart[index];
    const product = state.products.find(p => p.code === item.kode);
    
    let newQty = item.qty + change;
    if (newQty > 0 && newQty <= product.stock) {
        item.qty = newQty;
        item.total_harga = item.qty * item.harga_satuan;
    } else if (newQty > product.stock) {
         showToast('Peringatan', 'Jumlah melebihi stok yang ada!', true);
         return;
    }
    renderCart();
    syncActiveSession();
}

function removeFromCart(index) {
    if (!state.activeSession) return;
    state.sessions[state.activeSession].splice(index, 1);
    renderCart();
    syncActiveSession();
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const emptyMsg = document.getElementById('empty-cart-msg');
    const totalDisplay = document.getElementById('cart-total-display');
    const btnCheckout = document.getElementById('btn-checkout');
    
    container.innerHTML = '';
    
    if (!state.activeSession || !state.sessions[state.activeSession] || state.sessions[state.activeSession].length === 0) {
        emptyMsg.style.display = 'block';
        totalDisplay.textContent = 'Rp 0';
        btnCheckout.disabled = true;
        return;
    }
    
    const activeCart = state.sessions[state.activeSession];
    emptyMsg.style.display = 'none';
    btnCheckout.disabled = false;
    
    let total = 0;
    
    activeCart.forEach((item, index) => {
        total += item.total_harga;
        const el = document.createElement('div');
        el.className = 'flex flex-col bg-[#F5F6FA] rounded-2xl p-4 mb-3 transition-all hover:bg-blue-50 border border-transparent hover:border-blue-100';
        el.innerHTML = `
            <!-- Baris Atas: Nama & Tombol Hapus -->
            <div class="flex justify-between items-start mb-2">
                <p class="font-bold text-sm text-gray-800 leading-tight pr-3">${item.nama}</p>
                <button onclick="removeFromCart(${index})" class="text-gray-400 hover:text-red-500 transition-colors p-1 bg-white rounded-full shadow-sm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
            
            <!-- Baris Bawah: Harga Satuan, Qty, Total -->
            <div class="flex justify-between items-end">
                <div class="flex flex-col">
                    <span class="text-xs text-gray-500 mb-1">${formatRupiah(item.harga_satuan)} / item</span>
                    <div class="flex items-center space-x-1 bg-white rounded-xl p-1 shadow-sm w-max border border-gray-100">
                        <button onclick="updateCartQty(${index}, -1)" class="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-200 text-gray-600 rounded-lg font-bold transition-colors">-</button>
                        <input type="number" onchange="setCartQty(${index}, this.value)" value="${item.qty}" class="w-10 text-sm font-bold text-center text-gray-800 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-[#5B65FF] rounded px-1 hide-arrows">
                        <button onclick="updateCartQty(${index}, 1)" class="w-8 h-8 flex items-center justify-center bg-gradient-to-r from-[#5B65FF] to-[#9146FF] text-white rounded-lg font-bold transition-colors shadow-sm">+</button>
                    </div>
                </div>
                <div class="text-right">
                    <span class="block text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">Subtotal</span>
                    <p class="font-extrabold text-base text-gray-800">${formatRupiah(item.total_harga)}</p>
                </div>
            </div>
        `;
        container.appendChild(el);
    });
    
    totalDisplay.textContent = formatRupiah(total);
}

async function processCheckout() {
    if (!state.activeSession) return;
    const activeCart = state.sessions[state.activeSession];
    if (!activeCart || activeCart.length === 0) return;
    
    const totalBelanja = activeCart.reduce((sum, item) => sum + item.total_harga, 0);
    
    showLoader();
    try {
        const res = await callAPI('processTransaction', {
            sesi: state.activeSession,
            totalBelanja: totalBelanja
        });
        
        showToast('Sukses', `Transaksi Sesi ${state.activeSession} berhasil! ID: ${res.transactionId}`);
        
        // Bersihkan sesi aktif setelah checkout
        delete state.sessions[state.activeSession];
        state.activeSession = null;
        
        renderSessionDropdown();
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

// === PENJUALAN LOGIC ===
function renderPenjualan() {
    const tbody = document.getElementById('penjualan-table');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const filterText = document.getElementById('penjualan-search') ? document.getElementById('penjualan-search').value.toLowerCase() : '';
    const filterDate = document.getElementById('penjualan-date') ? document.getElementById('penjualan-date').value : ''; // Format YYYY-MM-DD
    
    const filtered = state.penjualan.filter(row => {
        const matchText = row.id.toLowerCase().includes(filterText) || 
                          row.nama.toLowerCase().includes(filterText) ||
                          row.user.toLowerCase().includes(filterText);
        
        let matchDate = true;
        if (filterDate) {
            try {
                const tStr = String(row.tanggal);
                
                // If it's a standard ISO string (has T and Z), strictly use Date parsing 
                // to ensure correct local timezone shifting (e.g. UTC to WIB).
                if (tStr.includes('T') && tStr.includes('Z')) {
                    const d = new Date(tStr);
                    if (!isNaN(d)) {
                        const yy = d.getFullYear();
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        const rowDateStr = `${yy}-${mm}-${dd}`;
                        matchDate = (rowDateStr === filterDate);
                    } else {
                        matchDate = false;
                    }
                } else {
                    const [fYear, fMonth, fDay] = filterDate.split('-');
                    const fMonthNoPad = parseInt(fMonth, 10).toString();
                    const fDayNoPad = parseInt(fDay, 10).toString();
                    
                    const possibleFormats = [
                        filterDate,
                        `${fDay}/${fMonth}/${fYear}`,
                        `${fDayNoPad}/${fMonthNoPad}/${fYear}`,
                        `${fDay}-${fMonth}-${fYear}`,
                        `${fDayNoPad}-${fMonthNoPad}-${fYear}`,
                        `${fMonth}/${fDay}/${fYear}`,
                        `${fMonthNoPad}/${fDayNoPad}/${fYear}`
                    ];
                    
                    if (possibleFormats.some(fmt => tStr.startsWith(fmt) || tStr.includes(fmt + ' ') || tStr === fmt)) {
                        matchDate = true;
                    } else {
                        const d = new Date(tStr);
                        if (!isNaN(d)) {
                            const yy = d.getFullYear();
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const dd = String(d.getDate()).padStart(2, '0');
                            const rowDateStr = `${yy}-${mm}-${dd}`;
                            matchDate = (rowDateStr === filterDate);
                        } else {
                            matchDate = false;
                        }
                    }
                }
            } catch(e){}
        }
        
        return matchText && matchDate;
    });

    if (filtered.length > 0) {
        filtered.forEach(row => {
            const tr = document.createElement('tr');
            
            let dateStr = row.tanggal;
            try {
                const tStr = String(row.tanggal);
                // Only attempt Date parsing if it's an ISO string or a known standard format, 
                // otherwise just use the raw string from the sheet to avoid Month/Day swaps
                if (tStr.includes('T') && tStr.includes('Z')) {
                    const d = new Date(tStr);
                    if (!isNaN(d)) {
                        dateStr = d.toLocaleString('id-ID', {day: 'numeric', month: 'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
                    }
                } else if (tStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                    const d = new Date(tStr);
                    if (!isNaN(d)) {
                        dateStr = d.toLocaleString('id-ID', {day: 'numeric', month: 'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
                    }
                }
            } catch(e){}

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${dateStr}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">${row.id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row.user}</td>
                <td class="px-6 py-4 text-sm text-gray-800">${row.kode} - ${row.nama}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-800">${row.qty}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-extrabold text-[#5B65FF]">${formatRupiah(row.total)}</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
         tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-sm text-gray-500">Belum ada data penjualan yang cocok.</td></tr>';
    }
}

function filterPenjualan() {
    renderPenjualan();
}
