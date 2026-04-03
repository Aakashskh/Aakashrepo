// Theme Initialization
const savedTheme = localStorage.getItem('cverso-theme') || 'light';
if(savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

window.toggleTheme = function() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('cverso-theme', next);
  
  document.querySelectorAll('.theme-toggle i, .nav-icon i, .sidebar-link i.fa-moon, .sidebar-link i.fa-sun').forEach(icon => {
    if (icon.classList.contains('fa-moon') || icon.classList.contains('fa-sun')) {
      icon.className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
  });
};

const STORAGE_KEY = 'clipit-auth';

// DOM Elements
const landingPage = document.getElementById('landing-page');
const dashboard = document.getElementById('dashboard');

// Auth DOM
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const formLogin = document.getElementById('form-login');
const formSignup = document.getElementById('form-signup');
const authPage = document.getElementById('auth-page');
const authStep1 = document.getElementById('auth-step-1');
const authStep2 = document.getElementById('auth-step-2');
const authBackBtn = document.getElementById('auth-back-btn');
const roleNextBtn = document.getElementById('role-next-btn');
const roleHeading = document.getElementById('role-heading');
// Legacy compat
const loginMsg = document.getElementById('login-msg');
const signupMsg = document.getElementById('signup-msg');
const authOverlay = null; // replaced by auth-page

// Dashboard DOM
const sidebar = document.getElementById('sidebar');
const hamburgerBtn = document.getElementById('hamburger-btn');
const topbarName = document.getElementById('topbar-name');
const searchCreators = document.getElementById('search-creators');
const universityFilter = document.getElementById('university-filter');
const creatorGrid = document.getElementById('creator-grid');
const resultsSummary = document.getElementById('results-summary');

const csearchCreators = document.getElementById('csearch-creators');
const cuniversityFilter = document.getElementById('cuniversity-filter');
const ccreatorGrid = document.getElementById('ccreator-grid');
const cresultsSummary = document.getElementById('cresults-summary');

// View Toggles
const navMarketplace = document.getElementById('nav-marketplace');
const navUpload = document.getElementById('nav-upload');
const viewMarketplace = document.getElementById('view-marketplace');
const viewUpload = document.getElementById('view-upload');

// Chat DOM
const chatWidget = document.getElementById('chat-widget');
const chatToggle = document.getElementById('chat-toggle');
const chatWindow = document.getElementById('chat-window');
const chatClose = document.getElementById('chat-close');
const chatMessages = document.getElementById('chat-messages');
const chatSend = document.getElementById('chat-send');
const chatText = document.getElementById('chat-text');

let currentUser = null;
let creatorsList = [];
let searchTimeout = null;

// Initialization
function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      showDashboard();
    } catch {
      showLanding();
    }
  } else {
    showLanding();
  }
  setupEventListeners();
  initCategoryFilters();
  // initUnicornAnimations(); // Disabling futuristic animations for red-white theme
}

