// frontend/js/apply.js
// Application submission page logic

const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', function() {
  const token = localStorage.getItem('hr_token');
  const user = localStorage.getItem('hr_user') ? JSON.parse(localStorage.getItem('hr_user')) : null;
  
  if (!token || !user || user.role !== 'Applicant') {
    const oppId = new URLSearchParams(window.location.search).get('job');
    window.location.href = `/login?redirect=apply` + (oppId ? `&job=${oppId}` : '');
    return;
  }
  
  // Auto-fill applicant fields
  document.getElementById('applicantName').dataset.userId = user.id;
  document.getElementById('applicantEmail').value = user.email;
  document.getElementById('applicantEmail').readOnly = true;

  loadOpportunities();
  setupApplyForm();
});

/**
 * Load available opportunities for the dropdown
 */
async function loadOpportunities() {
  try {
    const res = await fetch(API_BASE + '/applications/opportunities');
    if (!res.ok) return;

    const opportunities = await res.json();
    const select = document.getElementById('opportunityId');
    if (!select) return;

    opportunities.forEach(opp => {
      const option = document.createElement('option');
      option.value = opp.opportunityId;
      option.textContent = `${opp.opportunityId} - ${opp.title} (${opp.department})`;
      select.appendChild(option);
    });

    // Auto select from URL
    const urlParams = new URLSearchParams(window.location.search);
    const targetJob = urlParams.get('job');
    if (targetJob) {
      select.value = targetJob;
    }
  } catch (err) {
    console.error('Failed to load opportunities:', err);
  }
}

/**
 * Setup the application form submission
 */
function setupApplyForm() {
  const form = document.getElementById('applyForm');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = document.getElementById('applicantName').value.trim();
    const email = document.getElementById('applicantEmail').value.trim();
    const opportunityId = document.getElementById('opportunityId').value;
    const resume = document.getElementById('resume').files[0];
    const msgEl = document.getElementById('applyMsg');

    // Validate
    if (!name || !email || !opportunityId) {
      showMessage(msgEl, 'Please fill in all required fields.', 'error');
      return;
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showMessage(msgEl, 'Please enter a valid email address.', 'error');
      return;
    }

    // Build form data (multipart for file upload)
    const formData = new FormData();
    formData.append('applicantName', name);
    formData.append('applicantEmail', email);
    formData.append('opportunityId', opportunityId);
    if (resume) {
      formData.append('resume', resume);
    }

    try {
      const res = await fetch(API_BASE + '/applications/apply', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + localStorage.getItem('hr_token')
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage(msgEl, data.error || 'Submission failed.', 'error');
        return;
      }

      showMessage(msgEl, 'Application submitted successfully! You can login to track your application status.', 'success');
      form.reset();
    } catch (err) {
      showMessage(msgEl, 'Connection error. Please try again.', 'error');
      console.error('Apply error:', err);
    }
  });
}

/**
 * Show success/error message
 */
function showMessage(el, msg, type) {
  if (el) {
    el.textContent = msg;
    el.className = 'alert mt-3 ' + (type === 'success' ? 'alert-success' : 'alert-danger');
    el.style.display = 'block';
  }
}
