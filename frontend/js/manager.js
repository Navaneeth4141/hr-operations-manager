// frontend/js/manager.js
// Manager dashboard logic - view shortlisted, schedule interviews, final decisions

document.addEventListener('DOMContentLoaded', function() {
  const user = checkAuth('Manager');
  if (!user) return;

  setupNavbar();
  loadManagerApplications();
  loadInterviewers();
});

let interviewersCache = [];

/**
 * Load interviewers list for scheduling dropdown
 */
async function loadInterviewers() {
  try {
    const res = await apiRequest('/auth/users?role=Interviewer');
    if (res && res.ok) {
      interviewersCache = await res.json();
    }
  } catch (err) {
    console.error('Failed to load interviewers:', err);
  }
}

/**
 * Load applications assigned to this manager
 */
async function loadManagerApplications() {
  try {
    const res = await apiRequest('/manager/applications');
    if (!res || !res.ok) return;

    const applications = await res.json();
    const tbody = document.getElementById('applicationsBody');

    if (!tbody) return;

    if (applications.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-3">No candidates assigned to you.</td></tr>';
      return;
    }

    tbody.innerHTML = applications.map((app, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${app.applicantName}</td>
        <td>${app.applicantEmail}</td>
        <td>${app.opportunityId}</td>
        <td><span class="badge-status ${getStatusBadgeClass(app.status)}">${app.status}</span></td>
        <td>${app.interview ? `${formatDate(app.interview.date)} at ${app.interview.time}` : '-'}</td>
        <td>${app.interview ? `<span class="badge-status ${getStatusBadgeClass(app.interview.result)}">${app.interview.result}</span>` : '-'}</td>
        <td>${getManagerActions(app)}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load manager applications:', err);
  }
}

/**
 * Get available action buttons based on application status
 */
function getManagerActions(app) {
  if (app.status === 'Shortlisted') {
    return `<button class="btn-action btn-schedule" onclick="openScheduleModal('${app._id}')">Schedule Interview</button>`;
  }
  if (app.status === 'Interview Done') {
    return `
      <button class="btn-action btn-accept" onclick="makeFinalDecision('${app._id}', 'selected')">Select</button>
      <button class="btn-action btn-reject" onclick="openDecisionRejectModal('${app._id}')">Reject</button>
    `;
  }
  if (app.status === 'Interview Scheduled') {
    return `<span class="text-muted" style="font-size:11px">Awaiting interview result</span>`;
  }
  return `<span class="text-muted" style="font-size:11px">${app.status}</span>`;
}

/**
 * Open schedule interview modal
 */
function openScheduleModal(appId) {
  const modal = document.getElementById('scheduleModal');
  const select = document.getElementById('interviewerSelect');

  if (!modal || !select) return;

  // Populate interviewers dropdown
  select.innerHTML = '<option value="">-- Select Interviewer --</option>';
  interviewersCache.forEach(int => {
    select.innerHTML += `<option value="${int._id}">${int.username} (${int.department})</option>`;
  });

  // Clear previous values
  document.getElementById('interviewDate').value = '';
  document.getElementById('interviewTime').value = '';

  modal.dataset.appId = appId;
  modal.classList.add('show');
}

/**
 * Submit schedule interview
 */
async function submitSchedule() {
  const modal = document.getElementById('scheduleModal');
  const appId = modal.dataset.appId;
  const interviewerId = document.getElementById('interviewerSelect').value;
  const date = document.getElementById('interviewDate').value;
  const time = document.getElementById('interviewTime').value;

  if (!interviewerId || !date || !time) {
    alert('Please fill in all fields.');
    return;
  }

  try {
    const res = await apiRequest(`/manager/${appId}/schedule-interview`, {
      method: 'PUT',
      body: JSON.stringify({ interviewerId, date, time })
    });

    if (res && res.ok) {
      showAlert('Interview scheduled successfully.', 'success');
      closeModal('scheduleModal');
      loadManagerApplications();
    } else {
      const data = await res.json();
      showAlert(data.error || 'Failed to schedule.', 'error');
    }
  } catch (err) {
    showAlert('Connection error.', 'error');
  }
}

/**
 * Make final decision - select
 */
async function makeFinalDecision(appId, decision) {
  if (decision === 'selected') {
    if (!confirm('Select this candidate for the position?')) return;

    try {
      const res = await apiRequest(`/manager/${appId}/final-decision`, {
        method: 'PUT',
        body: JSON.stringify({ decision: 'selected' })
      });

      if (res && res.ok) {
        showAlert('Candidate selected! HR has been notified to send offer.', 'success');
        loadManagerApplications();
      } else {
        const data = await res.json();
        showAlert(data.error || 'Failed to update decision.', 'error');
      }
    } catch (err) {
      showAlert('Connection error.', 'error');
    }
  }
}

/**
 * Open rejection decision modal
 */
function openDecisionRejectModal(appId) {
  const modal = document.getElementById('decisionRejectModal');
  if (!modal) return;

  document.getElementById('decisionRejectReason').value = '';
  modal.dataset.appId = appId;
  modal.classList.add('show');
}

/**
 * Submit rejection decision
 */
async function submitDecisionReject() {
  const modal = document.getElementById('decisionRejectModal');
  const appId = modal.dataset.appId;
  const reason = document.getElementById('decisionRejectReason').value.trim();

  if (!reason) {
    alert('Please enter a reason for rejection.');
    return;
  }

  try {
    const res = await apiRequest(`/manager/${appId}/final-decision`, {
      method: 'PUT',
      body: JSON.stringify({ decision: 'rejected', reason })
    });

    if (res && res.ok) {
      showAlert('Candidate rejected after interview.', 'success');
      closeModal('decisionRejectModal');
      loadManagerApplications();
    } else {
      const data = await res.json();
      showAlert(data.error || 'Failed to update decision.', 'error');
    }
  } catch (err) {
    showAlert('Connection error.', 'error');
  }
}

/**
 * Close a modal by ID
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('show');
}