// State toggles
function showLanding() {
  landingPage.classList.remove('hidden');
  authPage?.classList.add('hidden');
  dashboard.classList.add('hidden');
  chatWidget.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function showDashboard() {
  landingPage.classList.add('hidden');
  authPage?.classList.add('hidden');
  dashboard.classList.remove('hidden');
  chatWidget.classList.remove('hidden');
  document.body.classList.remove('modal-open');

  const buyerDash = document.getElementById('buyer-dashboard');
  const creatorDash = document.getElementById('creator-dashboard');

  if (currentUser?.role === 'creator') {
    // Show CREATOR dashboard
    buyerDash.classList.add('hidden');
    creatorDash.classList.remove('hidden');
    const el = document.getElementById('creator-topbar-name');
    const av = document.getElementById('creator-topbar-avatar');
    if (el) el.textContent = currentUser.name.split(' ')[0];
    if (av) av.src = currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=ff0033&color=fff`;
    // Restore saved profile photo if any
    setTimeout(() => window.restoreCreatorAvatar?.(), 100);
  } else {
    // Show BUYER dashboard
    buyerDash.classList.remove('hidden');
    creatorDash.classList.add('hidden');
    const el = document.getElementById('topbar-name');
    const av = document.getElementById('topbar-avatar');
    if (el) el.textContent = `Welcome, ${currentUser?.name?.split(' ')[0] || ''}`;
    if (av) av.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=2563eb&color=fff`;
    
    // Fiverr specific welcome text
    const homeWelcome = document.getElementById('fiverr-welcome-text');
    if (homeWelcome && currentUser) {
      homeWelcome.textContent = `Welcome to Cverso, ${currentUser.name.split(' ')[0]}`;
    }
    
    // Redirect to home
    setTimeout(() => {
      if (window.buyerNav) window.buyerNav('bnav-home');
    }, 50);
  }
  
  // Always fetch creators so the directory is populated
  fetchCreators();
}

function handleLogout() {
  localStorage.removeItem(STORAGE_KEY);
  currentUser = null;
  showLanding();
}

function escapeHtml(value) {
  if (!value) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);
  
  try {
    const response = await fetch(endpoint, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Server error');
    return data;
  } catch (err) {
    throw err;
  }
}

// Notification System (Toast)
const toastContainer = document.getElementById('toast-container');
function showToast(message, type = 'success') {
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
  toast.innerHTML = `<i class="fas ${icon}"></i> <span>${escapeHtml(message)}</span>`;
  
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Authentication
async function login(e) {
  e.preventDefault();
  const formData = new FormData(formLogin);
  const data = Object.fromEntries(formData.entries());
  try {
    const res = await apiRequest('/api/login', 'POST', data);
    currentUser = res.user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(res.user));
    showDashboard();
    formLogin.reset();
    showToast(`Welcome back, ${currentUser.name}!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

let pendingSignupData = null; // Hold data between Step 1 and Step 2

async function signup(e) {
  e.preventDefault();
  const formData = new FormData(formSignup);
  const data = Object.fromEntries(formData.entries());

  // Store data and advance to Step 2 (role selection)
  pendingSignupData = data;
  if (roleHeading) {
    roleHeading.textContent = `${data.name.split(' ')[0]}, what brings you to Cverso?`;
  }
  // Reset role selection
  document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
  if (roleNextBtn) roleNextBtn.disabled = true;

  // Show Step 2
  authStep1?.classList.add('hidden');
  authStep2?.classList.remove('hidden');
}

async function finalizeSignup(role) {
  if (!pendingSignupData) return;
  const data = { ...pendingSignupData, role };
  try {
    await apiRequest('/api/signup', 'POST', data);
    const res = await apiRequest('/api/login', 'POST', { email: data.email, password: data.password });
    currentUser = res.user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(res.user));
    pendingSignupData = null;
    showDashboard();
    formSignup.reset();
    showToast('Account created! Welcome to Cverso 🎬', 'success');
  } catch (err) {
    // Go back to step 1 with error
    authStep2?.classList.add('hidden');
    authStep1?.classList.remove('hidden');
    showToast(err.message, 'error');
  }
}

// Creators API
async function fetchCreators() {
  const query = (searchCreators?.value || csearchCreators?.value || '').trim();
  const uni = universityFilter?.value || cuniversityFilter?.value || '';
  if (resultsSummary) resultsSummary.textContent = "Loading creators...";
  if (cresultsSummary) cresultsSummary.textContent = "Loading creators...";
  
  const params = new URLSearchParams();
  if (query) params.set('search', query);
  if (uni) params.set('university', uni);

  try {
    const res = await apiRequest(`/api/creators?${params.toString()}`);
    creatorsList = res;
    renderCreators();
  } catch (err) {
    console.error(err);
    if (resultsSummary) resultsSummary.textContent = "Failed to load creators.";
    if (cresultsSummary) cresultsSummary.textContent = "Failed to load creators.";
  }
}

function renderStars(rating = 0) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  return `${'\u2605'.repeat(safeRating)}${'\u2606'.repeat(5 - safeRating)}`;
}

function renderCreators() {
  const count = creatorsList.length;
  if(resultsSummary) resultsSummary.textContent = count === 0 ? '' : `${count} Editors found`;
  if(cresultsSummary) cresultsSummary.textContent = count === 0 ? '' : `${count} Editors found`;

  let emptyHtml = '';
  if (count === 0) {
    emptyHtml = `<div class="marketplace-empty">
           <i class="fas fa-search"></i>
           <h3>No editors found</h3>
           <p>Try adjusting your search or university filter.</p>
         </div>`;
  }

  const cardsHtml = count === 0 ? emptyHtml : creatorsList.map((creator, index) => {
    const avatarSrc = creator.avatar && creator.avatar.length > 10
      ? escapeHtml(creator.avatar)
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name)}&background=FF0033&color=fff&size=200`;
    
    return `
    <article class="creator-card" data-id="${creator.id}">
      <div class="creator-header">
        <div class="creator-avatar-wrap">
          <img src="${avatarSrc}" alt="${escapeHtml(creator.name)}" />
        </div>
      </div>
      
      <div class="creator-info">
        <h3 class="creator-name">${escapeHtml(creator.name)}</h3>
        <p class="creator-specialty">${escapeHtml(creator.specialty || 'Video Editor')}</p>
        
        <div class="creator-rating">
          ${renderStars(creator.rating)}
          <span>${creator.rating}.0</span>
        </div>

        <button class="btn btn-full view-profile-btn" data-id="${creator.id}">
          View Profile
        </button>
      </div>
    </article>`;
  }).join('');

  if(creatorGrid) {
    creatorGrid.className = 'creator-grid';
    creatorGrid.innerHTML = cardsHtml;
  }
  if(ccreatorGrid) {
    ccreatorGrid.className = 'creator-grid';
    ccreatorGrid.innerHTML = cardsHtml;
  }

  document.querySelectorAll('.view-profile-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const c = creatorsList.find(x => x.id == btn.dataset.id);
      if (c) showCreatorProfile(c);
    });
  });
}

