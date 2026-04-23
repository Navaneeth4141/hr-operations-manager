// frontend/js/auth.js
// Login and registration page logic

const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const portalRole = urlParams.get('role'); // 'admin', 'company', or null
  const portalKey = portalRole || 'applicant';

  // Check if already logged in for this specific portal
  const token = localStorage.getItem('hr_token_' + portalKey);
  const user = localStorage.getItem('hr_user_' + portalKey);
  if (token && user) {
    redirectByRole(JSON.parse(user).role);
    return;
  }

  setupDynamicUI();
  setupLoginForm();
  setupRegisterForm();
  setupToggle();
});

/**
 * Setup login form submission
 */
function setupLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    if (!username || !password) {
      showError(errorEl, 'Please enter username and password.');
      return;
    }

    try {
      const res = await fetch(API_BASE + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        showError(errorEl, data.error || 'Login failed.');
        return;
      }

      // Portal-role gate: ensure the login page matches the user's role
      const urlParams = new URLSearchParams(window.location.search);
      const portalRole = urlParams.get('role');  // 'admin', 'company', or null (applicant)
      const userRole = data.user.role;

      const roleMap = { 'admin': 'Admin', 'company': 'CompanyHR' };
      const expectedRole = roleMap[portalRole] || null;

      // Block if trying to log into wrong portal
      if (portalRole === 'admin' && userRole !== 'Admin') {
        showError(errorEl, 'Access denied. This portal is for Admins only.');
        return;
      }
      if (portalRole === 'company' && !['CompanyHR', 'Manager', 'Interviewer'].includes(userRole)) {
        showError(errorEl, 'Access denied. This portal is for Company accounts only.');
        return;
      }
      if (!portalRole && ['Admin', 'CompanyHR', 'Manager', 'Interviewer'].includes(userRole)) {
        showError(errorEl, 'Access denied. Please use the correct login portal for your account.');
        return;
      }

      // Store token and user info per portal
      const portalKeyToSave = portalRole || 'applicant';
      localStorage.setItem('hr_token_' + portalKeyToSave, data.token);
      localStorage.setItem('hr_user_' + portalKeyToSave, JSON.stringify(data.user));

      const redirect = urlParams.get('redirect');
      const job = urlParams.get('job');
      
      if (redirect === 'apply' && job && userRole === 'Applicant') {
        window.location.href = `/apply?job=${job}`;
      } else {
        redirectByRole(userRole);
      }
    } catch (err) {
      showError(errorEl, 'Connection error. Please try again.');
      console.error('Login error:', err);
    }
  });
}

/**
 * Setup registration form
 */
function setupRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const errorEl = document.getElementById('registerError');

    if (!username || !email || !password) {
      showError(errorEl, 'All fields are required.');
      return;
    }

    if (password.length < 6) {
      showError(errorEl, 'Password must be at least 6 characters.');
      return;
    }

    try {
      const res = await fetch(API_BASE + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role: 'Applicant' })
      });

      const data = await res.json();

      if (!res.ok) {
        showError(errorEl, data.error || 'Registration failed.');
        return;
      }

      // Show success and switch to login
      alert('Registration successful! You can now login.');
      toggleForms();
    } catch (err) {
      showError(errorEl, 'Connection error. Please try again.');
      console.error('Register error:', err);
    }
  });
}

/**
 * Toggle between login and register forms
 */
function setupToggle() {
  const showRegBtn = document.getElementById('showRegister');
  const showLoginBtn = document.getElementById('showLogin');

  if (showRegBtn) {
    showRegBtn.addEventListener('click', function(e) {
      e.preventDefault();
      toggleForms();
    });
  }

  if (showLoginBtn) {
    showLoginBtn.addEventListener('click', function(e) {
      e.preventDefault();
      toggleForms();
    });
  }
}

function toggleForms() {
  const loginSection = document.getElementById('loginSection');
  const registerSection = document.getElementById('registerSection');
  
  if (loginSection && registerSection) {
    loginSection.classList.toggle('d-none');
    registerSection.classList.toggle('d-none');
  }
}

/**
 * Redirect user to their role-specific dashboard
 */
function redirectByRole(role) {
  const routes = {
    'Admin':        '/admin-dashboard',
    'CompanyHR':    '/hr-dashboard',
    'Manager':      '/manager-dashboard',
    'Interviewer':  '/interviewer-dashboard',
    'Applicant':    '/applicant-dashboard'
  };

  const url = routes[role] || '/';
  window.location.href = url;
}

