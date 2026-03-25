const searchInput = document.querySelector('.search');
const heroSearchInput = document.querySelector('.hero-search');
const heroSearchButton = document.querySelector('.hero-search-btn');
const creatorGrid = document.querySelector('.creator-grid');
const resultsSummary = document.querySelector('.results-summary');

let creators = [];
let currentQuery = '';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => (
    {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character]
  ));
}

function renderStars(rating = 0) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  return `${'\u2605'.repeat(safeRating)}${'\u2606'.repeat(5 - safeRating)}`;
}

function formatCurrency(amountCents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format((Number(amountCents) || 0) / 100);
}

async function readApiResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Server returned an invalid response (${response.status}).`);
  }
}

function syncSearchInputs(value) {
  searchInput.value = value;
  heroSearchInput.value = value;
}

function setResultsSummary(message, tone = 'default') {
  resultsSummary.textContent = message;
  resultsSummary.dataset.tone = tone;
}

function renderStateCard(title, description) {
  creatorGrid.innerHTML = `
    <article class="state-card">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
    </article>
  `;
}

function displayCreators(list) {
  if (!list.length) {
    renderStateCard('No matching editors yet', 'Try a broader search like "music", "wedding", or "documentary".');
    setResultsSummary(`0 editors found for "${currentQuery}"`, 'muted');
    return;
  }

  creatorGrid.innerHTML = list.map((creator) => `
    <article class="creator-card" data-creator-id="${creator.id}">
      <img src="${escapeHtml(creator.avatar || 'https://via.placeholder.com/80')}" alt="${escapeHtml(creator.name)}" />
      <div class="creator-meta">
        <h3>${escapeHtml(creator.name)}</h3>
        <p class="specialty">${escapeHtml(creator.specialty)}</p>
        <p class="bio">${escapeHtml(creator.bio || 'Experienced editor ready to jump into your next project.')}</p>
      </div>
      <div class="creator-stats">
        <span class="rating" aria-label="${Number(creator.rating) || 0} out of 5 stars">${renderStars(creator.rating)}</span>
        <span class="price">$${Number(creator.price) || 0}/hr</span>
      </div>
      <button type="button">View Profile</button>
    </article>
  `).join('');

  const summary = currentQuery
    ? `${list.length} editor${list.length === 1 ? '' : 's'} found for "${currentQuery}"`
    : `${list.length} featured editor${list.length === 1 ? '' : 's'} available`;
  setResultsSummary(summary);
}

async function fetchCreators(query = '') {
  currentQuery = query.trim();
  setResultsSummary(currentQuery ? `Searching for "${currentQuery}"...` : 'Loading featured editors...', 'muted');
  renderStateCard('Loading editors...', 'Fetching the latest creator list for the marketplace.');

  try {
    const params = new URLSearchParams();
    if (currentQuery) {
      params.set('search', currentQuery);
    }

    const response = await fetch(`/api/creators${params.toString() ? `?${params.toString()}` : ''}`);
    const data = await readApiResponse(response);
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch creators.');
    }

    creators = Array.isArray(data) ? data : [];
    displayCreators(creators);
  } catch (error) {
    console.error('Error fetching creators:', error);
    renderStateCard('Unable to load editors', 'Please refresh the page or restart the server to try again.');
    setResultsSummary('Editor list unavailable right now.', 'error');
  }
}

function handleSearch(value) {
  const nextValue = value.trim();
  syncSearchInputs(nextValue);
  fetchCreators(nextValue);
}

function openModal(content) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true">
      <button class="close-btn" type="button" aria-label="Close modal">&times;</button>
      ${content}
    </div>
  `;

  document.body.appendChild(modal);
  document.body.classList.add('modal-open');

  const closeModal = () => {
    modal.remove();
    document.body.classList.remove('modal-open');
  };

  const bindCloseHandlers = () => {
    const closeButton = modal.querySelector('.close-btn');
    if (closeButton) {
      closeButton.addEventListener('click', closeModal);
    }
  };

  bindCloseHandlers();

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  return { modal, closeModal, bindCloseHandlers };
}