// Modals
function openModal(contentHtml) {
  const modalObj = document.createElement('div');
  modalObj.className = 'modal-overlay';
  modalObj.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" id="mc-close"><i class="fas fa-times"></i></button>
      ${contentHtml}
    </div>
  `;
  document.body.appendChild(modalObj);
  document.body.classList.add('modal-open');
  
  const closeFn = () => {
    modalObj.remove();
    document.body.classList.remove('modal-open');
  };
  
  modalObj.querySelector('#mc-close').addEventListener('click', closeFn);
  modalObj.addEventListener('click', (e) => {
    if (e.target === modalObj) closeFn();
  });
  
  return { modalEl: modalObj, closeFn };
}

function showCreatorProfile(c) {
  const demoImgs = [
    'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&h=533&fit=crop',
    'https://images.unsplash.com/photo-1616469829581-73993eb86b02?w=300&h=533&fit=crop',
    'https://images.unsplash.com/photo-1621619856624-42fd193a0661?w=300&h=533&fit=crop'
  ];

  const modal = openModal(`
    <div class="profile-banner">
      <img src="https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=800&h=200&fit=crop" class="bg" />
    </div>
    <div class="profile-header">
      <img src="${escapeHtml(c.avatar)}" alt="${escapeHtml(c.name)}"/>
      <div class="profile-info">
        <h2>${escapeHtml(c.name)} <span style="color:#22c55e" title="Verified Creator"><i class="fas fa-check-circle" style="font-size:1.2rem;"></i></span></h2>
        <p style="color:var(--text-secondary)">${escapeHtml(c.specialty)} • ${escapeHtml(c.university || 'Independent')}</p>
        <p class="rating">${renderStars(c.rating)} (${c.rating}.0)</p>
      </div>
      <div style="flex:1"></div>
      <button class="btn open-payment" style="font-size:1.1rem; padding: 12px 30px;">
        Pay &amp; Order
      </button>
    </div>
    <div class="profile-body">
      <h3 style="margin-bottom: 10px; font-size:1.4rem;">About</h3>
      <p style="color:var(--text-secondary); line-height:1.6; margin-bottom: 30px;">${escapeHtml(c.bio)}</p>
      
      <h3 style="margin-bottom: 15px; font-size:1.4rem;">Portfolio Demos</h3>
      <div class="portfolio-grid">
        ${window.renderPortfolioItems(c.portfolio)}
      </div>

      <div class="doc-upload-area">
        <i class="fas fa-file-upload"></i>
        <h3>Have a specific footage requirement?</h3>
        <p style="color:var(--text-secondary); margin-top:5px;">Upload a PDF proposal, ZIP footage, or contract before ordering.</p>
        <div class="upload-btn-wrapper" style="margin-top:15px;">
          <button class="btn-outline">Browse Files</button>
          <input type="file" name="myfile" accept=".pdf,.zip,.mp4" />
        </div>
      </div>
    </div>
  `);

  modal.modalEl.querySelector('.open-payment').addEventListener('click', () => {
    modal.closeFn();
    showPaymentModal(c);
  });
}

function showPaymentModal(c) {
  const modal = openModal(`
    <div style="padding: 20px;">
      <h2 style="margin-bottom: 15px;"><i class="fas fa-lock" style="color: #22c55e"></i> Secure Checkout</h2>
      <div class="glass-panel" style="padding: 15px; margin-bottom: 20px;">
        <p><strong>Service:</strong> ${escapeHtml(c.specialty)}</p>
        <p><strong>Creator:</strong> ${escapeHtml(c.name)}</p>
        <p><strong>Rate:</strong> $${c.price}/hr</p>
      </div>
      <form id="payment-form" style="display:flex; flex-direction:column; gap: 15px;">
        <input type="text" class="input-field" placeholder="Notes for the editor (Optional)" />
        <div style="display:flex; gap: 15px;">
          <input type="number" id="pay-qty" class="input-field" value="1" min="1" max="50" style="flex:1" placeholder="Hours" />
          <div class="input-field" style="flex:2; display:flex; align-items:center; justify-content:space-between;">
            <span style="color:var(--text-secondary)">Total:</span>
            <strong style="font-size:1.2rem; color:var(--accent-purple)" id="pay-total">$${c.price}</strong>
          </div>
        </div>
        <div style="margin-top: 10px">
          <h4 style="margin-bottom:10px; color:var(--text-secondary);">Payment Method</h4>
          <input type="text" class="input-field" placeholder="Card Number (mock)" style="margin-bottom:10px;" required />
          <div style="display:flex; gap: 10px; margin-bottom: 10px;">
            <input type="text" class="input-field" placeholder="MM/YY" required />
            <input type="text" class="input-field" placeholder="CVV" required />
          </div>
          <p style="text-align: center; margin: 5px 0 15px; color: var(--text-secondary);">OR</p>
          <input type="text" class="input-field" placeholder="UPI ID (e.g. user@okhdfc)" />
        </div>
        <button type="submit" class="btn" style="font-size:1.1rem; padding: 15px;">Pay Now</button>
      </form>
    </div>
  `);

  const qtyInput = modal.modalEl.querySelector('#pay-qty');
  const totalDisplay = modal.modalEl.querySelector('#pay-total');
  
  qtyInput.addEventListener('input', () => {
    const val = parseInt(qtyInput.value) || 0;
    totalDisplay.textContent = '$' + (val * c.price);
  });

  modal.modalEl.querySelector('#payment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    modal.modalEl.querySelector('.btn').textContent = "Processing...";
    modal.modalEl.querySelector('.btn').disabled = true;
    setTimeout(() => {
      modal.closeFn();
      showToast(`Payment to ${c.name} successful! Order created in your Request history.`, 'success');
    }, 1500);
  });
}

// Chat system
function pushChatMessage(text, type) {
  const msg = document.createElement('div');
  msg.className = `message ${type}`;
  msg.textContent = text;
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function submitChat() {
  const val = chatText.value.trim();
  if(!val) return;
  pushChatMessage(val, 'msg-sent');
  chatText.value = '';
  
  // Call /api/chat simulator
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: val })
  })
  .then(res => res.json())
  .then(data => {
    if (data.reply) {
      pushChatMessage(data.reply, 'msg-received');
    }
  })
  .catch(err => {
    pushChatMessage("Sorry, I'm offline right now.", 'msg-received');
  });
}


// Listeners
function setupEventListeners() {
  // Open full-page auth
  function openAuthPage(tab = 'login') {
    landingPage.classList.add('hidden');
    authPage?.classList.remove('hidden');
    // Reset to step 1
    authStep1?.classList.remove('hidden');
    authStep2?.classList.add('hidden');
    if (tab === 'signup') {
      tabSignup?.click();
    } else {
      tabLogin?.click();
    }
  }

  document.getElementById('open-login')?.addEventListener('click', () => openAuthPage('login'));
  document.getElementById('open-signup')?.addEventListener('click', () => openAuthPage('signup'));
  document.getElementById('open-signup-bottom')?.addEventListener('click', () => openAuthPage('signup'));
  document.getElementById('features-join-btn')?.addEventListener('click', () => openAuthPage('signup'));

  // Back button on auth page
  authBackBtn?.addEventListener('click', () => {
    if (!authStep2?.classList.contains('hidden')) {
      // Go back from Step 2 to Step 1
      authStep2.classList.add('hidden');
      authStep1.classList.remove('hidden');
    } else {
      showLanding();
    }
  });

  // Logo on auth page goes back to landing
  document.getElementById('auth-nav-logo')?.addEventListener('click', (e) => { e.preventDefault(); showLanding(); });

  // Hero tags / search
  document.querySelectorAll('.hero-tag').forEach(tag => tag.addEventListener('click', () => openAuthPage('signup')));
  document.getElementById('hero-search-btn')?.addEventListener('click', () => {
    const val = document.getElementById('hero-search-input')?.value;
    if (val) localStorage.setItem('clipit_pending_search', val);
    openAuthPage('signup');
  });

  // Auth tabs
  tabLogin?.addEventListener('click', () => {
    tabLogin.classList.add('active'); tabSignup.classList.remove('active');
    formLogin.classList.remove('hidden'); formSignup.classList.add('hidden');
  });
  tabSignup?.addEventListener('click', () => {
    tabSignup.classList.add('active'); tabLogin.classList.remove('active');
    formSignup.classList.remove('hidden'); formLogin.classList.add('hidden');
  });

  document.getElementById('switch-to-signup')?.addEventListener('click', (e) => { e.preventDefault(); tabSignup.click(); });
  document.getElementById('switch-to-login')?.addEventListener('click', (e) => { e.preventDefault(); tabLogin.click(); });

  formLogin?.addEventListener('submit', login);
  formSignup?.addEventListener('submit', signup);

  // Role card selection (Step 2)
  document.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      if (roleNextBtn) roleNextBtn.disabled = false;
    });
  });

  roleNextBtn?.addEventListener('click', async () => {
    const selected = document.querySelector('.role-card.selected');
    if (!selected) return;
    const role = selected.dataset.role;
    roleNextBtn.disabled = true;
    roleNextBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    await finalizeSignup(role);
    roleNextBtn.innerHTML = 'Next <i class="fas fa-arrow-right"></i>';
    roleNextBtn.disabled = false;
  });

  // Dashboard controls
  hamburgerBtn?.addEventListener('click', () => sidebar?.classList.toggle('collapsed'));
  document.getElementById('creator-hamburger-btn')?.addEventListener('click', () => {
    document.getElementById('creator-sidebar')?.classList.toggle('collapsed');
  });
  document.querySelectorAll('.logout-btn').forEach(b => b.addEventListener('click', handleLogout));

  // ---- BUYER NAV SYSTEM ----
  const buyerNavMap = {
    'bnav-home':        'view-home',
    'bnav-marketplace': 'view-marketplace',
    'bnav-requests':    'view-requests',
    'bnav-history':     'view-history',
    'bnav-upload':      'view-upload',
    'bnav-profile':     'view-profile',
    'bnav-settings':    'view-settings',
  };

  window.buyerNav = function(navId) {
    Object.keys(buyerNavMap).forEach(id => document.getElementById(id)?.classList.remove('active'));
    document.getElementById(navId)?.classList.add('active');
    Object.values(buyerNavMap).forEach(vid => document.getElementById(vid)?.classList.add('hidden'));
    document.getElementById(buyerNavMap[navId])?.classList.remove('hidden');
    if (navId === 'bnav-profile' && currentUser) {
      const nameEl = document.getElementById('profile-edit-name');
      const emailEl = document.getElementById('profile-edit-email');
      const avatarEl = document.getElementById('profile-edit-avatar');
      const pfName = document.getElementById('pf-name');
      if (nameEl) nameEl.textContent = currentUser.name;
      if (emailEl) emailEl.textContent = currentUser.email || '';
      if (avatarEl) avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=ff0033&color=fff&size=80`;
      if (pfName) pfName.value = currentUser.name;
    }
  };

  Object.keys(buyerNavMap).forEach(id => {
    document.getElementById(id)?.addEventListener('click', (e) => {
      e.preventDefault();
      buyerNav(id);
    });
  });

  // Request form logic
  function openRequestForm() {
    document.getElementById('requests-empty')?.classList.add('hidden');
    document.getElementById('request-form')?.classList.remove('hidden');
  }
  document.getElementById('new-request-btn')?.addEventListener('click', openRequestForm);
  document.getElementById('new-request-btn-2')?.addEventListener('click', openRequestForm);
  document.getElementById('req-cancel-btn')?.addEventListener('click', () => {
    document.getElementById('request-form')?.classList.add('hidden');
    const list = document.getElementById('requests-list');
    if (list && list.children.length > 0) {
      list.classList.remove('hidden');
    } else {
      document.getElementById('requests-empty')?.classList.remove('hidden');
    }
  });
  document.getElementById('req-post-btn')?.addEventListener('click', () => {
    const title = document.getElementById('req-title')?.value.trim();
    const budget = document.getElementById('req-budget')?.value;
    const deadline = document.getElementById('req-deadline')?.value;
    if (!title) { showToast('Please enter a request title', 'error'); return; }
    const list = document.getElementById('requests-list');
    const item = document.createElement('div');
    item.className = 'request-item';
    const deadlineStr = deadline ? new Date(deadline).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : 'No deadline';
    item.innerHTML = `<div class="request-item-info"><div class="request-item-title">${escapeHtml(title)}</div><div class="request-item-meta">Budget: ₹${budget||'Open'} &nbsp;&middot;&nbsp; Deadline: ${deadlineStr}</div></div><span class="request-badge">Open</span>`;
    list?.appendChild(item);
    list?.classList.remove('hidden');
    document.getElementById('request-form')?.classList.add('hidden');
    document.getElementById('requests-empty')?.classList.add('hidden');
    document.getElementById('req-title').value = '';
    document.getElementById('req-budget').value = '';
    document.getElementById('req-deadline').value = '';
    showToast(`Request "${title}" posted!`, 'success');
  });


  // Creator nav links
  function switchCreatorView(activeId) {
    const views = ['cview-overview','cview-gigs','cview-orders','cview-earnings','cview-portfolio','cview-profile','cview-marketplace'];
    const navs  = ['cnav-overview','cnav-gigs','cnav-orders','cnav-earnings','cnav-portfolio','cnav-profile','cnav-marketplace'];
    views.forEach(id => document.getElementById(id)?.classList.add('hidden'));
    navs.forEach(id => document.getElementById(id)?.classList.remove('active'));
    const viewMap = {
      'cnav-overview':'cview-overview','cnav-gigs':'cview-gigs',
      'cnav-orders':'cview-orders','cnav-earnings':'cview-earnings',
      'cnav-portfolio':'cview-portfolio','cnav-profile':'cview-profile',
      'cnav-marketplace':'cview-marketplace'
    };
    document.getElementById(activeId)?.classList.add('active');
    document.getElementById(viewMap[activeId])?.classList.remove('hidden');
    // Pre-fill profile form when opening
    if (activeId === 'cnav-profile' && currentUser) {
      const nameEl = document.getElementById('cpf-name');
      if (nameEl && !nameEl.value) nameEl.value = currentUser.name || '';
      // Fetch creator data and prefill
      const c = creatorsList.find(c => c.user_id === currentUser.id);
      if (c) {
        if(document.getElementById('cpf-specialty')) document.getElementById('cpf-specialty').value = c.specialty || '';
        if(document.getElementById('cpf-uni')) document.getElementById('cpf-uni').value = c.university || '';
        if(document.getElementById('cpf-rate')) document.getElementById('cpf-rate').value = c.price || '';
        if(document.getElementById('cpf-bio')) document.getElementById('cpf-bio').value = c.bio || '';
      }
    }
    // Load portfolio
    if (activeId === 'cnav-portfolio' && currentUser) {
      renderCreatorStudioPortfolio();
    }
  }
  ['cnav-overview','cnav-gigs','cnav-orders','cnav-earnings','cnav-portfolio','cnav-profile','cnav-marketplace'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', (e) => { e.preventDefault(); switchCreatorView(id); });
  });

  // ---- CREATOR AVATAR UPLOAD ----
  const avatarInput     = document.getElementById('creator-avatar-input');
  const avatarImg       = document.getElementById('creator-profile-img');
  const avatarPH        = document.getElementById('avatar-placeholder');
  const removeAvatarBtn = document.getElementById('remove-avatar-btn');
  const uploadAvatarBtn = document.getElementById('upload-avatar-btn');

  // "Upload Photo" button below the zone also triggers the picker
  uploadAvatarBtn?.addEventListener('click', () => avatarInput?.click());

  function applyAvatarPreview(dataUrl) {
    if (!avatarImg) return;
    avatarImg.src = dataUrl;
    avatarImg.classList.remove('hidden');
    avatarPH?.classList.add('hidden');
    removeAvatarBtn?.classList.remove('hidden');
    uploadAvatarBtn?.classList.add('hidden');
    // Update topbar avatar live
    const topAv = document.getElementById('creator-topbar-avatar');
    if (topAv) topAv.src = dataUrl;
    // Persist in localStorage
    if (currentUser) {
      currentUser.avatarUrl = dataUrl;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
    }
  }

  // File chosen → FileReader preview
  avatarInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB', 'error');
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      applyAvatarPreview(dataUrl);
      
      // Auto-save avatar to DB immediately
      if (currentUser) {
        try {
          // Send just what we need, the API allows partial upsert if we read inputs
          const name = document.getElementById('cpf-name')?.value.trim() || currentUser.name;
          await apiRequest('/api/creators/profile', 'POST', {
            userId: currentUser.id,
            name: name,
            avatar: dataUrl
          });
          showToast('Profile photo updated! 📸', 'success');
          fetchCreators(); // Refresh marketplace immediately
        } catch(err) {
          showToast('Failed to save photo to server.', 'error');
        }
      } else {
        showToast('Profile photo updated locally! 📸', 'success');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset so same file can be re-selected
  });

  // Remove photo
  removeAvatarBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!avatarImg) return;
    avatarImg.src = '';
    avatarImg.classList.add('hidden');
    avatarPH?.classList.remove('hidden');
    removeAvatarBtn.classList.add('hidden');
    uploadAvatarBtn?.classList.remove('hidden');  // show Upload button again
    if (currentUser) {
      delete currentUser.avatarUrl;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
      const topAv = document.getElementById('creator-topbar-avatar');
      if (topAv) topAv.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=ff0033&color=fff`;
      
      // Auto-remove avatar from DB immediately
      try {
        const name = document.getElementById('cpf-name')?.value.trim() || currentUser.name;
        await apiRequest('/api/creators/profile', 'POST', {
          userId: currentUser.id,
          name: name,
          avatar: ''
        });
        showToast('Profile photo removed', 'success');
        fetchCreators(); // Refresh marketplace immediately
      } catch(err) {
        showToast('Failed to remove photo on server.', 'error');
      }
    } else {
      showToast('Profile photo removed locally', 'success');
    }
  });

  // Save profile button
  document.getElementById('creator-save-profile-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('cpf-name')?.value.trim();
    const uni = document.getElementById('cpf-uni')?.value.trim();
    const specialty = document.getElementById('cpf-specialty')?.value.trim();
    const rate = document.getElementById('cpf-rate')?.value.trim();
    const bio = document.getElementById('cpf-bio')?.value.trim();

    if (name && currentUser) {
      currentUser.name = name;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
      const nameEl = document.getElementById('creator-topbar-name');
      if (nameEl) nameEl.textContent = name.split(' ')[0];
    }

    try {
      await apiRequest('/api/creators/profile', 'POST', {
        userId: currentUser.id,
        name: name,
        university: uni,
        specialty: specialty,
        price: rate,
        bio: bio,
        avatar: currentUser.avatarUrl || ''
      });
      showToast('Profile saved successfully! ✅', 'success');
      fetchCreators(); // Refresh data
    } catch (err) {
      showToast('Failed to save profile on server.', 'error');
    }
  });

  // Restore saved avatar on dashboard open (called from showDashboard)
  window.restoreCreatorAvatar = function() {
    if (currentUser?.avatarUrl) {
      applyAvatarPreview(currentUser.avatarUrl);
    }
  };

  // ---- CREATOR PORTFOLIO MANAGEMENT ----
  window.parsePortfolio = function(jsonStr) {
    try { return JSON.parse(jsonStr || '[]'); } catch { return []; }
  };

  window.renderPortfolioItems = function(jsonStr) {
    const items = window.parsePortfolio(jsonStr);
    if (!items || items.length === 0) {
      return `<p style="color:var(--text-muted); font-style:italic;">No portfolio items yet.</p>`;
    }
    return items.map(url => {
      let thumbUrl = url;
      const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      if (ytMatch && ytMatch[1]) {
        thumbUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
      }
      return `
        <div class="portfolio-item" onclick="window.open('${escapeHtml(url)}', '_blank')">
          <img src="${escapeHtml(thumbUrl)}" onerror="this.src='https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&h=533&fit=crop'" />
          <div class="play-btn"><i class="fas fa-play"></i></div>
        </div>
      `;
    }).join('');
  };

  window.renderCreatorStudioPortfolio = function() {
    const grid = document.getElementById('portfolio-grid-container');
    const empty = document.getElementById('portfolio-empty-state');
    if (!grid || !empty) return;

    const c = creatorsList.find(cr => cr.user_id === currentUser.id);
    const items = c ? window.parsePortfolio(c.portfolio) : [];

    if (items.length === 0) {
      grid.style.display = 'none';
      empty.style.display = 'flex';
    } else {
      empty.style.display = 'none';
      grid.style.display = 'grid';
      // Render items with a delete button for the owner
      grid.innerHTML = items.map((url, idx) => {
        let thumbUrl = url;
        const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
        if (ytMatch && ytMatch[1]) {
          thumbUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
        }
        return `
          <div class="portfolio-item" style="position:relative;">
            <img src="${escapeHtml(thumbUrl)}" onerror="this.src='https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&h=533&fit=crop'" />
            <button class="btn btn-outline" style="position:absolute; top:8px; right:8px; padding:6px 10px; background:rgba(0,0,0,0.6); border:none; color:#fff; z-index:2;" onclick="event.stopPropagation(); removePortfolioItem(${idx})">
              <i class="fas fa-trash"></i>
            </button>
            <div class="play-btn" onclick="window.open('${escapeHtml(url)}', '_blank')"><i class="fas fa-play"></i></div>
          </div>
        `;
      }).join('');
    }
  };

  window.removePortfolioItem = async function(idx) {
    if (!currentUser) return;
    const c = creatorsList.find(cr => cr.user_id === currentUser.id);
    if (!c) return;
    const items = window.parsePortfolio(c.portfolio);
    items.splice(idx, 1);
    
    try {
      await apiRequest('/api/creators/portfolio', 'POST', { userId: currentUser.id, portfolio: items });
      c.portfolio = JSON.stringify(items);
      window.renderCreatorStudioPortfolio();
      showToast('Item removed.', 'success');
    } catch(e) {
      showToast('Failed to remove item.', 'error');
    }
  };

  document.getElementById('add-portfolio-btn')?.addEventListener('click', async () => {
    const url = prompt("Enter a video or image link (e.g., YouTube Shorts URL, Instagram Reel URL):");
    if(!url || !url.trim()) return;
    if(!url.startsWith('http')) {
      showToast('Please enter a valid URL starting with http', 'error');
      return;
    }

    const c = creatorsList.find(cr => cr.user_id === currentUser?.id);
    if (!c) {
      showToast('Could not find your creator profile.', 'error');
      return;
    }

    const items = window.parsePortfolio(c.portfolio);
    items.push(url.trim());

    try {
      await apiRequest('/api/creators/portfolio', 'POST', { userId: currentUser.id, portfolio: items });
      c.portfolio = JSON.stringify(items);
      window.renderCreatorStudioPortfolio();
      showToast('Portfolio item added!', 'success');
    } catch(e) {
      showToast('Failed to save portfolio item.', 'error');
    }
  });



  // Gig form open/close
  const createdGigs = JSON.parse(localStorage.getItem('cverso-gigs') || '[]');

  function renderGigsList() {
    const list = document.getElementById('gigs-list');
    const empty = document.getElementById('gigs-empty');
    if (!list || !empty) return;
    if (createdGigs.length === 0) {
      list.classList.add('hidden');
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      list.classList.remove('hidden');
      list.innerHTML = createdGigs.map((g, i) => `
        <div class="request-item">
          <div class="request-item-info">
            <div class="request-item-title">${escapeHtml(g.title)}</div>
            <div class="request-item-meta">${escapeHtml(g.specialty || 'General')} &middot; ₹${g.price || '0'}/hr</div>
          </div>
          <span class="request-badge">Active</span>
        </div>
      `).join('');
    }
  }

  document.getElementById('goto-gigs-btn')?.addEventListener('click', () => switchCreatorView('cnav-gigs'));
  function openGigForm() {
    document.getElementById('gigs-empty')?.classList.add('hidden');
    document.getElementById('gigs-list')?.classList.add('hidden');
    document.getElementById('gig-form')?.classList.remove('hidden');
  }
  document.getElementById('add-gig-btn')?.addEventListener('click', openGigForm);
  document.getElementById('add-gig-btn-2')?.addEventListener('click', openGigForm);
  document.getElementById('gig-cancel-btn')?.addEventListener('click', () => {
    document.getElementById('gig-form')?.classList.add('hidden');
    renderGigsList();
  });
  document.getElementById('gig-save-btn')?.addEventListener('click', () => {
    const title = document.getElementById('gig-title')?.value.trim();
    const specialty = document.getElementById('gig-specialty')?.value.trim();
    const price = document.getElementById('gig-price')?.value.trim();
    const desc = document.getElementById('gig-desc')?.value.trim();
    if (!title) { showToast('Please enter a gig title', 'error'); return; }
    createdGigs.push({ title, specialty, price, desc, date: new Date().toISOString() });
    localStorage.setItem('cverso-gigs', JSON.stringify(createdGigs));
    showToast(`Gig "${title}" published successfully! 🎬`, 'success');
    document.getElementById('gig-form')?.classList.add('hidden');
    document.getElementById('gig-title').value = '';
    document.getElementById('gig-specialty').value = '';
    document.getElementById('gig-price').value = '';
    document.getElementById('gig-desc').value = '';
    renderGigsList();
  });
  // Initial render
  renderGigsList();

  searchCreators?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(fetchCreators, 400);
  });
  csearchCreators?.addEventListener('input', () => {
    // Sync the inputs optionally
    if (searchCreators) searchCreators.value = csearchCreators.value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(fetchCreators, 400);
  });
  universityFilter?.addEventListener('change', fetchCreators);
  cuniversityFilter?.addEventListener('change', () => {
    if (universityFilter) universityFilter.value = cuniversityFilter.value;
    fetchCreators();
  });

  navMarketplace?.addEventListener('click', (e) => {
    e.preventDefault();
    navMarketplace.classList.add('active'); navUpload.classList.remove('active');
    viewMarketplace.classList.remove('hidden'); viewUpload.classList.add('hidden');
  });
  navUpload?.addEventListener('click', (e) => {
    e.preventDefault();
    navUpload.classList.add('active'); navMarketplace.classList.remove('active');
    viewUpload.classList.remove('hidden'); viewMarketplace.classList.add('hidden');
  });

  // Chat
  chatToggle?.addEventListener('click', () => chatWindow.classList.add('open'));
  chatClose?.addEventListener('click', () => chatWindow.classList.remove('open'));
  chatSend?.addEventListener('click', submitChat);
  chatText?.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitChat(); });

  // Add scroll animations for motion effect
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.service-card, .feature-item, .category-pill, .section-heading, .creator-setup-prompt, .stat-card, .earning-card, .upload-panel').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
  });
}

// Boot
init();

function initCategoryFilters() {
  // Category pill filters (if present)
  const pills = document.querySelectorAll('.category-pill');
  const scroller = document.getElementById('popular-services-scroller');

  if (pills.length && scroller) {
    pills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.preventDefault();
        const category = pill.dataset.category;
        const cards = scroller.querySelectorAll('.service-card');
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        cards.forEach(card => {
          const cardCategories = card.dataset.category || '';
          const matches = category === 'all' || cardCategories.includes(category);
          if (matches) {
            card.classList.remove('hidden');
            card.classList.add('service-fade-in');
            setTimeout(() => card.classList.remove('service-fade-in'), 400);
          } else {
            card.classList.add('hidden');
          }
        });
        scroller.scrollTo({ left: 0, behavior: 'smooth' });
      });
    });
  }

  // Services nav bar filtering
  const serviceNavItems = document.querySelectorAll('.service-nav-item');
  if (serviceNavItems.length && scroller) {
    const categoryMap = [
      'all', 'reels', 'short-form', 'motion-graphics', 'promo-edits', 'captions', 'vfx', 'youtube'
    ];
    serviceNavItems.forEach((item, idx) => {
      item.addEventListener('click', () => {
        serviceNavItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const cat = categoryMap[idx] || 'all';
        const cards = scroller.querySelectorAll('.service-card');
        cards.forEach(card => {
          const cardCats = card.dataset.category || '';
          const matches = cat === 'all' || cardCats.includes(cat);
          if (matches) {
            card.classList.remove('hidden');
            card.classList.add('service-fade-in');
            setTimeout(() => card.classList.remove('service-fade-in'), 400);
          } else {
            card.classList.add('hidden');
          }
        });
      });
    });
  }
}