/**
 * Show error message
 */
function showError(el, msg) {
  if (el) {
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 4000);
  }
}

/**
 * Configure UI based on ?role URL param
 */
function setupDynamicUI() {
  const urlParams = new URLSearchParams(window.location.search);
  const role = urlParams.get('role'); // 'admin', 'company', or null (applicant)

  const split = document.getElementById('loginSplit');
  const leftPanel = document.getElementById('loginLeft');
  const rightPanel = document.getElementById('loginRight');
  const tagline = document.getElementById('leftTagline');
  const benefitsList = document.getElementById('benefitsList');
  const loginTitle = document.getElementById('loginTitle');
  const loginSubtitle = document.getElementById('loginSubtitle');
  const adminNotice = document.getElementById('adminNotice');
  const applicantFooter = document.getElementById('applicantFooter');

  const applicantBenefits = [
    { icon: '&#128269;', title: 'Discover Top Opportunities', desc: 'Browse hundreds of curated job openings from companies actively hiring — all in one place.' },
    { icon: '&#128203;', title: 'One-Click Applications', desc: 'Apply directly to any role with your profile. No repeated form-filling. Your data travels with you.' },
    { icon: '&#128276;', title: 'Real-Time Status Tracking', desc: 'Know exactly where your application stands — from Applied to Offer Accepted — at every step.' },
    { icon: '&#127775;', title: 'Professional Profile', desc: 'Build a complete profile with education, work experience and skills that HRs can view directly.' }
  ];

  const companyBenefits = [
    { icon: '&#127970;', title: 'Multi-Department Management', desc: 'Create and organize your company\'s departments and post targeted job vacancies in seconds.' },
    { icon: '&#128101;', title: 'Team Collaboration Tools', desc: 'Add Managers and Interviewers to your hiring team with role-based access control for each stage.' },
    { icon: '&#128202;', title: 'End-to-End Hiring Pipeline', desc: 'Shortlist, schedule interviews, select candidates, and send offer letters — all from one dashboard.' },
    { icon: '&#128196;', title: 'Rich Applicant Profiles', desc: 'View complete applicant data including education, experience, skills and resume in a single click.' }
  ];

  function renderBenefits(list) {
    if (!benefitsList) return;
    benefitsList.innerHTML = list.map(b => `
      <div class="benefit-item">
        <div class="benefit-icon">${b.icon}</div>
        <div class="benefit-text"><h4>${b.title}</h4><p>${b.desc}</p></div>
      </div>
    `).join('');
  }

  if (role === 'admin') {
    if (split) split.classList.add('login-admin');
    if (rightPanel) rightPanel.style.padding = '2.5rem';
    if (adminNotice) adminNotice.style.display = 'block';
    if (loginTitle) loginTitle.textContent = 'Platform Admin Login';
    if (loginSubtitle) loginSubtitle.textContent = 'System Administration Portal';
    if (applicantFooter) applicantFooter.style.display = 'none';
    // Hide register link for admin
    const regSection = document.getElementById('registerSection');
    if (regSection) regSection.remove();
  } else if (role === 'company') {
    if (leftPanel) leftPanel.classList.add('company-theme');
    if (rightPanel) rightPanel.classList.add('company-theme');
    if (tagline) tagline.textContent = 'Streamline your entire recruitment lifecycle.';
    if (loginTitle) loginTitle.textContent = 'Company Portal';
    if (loginSubtitle) loginSubtitle.textContent = 'Sign in to manage your hiring pipeline';
    if (applicantFooter) applicantFooter.style.display = 'none';
    renderBenefits(companyBenefits);
  } else {
    if (loginTitle) loginTitle.textContent = 'Applicant Login';
    if (loginSubtitle) loginSubtitle.textContent = 'Sign in to track your applications';
    renderBenefits(applicantBenefits);
  }

  // Set the Forgot Password link appropriately
  const forgotLink = document.getElementById('forgotPasswordLink');
  if (forgotLink) {
    if (role === 'company') {
      forgotLink.href = '/forgot-password?role=company';
      forgotLink.style.color = '#065f46';
    } else if (role === 'admin') {
      forgotLink.href = '/forgot-password?role=admin';
    } else {
      forgotLink.href = '/forgot-password?role=applicant';
    }
  }
}
