// frontend/js/admin.js
// Admin dashboard logic - stats, charts, reports, export

document.addEventListener('DOMContentLoaded', function() {
  const user = checkAuth('Admin');
  if (!user) return;

  setupNavbar();
  loadStats();
  loadReports();
  initCompanyManagement();
});

/**
 * Load aggregate statistics and render charts
 */
function toggleCompanyStats() {
  const companyId = document.getElementById('statsCompanyToggle').value;
  loadStats(companyId);
}

async function loadStats(companyId = '') {
  try {
    const res = await apiRequest(`/admin/stats${companyId ? '?companyId=' + companyId : ''}`);
    if (!res || !res.ok) return;
    const stats = await res.json();

    // Update stat cards
    setStatValue('totalApplicants', stats.totalApplicants);
    setStatValue('totalSelected', stats.selected);
    setStatValue('totalRejected', stats.rejected);
    setStatValue('totalPending', stats.pending);

    // Render charts based on response mode
    if (stats.mode === 'overall') {
      renderBarChart('deptChart', 'Company-wise Hiring', stats.companyStats || {});
    } else {
      renderBarChart('deptChart', 'Department-wise Hiring', stats.departmentStats || {});
    }
    renderStatusChart(stats);
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

function setStatValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || 0;
}

// Store chart instances so we can destroy & re-create on toggle
let deptChartInstance = null;
let statusChartInstance = null;

/**
 * Render bar chart (company-wise or department-wise)
 */
function renderBarChart(canvasId, title, statsData) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  // Update heading above canvas
  const heading = ctx.closest('.chart-box')?.querySelector('h4');
  if (heading) heading.textContent = title;

  // Destroy old chart if exists
  if (deptChartInstance) {
    deptChartInstance.destroy();
    deptChartInstance = null;
  }

  const labels = Object.keys(statsData);
  const totals = labels.map(l => statsData[l].total);
  const selected = labels.map(l => statsData[l].selected);
  const rejected = labels.map(l => statsData[l].rejected);

  deptChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['No Data'],
      datasets: [
        { label: 'Total', data: totals, backgroundColor: '#3182ce' },
        { label: 'Selected', data: selected, backgroundColor: '#38a169' },
        { label: 'Rejected', data: rejected, backgroundColor: '#e53e3e' }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });
}

/**
 * Render application status donut chart
 */
function renderStatusChart(stats) {
  const ctx = document.getElementById('statusChart');
  if (!ctx) return;

  if (statusChartInstance) {
    statusChartInstance.destroy();
    statusChartInstance = null;
  }

  statusChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Selected', 'Rejected', 'Pending'],
      datasets: [{
        data: [stats.selected, stats.rejected, stats.pending],
        backgroundColor: ['#38a169', '#e53e3e', '#d69e2e'],
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

/**
 * Load filterable report data
 */
async function loadReports(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.department) params.set('department', filters.department);
    if (filters.status) params.set('status', filters.status);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);

    const url = '/admin/reports' + (params.toString() ? '?' + params.toString() : '');
    const res = await apiRequest(url);
    if (!res || !res.ok) return;

    const applications = await res.json();
    const tbody = document.getElementById('reportBody');
    const summary = document.getElementById('reportSummary');

    if (!tbody) return;

    // Update summary
    if (summary) {
      summary.innerHTML = `Showing <span>${applications.length}</span> records`;
    }

    if (applications.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-3">No records found.</td></tr>';
      return;
    }

    tbody.innerHTML = applications.map((app, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${app.applicantName}</td>
        <td>${app.applicantEmail}</td>
        <td>${app.opportunityId}</td>
        <td><span class="badge-status ${getStatusBadgeClass(app.status)}">${app.status}</span></td>
        <td>${app.interviewResult || '-'}</td>
        <td>${app.employeeId || '-'}</td>
        <td>${formatDate(app.createdAt)}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load reports:', err);
  }
}

/**
 * Apply filters from the filter bar
 */
function applyFilters() {
  const department = document.getElementById('filterDept').value;
  const status = document.getElementById('filterStatus').value;
  const startDate = document.getElementById('filterStartDate').value;
  const endDate = document.getElementById('filterEndDate').value;

  loadReports({ department, status, startDate, endDate });
}

/**
 * Clear all filters
 */
function clearFilters() {
  document.getElementById('filterDept').value = '';
  document.getElementById('filterStatus').value = '';
  document.getElementById('filterStartDate').value = '';
  document.getElementById('filterEndDate').value = '';
  loadReports();
}

/**
 * Export report data to Excel using SheetJS
 */
async function exportToExcel() {
  try {
    const department = document.getElementById('filterDept').value;
    const status = document.getElementById('filterStatus').value;

    const params = new URLSearchParams();
    if (department) params.set('department', department);
    if (status) params.set('status', status);

    const url = '/admin/export' + (params.toString() ? '?' + params.toString() : '');
    const res = await apiRequest(url);
    if (!res || !res.ok) {
      showAlert('Failed to export data.', 'error');
      return;
    }

    const data = await res.json();

    if (data.length === 0) {
      showAlert('No data to export.', 'error');
      return;
    }

    // Use SheetJS to create Excel file
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'HR Report');

    // Download the file
    XLSX.writeFile(wb, 'HR_Report_' + new Date().toISOString().split('T')[0] + '.xlsx');
    
    showAlert('Report exported successfully!', 'success');
  } catch (err) {
    showAlert('Failed to export. Check console.', 'error');
    console.error('Export error:', err);
  }
}

/**
 * Initialize Company Management
 */
function initCompanyManagement() {
  loadCompanies();

  document.getElementById('createCompanyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('compName').value;
    const description = document.getElementById('compDesc').value;

    const res = await apiRequest('/admin/companies', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });

    if (res.ok) {
      showAlert('Company created successfully!', 'success');
      e.target.reset();
      loadCompanies();
    } else {
      showAlert('Failed to create company', 'error');
    }
  });

  document.getElementById('createHrForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const companyId = document.getElementById('hrCompanyId').value;
    const username = document.getElementById('hrUsername').value;
    const email = document.getElementById('hrEmail').value;
    const password = document.getElementById('hrPassword').value;

    const res = await apiRequest(`/admin/companies/${companyId}/hr`, {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });

    if (res.ok) {
      showAlert('Root HR created successfully!', 'success');
      e.target.reset();
    } else {
      const resp = await res.json();
      showAlert(resp.error || 'Failed to create HR', 'error');
    }
  });
}

async function loadCompanies() {
  try {
    const res = await apiRequest('/admin/companies');
    if (!res.ok) return;
    const companies = await res.json();
    
    // Populate dropdowns for Creating HR
    const select = document.getElementById('hrCompanyId');
    if (select) select.innerHTML = '<option value="">-- Select Company --</option>';

    // Populate dropdowns for Stats filtering
    const statsToggle = document.getElementById('statsCompanyToggle');
    if (statsToggle) statsToggle.innerHTML = '<option value="">Overall Platform Stats</option>';

    companies.forEach(c => {
      if (select) select.innerHTML += `<option value="${c._id}">${c.name}</option>`;
      if (statsToggle) statsToggle.innerHTML += `<option value="${c._id}">${c.name}</option>`;
    });
  } catch (err) {
    console.error(err);
  }
}
