// frontend/js/applicant.js
// Applicant dashboard logic - view applications, respond to offers

document.addEventListener('DOMContentLoaded', function() {
  const user = checkAuth('Applicant');
  if (!user) return;

  setupNavbar();
  loadApplications();
});

/**
 * Load all applications for the logged-in applicant
 */
async function loadApplications() {
  try {
    const res = await apiRequest('/applications/my');
    if (!res || !res.ok) return;

    const applications = await res.json();
    const tbody = document.getElementById('applicationsBody');
    const emptyState = document.getElementById('emptyState');

    if (!tbody) return;

    if (applications.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = applications.map((app, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${app.opportunityId}</td>
        <td><span class="badge-status ${getStatusBadgeClass(app.status)}">${app.status}</span></td>
        <td>${formatDate(app.createdAt)}</td>
        <td>${formatDate(app.updatedAt)}</td>
        <td>${app.employeeId || '-'}</td>
        <td>${app.officialEmail || '-'}</td>
        <td>
          ${app.status === 'Offer Sent' ? `
            <button class="btn-action btn-accept" onclick="respondOffer('${app._id}', 'accept')">Accept</button>
            <button class="btn-action btn-reject" onclick="respondOffer('${app._id}', 'reject')">Reject</button>
          ` : '-'}
        </td>
      </tr>
    `).join('');

    // Show offer letter if any application has one
    const offerApp = applications.find(a => a.status === 'Offer Sent' && a.offerLetter);
    if (offerApp) {
      const offerSection = document.getElementById('offerSection');
      const offerContent = document.getElementById('offerContent');
      if (offerSection && offerContent) {
        offerSection.style.display = 'block';
        offerContent.textContent = offerApp.offerLetter;
      }
    }
  } catch (err) {
    console.error('Failed to load applications:', err);
  }
}

/**
 * Accept or reject an offer
 */
async function respondOffer(appId, response) {
  const confirmMsg = response === 'accept' 
    ? 'Are you sure you want to ACCEPT this offer?' 
    : 'Are you sure you want to REJECT this offer? This action cannot be undone.';

  if (!confirm(confirmMsg)) return;

  try {
    const res = await apiRequest(`/applications/${appId}/respond`, {
      method: 'PUT',
      body: JSON.stringify({ response })
    });

    if (!res || !res.ok) {
      const data = await res.json();
      showAlert(data.error || 'Failed to respond.', 'error');
      return;
    }

    const data = await res.json();
    
    if (response === 'accept') {
      showAlert(`Offer accepted! Employee ID: ${data.employeeId}, Email: ${data.officialEmail}`, 'success');
    } else {
      showAlert('Offer declined. Process ended.', 'success');
    }

    // Reload the applications table
    loadApplications();
  } catch (err) {
    showAlert('Connection error. Please try again.', 'error');
    console.error('Respond error:', err);
  }
}

/**
 * Toggle between Application view and Job Board
 */
function toggleJobBoard() {
  document.getElementById('applicationsView').style.display = 'none';
  document.getElementById('jobBoardView').style.display = 'block';
  loadJobs();
}

function showApplications() {
  document.getElementById('jobBoardView').style.display = 'none';
  document.getElementById('applicationsView').style.display = 'block';
}

/**
 * Fetch and render vacant jobs
 */
async function loadJobs() {
  const loader = document.getElementById('jobLoading');
  const grid = document.getElementById('jobsGrid');
  
  if (!loader || !grid) return;

  grid.style.display = 'none';
  loader.style.display = 'block';
  loader.textContent = 'Loading vacant jobs...';

  try {
    // Fetch jobs and user's existing applications in parallel
    const [jobsRes, myAppsRes] = await Promise.all([
      apiRequest('/public/jobs'),
      apiRequest('/applications/my')
    ]);
    
    if (!jobsRes || !jobsRes.ok) throw new Error('Failed to fetch jobs');
    
    const jobs = await jobsRes.json();
    const myAppliedIds = new Set();
    if (myAppsRes && myAppsRes.ok) {
      const myApps = await myAppsRes.json();
      myApps.forEach(a => myAppliedIds.add(a.opportunityId));
    }

    loader.style.display = 'none';
    grid.style.display = 'grid';

    if (jobs.length === 0) {
      grid.innerHTML = '<p class="text-secondary" style="grid-column: 1/-1;">No open positions at the moment.</p>';
      return;
    }

    grid.innerHTML = jobs.map(job => {
      const companyName = job.companyId ? job.companyId.name : 'Unknown Company';
      const desc = job.description || 'No description provided.';
      const hasApplied = myAppliedIds.has(job.opportunityId);
      
      const actionBtn = hasApplied
        ? `<span style="background:#d1fae5; color:#065f46; padding:0.4rem 1rem; border-radius:6px; font-weight:600; font-size:0.85rem;">✓ Applied</span>`
        : `<a href="/frontend/pages/apply.html?job=${job.opportunityId}" class="apply-btn">Apply Now</a>`;
      
      return `
        <div class="job-card">
          <div class="job-company">${companyName}</div>
          <h3 class="job-title">${job.title}</h3>
          <div><span class="job-dept">${job.department}</span></div>
          <div class="job-desc">${desc.substring(0, 120)}${desc.length > 120 ? '...' : ''}</div>
          <div class="job-footer">
            <span style="color: #9ca3af; font-size: 0.8rem;">ID: ${job.opportunityId}</span>
            ${actionBtn}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    loader.style.color = '#ef4444';
    loader.textContent = 'Failed to load jobs. Please try again later.';
  }
}