function showPaymentModal(creator) {
  const { modal, closeModal, bindCloseHandlers } = openModal(`
    <h2>Complete payment</h2>
    <div class="payment-summary">
      <p><strong>Editor:</strong> ${escapeHtml(creator.name)}</p>
      <p><strong>Specialty:</strong> ${escapeHtml(creator.specialty)}</p>
      <p><strong>Rate:</strong> ${formatCurrency(Number(creator.price || 0) * 100)} per hour</p>
    </div>
    <form class="payment-form">
      <input type="text" name="customerName" placeholder="Your name" required minlength="2" />
      <input type="email" name="customerEmail" placeholder="Email address" required />
      <input type="text" name="projectName" placeholder="Project name" required minlength="3" />
      <div class="payment-grid">
        <input type="number" name="hours" placeholder="Hours" min="1" max="40" value="2" required />
        <div class="payment-total">
          <span>Estimated total</span>
          <strong data-payment-total>${formatCurrency(Number(creator.price || 0) * 2 * 100)}</strong>
        </div>
      </div>
      <input type="text" name="cardNumber" placeholder="Card number" inputmode="numeric" autocomplete="cc-number" required />
      <div class="payment-grid payment-grid-tight">
        <input type="text" name="expiry" placeholder="MM/YY" inputmode="numeric" autocomplete="cc-exp" required />
        <input type="text" name="cvv" placeholder="CVV" inputmode="numeric" autocomplete="cc-csc" required />
      </div>
      <button type="submit" class="pay-btn">Pay ${formatCurrency(Number(creator.price || 0) * 2 * 100)}</button>
      <p class="form-message" aria-live="polite"></p>
      <p class="payment-note">Demo checkout for local development. The app stores receipt details only, not raw card data.</p>
    </form>
  `);

  const form = modal.querySelector('.payment-form');
  const hoursInput = form.querySelector('input[name="hours"]');
  const cardNumberInput = form.querySelector('input[name="cardNumber"]');
  const expiryInput = form.querySelector('input[name="expiry"]');
  const cvvInput = form.querySelector('input[name="cvv"]');
  const message = form.querySelector('.form-message');
  const totalLabel = form.querySelector('[data-payment-total]');
  const payButton = form.querySelector('.pay-btn');

  function refreshTotal() {
    const hours = Math.max(1, Math.min(40, Number(hoursInput.value) || 1));
    const amountCents = Number(creator.price || 0) * hours * 100;
    totalLabel.textContent = formatCurrency(amountCents);
    payButton.textContent = `Pay ${formatCurrency(amountCents)}`;
  }

  hoursInput.addEventListener('input', refreshTotal);

  cardNumberInput.addEventListener('input', () => {
    const digits = cardNumberInput.value.replace(/\D/g, '').slice(0, 19);
    cardNumberInput.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  });

  expiryInput.addEventListener('input', () => {
    const digits = expiryInput.value.replace(/\D/g, '').slice(0, 4);
    expiryInput.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  });

  cvvInput.addEventListener('input', () => {
    cvvInput.value = cvvInput.value.replace(/\D/g, '').slice(0, 4);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    refreshTotal();

    const formData = new FormData(form);
    const payload = {
      creatorId: creator.id,
      customerName: formData.get('customerName'),
      customerEmail: formData.get('customerEmail'),
      projectName: formData.get('projectName'),
      hours: Number(formData.get('hours')),
      cardNumber: formData.get('cardNumber'),
      expiry: formData.get('expiry'),
      cvv: formData.get('cvv')
    };

    message.textContent = 'Processing payment...';
    payButton.disabled = true;

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(data.error || 'Payment failed.');
      }

      modal.querySelector('.modal-content').innerHTML = `
        <button class="close-btn" type="button" aria-label="Close modal">&times;</button>
        <h2>Payment received</h2>
        <div class="receipt-card">
          <p><strong>Reference:</strong> ${escapeHtml(data.payment.paymentReference)}</p>
          <p><strong>Editor:</strong> ${escapeHtml(data.payment.creatorName)}</p>
          <p><strong>Project:</strong> ${escapeHtml(data.payment.projectName)}</p>
          <p><strong>Total paid:</strong> ${formatCurrency(data.payment.amountCents)}</p>
          <p><strong>Card:</strong> ${escapeHtml(data.payment.cardBrand)} ending in ${escapeHtml(data.payment.cardLast4)}</p>
          <p><strong>Status:</strong> Paid</p>
        </div>
        <button type="button" class="btn modal-primary-btn">Done</button>
      `;

      bindCloseHandlers();
      modal.querySelector('.modal-primary-btn').addEventListener('click', closeModal);
    } catch (error) {
      console.error('Error processing payment:', error);
      message.textContent = error.message;
      payButton.disabled = false;
    }
  });
}

