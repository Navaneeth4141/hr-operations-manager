// frontend/js/interviewer.js
// Interviewer dashboard logic - view interviews, submit results

document.addEventListener('DOMContentLoaded', function() {
  const user = checkAuth('Interviewer');
  if (!user) return;

  setupNavbar();
  loadInterviews();
});

/**
 * Load all interviews assigned to this interviewer
 */
async function loadInterviews() {
  try {
    const res = await apiRequest('/interviewer/interviews');
    if (!res || !res.ok) return;

    const interviews = await res.json();
    const tbody = document.getElementById('interviewsBody');

    if (!tbody) return;

    if (interviews.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3">No interviews assigned to you.</td></tr>';
      return;
    }

    tbody.innerHTML = interviews.map((int, index) => {
      const app = int.applicationId || {};
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${app.applicantName || '-'}</td>
          <td>${app.opportunityId || '-'}</td>
          <td>${formatDate(int.date)}</td>
          <td>${int.time}</td>
          <td><span class="badge-status ${getStatusBadgeClass(int.result)}">${int.result}</span></td>
          <td>
            ${int.result === 'Pending' ? `
              <button class="btn-action btn-schedule" onclick="openResultModal('${int._id}')">Submit Result</button>
            ` : `<span style="font-size:11px">${int.remarks || '-'}</span>`}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load interviews:', err);
  }
}

/**
 * Open result submission modal
 */
function openResultModal(interviewId) {
  const modal = document.getElementById('resultModal');
  if (!modal) return;

  document.getElementById('interviewResult').value = '';
  document.getElementById('interviewRemarks').value = '';

  modal.dataset.interviewId = interviewId;
  modal.classList.add('show');
}

/**
 * Submit interview result
 */
async function submitInterviewResult() {
  const modal = document.getElementById('resultModal');
  const interviewId = modal.dataset.interviewId;
  const result = document.getElementById('interviewResult').value;
  const remarks = document.getElementById('interviewRemarks').value.trim();

  if (!result) {
    alert('Please select Pass or Fail.');
    return;
  }

  try {
    const res = await apiRequest(`/interviewer/${interviewId}/submit-result`, {
      method: 'PUT',
      body: JSON.stringify({ result, remarks })
    });

    if (res && res.ok) {
      showAlert(`Result submitted: ${result}`, 'success');
      closeModal('resultModal');
      loadInterviews();
    } else {
      const data = await res.json();
      showAlert(data.error || 'Failed to submit result.', 'error');
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
