// frontend/js/hr.js
// HR dashboard logic - view applications, shortlist, reject, send offers

document.addEventListener('DOMContentLoaded', function () {
  const user = checkAuth('CompanyHR');
  if (!user) return;

  setupNavbar();
  loadHRApplications();
  loadManagers();
  loadDepts();
  loadMyPostings();
  initHRManagement();
  loadPasswordRequests();
});

let managersCache = [];

/**
 * Load managers list for shortlisting dropdown
 */
async function loadManagers() {
  try {
    const res = await apiRequest('/auth/users?role=Manager');
    if (res && res.ok) {
      managersCache = await res.json();
    }
  } catch (err) {
    console.error('Failed to load managers:', err);
  }
}

/**
 * Load applications assigned to this HR
 */
async function loadHRApplications() {
  try {
    const res = await apiRequest('/hr/applications');
    if (!res || !res.ok) return;

    const applications = await res.json();
    _allApplications = applications; // cache for modal usage
    const tbody = document.getElementById('applicationsBody');

    if (!tbody) return;

    if (applications.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3">No applications assigned to you.</td></tr>';
      return;
    }

    tbody.innerHTML = applications.map((app, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${app.applicantName}</td>
        <td>${app.applicantEmail}</td>
        <td>${app.opportunityId}</td>
        <td><span class="badge-status ${getStatusBadgeClass(app.status)}">${app.status}</span></td>
        <td>${formatDate(app.createdAt)}</td>
        <td>
          ${getHRActions(app)}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load HR applications:', err);
  }
}

/**
 * Get available action buttons based on application status
 */
function getHRActions(app) {
  let actions = `<button class="btn-action" style="background:#4a6fa5;color:white;" onclick="viewDetails('${app._id}')">&#128100; Details</button> `;

  if (app.status === 'Applied' || app.status === 'HR Review') {
    actions += `
      <button class="btn-action btn-shortlist" onclick="openShortlistModal('${app._id}')">Shortlist</button>
      <button class="btn-action btn-reject" onclick="openRejectModal('${app._id}')">Reject</button>
    `;
  } else if (app.status === 'Selected') {
    actions += `<button class="btn-action btn-offer" onclick="sendOffer('${app._id}')">Send Offer</button>`;
  } else if (app.status === 'Rejected') {
    actions += `<span class="text-muted" style="font-size:11px">Reason: ${app.rejectionReason || '-'}</span>`;
  } else {
    actions += `<span class="text-muted" style="font-size:11px">${app.status}</span>`;
  }
  return actions;
}

// Cache of application data for modal
let _allApplications = [];

/**
 * Open details modal for an application
 */
function viewDetails(appId) {
  const app = _allApplications.find(a => a._id === appId);
  if (!app) return;

  const resumeLink = app.resumePath
    ? `<a href="/${app.resumePath.replace(/\\/g, '/')}" target="_blank" style="color:#2563eb;">&#128196; Download Resume</a>`
    : '<span class="text-muted">No resume uploaded</span>';

  const detailsContent = document.getElementById('detailsContent');
  if (!detailsContent) return;

  detailsContent.innerHTML = `
    <table style="width:100%; border-collapse:collapse;">
      <tr><td style="font-weight:600; width:40%; padding:4px 0;">Full Name</td><td>${app.applicantName || '-'}</td></tr>
      <tr><td style="font-weight:600; padding:4px 0;">Email</td><td>${app.applicantEmail || '-'}</td></tr>
      <tr><td style="font-weight:600; padding:4px 0;">Opportunity ID</td><td>${app.opportunityId || '-'}</td></tr>
      <tr><td style="font-weight:600; padding:4px 0;">Status</td><td><span class="badge-status ${getStatusBadgeClass(app.status)}">${app.status}</span></td></tr>
      <tr><td style="font-weight:600; padding:4px 0;">Applied Date</td><td>${formatDate(app.createdAt)}</td></tr>
      <tr><td style="font-weight:600; padding:4px 0;">Last Updated</td><td>${formatDate(app.updatedAt)}</td></tr>
      ${app.rejectionReason ? `<tr><td style="font-weight:600; padding:4px 0;">Rejection Reason</td><td>${app.rejectionReason}</td></tr>` : ''}
      ${app.employeeId ? `<tr><td style="font-weight:600; padding:4px 0;">Employee ID</td><td>${app.employeeId}</td></tr>` : ''}
      ${app.officialEmail ? `<tr><td style="font-weight:600; padding:4px 0;">Official Email</td><td>${app.officialEmail}</td></tr>` : ''}
      <tr><td style="font-weight:600; padding:4px 0;">Resume</td><td>${resumeLink}</td></tr>
    </table>
    <div id="profileSection" style="margin-top:1rem;"><button class="btn btn-outline-primary btn-sm" onclick="loadApplicantProfile('${app.applicantUser}')">&#128100; Load Full Profile</button></div>
  `;

  document.getElementById('viewDetailsModal').classList.add('show');
}

async function loadApplicantProfile(userId) {
  const section = document.getElementById('profileSection');
  if (!section || !userId) return;
  section.innerHTML = '<small class="text-muted">Loading profile...</small>';

  const res = await apiRequest(`/applicant/profile/${userId}`);
  if (!res || !res.ok) { section.innerHTML = '<small class="text-muted">No profile found.</small>'; return; }
  const p = await res.json();

  const skills = (p.skills || []).join(', ') || '-';
  const edu = (p.education || []).map(e =>
    `<li>${e.degree || ''} in ${e.field || ''} &mdash; ${e.institution || ''} (${e.fromYear || ''} &ndash; ${e.toYear || 'Present'}) ${e.grade ? '| ' + e.grade : ''}</li>`
  ).join('') || '<li>Not provided</li>';
  const exp = (p.workExperience || []).map(e =>
    `<li><strong>${e.title || ''}</strong> @ ${e.company || ''} (${e.from || ''} &ndash; ${e.to || 'Present'})<br><small>${e.description || ''}</small></li>`
  ).join('') || '<li>Not provided</li>';

  section.innerHTML = `
    <hr style="margin:1rem 0;">
    <h6 style="font-weight:700; margin-bottom:0.5rem;">&#128100; Full Applicant Profile</h6>
    <table style="width:100%; font-size:13px; margin-bottom:0.75rem;">
      <tr><td style="font-weight:600;width:35%;">Phone</td><td>${p.phone || '-'}</td></tr>
      <tr><td style="font-weight:600;">Address</td><td>${p.address || '-'}</td></tr>
      <tr><td style="font-weight:600;">Summary</td><td>${p.summary || '-'}</td></tr>
      <tr><td style="font-weight:600;">LinkedIn</td><td>${p.linkedin ? `<a href="${p.linkedin}" target="_blank">${p.linkedin}</a>` : '-'}</td></tr>
      <tr><td style="font-weight:600;">Skills</td><td>${skills}</td></tr>
    </table>
    <p style="font-weight:700;font-size:13px;margin-bottom:4px;">&#127979; Education</p>
    <ul style="font-size:13px;padding-left:1.2rem;margin-bottom:0.75rem;">${edu}</ul>
    <p style="font-weight:700;font-size:13px;margin-bottom:4px;">&#128188; Work Experience</p>
    <ul style="font-size:13px;padding-left:1.2rem;">${exp}</ul>
  `;
}

/**
 * Open shortlist modal with manager selection
 */
function openShortlistModal(appId) {
  const modal = document.getElementById('shortlistModal');
  const select = document.getElementById('managerSelect');

  if (!modal || !select) return;

  // Populate managers dropdown
  select.innerHTML = '<option value="">-- Select Manager --</option>';
  managersCache.forEach(mgr => {
    select.innerHTML += `<option value="${mgr._id}">${mgr.username} (${mgr.department})</option>`;
  });

  // Store app ID
  modal.dataset.appId = appId;
  modal.classList.add('show');
}

/**
 * Submit shortlist action
 */
async function submitShortlist() {
  const modal = document.getElementById('shortlistModal');
  const appId = modal.dataset.appId;
  const managerId = document.getElementById('managerSelect').value;

  if (!managerId) {
    alert('Please select a manager.');
    return;
  }

  try {
    const res = await apiRequest(`/hr/${appId}/shortlist`, {
      method: 'PUT',
      body: JSON.stringify({ managerId })
    });

    if (res && res.ok) {
      showAlert('Candidate shortlisted and forwarded to manager.', 'success');
      closeModal('shortlistModal');
      loadHRApplications();
    } else {
      const data = await res.json();
      showAlert(data.error || 'Failed to shortlist.', 'error');
    }
  } catch (err) {
    showAlert('Connection error.', 'error');
  }
}

/**
 * Open rejection modal
 */
function openRejectModal(appId) {
  const modal = document.getElementById('rejectModal');
  if (!modal) return;

  document.getElementById('rejectReason').value = '';
  modal.dataset.appId = appId;
  modal.classList.add('show');
}

/**
 * Submit rejection action
 */
async function submitRejection() {
  const modal = document.getElementById('rejectModal');
  const appId = modal.dataset.appId;
  const reason = document.getElementById('rejectReason').value.trim();

  if (!reason) {
    alert('Please enter a rejection reason.');
    return;
  }

  try {
    const res = await apiRequest(`/hr/${appId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason })
    });

    if (res && res.ok) {
      showAlert('Candidate rejected. Email notification sent.', 'success');
      closeModal('rejectModal');
      loadHRApplications();
    } else {
      const data = await res.json();
      showAlert(data.error || 'Failed to reject.', 'error');
    }
  } catch (err) {
    showAlert('Connection error.', 'error');
  }
}

/**
 * Send offer to selected candidate
 */
async function sendOffer(appId) {
  if (!confirm('Send offer letter to this candidate?')) return;

  try {
    const res = await apiRequest(`/hr/${appId}/send-offer`, {
      method: 'PUT'
    });

    if (res && res.ok) {
      showAlert('Offer letter sent to candidate.', 'success');
      loadHRApplications();
    } else {
      const data = await res.json();
      showAlert(data.error || 'Failed to send offer.', 'error');
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

/**
 * Load departments and populate dropdown + list
 */
async function loadDepts() {
  const res = await apiRequest('/hr/departments');
  if (!res || !res.ok) return;
  const depts = await res.json();

  // Populate dropdown in job form
  const select = document.getElementById('oppDept');
  if (select) {
    select.innerHTML = '<option value="">-- Select Department --</option>';
    depts.forEach(d => {
      select.innerHTML += `<option value="${d.name}">${d.name}</option>`;
    });
  }

  // Populate dept management list
  const list = document.getElementById('deptList');
  if (list) {
    if (depts.length === 0) {
      list.innerHTML = '<small class="text-muted">No departments yet.</small>';
    } else {
      list.innerHTML = depts.map(d => `
        <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
          <span style="font-size:13px;">&#127970; ${d.name}</span>
          <button class="btn btn-sm btn-outline-danger py-0" onclick="removeDept('${encodeURIComponent(d.name)}')">&#10005;</button>
        </div>
      `).join('');
    }
  }
}

async function addDept() {
  const input = document.getElementById('newDeptName');
  const name = input ? input.value.trim() : '';
  if (!name) return;
  const res = await apiRequest('/hr/departments', { method: 'POST', body: JSON.stringify({ name }) });
  if (res && res.ok) {
    showAlert('Department added!', 'success');
    input.value = '';
    loadDepts();
  } else {
    const d = await res.json();
    showAlert(d.error || 'Failed to add department', 'error');
  }
}

async function removeDept(nameEncoded) {
  const name = decodeURIComponent(nameEncoded);
  if (!confirm(`Remove department "${name}"?`)) return;
  const res = await apiRequest(`/hr/departments/${encodeURIComponent(name)}`, { method: 'DELETE' });
  if (res && res.ok) { showAlert('Department removed.', 'success'); loadDepts(); }
  else showAlert('Failed to remove.', 'error');
}

/**
 * Handle new company admin tool forms
 */
function initHRManagement() {
  const oppForm = document.getElementById('createOppForm');
  if (oppForm) {
    oppForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const opportunityId = document.getElementById('oppId').value;
      const title = document.getElementById('oppTitle').value;
      const description = document.getElementById('oppDesc').value;
      const department = document.getElementById('oppDept').value;
      const res = await apiRequest('/hr/opportunities', {
        method: 'POST',
        body: JSON.stringify({ opportunityId, title, description, department })
      });
      if (res && res.ok) {
        showAlert('Job posted successfully!', 'success');
        e.target.reset();
        loadDepts(); // re-populate dropdown
        loadMyPostings(); // refresh postings table
      } else showAlert('Failed to post job', 'error');
    });
  }
}

/**
 * Load this HR's job postings
 */
async function loadMyPostings() {
  const res = await apiRequest('/hr/opportunities');
  if (!res || !res.ok) return;
  const opps = await res.json();
  const tbody = document.getElementById('myPostingsBody');
  if (!tbody) return;

  if (opps.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-muted">No job postings yet.</td></tr>';
    return;
  }

  tbody.innerHTML = opps.map((opp, i) => {
    const status = opp.isActive !== false
      ? '<span style="color:#38a169; font-weight:600;">&#9679; Active</span>'
      : '<span style="color:#e53e3e; font-weight:600;">&#9679; Closed</span>';
    const toggleLabel = opp.isActive !== false ? 'Close' : 'Reopen';
    const toggleClass = opp.isActive !== false ? 'btn-warning' : 'btn-success';
    return `
      <tr>
        <td>${i + 1}</td>
        <td><code>${opp.opportunityId}</code></td>
        <td>${opp.title}</td>
        <td>${opp.department || '-'}</td>
        <td>${status}</td>
        <td>${formatDate(opp.createdAt)}</td>
        <td>
          <button class="btn btn-sm ${toggleClass} me-1" onclick="togglePosting('${opp._id}')">${toggleLabel}</button>
          <button class="btn btn-sm btn-danger" onclick="deletePosting('${opp._id}')">&#128465;</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function togglePosting(id) {
  const res = await apiRequest(`/hr/opportunities/${id}/toggle`, { method: 'PUT' });
  if (res && res.ok) {
    const d = await res.json();
    showAlert(d.message, 'success');
    loadMyPostings();
  } else showAlert('Failed to update posting.', 'error');
}

async function deletePosting(id) {
  if (!confirm('Permanently delete this job posting? This cannot be undone.')) return;
  const res = await apiRequest(`/hr/opportunities/${id}`, { method: 'DELETE' });
  if (res && res.ok) {
    showAlert('Job posting deleted.', 'success');
    loadMyPostings();
  } catch (err) {
    showAlert('Server error deleting posting', false);
  }
}

/**
 * Load Team Member Password Requests
 */
async function loadPasswordRequests() {
  const tbody = document.getElementById('passwordRequestsBody');
  if (!tbody) return;

  try {
    const res = await apiRequest('/hr/password-requests');
    if (!res || !res.ok) throw new Error();
    const requests = await res.json();

    if (requests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3">No pending password requests.</td></tr>';
      return;
    }

    tbody.innerHTML = requests.map(req => `
      <tr>
        <td>${req.user.username}</td>
        <td>${req.user.email}</td>
        <td>${req.user.role}</td>
        <td>${new Date(req.createdAt).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-sm btn-success" onclick="approvePasswordRequest('${req._id}')">Approve</button>
          <button class="btn btn-sm btn-danger" onclick="rejectPasswordRequest('${req._id}')">Reject</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-danger">Error loading requests.</td></tr>';
  }
}

async function approvePasswordRequest(id) {
  if (!confirm('Are you sure you want to approve this password reset?')) return;
  try {
    const res = await apiRequest(`/hr/password-requests/${id}/approve`, { method: 'PUT' });
    const data = await res.json();
    if (res.ok) {
      showAlert(data.message, true);
      loadPasswordRequests();
    } else {
      showAlert(data.error || 'Failed to approve request', false);
    }
  } catch (err) {
    showAlert('Server error', false);
  }
}

async function rejectPasswordRequest(id) {
  if (!confirm('Are you sure you want to reject this request?')) return;
  try {
    const res = await apiRequest(`/hr/password-requests/${id}/reject`, { method: 'PUT' });
    const data = await res.json();
    if (res.ok) {
      showAlert(data.message, true);
      loadPasswordRequests();
    } else {
      showAlert(data.error || 'Failed to reject request', false);
    }
  } catch (err) {
    showAlert('Server error', false);
  }
}