function showProfileModal(creator) {
  const { modal } = openModal(`
    <h2>${escapeHtml(creator.name)}</h2>
    <p><strong>Specialty:</strong> ${escapeHtml(creator.specialty)}</p>
    <p><strong>Rating:</strong> ${renderStars(creator.rating)}</p>
    <p><strong>Bio:</strong> ${escapeHtml(creator.bio)}</p>
    <p><strong>Price:</strong> ${formatCurrency(Number(creator.price || 0) * 100)}/hour</p>
    <div class="modal-actions">
      <button type="button" class="btn contact-btn">Contact</button>
      <button type="button" class="btn-outline start-payment-btn">Pay Now</button>
    </div>
  `);

  modal.querySelector('.contact-btn').addEventListener('click', () => {
    alert(`Contact flow coming soon for ${creator.name}.`);
  });

  modal.querySelector('.start-payment-btn').addEventListener('click', () => {
    modal.remove();
    document.body.classList.remove('modal-open');
    showPaymentModal(creator);
  });
}

function showAuthModal(mode) {
  const isLogin = mode === 'login';
  const endpoint = isLogin ? '/api/login' : '/api/signup';
  const title = isLogin ? 'Login' : 'Sign Up';
  const fields = isLogin
    ? `
      <input type="email" name="email" placeholder="Email" required />
      <input type="password" name="password" placeholder="Password" required minlength="6" />
    `
    : `
      <input type="text" name="name" placeholder="Name" required minlength="2" />
      <input type="email" name="email" placeholder="Email" required />
      <input type="password" name="password" placeholder="Password" required minlength="6" />
    `;

  const { modal, closeModal } = openModal(`
    <h2>${title}</h2>
    <form class="auth-form">
      ${fields}
      <button type="submit">${title}</button>
      <p class="form-message" aria-live="polite"></p>
    </form>
  `);

  const form = modal.querySelector('.auth-form');
  const message = modal.querySelector('.form-message');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    message.textContent = isLogin ? 'Signing you in...' : 'Creating your account...';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(data.error || `${title} failed. Please try again.`);
      }

      message.textContent = isLogin ? 'Logged in successfully.' : 'Account created successfully.';
      if (data.token) {
        localStorage.setItem('clipit-token', data.token);
      }
      window.setTimeout(closeModal, 500);
    } catch (error) {
      console.error(`Error during ${mode}:`, error);
      message.textContent = error.message;
    }
  });
}

searchInput.addEventListener('input', (event) => handleSearch(event.target.value));
heroSearchInput.addEventListener('input', (event) => handleSearch(event.target.value));
heroSearchButton.addEventListener('click', () => handleSearch(heroSearchInput.value));

creatorGrid.addEventListener('click', (event) => {
  if (event.target.tagName !== 'BUTTON') {
    return;
  }

  const card = event.target.closest('.creator-card');
  if (!card) {
    return;
  }

  const creatorId = Number(card.dataset.creatorId);
  const creator = creators.find((item) => item.id === creatorId);
  if (creator) {
    showProfileModal(creator);
  }
});

document.querySelector('.nav-links a[href="#"]').addEventListener('click', (event) => {
  event.preventDefault();
  showAuthModal('login');
});

document.querySelector('.nav-links .btn').addEventListener('click', (event) => {
  event.preventDefault();
  showAuthModal('signup');
});

document.addEventListener('DOMContentLoaded', () => {
  fetchCreators();
});
